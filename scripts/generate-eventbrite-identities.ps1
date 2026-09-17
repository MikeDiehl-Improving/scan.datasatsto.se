param(
    [Parameter(Mandatory = $true)]
    [Alias("CsvPath")]
    [string]$AttendeesCsvPath,

    [Alias("ReportCsvPath")]
    [string]$CustomQuestionsResponsesCsvPath,

    [Alias("OrganizersVolunteersCsvPath")]
    [string]$OrganizersAndVolunteersCsvPath,

    [string]$SpeakerListCsvPath,

    [long]$ReservedIdStart,

    [int]$ReservedIdCount = 0,

    [string]$OutputPath = ".\eventbrite-identities.sql"
)

if (($PSBoundParameters.ContainsKey("ReservedIdStart") -and $ReservedIdCount -eq 0) -or
    (-not $PSBoundParameters.ContainsKey("ReservedIdStart") -and $ReservedIdCount -ne 0)) {
    throw "ReservedIdStart and ReservedIdCount must be supplied together."
}
if ($ReservedIdCount -lt 0) {
    throw "ReservedIdCount cannot be negative."
}
if ($PSBoundParameters.ContainsKey("ReservedIdStart") -and $ReservedIdStart -lt 0) {
    throw "ReservedIdStart cannot be negative."
}
if ($ReservedIdCount -gt 0 -and
    ([bigint]$ReservedIdStart + $ReservedIdCount - 1) -gt [bigint]9223372036854775807) {
    throw "The reserved ID range does not fit SQL bigint."
}

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

function Get-NormalizedMatchValue {
    param([string]$Value)
    return (([string]$Value).Trim().ToLowerInvariant() -replace '[^\p{L}\p{Nd}]', '')
}

function Get-NameMatchKey {
    param([string]$FirstName, [string]$LastName)
    return Get-NormalizedMatchValue ((@($FirstName, $LastName) | Where-Object { $_ }) -join " ")
}

function Get-RolePriority {
    param([string]$Role)
    switch ($Role) {
        "Speaker" { return 3 }
        "Organizer" { return 2 }
        "Volunteer" { return 1 }
        default { return 0 }
    }
}

function Get-CanonicalRole {
    param([string]$Role)
    switch ((Get-NormalizedMatchValue $Role)) {
        "speaker" { return "Speaker" }
        "organizer" { return "Organizer" }
        "volunteer" { return "Volunteer" }
        "vollunteer" { return "Volunteer" }
        default { return "" }
    }
}

function Get-SupplementalPersonKey {
    param($Row)
    $email = Get-NormalizedMatchValue (Get-Field $Row "Email")
    if ($email) {
        return "email:$email"
    }
    return "name:$(Get-NameMatchKey (Get-Field $Row 'FirstName') (Get-Field $Row 'LastName'))"
}

function Get-SpeakerIdentityId {
    param([string]$SpeakerId)
    if (-not $SpeakerId) {
        return $null
    }

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($SpeakerId.Trim().ToLowerInvariant())
        $hash = $sha256.ComputeHash($bytes)
        $hashPrefix = [System.BitConverter]::ToString($hash).Replace("-", "").Substring(0, 12)
        return ([bigint]100000000000000 + [Convert]::ToInt64($hashPrefix, 16)).ToString()
    } finally {
        $sha256.Dispose()
    }
}

function Add-RoleToIdentity {
    param($Identity, [string]$Role)
    $canonicalRole = Get-CanonicalRole $Role
    if (-not $canonicalRole) {
        return
    }
    if ((Get-RolePriority $canonicalRole) -gt (Get-RolePriority $Identity.role)) {
        $Identity.role = $canonicalRole
    }
}

