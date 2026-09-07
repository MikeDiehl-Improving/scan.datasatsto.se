CREATE OR ALTER PROCEDURE Scan.Get_Identities
    @EventSecret        uniqueidentifier,
    @EncryptionKey      nvarchar(200)=NULL,
    @IdentityIDs        nvarchar(max)=NULL
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
                CONVERT(nvarchar(50),  DECRYPTBYPASSPHRASE(@EncryptionKey, Phone)) AS phone,
                CONVERT(nvarchar(200), DECRYPTBYPASSPHRASE(@EncryptionKey, Email)) AS email,
                CONVERT(nvarchar(200), DECRYPTBYPASSPHRASE(@EncryptionKey, [Location])) AS [location]
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
    WHERE e.EventSecret=@EventSecret
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS blob;
GO
