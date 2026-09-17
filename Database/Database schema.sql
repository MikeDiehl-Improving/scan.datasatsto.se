-- Idempotent database schema and stored procedures.
-- This file can be executed in full repeatedly.

-- Keep all schema and procedure changes atomic. XACT_ABORT rolls back the
-- transaction when a runtime error occurs in any batch.
SET XACT_ABORT ON;
SET NOCOUNT ON;
BEGIN TRANSACTION;

IF SCHEMA_ID(N'Scan') IS NULL
    EXEC(N'CREATE SCHEMA Scan');
PRINT N'[1/15] Schema Scan is ready.';
GO

-- Events
---------
PRINT N'[2/15] Creating or upgrading Scan.Events...';
IF OBJECT_ID(N'Scan.Events', N'U') IS NULL BEGIN
    CREATE TABLE Scan.Events (
        EventID       int IDENTITY(1, 1) NOT NULL,
        [Event]       varchar(50) NOT NULL,
        EventCode     uniqueidentifier CONSTRAINT DF_Scan_Events_EventCode DEFAULT (NEWID()) NOT NULL,
        ScannerSecret uniqueidentifier CONSTRAINT DF_Scan_Events_ScannerSecret DEFAULT (NEWID()) NOT NULL,
        Expires       date CONSTRAINT DF_Scan_Events_Expires DEFAULT (DATEADD(day, 365, SYSUTCDATETIME())) NOT NULL,
        CONSTRAINT PK_Scan_Events PRIMARY KEY CLUSTERED (EventID),
        CONSTRAINT UQ_Scan_Events UNIQUE ([Event]),
        CONSTRAINT UQ_Scan_Events_EventCode UNIQUE (EventCode),
        CONSTRAINT UQ_Scan_Events_ScannerSecret UNIQUE (ScannerSecret)
    );
    PRINT N'[2/15] Created Scan.Events.';
END;
ELSE BEGIN
    IF COL_LENGTH(N'Scan.Events', N'EventSecret') IS NOT NULL
       AND COL_LENGTH(N'Scan.Events', N'EventCode') IS NULL
    BEGIN
        PRINT N'[2/15] Renaming Scan.Events.EventSecret to EventCode...';
        EXEC sys.sp_rename N'Scan.Events.EventSecret', N'EventCode', N'COLUMN';
    END;

    IF COL_LENGTH(N'Scan.Events', N'EventCode') IS NULL BEGIN
        PRINT N'[2/15] Adding Scan.Events.EventCode...';
        EXEC(N'ALTER TABLE Scan.Events ADD EventCode uniqueidentifier NULL');
    END;

    IF COL_LENGTH(N'Scan.Events', N'ScannerSecret') IS NULL BEGIN
        PRINT N'[2/15] Adding Scan.Events.ScannerSecret...';
        EXEC(N'ALTER TABLE Scan.Events ADD ScannerSecret uniqueidentifier NULL');
    END;

    PRINT N'[2/15] Backfilling Scan.Events authorization codes...';
    EXEC(N'UPDATE Scan.Events
          SET EventCode=COALESCE(EventCode, NEWID()),
              ScannerSecret=COALESCE(ScannerSecret, NEWID())');

    EXEC(N'ALTER TABLE Scan.Events ALTER COLUMN EventCode uniqueidentifier NOT NULL');
    EXEC(N'ALTER TABLE Scan.Events ALTER COLUMN ScannerSecret uniqueidentifier NOT NULL');

    IF NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints AS dc
        INNER JOIN sys.columns AS c ON c.default_object_id=dc.object_id
        WHERE dc.parent_object_id=OBJECT_ID(N'Scan.Events')
          AND c.name=N'EventCode')
        EXEC(N'ALTER TABLE Scan.Events ADD CONSTRAINT DF_Scan_Events_EventCode DEFAULT (NEWID()) FOR EventCode');

    IF NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints AS dc
        INNER JOIN sys.columns AS c ON c.default_object_id=dc.object_id
        WHERE dc.parent_object_id=OBJECT_ID(N'Scan.Events')
          AND c.name=N'ScannerSecret')
        EXEC(N'ALTER TABLE Scan.Events ADD CONSTRAINT DF_Scan_Events_ScannerSecret DEFAULT (NEWID()) FOR ScannerSecret');

    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name=N'UQ_Scan_Events_EventCode')
        EXEC(N'ALTER TABLE Scan.Events ADD CONSTRAINT UQ_Scan_Events_EventCode UNIQUE (EventCode)');

    IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name=N'UQ_Scan_Events_ScannerSecret')
        EXEC(N'ALTER TABLE Scan.Events ADD CONSTRAINT UQ_Scan_Events_ScannerSecret UNIQUE (ScannerSecret)');

    PRINT N'[2/15] Upgraded Scan.Events.';