function Add-SupplementalPerson {
    param($People, $Person)
    $personEmail = Get-NormalizedMatchValue $Person.Email
    $personName = Get-NameMatchKey $Person.FirstName $Person.LastName
    foreach ($existing in @($People.Values)) {
        $existingEmail = Get-NormalizedMatchValue $existing.Email
        $existingName = Get-NameMatchKey $existing.FirstName $existing.LastName
        if (($personEmail -and $personEmail -eq $existingEmail) -or
            ($personName -and $personName -eq $existingName)) {
            Add-RoleToIdentity $existing $Person.Role
            if (-not $existing.Email -and $Person.Email) {
                $existing.Email = $Person.Email
            }
            if (-not $existing.Phone -and $Person.Phone) {
                $existing.Phone = $Person.Phone
            }
            if (-not $existing.SpeakerId -and $Person.SpeakerId) {
                $existing.SpeakerId = $Person.SpeakerId
            }
            if (-not $existing.Description -and $Person.Description) {
                $existing.Description = $Person.Description
            }
            return
        }
    }
    $People[(Get-SupplementalPersonKey $Person)] = $Person
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

$supplementalPeople = [ordered]@{}
if ($OrganizersAndVolunteersCsvPath) {
    $organizerVolunteerRows = @(Import-Csv -LiteralPath $OrganizersAndVolunteersCsvPath)
    if ($organizerVolunteerRows.Count -gt 0) {
        $requiredSupplementalColumns = @("Name", "Email", "Role")
        $missingSupplementalColumns = @($requiredSupplementalColumns | Where-Object {
            -not $organizerVolunteerRows[0].PSObject.Properties.Name.Contains($_)
        })
        if ($missingSupplementalColumns.Count -gt 0) {
            throw "Organizers and volunteers CSV is missing required columns: $($missingSupplementalColumns -join ', ')"
        }
        foreach ($sourceRow in $organizerVolunteerRows) {
            $nameParts = (Get-Field $sourceRow "Name") -split '\s+', 2
            $person = [pscustomobject]@{
                FirstName = if ($nameParts.Count -gt 0) { $nameParts[0] } else { "" }
                LastName = if ($nameParts.Count -gt 1) { $nameParts[1] } else { "" }
                Email = Get-Field $sourceRow "Email"
                Role = Get-CanonicalRole (Get-Field $sourceRow "Role")
                Phone = ""
                SpeakerId = ""
                Description = ""
            }
            if (-not ($person.Email -or $person.FirstName -or $person.LastName)) {
                Write-Warning "Ignoring organizer/volunteer row with no name or email."
                continue
            }
            if (-not $person.Role) {
                throw "Unsupported organizer/volunteer role '$($sourceRow.Role)' for '$($sourceRow.Name)'."
            }
            Add-SupplementalPerson $supplementalPeople $person
        }
    }
}
if ($SpeakerListCsvPath) {
    $speakerRows = @(Import-Csv -LiteralPath $SpeakerListCsvPath)
    if ($speakerRows.Count -gt 0) {
        $requiredSpeakerColumns = @("FirstName", "LastName", "Email")
        $missingSpeakerColumns = @($requiredSpeakerColumns | Where-Object {
            -not $speakerRows[0].PSObject.Properties.Name.Contains($_)
        })
        if ($missingSpeakerColumns.Count -gt 0) {
            throw "Speaker list CSV is missing required columns: $($missingSpeakerColumns -join ', ')"
        }
        foreach ($sourceRow in $speakerRows) {
            $person = [pscustomobject]@{
                FirstName = Get-Field $sourceRow "FirstName"
                LastName = Get-Field $sourceRow "LastName"
                Email = Get-Field $sourceRow "Email"
                Role = "Speaker"
                Phone = Get-Field $sourceRow "Cell Phone"
                SpeakerId = Get-Field $sourceRow "Speaker Id"
                Description = Get-Field $sourceRow "TagLine"
            }
            if (-not ($person.Email -or $person.FirstName -or $person.LastName)) {
                Write-Warning "Ignoring speaker row with no name or email."
                continue
            }
            Add-SupplementalPerson $supplementalPeople $person
        }
    }
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
            role = $null
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
            role = $null
        })
        Write-Warning "No row found in the Attendees report for Custom Questions Responses Row (line $($reportRow.SourceLine)): Order=$orderId, Name='$($name -join " ")', Email='$(Get-Field $reportRow "Email")'. Identity data was populated from the Custom Questions Responses row"
    }
    $nextSequenceByOrder[$orderId] = $sequence
}

$identityByEmail = @{}
$identityByName = @{}
foreach ($identity in $identities) {
    $emailKey = Get-NormalizedMatchValue $identity.email
    $nameKey = Get-NameMatchKey $identity.firstName $identity.lastName
    if ($emailKey) {
        if (-not $identityByEmail.ContainsKey($emailKey)) {
            $identityByEmail[$emailKey] = [System.Collections.Generic.List[object]]::new()
        }
        $identityByEmail[$emailKey].Add($identity)
    }
    if ($nameKey) {
        if (-not $identityByName.ContainsKey($nameKey)) {
            $identityByName[$nameKey] = [System.Collections.Generic.List[object]]::new()
        }
        $identityByName[$nameKey].Add($identity)
    }
}

