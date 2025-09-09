CREATE SCHEMA Scan;
GO
-- Events
---------
CREATE TABLE Scan.Events (
    EventID     int IDENTITY(1, 1) NOT NULL,
    [Event]     varchar(50) NOT NULL,
    EventSecret uniqueidentifier DEFAULT (NEWID()) NOT NULL,
    Expires     date DEFAULT (DATEADD(day, 365, SYSUTCDATETIME())) NOT NULL,
    CONSTRAINT PK_Scan_Events PRIMARY KEY CLUSTERED (EventID),
    CONSTRAINT UQ_Scan_Events UNIQUE ([Event])
);
GO
-- Identities
-------------
CREATE TABLE Scan.Identities (
    EventID     int NOT NULL,
    ID          bigint NOT NULL,
    Created     datetime2(3) NOT NULL,
	[Name]      varbinary(250) NULL,
	[Description] varbinary(500) NULL,
	JobTitle    varbinary(200) NULL,
	Email       varbinary(200) NULL,
	Phone       varbinary(50) NULL,
	[Location]  varbinary(200) NULL
    CONSTRAINT PK_Scan_Identities PRIMARY KEY CLUSTERED (ID),
    CONSTRAINT FK_Scan_Identities_Events FOREIGN KEY (EventID) REFERENCES Scan.Events (EventID)
);
GO
-- Exhibitor codes
CREATE TABLE Scan.ReferenceCodes (
    EventID     int NOT NULL,
    ReferenceCode varchar(20) NOT NULL,
    CONSTRAINT PK_Scan_ReferenceCodes PRIMARY KEY CLUSTERED (EventID, ReferenceCode),
    CONSTRAINT FK_Scan_ReferenceCodes_Events FOREIGN KEY (EventID) REFERENCES Scan.Events (EventID)
);
-- Scans
--------
CREATE TABLE Scan.Scans (
    ID          bigint NOT NULL,
    Scanned     datetime2(3) NOT NULL,
    ReferenceCode varchar(20) NULL,
    Note        nvarchar(max) NULL,
    CONSTRAINT PK_Scan_Scans PRIMARY KEY CLUSTERED (Id, Scanned),
    CONSTRAINT FK_Scan_Scans_Identities FOREIGN KEY (ID) REFERENCES Scan.Identities (ID)
);
GO

-------------------------------------------------------------------------------
--- Create a new event
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.New_Event
    @Event      varchar(50)
AS

SET NOCOUNT ON;

INSERT INTO Scan.Events ([Event])
OUTPUT inserted.EventSecret
VALUES (@Event);

GO

-------------------------------------------------------------------------------
--- Create a new identity
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.New_Identity
    @Event      varchar(50),
    @ID         bigint=NULL
AS

SET NOCOUNT ON;

DECLARE @Done       bit=0,
        @Attempts   tinyint=0,
        @EventID    int=(SELECT EventID FROM Scan.Events WHERE [Event]=@Event);

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

-------------------------------------------------------------------------------
--- Scan an identity
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.New_Scan
    @ID             bigint,
    @ReferenceCode  varchar(20)=NULL,
    @Note           nvarchar(max)=NULL
AS

SET NOCOUNT ON;

IF ((SELECT Expires
     FROM Scan.Events
     WHERE EventID=(SELECT EventID
                    FROM Scan.Identities
                    WHERE ID=@ID)
    )<=CAST(SYSDATETIME() AS date)) BEGIN;

    SELECT -1 AS [ID];
    THROW 50001, 'This event is no longer active', 1;
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

-------------------------------------------------------------------------------
--- Get a list of exhibitor codes for an identity. Used by /setup?id=...
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Get_Codes
    @ID             bigint
AS

SELECT c.ReferenceCode
FROM Scan.Identities AS i
INNER JOIN Scan.ReferenceCodes AS c ON i.EventID=c.EventID
WHERE i.ID=@ID
ORDER BY c.ReferenceCode;

GO

-------------------------------------------------------------------------------
--- Fetch all scans for an event
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE [Scan].[Get_Scans]
    @EventSecret        uniqueidentifier,
    @EncryptionKey      nvarchar(200)=N''
AS