END;
GO

-- Identities
-------------
PRINT N'[3/15] Creating or upgrading Scan.Identities...';
IF OBJECT_ID(N'Scan.Identities', N'U') IS NULL BEGIN
    CREATE TABLE Scan.Identities (
        EventID     int NOT NULL,
        ID          bigint NOT NULL,
        Created     datetime2(3) NOT NULL,
        [Name]      varbinary(250) NULL,
        [FirstName] varbinary(250) NULL,
        [LastName]  varbinary(250) NULL,
        [Description] varbinary(500) NULL,
        JobTitle    varbinary(200) NULL,
        Email       varbinary(200) NULL,
        Phone       varbinary(100) NULL,
        [Location]  varbinary(200) NULL,
        [Role]      varbinary(100) NULL,
        CONSTRAINT PK_Scan_Identities PRIMARY KEY CLUSTERED (ID),
        CONSTRAINT FK_Scan_Identities_Events FOREIGN KEY (EventID) REFERENCES Scan.Events (EventID)
    );
    PRINT N'[3/15] Created Scan.Identities.';
END;
ELSE BEGIN
    IF COL_LENGTH(N'Scan.Identities', N'Phone') < 100
        ALTER TABLE Scan.Identities ALTER COLUMN Phone varbinary(100) NULL;

    IF COL_LENGTH(N'Scan.Identities', N'FirstName') IS NULL
        ALTER TABLE Scan.Identities ADD [FirstName] varbinary(250) NULL;

    IF COL_LENGTH(N'Scan.Identities', N'LastName') IS NULL
        ALTER TABLE Scan.Identities ADD [LastName] varbinary(250) NULL;
    IF COL_LENGTH(N'Scan.Identities', N'Role') IS NULL
        ALTER TABLE Scan.Identities ADD [Role] varbinary(100) NULL;
    ELSE
        ALTER TABLE Scan.Identities ALTER COLUMN [Role] varbinary(100) NULL;
    PRINT N'[3/15] Upgraded Scan.Identities.';
END;
GO

-- Exhibitor codes
PRINT N'[4/15] Creating Scan.ReferenceCodes if needed...';
IF OBJECT_ID(N'Scan.ReferenceCodes', N'U') IS NULL BEGIN
    CREATE TABLE Scan.ReferenceCodes (
        EventID       int NOT NULL,
        ReferenceCode varchar(20) NOT NULL,
        CONSTRAINT PK_Scan_ReferenceCodes PRIMARY KEY CLUSTERED (EventID, ReferenceCode),
        CONSTRAINT FK_Scan_ReferenceCodes_Events FOREIGN KEY (EventID) REFERENCES Scan.Events (EventID)
    );
    PRINT N'[4/15] Created Scan.ReferenceCodes.';
END;
GO
PRINT N'[4/15] Scan.ReferenceCodes is ready.';
GO

