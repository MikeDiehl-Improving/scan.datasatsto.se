param(
    [Parameter(Mandatory = $true)]
    [Alias("CsvPath")]
    [string]$AttendeesCsvPath,

    [Alias("ReportCsvPath")]
    [string]$CustomQuestionsResponsesCsvPath,

    [string]$OutputPath = ".\eventbrite-identities.sql"
)

$requiredColumns = @(
    "Order ID",
    "Attendee first name",
    "Attendee last name",
    "Attendee email",
    "Phone number",
    "Purchaser city",
    "Purchaser state"
)

function Import-ReportCsv {
    param([string]$Path)

    # Eventbrite's report export contains two Company headers. Rename the trailing
    # billing Company header before parsing so the attendee Company is preserved.
    $text = [System.IO.File]::ReadAllText($Path)
    $text = [regex]::Replace($text, '^([^\r\n]*),Company(\r?\n)', '$1,Billing Company$2')
    return @(ConvertFrom-Csv -InputObject $text)
}

function Get-Field {
    param($Row, [string]$Name)
    return ([string]$Row.$Name).Trim()
}

function Get-ReportMatchKey {
    param($Row)
    return @(
        (Get-Field $Row "Order #").ToLowerInvariant()
        (Get-Field $Row "Email").ToLowerInvariant()
        (Get-Field $Row "First Name").ToLowerInvariant()
        (Get-Field $Row "Last Name").ToLowerInvariant()
    ) -join "|"
}

function Get-AttendeeMatchKey {
    param($Row)
    return @(
        (Get-Field $Row "Order ID").ToLowerInvariant()
        (Get-Field $Row "Attendee email").ToLowerInvariant()
        (Get-Field $Row "Attendee first name").ToLowerInvariant()
        (Get-Field $Row "Attendee last name").ToLowerInvariant()
    ) -join "|"
}

function Get-LimitedJobTitle {
    param(
        [string]$Value,
        [string]$Context
    )

    $maxJobTitleCharacters = 80
    if ($Value.Length -gt $maxJobTitleCharacters) {
        Write-Warning "Truncated jobTitle to $maxJobTitleCharacters characters for $Context."
        return $Value.Substring(0, $maxJobTitleCharacters)
    }
    return $Value
}

function Warn-DetailOverflow {
    param(
        [string]$Company,
        [string]$JobTitle,
        [string]$Context
    )

    $totalLength = $Company.Length + $JobTitle.Length
    if ($totalLength -gt 150) {
        Write-Warning "Company and jobTitle total $totalLength characters for $Context; this may overflow the Avery badge details area."
    }
}

function Get-SortKey {
    param($Row)
    return @(
        (Get-Field $Row "Attendee email").ToLowerInvariant(),
        (Get-Field $Row "Attendee first name").ToLowerInvariant(),
        (Get-Field $Row "Attendee last name").ToLowerInvariant(),
        (Get-Field $Row "Phone number")
    ) -join [char]31
}

$attendeeSourceRows = @(Import-Csv -LiteralPath $AttendeesCsvPath)
$attendeeSourceRowCount = $attendeeSourceRows.Count
$unusableAttendeeRows = @(
    for ($index = 0; $index -lt $attendeeSourceRows.Count; $index++) {
        $sourceRow = $attendeeSourceRows[$index]
        if (-not ((Get-Field $sourceRow "Attendee email") -or
            (Get-Field $sourceRow "Attendee first name") -or
            (Get-Field $sourceRow "Attendee last name"))) {
            [ordered]@{
                row = $index + 2
                order = Get-Field $sourceRow "Order ID"
                name = @(
                    (Get-Field $sourceRow "Attendee first name")
                    (Get-Field $sourceRow "Attendee last name")
                ) -join " "
                email = Get-Field $sourceRow "Attendee email"
            }
        }
    }
)
$rows = @($attendeeSourceRows | Where-Object {
    (Get-Field $_ "Attendee email") -or
    (Get-Field $_ "Attendee first name") -or
    (Get-Field $_ "Attendee last name")
})
$attendeeRowsWithIdentityDataCount = $rows.Count
$attendeeRowsWithoutIdentityDataCount = $attendeeSourceRowCount - $attendeeRowsWithIdentityDataCount
if ($rows.Count -eq 0) {
    throw "The CSV contains no attendee rows."
}