SELECT i.ID, s.Scanned, s.ReferenceCode AS Code, s.Note,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.[Name]) AS nvarchar(max)) AS [name],
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.[Description]) AS nvarchar(max)) AS [description],
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.JobTitle) AS nvarchar(max)) AS jobTitle,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.Phone) AS nvarchar(max)) AS phone,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.Email) AS nvarchar(max)) AS email,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, i.[Location]) AS nvarchar(max)) AS [location]
FROM Scan.[Events] AS e
INNER JOIN Scan.Identities AS i ON e.EventID=i.EventID
LEFT JOIN Scan.Scans AS s ON i.ID=s.ID
WHERE e.EventSecret=@EventSecret
ORDER BY s.Scanned;

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
    @EventSecret        uniqueidentifier,
    @EncryptionKey      nvarchar(200)=NULL
AS

SELECT (
    SELECT TOP (1)
        e.EventID AS eventId,
        e.Event AS eventName,
        (SELECT i.ID AS id,
                CONVERT(nvarchar(250), DECRYPTBYPASSPHRASE(@EncryptionKey, [Name])) AS [name],
                CONVERT(nvarchar(500), DECRYPTBYPASSPHRASE(@EncryptionKey, [Description])) AS [description],
                CONVERT(nvarchar(200), DECRYPTBYPASSPHRASE(@EncryptionKey, JobTitle)) AS jobTitle,
                CONVERT(nvarchar(50),  DECRYPTBYPASSPHRASE(@EncryptionKey, Phone)) AS phone,
                CONVERT(nvarchar(200), DECRYPTBYPASSPHRASE(@EncryptionKey, Email)) AS email,
                CONVERT(nvarchar(200), DECRYPTBYPASSPHRASE(@EncryptionKey, [Location])) AS [location]
            FROM Scan.Identities AS i
            WHERE i.EventID=e.EventID
            --AND (@EncryptionKey IS NOT NULL AND [Name] IS NOT NULL OR @EncryptionKey IS NULL)
            ORDER BY [name]
            FOR JSON PATH) AS identities
    FROM Scan.Events AS e
    WHERE e.EventSecret=@EventSecret
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS blob;

GO

-------------------------------------------------------------------------------
--- Fetch a random scans for an event
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE [Scan].[Get_Random]
    @EventSecret        uniqueidentifier,
    @ReferenceCode      varchar(20)=NULL,
    @EncryptionKey      nvarchar(200)=N''
AS

SELECT TOP (1) ID, Scanned, Code,
       CAST(DECRYPTBYPASSPHRASE(@EncryptionKey, [name]) AS nvarchar(max)) AS [Name]
FROM (
    SELECT DISTINCT i.ID, s.Scanned, s.ReferenceCode AS Code, i.[Name]
    FROM Scan.Events AS e
    INNER JOIN Scan.Identities AS i ON e.EventID=i.EventID
    INNER JOIN Scan.Scans AS s ON i.ID=s.ID
    WHERE e.EventSecret=@EventSecret
    AND (s.ReferenceCode=@ReferenceCode OR NULLIF(@ReferenceCode, '') IS NULL)
) AS sub
ORDER BY NEWID();

GO

-------------------------------------------------------------------------------
--- Evict old identities and scans
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Expire
AS

DECLARE @today date=SYSUTCDATETIME();

BEGIN TRANSACTION;

    --- Events -> Identities -> Scans:
    DELETE s
    FROM Scan.Events AS e
    INNER JOIN Scan.Identities AS i ON e.EventID=i.EventID
    INNER JOIN Scan.Scans AS s ON i.ID=s.ID
    WHERE e.Expires<@today;

    --- Events -> Identities
    DELETE i
    FROM Scan.Events AS e
    INNER JOIN Scan.Identities AS i ON e.EventID=i.EventID
    WHERE e.Expires<@today;

    --- Events -> ReferenceCodes
    DELETE c
    FROM Scan.Events AS e
    INNER JOIN Scan.ReferenceCodes AS c ON e.EventID=c.EventID
    WHERE e.Expires<@today;

    --- Events
    DELETE e
    OUTPUT deleted.Event AS ExpiredEvent
    FROM Scan.Events AS e
    WHERE e.Expires<@today;

COMMIT TRANSACTION;

GO

-------------------------------------------------------------------------------
---
--- Applies names and descriptions to identities for an event. An optional
--- encryption key can be applied using the @EncryptionKey parameter.
---
--- The JSON blob should look like this:
--- [{ "id": 123456, "name": "Firstname Lastname", "description: "Company" }, ...]
---
--- Valid attributes are:
---
--- * id: the unique identity (int)
--- * name: nvarchar(200)
--- * description: nvarchar(400)
--- * jobTitle: nvarchar(150)
--- * phone: nvarchar(150)
--- * email: nvarchar(150)
--- * location: nvarchar(150)
--- 
--- NB: Attributes are case sensitive.
---
-------------------------------------------------------------------------------

CREATE OR ALTER PROCEDURE Scan.Update_Identities
    @EventSecret        uniqueidentifier,
    @EncryptionKey      nvarchar(200)=N'',
    @Identities_blob    nvarchar(max)
AS

DECLARE @EventID int=(SELECT EventID FROM Scan.Events WHERE EventSecret=@EventSecret);

IF (@EventID IS NULL) BEGIN;
    THROW 50001, N'Invalid or missing event secret.', 1;
    RETURN;
END;

--- Generate new unique IDs, just in case.
DECLARE @idcount int=(SELECT COUNT(*) FROM STRING_SPLIT(@Identities_blob, N'{'))+1;

SELECT TOP (@idcount) ROW_NUMBER() OVER (ORDER BY ID) AS _rowno, ID INTO #idents
FROM (
    SELECT DISTINCT CAST(10000000000.+10000000000.*RAND(CHECKSUM(NEWID())) AS bigint) AS ID
    FROM GENERATE_SERIES(1, @idcount*2, 1)) AS sub
WHERE ID NOT IN (SELECT ID FROM Scan.Identities);


WITH i AS (
    SELECT EventID, ID, [Name], [Description], JobTitle, Email, Phone, [Location], Created
    FROM Scan.Identities
    WHERE EventID=@EventID),

j AS (
    SELECT ROW_NUMBER() OVER (ORDER BY id) AS _rowno,
           id AS ID,
           ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF([name], N'')) AS [Name],
           ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF([description], N'')) AS [Description],
           ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(jobTitle, N'')) AS JobTitle,
           ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(phone, N'')) AS Phone,
           ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(LOWER(email), N'')) AS Email,
           ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF([location], N'')) AS [Location],
           (CASE WHEN [id] IS NOT NULL THEN ROW_NUMBER() OVER (PARTITION BY [id] ORDER BY (SELECT NULL)) ELSE 1 END) AS _duplicate
    FROM OPENJSON(NULLIF(@Identities_blob, N'')) WITH (
        id              bigint          '$.id',
        [name]          nvarchar(max)   '$.name',
        [description]   nvarchar(max)   '$.description',
        jobTitle        nvarchar(max)   '$.jobTitle',
        phone           nvarchar(max)   '$.phone',
        email           nvarchar(max)   '$.email',
        [location]      nvarchar(max)   '$.location')),

