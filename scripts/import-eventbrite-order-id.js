#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse');
const Connection = require('tedious').Connection;
const Request = require('tedious').Request;
const Types = require('tedious').TYPES;

const csvPath = process.argv[2];
if (!csvPath) {
    console.error('Usage: node scripts/import-eventbrite-order-id.js <eventbrite.csv>');
    process.exit(1);
}

const requiredEnvironment = ['dbserver', 'dbname', 'dblogin', 'dbpassword', 'EVENT_SECRET'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
if (missingEnvironment.length > 0) {
    console.error(`Missing environment variables: ${missingEnvironment.join(', ')}`);
    process.exit(1);
}

const sequenceMultiplier = 1000n;
const sqlBigintMaximum = 9223372036854775807n;
const requiredColumns = [
    'Order ID',
    'Attendee first name',
    'Attendee last name',
    'Attendee email',
    'Phone number',
    'Purchaser city',
    'Purchaser state'
];

function field(record, name) {
    return (record[name] || '').trim();
}

function parseCsv(file) {
    return new Promise((resolve, reject) => {
        csv.parse(fs.readFileSync(file, 'utf8'), {
            columns: true,
            skip_empty_lines: true,
            trim: true
        }, (error, records) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(records.filter((record) =>
                Object.values(record).some((value) => value.trim() !== '')
            ));
        });
    });
}

function attendeeSortKey(record) {
    return [
        field(record, 'Attendee email').toLowerCase(),
        field(record, 'Attendee first name').toLowerCase(),
        field(record, 'Attendee last name').toLowerCase(),
        field(record, 'Phone number')
    ].join('\u001f');
}

function makeIdentities(records) {
    if (records.length === 0) {
        throw new Error('The CSV contains no attendee rows.');
    }

    const missingColumns = requiredColumns.filter((column) =>
        !Object.prototype.hasOwnProperty.call(records[0], column)
    );
    if (missingColumns.length > 0) {
        throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
    }

    const orders = new Map();
    records.forEach((record, index) => {
        const orderId = field(record, 'Order ID');
        if (!/^\d+$/.test(orderId)) {
            throw new Error(`CSV row ${index + 2} has no valid Order ID.`);
        }
        if (!orders.has(orderId)) orders.set(orderId, []);
        orders.get(orderId).push(record);
    });

    const identities = [];
    for (const [orderIdText, attendees] of orders) {
        const orderId = BigInt(orderIdText);
        attendees.sort((left, right) => attendeeSortKey(left).localeCompare(attendeeSortKey(right)));
        if (attendees.length >= Number(sequenceMultiplier)) {
            throw new Error(`Order ${orderIdText} has too many attendees for the ID scheme.`);
        }

        attendees.forEach((record, offset) => {
            const id = orderId * sequenceMultiplier + BigInt(offset + 1);
            if (id > sqlBigintMaximum) {
                throw new Error(`Generated ID ${id} does not fit SQL bigint.`);
            }
            identities.push({
                id: id.toString(),
                firstName: field(record, 'Attendee first name'),
                lastName: field(record, 'Attendee last name'),
                name: [field(record, 'Attendee first name'), field(record, 'Attendee last name')]
                    .filter(Boolean).join(' '),
                description: '',
                jobTitle: '',
                phone: field(record, 'Phone number'),
                email: field(record, 'Attendee email'),
                location: [field(record, 'Purchaser city'), field(record, 'Purchaser state')]
                    .filter(Boolean).join(', ')
            });
        });
    }
    return identities;
}

function updateIdentities(identities) {
    const connection = new Connection({
        server: process.env.dbserver,
        authentication: {
            type: 'default',
            options: { userName: process.env.dblogin, password: process.env.dbpassword }
        },
        options: {
            encrypt: true,
            database: process.env.dbname,
            connectTimeout: 20000,
            requestTimeout: 30000,
            appName: 'eventbrite-order-id-import'
        }
    });

    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error) => {
            if (settled) return;
            settled = true;
            connection.close();
            error ? reject(error) : resolve();
        };
        connection.on('error', finish);
        connection.connect((error) => {
            if (error) return finish(error);
            const request = new Request(
                'EXECUTE Scan.Update_Identities ' +
                '@EventSecret=@EventSecret, @EncryptionKey=@EncryptionKey, ' +
                '@Identities_blob=@Identities_blob;',
                finish
            );
            request.addParameter('EventSecret', Types.UniqueIdentifier, process.env.EVENT_SECRET);
            request.addParameter('EncryptionKey', Types.NVarChar, process.env.ENCRYPTION_KEY || '');
            request.addParameter('Identities_blob', Types.NVarChar, JSON.stringify(identities));
            connection.execSql(request);
        });
    });
}

(async () => {
    try {
        const identities = makeIdentities(await parseCsv(path.resolve(csvPath)));
        await updateIdentities(identities);
        console.log(`Imported ${identities.length} identities.`);
    } catch (error) {
        console.error(`Import failed: ${error.message}`);
        process.exitCode = 1;
    }
})();
