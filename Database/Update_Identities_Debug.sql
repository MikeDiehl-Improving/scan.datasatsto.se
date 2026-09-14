-- Intermediate parser and encryption test for Scan.Update_Identities.
-- This procedure does not change Scan.Identities.

CREATE OR ALTER PROCEDURE Scan.Update_Identities_Debug
    @EventCode uniqueidentifier,
    @EncryptionKey nvarchar(200) = N'',
    @Identities_blob nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @EventID int;

    SELECT @EventID = EventID
    FROM Scan.Events
    WHERE EventCode = @EventCode;

    IF @EventID IS NULL
    BEGIN
        THROW 50001, N'Invalid or missing event code.', 1;
    END;

    DECLARE @sourceRows TABLE (
        RowNumber int NOT NULL,
        ID bigint NULL,
        [Name] nvarchar(250) NULL,
        [FirstName] nvarchar(250) NULL,
        [LastName] nvarchar(250) NULL,
        [Description] nvarchar(400) NULL,
        JobTitle nvarchar(150) NULL,
        Phone nvarchar(150) NULL,
        Email nvarchar(150) NULL,
        [Location] nvarchar(150) NULL,
        RoleName nvarchar(50) NULL
    );

    INSERT INTO @sourceRows (
        RowNumber, ID, [Name], [FirstName], [LastName], [Description],
        JobTitle, Phone, Email, [Location], RoleName
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY parsed.id),
        parsed.id,
        parsed.[name],
        parsed.[firstName],
        parsed.[lastName],
        parsed.[description],
        parsed.jobTitle,
        parsed.phone,
        parsed.email,
        parsed.[location],
        parsed.RoleName
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
    ) AS parsed;

    BEGIN TRANSACTION;

    DECLARE @UpdatedCount int = 0;
    DECLARE @InsertedCount int = 0;

    UPDATE target
    SET target.[Name] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Name], N'')),
        target.[FirstName] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[FirstName], N'')),
        target.[LastName] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[LastName], N'')),
        target.[Description] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Description], N'')),
        target.JobTitle = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.JobTitle, N'')),
        target.Phone = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.Phone, N'')),
        target.Email = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(LOWER(source.Email), N'')),
        target.[Location] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.[Location], N'')),
        target.[Role] = ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.RoleName, N''))
    FROM Scan.Identities AS target
    INNER JOIN @sourceRows AS source
        ON source.ID = target.ID
    WHERE target.EventID = @EventID;

    SET @UpdatedCount = @@ROWCOUNT;

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
        ENCRYPTBYPASSPHRASE(@EncryptionKey, NULLIF(source.RoleName, N'')),
        SYSDATETIME()
    FROM @sourceRows AS source
    WHERE source.ID IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM Scan.Identities AS existing
          WHERE existing.ID = source.ID
      );

    SET @InsertedCount = @@ROWCOUNT;

    SELECT
        @EventID AS EventID,
        COUNT(*) AS ParsedCount,
        @UpdatedCount AS UpdatedCount,
        @InsertedCount AS InsertedCount
    FROM @sourceRows;

    ROLLBACK TRANSACTION;
END;
GO

PRINT N'[debug] Scan.Update_Identities_Debug created or altered.';
GO
