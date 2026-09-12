# Importing Eventbrite attendees

This procedure combines an Eventbrite attendee CSV with the Eventbrite report CSV
and imports the resulting identities by calling `Scan.Update_Identities`.
It does not change the existing application files.

## Field mapping

| Eventbrite column | Identity field |
| --- | --- |
| `Order ID` | `id` |
| `Attendee first name` | `firstName` |
| `Attendee last name` | `lastName` |
| `Company` (from the report CSV) | `description` |
| `Position` (from the report CSV) | `jobTitle` |
| `Phone number` | `phone` |
| `Attendee email` | `email` |
| `Purchaser city` + `Purchaser state` | `location` |

## Repeatable ID rule

An order can contain multiple attendees, so the script groups rows by `Order ID`, sorts
attendees deterministically by email, first name, last name, and phone, then assigns:

```text
id = (Order ID * 100) + attendee sequence within that order
```

The sequence starts at 1. This makes the same export idempotent: importing it again
produces the same IDs and `Scan.Update_Identities` updates the existing identities.
The script refuses an order with 100 or more attendees and validates SQL `bigint` range.

## Run it

Install the repository dependencies if needed:

```powershell
npm install
```

Set the database values in the current PowerShell session. Do not commit these values:

```powershell
$env:dbserver = "your-server.database.windows.net"
$env:dbname = "your-database"
$env:dblogin = "your-sql-login"
$env:dbpassword = "your-sql-password"
$env:EVENT_SECRET = "event-secret-guid"
$env:ENCRYPTION_KEY = ""  # Optional; blank matches the normal scan behavior
```

From the repository root, generate the SQL file from both exports:

```powershell
powershell -File .\scripts\generate-eventbrite-identities.ps1 `
  -CsvPath "C:\path\to\Day_of_Data_Winnipeg_2026_Attendees.csv" `
  -ReportCsvPath "C:\path\to\report-2026-09-04T1631.csv" `
  -OutputPath ".\Eventbrite-identities.sql"
```

The report export currently contains a second, billing-related `Company` header.
The script preserves the first `Company` column, which is the attendee's company.
Rows are combined using `Order ID`/`Order #` and attendee email. The attendee CSV
remains the source of the identity list and attendee details; report values are
added when a matching row is found. Only report rows with `Ticket Type` equal to
`General Admission` are included, so `Box Lunch` orders are excluded.

The generator validates both CSVs and reports the number of identities written to
the SQL file. Review the generated file, fill in `@EventSecret`, and execute it
against the database. The SQL calls `Scan.Update_Identities` with the combined
identity payload.

For an attendee export without a separate report, omit `-ReportCsvPath`; the
`description` and `jobTitle` fields will remain empty.