-- Scans
--------
PRINT N'[5/15] Creating Scan.Scans if needed...';
IF OBJECT_ID(N'Scan.Scans', N'U') IS NULL BEGIN
    CREATE TABLE Scan.Scans (
        ID            bigint NOT NULL,
        Scanned       datetime2(3) NOT NULL,
        ReferenceCode varchar(20) NULL,
        Note          nvarchar(max) NULL,
        CONSTRAINT PK_Scan_Scans PRIMARY KEY CLUSTERED (ID, Scanned),
        CONSTRAINT FK_Scan_Scans_Identities FOREIGN KEY (ID) REFERENCES Scan.Identities (ID)
    );
    PRINT N'[5/15] Created Scan.Scans.';
END;
GO
PRINT N'[5/15] Scan.Scans is ready.';
GO

PRINT N'[6/15] Creating or altering Scan.Authorize_Scanner...';
GO

-------------------------------------------------------------------------------
--- Authorize a scanner
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Authorize_Scanner
    @ScannerSecret uniqueidentifier
AS
SET NOCOUNT ON;
SELECT EventID, [Event], Expires
FROM Scan.Events
WHERE ScannerSecret=@ScannerSecret
  AND Expires>=CAST(SYSUTCDATETIME() AS date);
GO
PRINT N'[6/15] Scan.Authorize_Scanner succeeded.';
GO

PRINT N'[7/15] Creating or altering Scan.New_Event...';
GO
-------------------------------------------------------------------------------
--- Create a new event
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.New_Event
    @Event varchar(50)
AS
SET NOCOUNT ON;
INSERT INTO Scan.Events ([Event])
OUTPUT inserted.EventCode, inserted.ScannerSecret
VALUES (@Event);
GO
PRINT N'[7/15] Scan.New_Event succeeded.';
GO

PRINT N'[8/15] Creating or altering Scan.New_Identity...';
GO
-------------------------------------------------------------------------------
--- Create a new identity
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.New_Identity
    @Event varchar(50),
    @ID bigint=NULL
AS
SET NOCOUNT ON;
DECLARE @Done bit=0,
        @Attempts tinyint=0,
        @EventID int=(SELECT EventID FROM Scan.Events WHERE [Event]=@Event);

--- If the event does not exist, fail.
IF (@EventID IS NULL) BEGIN;
    THROW 50001, 'Invalid event code', 1;
    RETURN;
END;

--- If the request specified an ID, use that:
IF (@ID IS NOT NULL)
    INSERT INTO Scan.Identities (ID, EventID, Created)
    VALUES (@ID, @EventID, SYSUTCDATETIME());

IF (@ID IS NULL) BEGIN;
    --- Try up to a hundred times to allocate a new, random identity:
    WHILE (@Done=0 AND @Attempts<100) BEGIN;
        BEGIN TRY;
            SET @ID=10000000000.+10000000000.*RAND(CHECKSUM(NEWID()));
            SET @Attempts=@Attempts+1;
            INSERT INTO Scan.Identities (ID, EventID, Created)
            VALUES (@ID, @EventID, SYSUTCDATETIME());
            SET @Done=1;
        END TRY
        BEGIN CATCH;
            SET @ID=NULL;
            SET @Done=0;
        END CATCH;
    END;
END;

--- If we could allocate an identity, return it:
IF (@ID IS NOT NULL)
    SELECT @ID AS ID;

--- If we couldn't allocate an identity, fail:
IF (@ID IS NULL)
    THROW 50001, 'You''re not going to believe this. But I think we ran out of identity numbers', 1;
GO
PRINT N'[8/15] Scan.New_Identity succeeded.';
GO

PRINT N'[9/15] Creating or altering Scan.New_Scan...';
GO
-------------------------------------------------------------------------------
--- Scan an identity
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.New_Scan
    @ID bigint,
    @EventID int=NULL,
    @ReferenceCode varchar(20)=NULL,
    @Note nvarchar(max)=NULL
AS
SET NOCOUNT ON;

IF ((SELECT Expires
     FROM Scan.Events
     WHERE EventID=(SELECT EventID FROM Scan.Identities WHERE ID=@ID)
    )<=CAST(SYSDATETIME() AS date)) BEGIN;
    SELECT -1 AS [ID];
    THROW 50001, 'This event is no longer active', 1;
    RETURN;
