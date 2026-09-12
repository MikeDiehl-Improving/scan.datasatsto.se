-- Run this migration against an existing database before deploying the updated
-- Scan.Update_Identities procedure.
IF COL_LENGTH(N'Scan.Identities', N'FirstName') IS NULL
BEGIN
    ALTER TABLE Scan.Identities ADD [FirstName] varbinary(250) NULL;
END;
GO

IF COL_LENGTH(N'Scan.Identities', N'LastName') IS NULL
BEGIN
    ALTER TABLE Scan.Identities ADD [LastName] varbinary(250) NULL;
END;
GO

-- Existing combined names remain in [Name]. They cannot be split reliably
-- without knowing the original name boundaries; new imports populate both
-- columns while retaining [Name] for backwards compatibility.