$reportByKey = @{}
$boxLunchOrderCount = 0
$reportSourceRowCount = 0
$customQuestionsRowsWithIdentityDataCount = 0
$generalAdmissionReportRowCount = 0
$generalAdmissionOrderEmailKeyCount = 0
$generalAdmissionAttendeeKeyCount = 0
$generalAdmissionKeysWithoutAttendeeCount = 0
$fallbackReportRows = @()
$unusableCustomQuestionsRows = @()
if ($CustomQuestionsResponsesCsvPath) {
    $reportSourceRows = @(Import-ReportCsv $CustomQuestionsResponsesCsvPath)
    $reportSourceRowCount = $reportSourceRows.Count
    for ($index = 0; $index -lt $reportSourceRows.Count; $index++) {
        $reportSourceRows[$index] | Add-Member -NotePropertyName SourceLine -NotePropertyValue ($index + 2)
    }
    $unusableCustomQuestionsRows = @(
        for ($index = 0; $index -lt $reportSourceRows.Count; $index++) {
            $sourceRow = $reportSourceRows[$index]
            if (-not ((Get-Field $sourceRow "Order #") -and
                (Get-Field $sourceRow "Email") -and
                (Get-Field $sourceRow "First Name") -and
                (Get-Field $sourceRow "Last Name"))) {
                [ordered]@{
                    row = $index + 2
                    order = Get-Field $sourceRow "Order #"
                    name = @(
                        (Get-Field $sourceRow "First Name")
                        (Get-Field $sourceRow "Last Name")
                    ) -join " "
                    email = Get-Field $sourceRow "Email"
                    ticketType = Get-Field $sourceRow "Ticket Type"
                }
            }
        }
    )
    $reportRows = @($reportSourceRows | Where-Object {
        (Get-Field $_ "Email") -or
        (Get-Field $_ "First Name") -or
        (Get-Field $_ "Last Name")
    })
    $customQuestionsRowsWithIdentityDataCount = $reportRows.Count
    $generalAdmissionReportRowCount = @(
        $reportRows | Where-Object {
            (Get-Field $_ "Ticket Type") -eq "General Admission"
        }
    ).Count
    $generalAdmissionOrderEmailKeyCount = @(
        $reportRows |
            Where-Object {
                (Get-Field $_ "Ticket Type") -eq "General Admission"
            } |
            ForEach-Object {
                @(
                    (Get-Field $_ "Order #").ToLowerInvariant()
                    (Get-Field $_ "Email").ToLowerInvariant()
                ) -join "|"
            } |
            Sort-Object -Unique
    ).Count
    $generalAdmissionAttendeeKeyCount = @(
        $reportRows |
            Where-Object {
                (Get-Field $_ "Ticket Type") -eq "General Admission"
            } |
            ForEach-Object { Get-ReportMatchKey $_ } |
            Sort-Object -Unique
    ).Count
    $boxLunchOrderCount = @(
        $reportRows |
            Where-Object {
                (Get-Field $_ "Ticket Type") -eq "Box Lunch" -and
                (Get-Field $_ "Order #")
            } |
            ForEach-Object { Get-Field $_ "Order #" } |
            Sort-Object -Unique
    ).Count
    $reportColumns = @("Order #", "First Name", "Last Name", "Email", "Ticket Type", "Company", "Position")
    $missingReportColumns = @($reportColumns | Where-Object {
        -not $reportRows[0].PSObject.Properties.Name.Contains($_)
    })
    if ($missingReportColumns.Count -gt 0) {
        throw "Report CSV is missing required columns: $($missingReportColumns -join ', ')"
    }

    foreach ($reportRow in $reportRows) {
        $key = Get-ReportMatchKey $reportRow
        if ($reportByKey.ContainsKey($key)) {
            $existing = $reportByKey[$key]
            $existingIsGeneralAdmission = (Get-Field $existing "Ticket Type") -eq "General Admission"
            $reportIsGeneralAdmission = (Get-Field $reportRow "Ticket Type") -eq "General Admission"
            $selected = $existing
            $other = $reportRow
            if ($reportIsGeneralAdmission -and -not $existingIsGeneralAdmission) {
                $selected = $reportRow
                $other = $existing
            }

            $selectedCompany = Get-Field $selected "Company"
            $otherCompany = Get-Field $other "Company"
            $selectedPosition = Get-Field $selected "Position"
            $otherPosition = Get-Field $other "Position"
            if (-not $selectedCompany -and $otherCompany) {
                $selected.Company = $otherCompany
            }
            if (-not $selectedPosition -and $otherPosition) {
                $selected.Position = $otherPosition
            }
            $reportByKey[$key] = $selected
        } else {
            $reportByKey[$key] = $reportRow
        }
    }

    $attendeeIdentityRows = $rows
    $rows = @($rows | Where-Object {
        $attendeeKey = Get-AttendeeMatchKey $_
        $reportByKey.ContainsKey($attendeeKey) -and
        (Get-Field $reportByKey[$attendeeKey] "Ticket Type") -eq "General Admission"
    })
    $attendeeKeys = @{}
    foreach ($attendeeRow in $attendeeIdentityRows) {
        $attendeeKey = Get-AttendeeMatchKey $attendeeRow
        $attendeeKeys[$attendeeKey] = $true
    }
    $fallbackReportRows = @(
        $reportByKey.GetEnumerator() | Where-Object {
            (Get-Field $_.Value "Ticket Type") -eq "General Admission" -and
            -not $attendeeKeys.ContainsKey($_.Key) -and
            (Get-Field $_.Value "Order #") -match "^\d+$"
        } | ForEach-Object { $_.Value }
    )
    $generalAdmissionKeysWithoutAttendeeCount = $fallbackReportRows.Count
}