END;

IF (@EventID IS NOT NULL AND
    (SELECT EventID FROM Scan.Identities WHERE ID=@ID)<>@EventID) BEGIN;
    SELECT -1 AS [ID];
    THROW 50001, 'This scanner is not authorized for this event', 1;
    RETURN;
END;

--- Create the reference code if
--- * the identity exists, and
--- * the reference code doesn't already exist:
INSERT INTO Scan.ReferenceCodes (EventID, ReferenceCode)
SELECT EventID, @ReferenceCode
FROM Scan.Identities
WHERE ID=@ID
EXCEPT
SELECT EventID, ReferenceCode
FROM Scan.ReferenceCodes;

BEGIN TRY;
    --- Add the user scan if the identity exists:
    INSERT INTO Scan.Scans (ID, Scanned, ReferenceCode, Note)
    OUTPUT inserted.ID
    SELECT @ID, SYSUTCDATETIME(), @ReferenceCode, @Note
    FROM Scan.Identities
    WHERE ID=@ID;
END TRY
BEGIN CATCH;
    SELECT -1 AS [ID];
END CATCH;
GO
PRINT N'[9/15] Scan.New_Scan succeeded.';
GO

PRINT N'[10/15] Creating or altering Scan.Get_Codes...';
GO
-------------------------------------------------------------------------------
--- Get a list of exhibitor codes for an identity. Used by /setup?id=...
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Get_Codes
    @ID bigint
AS
SELECT c.ReferenceCode
FROM Scan.Identities AS i
INNER JOIN Scan.ReferenceCodes AS c ON i.EventID=c.EventID
WHERE i.ID=@ID
ORDER BY c.ReferenceCode;
GO
PRINT N'[10/15] Scan.Get_Codes succeeded.';
GO

PRINT N'[10/15] Creating or altering Scan.Get_Event_Codes...';
GO
-------------------------------------------------------------------------------
--- Get all exhibitor codes for an authorized event
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Get_Event_Codes
    @EventID int
AS
SELECT ReferenceCode
FROM Scan.ReferenceCodes
WHERE EventID=@EventID
ORDER BY ReferenceCode;
GO
PRINT N'[10/15] Scan.Get_Event_Codes succeeded.';
GO

PRINT N'[11/15] Creating or altering Scan.Get_Scans...';
GO
-------------------------------------------------------------------------------
--- Fetch all scans for an event
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Get_Scans
    @EventCode uniqueidentifier,
    @EncryptionKey nvarchar(200)=N''
AS
SELECT i.ID, s.Scanned, s.ReferenceCode AS Code, s.Note,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.[Name]) AS nvarchar(max)) AS [name],
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.[FirstName]) AS nvarchar(max)) AS firstName,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.[LastName]) AS nvarchar(max)) AS lastName,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.[Description]) AS nvarchar(max)) AS [description],
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.JobTitle) AS nvarchar(max)) AS jobTitle,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.Phone) AS nvarchar(max)) AS phone,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.Email) AS nvarchar(max)) AS email,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.[Location]) AS nvarchar(max)) AS [location]
FROM Scan.[Events] AS e
INNER JOIN Scan.Identities AS i ON e.EventID=i.EventID
LEFT JOIN Scan.Scans AS s ON i.ID=s.ID
WHERE e.EventCode=@EventCode
ORDER BY s.Scanned;
GO
PRINT N'[11/15] Scan.Get_Scans succeeded.';
GO

PRINT N'[12/15] Creating or altering Scan.Get_Identities...';
GO
-------------------------------------------------------------------------------
--- List all of the identities associated with an event
---
--- 1. If provided with an encryption key, only identities with names are returned
--- 2. If no encryption key is provided, all items are provided, and the caller
---    will need to assign names to the identities.
---
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Get_Identities
    @EventCode uniqueidentifier,
    @EncryptionKey nvarchar(200)=NULL,
    @IdentityIDs nvarchar(max)=NULL
