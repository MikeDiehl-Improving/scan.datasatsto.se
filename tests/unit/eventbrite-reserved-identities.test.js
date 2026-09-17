import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';

const scriptPath = path.resolve('scripts', 'generate-eventbrite-identities.ps1');
const powershellCommand = process.platform === 'win32' ? 'powershell' : 'pwsh';
const hasPowerShell = spawnSync(
    powershellCommand,
    ['-NoProfile', '-Command', 'exit 0'],
    { stdio: 'ignore' }
).status === 0;
const temporaryPaths = [];

afterEach(() => {
    for (const temporaryPath of temporaryPaths.splice(0)) {
        fs.rmSync(temporaryPath, { recursive: true, force: true });
    }
});

function runGenerator(argumentsList) {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-datasatsto-'));
    temporaryPaths.push(temporaryDirectory);
    const csvPath = path.join(temporaryDirectory, 'attendees.csv');
    const outputPath = path.join(temporaryDirectory, 'identities.sql');
    fs.writeFileSync(csvPath, [
        'Order ID,Attendee first name,Attendee last name,Attendee email,Phone number,Purchaser city,Purchaser state',
        '123,Test,Attendee,test@example.com,555,City,ST',
    ].join('\n'));

    execFileSync(powershellCommand, [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        '-AttendeesCsvPath', csvPath,
        '-OutputPath', outputPath,
        ...argumentsList,
    ], { encoding: 'utf8' });

    return fs.readFileSync(outputPath, 'utf8');
}

describe.skipIf(!hasPowerShell)('reserved blank badge identity generation', () => {
    it('adds deterministic blank identities for the requested range', () => {
        const sql = runGenerator([
            '-ReservedIdStart', '8000000000',
            '-ReservedIdCount', '2',
        ]);

        expect(sql).toMatch(/"id"\s*:\s*"8000000000"/);
        expect(sql).toMatch(/"email"\s*:\s*"blank-8000000000@invalid\.example"/);
        expect(sql).toMatch(/"id"\s*:\s*"8000000001"/);
        expect(sql).toMatch(/"email"\s*:\s*"blank-8000000001@invalid\.example"/);
    });

    it('rejects a reserved range that collides with an imported identity', () => {
        expect(() => runGenerator([
            '-ReservedIdStart', '12301',
            '-ReservedIdCount', '1',
        ])).toThrow();
    });
});