$missingColumns = @($requiredColumns | Where-Object {
    -not $attendeeSourceRows[0].PSObject.Properties.Name.Contains($_)
})
if ($missingColumns.Count -gt 0) {
    throw "CSV is missing required columns: $($missingColumns -join ', ')"
}
if ($rows.Count -eq 0 -and $fallbackReportRows.Count -eq 0) {
    throw "The CSV contains no General Admission attendees matching the report and no usable fallback rows."
}

$identities = [System.Collections.Generic.List[object]]::new()
$nextSequenceByOrder = @{}
$groups = $rows | Group-Object { Get-Field $_ "Order ID" }
foreach ($group in $groups) {
    if ($group.Name -notmatch "^\d+$") {
        throw "Order ID '$($group.Name)' is missing or invalid."
    }

    $attendees = @($group.Group | Sort-Object { Get-SortKey $_ })
    if ($attendees.Count -ge 100) {
        throw "Order $($group.Name) has too many attendees for the ID scheme."
    }

    $sequence = 0
    foreach ($row in $attendees) {
        $sequence++
        $id = ([bigint]$group.Name * 100) + $sequence
        if ($id -gt [bigint]9223372036854775807) {
            throw "Generated ID $id does not fit SQL bigint."
        }

        $location = @(
            (Get-Field $row "Purchaser city"),
            (Get-Field $row "Purchaser state")
        ) | Where-Object { $_ } 
        $location = $location -join ", "

        $name = @(
            (Get-Field $row "Attendee first name"),
            (Get-Field $row "Attendee last name")
        ) | Where-Object { $_ }
        $description = ""
        $jobTitle = ""
        if ($CustomQuestionsResponsesCsvPath) {
            $reportKey = Get-AttendeeMatchKey $row
            if ($reportByKey.ContainsKey($reportKey)) {
                $reportRow = $reportByKey[$reportKey]
                $description = Get-Field $reportRow "Company"
                $jobTitle = Get-LimitedJobTitle `
                    (Get-Field $reportRow "Position") `
                    "Custom Questions Responses row line $($reportRow.SourceLine), Order $(Get-Field $row 'Order ID'), email $(Get-Field $row 'Attendee email')"
                Warn-DetailOverflow `
                    $description `
                    $jobTitle `
                    "Custom Questions Responses row line $($reportRow.SourceLine), Order $(Get-Field $row 'Order ID'), email $(Get-Field $row 'Attendee email')"
            }
        }
        $identities.Add([ordered]@{
            id = $id.ToString()
            firstName = Get-Field $row "Attendee first name"
            lastName = Get-Field $row "Attendee last name"
            name = $name -join " "
            description = $description
            jobTitle = $jobTitle
            phone = Get-Field $row "Phone number"
            email = Get-Field $row "Attendee email"
            location = $location
        })
        $nextSequenceByOrder[$group.Name] = $sequence
    }
}

foreach ($fallbackGroup in @($fallbackReportRows | Group-Object { Get-Field $_ "Order #" })) {
    $orderId = $fallbackGroup.Name
    $sequence = if ($nextSequenceByOrder.ContainsKey($orderId)) {
        $nextSequenceByOrder[$orderId]
    } else {
        0
    }
    $fallbackAttendees = @($fallbackGroup.Group | Sort-Object { Get-ReportMatchKey $_ })
    if ($sequence + $fallbackAttendees.Count -ge 100) {
        throw "Order $orderId has too many attendees for the ID scheme including fallback identities."
    }
    foreach ($reportRow in $fallbackAttendees) {
        $sequence++
        $id = ([bigint]$orderId * 100) + $sequence
        $name = @(
            (Get-Field $reportRow "First Name")
            (Get-Field $reportRow "Last Name")
        ) | Where-Object { $_ }
        $fallbackJobTitle = Get-LimitedJobTitle `
            (Get-Field $reportRow "Position") `
            "fallback Custom Questions Responses row line $($reportRow.SourceLine), Order $orderId, email $(Get-Field $reportRow 'Email')"
        Warn-DetailOverflow `
            (Get-Field $reportRow "Company") `
            $fallbackJobTitle `
            "fallback Custom Questions Responses row line $($reportRow.SourceLine), Order $orderId, email $(Get-Field $reportRow 'Email')"
        $identities.Add([ordered]@{
            id = $id.ToString()
            firstName = Get-Field $reportRow "First Name"
            lastName = Get-Field $reportRow "Last Name"
            name = $name -join " "
            description = Get-Field $reportRow "Company"
            jobTitle = $fallbackJobTitle
            phone = ""
            email = Get-Field $reportRow "Email"
            location = ""
        })
        Write-Warning "No row found in the Attendees report for Custom Questions Responses Row (line $($reportRow.SourceLine)): Order=$orderId, Name='$($name -join " ")', Email='$(Get-Field $reportRow "Email")'. Identity data was populated from the Custom Questions Responses row"
    }
    $nextSequenceByOrder[$orderId] = $sequence
}

$json = $identities | ConvertTo-Json -Depth 3
$sqlJson = $json.Replace("'", "''")
$sourceFiles = [System.IO.Path]::GetFileName($AttendeesCsvPath)
if ($CustomQuestionsResponsesCsvPath) {
    $sourceFiles += ", " + [System.IO.Path]::GetFileName($CustomQuestionsResponsesCsvPath)
}
$sql = @"
-- Generated from: $sourceFiles
-- Idempotent ID rule: (Order ID * 100) + attendee sequence within that order.
-- Fill in @EventSecret before executing this script.

DECLARE @EventSecret uniqueidentifier = N'00000000-0000-0000-0000-000000000000';
DECLARE @EncryptionKey nvarchar(200) = N'';
DECLARE @Identities_blob nvarchar(max) = N'$sqlJson';

EXECUTE Scan.Update_Identities
    @EventSecret = @EventSecret,
    @EncryptionKey = @EncryptionKey,
    @Identities_blob = @Identities_blob;
GO
"@

$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
[System.IO.File]::WriteAllText($resolvedOutputPath, $sql)
$matchedAttendeeRowCount = $rows.Count
$unmatchedAttendeeRowCount = $attendeeRowsWithIdentityDataCount - $matchedAttendeeRowCount
Write-Host "Eventbrite source rows: Attendees report=$attendeeSourceRowCount; Custom Questions Responses=$reportSourceRowCount"
Write-Host "Attendees report rows with identity data: $attendeeRowsWithIdentityDataCount; rows without identity data: $attendeeRowsWithoutIdentityDataCount"
Write-Host "Custom Questions Responses rows with identity data: $customQuestionsRowsWithIdentityDataCount"
if ($CustomQuestionsResponsesCsvPath) {
    Write-Host "Custom Questions Responses General Admission rows: $generalAdmissionReportRowCount ($generalAdmissionOrderEmailKeyCount distinct order/email keys; $generalAdmissionAttendeeKeyCount distinct attendees); fallback candidates without an Attendees report row: $generalAdmissionKeysWithoutAttendeeCount"
    Write-Host "Matched Attendees report rows used for identities: $matchedAttendeeRowCount; eligible Attendees report rows without a General Admission match: $unmatchedAttendeeRowCount"
}
foreach ($unusableRow in $unusableAttendeeRows) {
    Write-Warning "Unusable Attendees report row $($unusableRow.row): Order='$($unusableRow.order)', Name='$($unusableRow.name)', Email='$($unusableRow.email)'; no attendee email or name was provided."
}
foreach ($unusableRow in $unusableCustomQuestionsRows) {
    Write-Warning "Unusable Custom Questions Responses row $($unusableRow.row): Order='$($unusableRow.order)', Name='$($unusableRow.name)', Email='$($unusableRow.email)', Ticket Type='$($unusableRow.ticketType)'; order, email, first name, and last name are all required."
}
Write-Host "Generated $($identities.Count) identities, including $($fallbackReportRows.Count) fallback identities in $OutputPath"
Write-Host "Found $boxLunchOrderCount distinct Box Lunch orders"