AS
SELECT (
    SELECT TOP (1)
        e.EventID AS eventId,
        e.Event AS eventName,
        (SELECT i.ID AS id,
                CONVERT(nvarchar(250), DECRYPTBYPASSPHRASE(@EncryptionKey, [Name])) AS [name],
                CONVERT(nvarchar(250), DECRYPTBYPASSPHRASE(@EncryptionKey, [FirstName])) AS firstName,
                CONVERT(nvarchar(250), DECRYPTBYPASSPHRASE(@EncryptionKey, [LastName])) AS lastName,
                CONVERT(nvarchar(500), DECRYPTBYPASSPHRASE(@EncryptionKey, [Description])) AS [description],
                CONVERT(nvarchar(200), DECRYPTBYPASSPHRASE(@EncryptionKey, JobTitle)) AS jobTitle,
                CONVERT(nvarchar(50), DECRYPTBYPASSPHRASE(@EncryptionKey, Phone)) AS phone,
                CONVERT(nvarchar(200), DECRYPTBYPASSPHRASE(@EncryptionKey, Email)) AS email,
                CONVERT(nvarchar(200), DECRYPTBYPASSPHRASE(@EncryptionKey, [Location])) AS [location],
                CONVERT(nvarchar(50), DECRYPTBYPASSPHRASE(@EncryptionKey, [Role])) AS [role]
            FROM Scan.Identities AS i
            WHERE i.EventID=e.EventID
              AND (
                  @IdentityIDs IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM OPENJSON(@IdentityIDs)
                      WITH (ID bigint '$') AS selected
                      WHERE selected.ID=i.ID
                  )
              )
            ORDER BY [name]
            FOR JSON PATH) AS identities
    FROM Scan.Events AS e
    WHERE e.EventCode=@EventCode
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS blob;
GO
PRINT N'[12/15] Scan.Get_Identities succeeded.';
GO

PRINT N'[12/15] Creating or altering Scan.Get_Reserved_Identity...';
GO
CREATE OR ALTER PROCEDURE Scan.Get_Reserved_Identity
    @EventID int,
    @ID bigint,
    @EncryptionKey nvarchar(200)=N''
AS
SET NOCOUNT ON;
SELECT CASE
           WHEN i.ID IS NULL THEN N'NotFound'
           WHEN CONVERT(nvarchar(150), DECRYPTBYPASSPHRASE(@EncryptionKey, i.Email))
                = LOWER(CONCAT(N'blank-', CONVERT(nvarchar(30), i.ID), N'@invalid.example'))
               THEN N'Available'
           ELSE N'Claimed'
       END AS Status
FROM (SELECT @ID AS ID) AS requested
LEFT JOIN Scan.Identities AS i
    ON i.ID=requested.ID
   AND i.EventID=@EventID;
GO
PRINT N'[12/15] Scan.Get_Reserved_Identity succeeded.';
GO

PRINT N'[12/15] Creating or altering Scan.Claim_Reserved_Identity...';
GO
CREATE OR ALTER PROCEDURE Scan.Claim_Reserved_Identity
    @EventID int,
    @ID bigint,
    @EncryptionKey nvarchar(200)=N'',
    @Email nvarchar(150),
    @FirstName nvarchar(250),
    @LastName nvarchar(250),
    @Name nvarchar(250),
    @Description nvarchar(400),
    @JobTitle nvarchar(150),
    @Phone nvarchar(150),
    @Location nvarchar(150),
    @Role nvarchar(50)
AS
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRANSACTION;

UPDATE i
SET i.Email = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(LOWER(@Email), N'')),
    i.FirstName = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(@FirstName, N'')),
    i.LastName = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(@LastName, N'')),
    i.[Name] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(@Name, N'')),
    i.[Description] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(@Description, N'')),
    i.JobTitle = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(@JobTitle, N'')),
    i.Phone = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(@Phone, N'')),
    i.[Location] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(@Location, N'')),
    i.[Role] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(@Role, N''))