$supplementalSequence = 0
$usedIdentityIds = @{}
foreach ($identity in $identities) {
    $usedIdentityIds[$identity.id] = $true
}
foreach ($person in @($supplementalPeople.Values | Sort-Object { Get-SupplementalPersonKey $_ })) {
    $emailKey = Get-NormalizedMatchValue $person.Email
    $nameKey = Get-NameMatchKey $person.FirstName $person.LastName
    $match = $null
    if ($emailKey -and $identityByEmail.ContainsKey($emailKey) -and $identityByEmail[$emailKey].Count -eq 1) {
        $match = $identityByEmail[$emailKey][0]
    } elseif ($nameKey -and $identityByName.ContainsKey($nameKey) -and $identityByName[$nameKey].Count -eq 1) {
        $match = $identityByName[$nameKey][0]
    }
    if ($match) {
        Add-RoleToIdentity $match $person.Role
        continue
    }
    if ($person.Role -eq "Organizer" -or $person.Role -eq "Volunteer") {
        Write-Warning "Organizer/volunteer '$($person.FirstName) $($person.LastName)' <$($person.Email)> was not matched with an Eventbrite registration; a supplemental identity will be created."
    }

    $supplementalSequence++
    $supplementalId = Get-SpeakerIdentityId $person.SpeakerId
    if (-not $supplementalId) {
        $supplementalId = ([bigint]900000000000000 + $supplementalSequence).ToString()
    }
    while ($usedIdentityIds.ContainsKey($supplementalId)) {
        $supplementalId = ([bigint]$supplementalId + 1).ToString()
    }
    $usedIdentityIds[$supplementalId] = $true
    $name = @($person.FirstName, $person.LastName) | Where-Object { $_ }
    $identity = [ordered]@{
        id = $supplementalId.ToString()
        firstName = $person.FirstName
        lastName = $person.LastName
        name = $name -join " "
        description = $person.Description
        jobTitle = ""
        phone = $person.Phone
        email = $person.Email
        location = ""
        role = $person.Role
    }
    $identities.Add($identity)
}

if ($ReservedIdCount -gt 0) {
    $reservedIds = @{}
    foreach ($identity in $identities) {
        $reservedIds[$identity.id] = $true
    }

    for ($offset = 0; $offset -lt $ReservedIdCount; $offset++) {
        $reservedId = ([bigint]$ReservedIdStart + $offset).ToString()
        if ($reservedIds.ContainsKey($reservedId)) {
            throw "Reserved identity ID $reservedId conflicts with an imported identity."
        }
        $reservedIds[$reservedId] = $true
        $identities.Add([ordered]@{
            id = $reservedId
            firstName = ""
            lastName = ""
            name = ""
            description = ""
            jobTitle = ""
            phone = ""
            email = "blank-$reservedId@invalid.example"
            location = ""
            role = $null
        })
    }
}

$json = $identities | ConvertTo-Json -Depth 3
$sqlJson = $json.Replace("'", "''")
$sourceFiles = [System.IO.Path]::GetFileName($AttendeesCsvPath)
if ($CustomQuestionsResponsesCsvPath) {
    $sourceFiles += ", " + [System.IO.Path]::GetFileName($CustomQuestionsResponsesCsvPath)
}
if ($OrganizersAndVolunteersCsvPath) {
    $sourceFiles += ", " + [System.IO.Path]::GetFileName($OrganizersAndVolunteersCsvPath)
}
if ($SpeakerListCsvPath) {
    $sourceFiles += ", " + [System.IO.Path]::GetFileName($SpeakerListCsvPath)
}
$reservedSummary = if ($ReservedIdCount -gt 0) {
    "Reserved blank IDs: $ReservedIdStart through $(([bigint]$ReservedIdStart + $ReservedIdCount - 1).ToString()) ($ReservedIdCount identities)."
} else {
    "Reserved blank IDs: none."
}
$sql = @"
-- Generated from: $sourceFiles
-- Idempotent ID rule: (Order ID * 100) + attendee sequence within that order.
-- $reservedSummary
-- Fill in @EventCode before executing this script.

DECLARE @EventCode uniqueidentifier = N'00000000-0000-0000-0000-000000000000';
DECLARE @EncryptionKey nvarchar(200) = N'';
DECLARE @Identities_blob nvarchar(max) = N'$sqlJson';

EXECUTE Scan.Update_Identities
    @EventCode = @EventCode,
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
Write-Host "Generated $ReservedIdCount reserved blank identities"
$speakerCount = @($identities | Where-Object { $_.role -eq "Speaker" }).Count
$organizerCount = @($identities | Where-Object { $_.role -eq "Organizer" }).Count
$volunteerCount = @($identities | Where-Object { $_.role -eq "Volunteer" }).Count
Write-Host "Found $speakerCount speakers, $organizerCount organizers, $volunteerCount volunteers, and $boxLunchOrderCount distinct Box Lunch orders"