blob AS (
    SELECT ISNULL(j.ID, id.ID) AS ID,
           j.[Name], j.[Description],
           j.JobTitle, j.Phone, j.Email, j.[Location]
    FROM j
    LEFT JOIN #idents AS id ON j._rowno=id._rowno
    WHERE j._duplicate=1
      AND (j.ID IS NOT NULL OR
           j.[Name] IS NOT NULL OR
           j.[Description] IS NOT NULL OR
           j.JobTitle IS NOT NULL OR
           j.Phone IS NOT NULL OR
           j.Email IS NOT NULL OR
           j.[Location] IS NOT NULL))

MERGE INTO i
USING blob ON (i.ID=blob.ID OR blob.ID IS NULL AND i.Email=blob.Email)

WHEN NOT MATCHED BY TARGET THEN
    INSERT (EventID, ID, [Name], [Description], JobTitle, Email, Phone, [Location], Created)
    VALUES (@EventID, blob.ID, blob.[Name], blob.[Description], blob.JobTitle, blob.Email, blob.Phone, blob.[Location], SYSDATETIME())

WHEN MATCHED THEN
    UPDATE
    SET i.ID=blob.ID,
        i.[Name]=blob.[Name],
        i.[Description]=blob.[Description],
        i.JobTitle=blob.JobTitle,
        i.Email=blob.Email,
        i.Phone=blob.Phone,
        i.[Location]=blob.[Location];

GO