FROM Scan.Identities AS i
WHERE i.EventID=@EventID
  AND i.ID=@ID
  AND CONVERT(nvarchar(150), DECRYPTBYPASSPHRASE(@EncryptionKey, i.Email))
      = LOWER(CONCAT(N'blank-', CONVERT(nvarchar(30), i.ID), N'@invalid.example'));

DECLARE @Claimed int=@@ROWCOUNT;
COMMIT TRANSACTION;
SELECT @Claimed AS Claimed;
GO
PRINT N'[12/15] Scan.Claim_Reserved_Identity succeeded.';
GO

PRINT N'[13/15] Creating or altering Scan.Get_Random...';
GO
-------------------------------------------------------------------------------
--- Fetch a random scan for an event
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Get_Random
    @EventCode uniqueidentifier,
    @ReferenceCode varchar(20)=NULL,
    @EncryptionKey nvarchar(200)=N''
AS
SELECT TOP (1) ID, Scanned, Code,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, [name]) AS nvarchar(max)) AS [Name],
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, [FirstName]) AS nvarchar(max)) AS firstName,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, [LastName]) AS nvarchar(max)) AS lastName
FROM (
    SELECT DISTINCT i.ID, s.Scanned, s.ReferenceCode AS Code,
                    i.[Name], i.[FirstName], i.[LastName]
    FROM Scan.Events AS e
    INNER JOIN Scan.Identities AS i ON e.EventID=i.EventID
    INNER JOIN Scan.Scans AS s ON i.ID=s.ID
    WHERE e.EventCode=@EventCode
      AND (s.ReferenceCode=@ReferenceCode OR NULLIF(@ReferenceCode, '') IS NULL)
) AS sub
ORDER BY NEWID();
GO
PRINT N'[13/15] Scan.Get_Random succeeded.';
GO

PRINT N'[14/15] Creating or altering Scan.Expire...';
GO
-------------------------------------------------------------------------------
--- Evict old identities and scans
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Expire
AS
DECLARE @today date=SYSUTCDATETIME();
BEGIN TRANSACTION;
    DELETE s
    FROM Scan.Events AS e
    INNER JOIN Scan.Identities AS i ON e.EventID=i.EventID
    INNER JOIN Scan.Scans AS s ON i.ID=s.ID
    WHERE e.Expires<@today;

    DELETE i
    FROM Scan.Events AS e
    INNER JOIN Scan.Identities AS i ON e.EventID=i.EventID
    WHERE e.Expires<@today;

    DELETE c
    FROM Scan.Events AS e
    INNER JOIN Scan.ReferenceCodes AS c ON e.EventID=c.EventID
    WHERE e.Expires<@today;

    DELETE e
    OUTPUT deleted.Event AS ExpiredEvent
    FROM Scan.Events AS e
    WHERE e.Expires<@today;
COMMIT TRANSACTION;
GO
PRINT N'[14/15] Scan.Expire succeeded.';
GO

PRINT N'[15/15] Creating or altering Scan.Update_Identities...';
GO
-------------------------------------------------------------------------------
---
--- Applies names and descriptions to identities for an event. An optional
--- encryption key can be applied using the @EncryptionKey parameter.
---
--- The JSON blob should look like this:
--- [{ "id": 123456, "firstName": "Firstname", "lastName": "Lastname", "description": "Company" }, ...]
---
--- Valid attributes are:
---
--- * id: the unique identity (int)
--- * name: nvarchar(200)
--- * firstName: nvarchar(250)
--- * lastName: nvarchar(250)
--- * description: nvarchar(400)
--- * jobTitle: nvarchar(150)
--- * phone: nvarchar(150)
--- * email: nvarchar(150)
---- * location: nvarchar(150)
--- * role: nvarchar(50)
---
--- NB: Attributes are case sensitive.
---
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Update_Identities
    @EventCode uniqueidentifier,
    @EncryptionKey nvarchar(200)=N'',
    @Identities_blob nvarchar(max)
AS
DECLARE @EventID int;
SELECT @EventID = EventID
FROM Scan.Events
WHERE EventCode = @EventCode;

IF (@EventID IS NULL) BEGIN
    THROW 50001, N'Invalid or missing event code.', 1;
    RETURN;
END;

DECLARE @sourceRows TABLE (
    ID bigint NULL,
    [Name] nvarchar(250) NULL,
    [FirstName] nvarchar(250) NULL,
    [LastName] nvarchar(250) NULL,
    [Description] nvarchar(400) NULL,
    JobTitle nvarchar(150) NULL,
    Phone nvarchar(150) NULL,
    Email nvarchar(150) NULL,
    [Location] nvarchar(150) NULL,
    [Role] nvarchar(50) NULL
);

INSERT INTO @sourceRows (ID, [Name], [FirstName], [LastName], [Description],
                         JobTitle, Phone, Email, [Location], [Role])
SELECT id, [name], [firstName], [lastName], [description],
       jobTitle, phone, email, [location], RoleName
FROM OPENJSON(NULLIF(@Identities_blob, N'')) WITH (
    id bigint '$.id',
    [name] nvarchar(250) '$.name',
    [firstName] nvarchar(250) '$.firstName',
    [lastName] nvarchar(250) '$.lastName',
    [description] nvarchar(400) '$.description',
    jobTitle nvarchar(150) '$.jobTitle',
    phone nvarchar(150) '$.phone',
    email nvarchar(150) '$.email',
    [location] nvarchar(150) '$.location',
    RoleName nvarchar(50) '$.role'
);

-- Preserve fields already registered for a reserved badge. Incoming values
-- fill only columns that are still NULL.
UPDATE target
SET target.[Name] = COALESCE(target.[Name], ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Name], N''))),
    target.[FirstName] = COALESCE(target.[FirstName], ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[FirstName], N''))),
    target.[LastName] = COALESCE(target.[LastName], ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[LastName], N''))),
    target.[Description] = COALESCE(target.[Description], ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Description], N''))),
    target.JobTitle = COALESCE(target.JobTitle, ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.JobTitle, N''))),
    target.Phone = COALESCE(target.Phone, ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.Phone, N''))),
    target.Email = COALESCE(target.Email, ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(LOWER(source.Email), N''))),
    target.[Location] = COALESCE(target.[Location], ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Location], N''))),
    target.[Role] = COALESCE(target.[Role], ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Role], N'')))
FROM Scan.Identities AS target
INNER JOIN @sourceRows AS source
    ON source.ID = target.ID
WHERE target.EventID = @EventID;

INSERT INTO Scan.Identities (
    EventID, ID, [Name], [FirstName], [LastName], [Description],
    JobTitle, Email, Phone, [Location], [Role], Created
)
SELECT
    @EventID,
    source.ID,
    ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Name], N'')),
    ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[FirstName], N'')),
    ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[LastName], N'')),
    ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Description], N'')),
    ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.JobTitle, N'')),
    ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(LOWER(source.Email), N'')),
    ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.Phone, N'')),
    ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Location], N'')),
    ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Role], N'')),
    SYSDATETIME()
FROM @sourceRows AS source
WHERE source.ID IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM Scan.Identities AS existing
      WHERE existing.ID = source.ID
  );
GO
PRINT N'[15/15] Scan.Update_Identities succeeded.';
GO

PRINT N'[16/16] Creating or altering Scan.Get_Authorization_Code...';
GO
-------------------------------------------------------------------------------
--- Fetch the organizer scanner authorization code for an event
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Get_Authorization_Code
    @EventCode uniqueidentifier
AS
SET NOCOUNT ON;
SELECT [Event], EventCode, ScannerSecret
FROM Scan.Events
WHERE EventCode=@EventCode
  AND Expires>=CAST(SYSUTCDATETIME() AS date);
GO
PRINT N'[16/16] Scan.Get_Authorization_Code succeeded.';
GO

COMMIT TRANSACTION;
