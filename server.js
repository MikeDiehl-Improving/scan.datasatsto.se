#!/usr/bin/env node



// Core modules:
const fs = require('fs');
const path = require('path');

// Other modules:
const express = require('express');
const cookieSession = require('cookie-session');

// HTTP port that the server will run on:
var serverPort=process.argv[2] || process.env.PORT || 3000;

// QR Code module:
const qr = require('qrcode'); // https://www.npmjs.com/package/qrcode

// PDF generator module:
const PDFGenerator = require('pdfkit');

// CSV parser
const csv = require('csv-parse');

// The web server itself:
const app = express();
app.disable('etag');
app.disable('x-powered-by');
app.enable('trust proxy');

app.use(express.json( { limit: '10mb' }));
app.use(express.urlencoded( { limit: '10mb', extended: true }));

app.use(cookieSession({
    name: 'session',
    secret: (process.env.cookieSecret || 'dev'),
    rolling: true,
    secure: !(serverPort==3000),        // on dev environment only, allow cookies even without HTTPS.
    sameSite: 'lax',
    resave: true,
    maxAge: 24 * 60 * 60 * 1000         // 24 little hours
}));

// Tedious: used to connect to SQL Server:
const Connection = require('tedious').Connection;
const Request = require('tedious').Request;
const Types = require('tedious').TYPES;
const IsolationLevels = require('tedious').ISOLATION_LEVEL;

// Connection string to the SQL Database:
var connectionString = {
    server: process.env.dbserver,
    authentication: {
        type      : 'default',
        options   : {
            userName  : process.env.dblogin,
            password  : process.env.dbpassword
        }
    },
    options: { encrypt       : true,
               database      : process.env.dbname,
               connectTimeout : 20000,   // 20 seconds before connection attempt times out.
               requestTimeout : 30000,   // 20 seconds before request times out.
               rowCollectionOnRequestCompletion : true,
               dateFormat    : 'ymd',
               isolationLevel: IsolationLevels.SERIALIZABLE,
               connectionIsolationLevel : IsolationLevels.SERIALIZABLE,
               appName       : 'scan.datasatsto.se' // host name of the web server
        }
    };




/*-----------------------------------------------------------------------------
  Start the web server
-----------------------------------------------------------------------------*/

console.log('HTTP port:       '+serverPort);
console.log('Database server: '+process.env.dbserver);
console.log('Express env:     '+app.settings.env);
console.log('');

if (require.main === module) {
    app.listen(serverPort, () => console.log('READY.'));
}

module.exports = app;




/*-----------------------------------------------------------------------------
  Default URL: returns an API landing page
  ---------------------------------------------------------------------------*/

app.get('/', function (req, res, next) {

    httpHeaders(res);

    if (!requireScannerAuthorization(req, res)) {
        return;
    }

    res.status(200).send(createHTML('assets/index.html', {}));
    return;

});

/*-----------------------------------------------------------------------------
  Stored procedure reference:
  ---------------------------------------------------------------------------*/

app.get('/stored-procedures', function (req, res, next) {

    httpHeaders(res);

    const databaseServer = process.env.dbserver || '';
    const databaseName = process.env.dbname || '';
    const hasDatabaseDetails = databaseServer && databaseName;

    res.status(200).send(createHTML('assets/stored-procedures.html', {
        "DatabaseDetails": hasDatabaseDetails
            ? '<p><strong>Database server:</strong> <code>' + simpleHtmlEncode(databaseServer) + '</code><br><strong>Database name:</strong> <code>' + simpleHtmlEncode(databaseName) + '</code></p>'
            : '<p class="notice">Database connection details are unavailable.</p>'
    }));
    return;

});





/*-----------------------------------------------------------------------------
  Azure Linux App Service Plan health check request:
  ---------------------------------------------------------------------------*/

app.get('/robots933456.txt', function (req, res, next) {
    console.log("Azure health check: OK.");
    res.status(200).send("OK");
});

/*-----------------------------------------------------------------------------
  Authorize a scanner phone for an event:
  ---------------------------------------------------------------------------*/

app.get('/authorize/:scannerSecret', function (req, res, next) {
    httpHeaders(res);

    sqlQuery(connectionString, 'EXECUTE Scan.Authorize_Scanner @ScannerSecret=@ScannerSecret;',
        [{ "name": 'ScannerSecret', "type": Types.UniqueIdentifier, "value": req.params.scannerSecret }],
        function(recordset) {
            if (!recordset || recordset.length !== 1) {
                res.status(403).send(createHTML('assets/error.html', {
                    "Msg": "That scanner authorization is invalid or expired."
                }));
                return;
            }

            const event = recordset[0];
            req.session.scannerEventId = Number(event.EventID);
            req.session.scannerExpires = new Date(event.Expires).getTime();
            delete req.session.vendorCode;
            res.status(200).send(createHTML('assets/authorized.html', {
                "Event": simpleHtmlEncode(String(event.Event || 'this event'))
            }));
        });
});




/*-----------------------------------------------------------------------------
  Get QR code PNG file
  ---------------------------------------------------------------------------*/

app.get(/^\/([^\/]+)\/([0-9]*)\.png$/, function (req, res, next) {

    httpHeaders(res);

    var options = {
        maxAge: 24 * 60 * 60 * 1000,      // Cache the PNG for 24 hours.
        root: __dirname+'/qr/'+decodeURI(req.params[0]).toLowerCase()+'/',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    res.sendFile(decodeURI(req.params[1])+'.png', options, function(err) {
        if (err) {
            res.sendStatus(404);
            return;
        }
    });

});





/*-----------------------------------------------------------------------------
  Generate a new QR code:
  ---------------------------------------------------------------------------*/

app.get(/^\/new\/([^\/]+)$/, newRegistration);     // Generate an ID (default)
app.get(/^\/new\/([^\/]+)\/([0-9]*)$/, newRegistration);  // Use an existing ID (suitable for simplifying integrations)

function newRegistration (req, res, next) {
    httpHeaders(res);

    // Name the connection after the host:
    connectionString.options.appName=req.headers.host;

    const event = req.params[0];
    const id = req.params[1] || null;  

    // Check if caller provided a specific ID to be used.
    var manualRegistrationId=null;
    if (id!='' &!isNaN(id)) {
        manualRegistrationId = id;
    }

    try {
        sqlQuery(connectionString, 'EXECUTE Scan.New_Identity @Event=@Event, @ID=@ID;',
        [{ "name": 'Event', "type": Types.VarChar, "value": decodeURI(event) },
         { "name": 'ID',    "type": Types.BigInt,  "value": manualRegistrationId        }],

            async function(recordset) {
                if (recordset) {
                    // Fetch the new output ID from the stored procedure:
                    var id=recordset[0].ID;

                    // Create the /qr directory if it doesn't already exist
                    fs.mkdirSync(__dirname+'/qr', { recursive: true });

                    // Create the event directory if it doesn't already exist
                    var dir=__dirname+'/qr/'+decodeURI(event).toLowerCase();
                    fs.mkdirSync(dir, { recursive: true });

                    var url='https://'+req.headers.host+'/'+id;

                    // Create the file
                    qr.toFile(dir+'/'+id+'.png', url, (err) => {
                        if (err) {
                            res.status(500).send(createHTML('assets/error.html', { "Msg": "Couldn't create .png file." }));
                            return;
                        }

                        // Create the Base64 data blob
                        qr.toDataURL(url, (err, src) => {
                            if (err) {
                                res.status(500).send(createHTML('assets/error.html', { "Msg": "Couldn't create the data blob." }));
                                return;
                            }
    
                            // Return a successful response to the request:
                            res.status(200).json({
                                "id": id,
                                "url": url,
                                "imgsrc": 'https://'+req.headers.host+'/'+decodeURI(event.toLowerCase())+'/'+id+'.png',
                                "data": src
                            });
                        });
                    });


                } else {
                    res.status(401).send(createHTML('assets/error.html', { "Msg": "Invalid ID." }));
                }
            });
    } catch(err) {
        res.status(500).send(createHTML('assets/error.html', { "Msg": "There was a problem" }));
    }

}






/*-----------------------------------------------------------------------------
  Set up the scanning client:
  ---------------------------------------------------------------------------*/

app.get('/setup', function (req, res, next) {

    httpHeaders(res);

    if (!requireScannerAuthorization(req, res)) {
        return;
    }

    if (req.query.id) {
        sqlQuery(connectionString, 'EXECUTE Scan.Get_Codes @ID=@ID;',
        [   { "name": 'ID', "type": Types.BigInt, "value": parseInt(req.query.id) }],

        async function(recordset) {
            var codes='';
            recordset.forEach(item => {
                codes+='<span class="code" xhref="/'+parseInt(req.query.id)+'/'+encodeURIComponent(item.ReferenceCode)+'">'+simpleHtmlEncode(item.ReferenceCode)+'</span>';
            });

            if (!codes) {
                res.status(500).send(createHTML('assets/error.html', { "Msg": "That code didn't look right." }));
                return;
            }

            res.status(200).send(createHTML('assets/select-code.html', { "codes": codes }));
            return;
        });
    } else {
        // This creates/renews a session cookie, used to create/maintain the user session:
        req.session.dummy=Date.now();        // Prevent the session from expiring.

        getEventVendorCodes(req, function (codes) {
            res.status(200).send(createHTML('assets/setup.html', {
                "VendorCode": htmlAttributeEncode(req.session.vendorCode || ""),
                "VendorCodeOptions": createVendorCodeOptions(codes, req.session.vendorCode || "")
            }));
        });
    }


});

app.post('/setup', function (req, res, next) {

    if (!requireScannerAuthorization(req, res)) {
        return;
    }

    const vendorCode = getSubmittedVendorCode(req);
    if (!vendorCode) {
        res.status(400).send(createHTML('assets/error.html', { "Msg": "A vendor code is required." }));
        return;
    }
    req.session.vendorCode = vendorCode;
    res.status(200).send(createHTML('assets/ok.html', { "VendorCode": simpleHtmlEncode(vendorCode) }));

});

/*-----------------------------------------------------------------------------
  Register a reserved badge:
  ---------------------------------------------------------------------------*/

app.get('/registration', function (req, res) {
    httpHeaders(res);
    if (!requireScannerAuthorization(req, res)) {
        return;
    }
    res.status(200).send(createHTML('assets/registration.html', {}));
});

app.post('/registration/status', function (req, res) {
    if (!requireScannerAuthorization(req, res)) {
        return;
    }

    const identityId = parseRegistrationIdentityId(req.body.id);
    if (identityId === null) {
        res.status(400).json({ error: 'A valid identity ID is required.' });
        return;
    }

    sqlQuery(connectionString, 'EXECUTE Scan.Get_Reserved_Identity @EventID=@EventID, @ID=@ID, @EncryptionKey=@EncryptionKey;',
        [
            { name: 'EventID', type: Types.Int, value: getAuthorizedEventId(req) },
            { name: 'ID', type: Types.BigInt, value: identityId },
            { name: 'EncryptionKey', type: Types.NVarChar, value: req.body.encryptionKey || '' }
        ],
        function (recordset) {
            const result = recordset && recordset[0];
            if (!result) {
                res.status(404).json({ status: 'not-found' });
                return;
            }
            if (result.Status === 'NotFound') {
                res.status(404).json({ status: 'not-found' });
                return;
            }
            res.status(200).json({
                status: result.Status === 'Available' ? 'available' : 'claimed',
                id: identityId
            });
        });
});

app.post('/registration/claim', function (req, res) {
    if (!requireScannerAuthorization(req, res)) {
        return;
    }

    const identityId = parseRegistrationIdentityId(req.body.id);
    const fields = ['email', 'firstName', 'lastName', 'name', 'description', 'title', 'phone', 'location', 'role'];
    if (identityId === null || fields.some(field => typeof req.body[field] !== 'string')) {
        res.status(400).json({ error: 'Identity ID and all registration fields are required.' });
        return;
    }

    sqlQuery(connectionString, 'EXECUTE Scan.Claim_Reserved_Identity @EventID=@EventID, @ID=@ID, @EncryptionKey=@EncryptionKey, @Email=@Email, @FirstName=@FirstName, @LastName=@LastName, @Name=@Name, @Description=@Description, @JobTitle=@JobTitle, @Phone=@Phone, @Location=@Location, @Role=@Role;',
        [
            { name: 'EventID', type: Types.Int, value: getAuthorizedEventId(req) },
            { name: 'ID', type: Types.BigInt, value: identityId },
            { name: 'EncryptionKey', type: Types.NVarChar, value: req.body.encryptionKey || '' },
            { name: 'Email', type: Types.NVarChar, value: req.body.email },
            { name: 'FirstName', type: Types.NVarChar, value: req.body.firstName },
            { name: 'LastName', type: Types.NVarChar, value: req.body.lastName },
            { name: 'Name', type: Types.NVarChar, value: req.body.name },
            { name: 'Description', type: Types.NVarChar, value: req.body.description },
            { name: 'JobTitle', type: Types.NVarChar, value: req.body.title },
            { name: 'Phone', type: Types.NVarChar, value: req.body.phone },
            { name: 'Location', type: Types.NVarChar, value: req.body.location },
            { name: 'Role', type: Types.NVarChar, value: req.body.role }
        ],
        function (recordset) {
            const result = recordset && recordset[0];
            if (!result || result.Claimed !== 1) {
                res.status(409).json({ status: 'claimed', message: 'That badge has already been registered.' });
                return;
            }
            res.status(200).json({ status: 'registered', id: identityId });
        });
});

function parseRegistrationIdentityId(value) {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return null;
    }
    const normalized = String(value).trim();
    if (!/^[0-9]+$/.test(normalized)) {
        return null;
    }
    const identityId = Number(normalized);
    return Number.isSafeInteger(identityId) ? identityId : null;
}










/*-----------------------------------------------------------------------------
  Scan using a vendor code:
  ---------------------------------------------------------------------------*/

app.post(/^\/([0-9]*)\/([^\/]+)$/, newScan);  // POST with ID and vendorCode
app.post(/^\/([0-9]+)$/, newScan);            // POST with ID only, using the vendor code from the session
app.get(/^\/([0-9]*)\/([^\/]+)$/, newScan);   // GET with ID and vendorCode
app.get(/^\/([0-9]*)$/, newScan);            // GET with ID only

function newScan(req, res, next) {

    if (!requireScannerAuthorization(req, res)) {
        return;
    }

    const id = req.params[0];
    const vendorCode = req.params[1] || null;
  
    if (vendorCode) {
        if (vendorCode.includes('favicon')) {
            res.status(404).send('');
            return;
        }
    }

    const cookieVendorCode = typeof req.session.vendorCode === 'string'
        ? req.session.vendorCode.trim()
        : '';
    const selectedVendorCode = getSubmittedVendorCode(req);
    var referenceCode=decodeURI(vendorCode || '') || selectedVendorCode || cookieVendorCode;

    if (!referenceCode) {
        if (req.method === 'POST') {
            res.status(400).send(createHTML('assets/error.html', { "Msg": "A vendor code is required." }));
            return;
        }
        res.redirect('/setup?id='+parseInt(id));
        return;
    }

    // A QR code opens this route with GET and no vendor code in the URL.
    // Show the note form before recording the scan; the form submits back via POST.
    if (req.method === 'GET' && !vendorCode) {
        httpHeaders(res);
        getEventVendorCodes(req, function (codes) {
            res.status(200).send(createHTML('assets/scan.html', {
                "ID": parseInt(id),
                "VendorCode": htmlAttributeEncode(referenceCode),
                "VendorCodeOptions": createVendorCodeOptions(codes, referenceCode),
                "Vendor": referenceCode
                    ? '<div class="scan-vendor">Vendor code: ' +
                        simpleHtmlEncode(referenceCode) + '</div>'
                    : ''
            }));
        });
        return;
    }

    var note="";
    if (req.body) { note = req.body.note || "" };
    const shouldSetDefault = req.body && req.body.setDefault === 'on';

    httpHeaders(res);
    try {
        // Name the connection after the host:
        connectionString.options.appName=req.headers.host;

        sqlQuery(connectionString, 'EXECUTE Scan.New_Scan @ID=@ID, @EventID=@EventID, @ReferenceCode=@ReferenceCode, @Note=@Note;',
            [   { "name": 'ID', "type": Types.BigInt, "value": parseInt(id) },
                { "name": 'EventID', "type": Types.Int, "value": getAuthorizedEventId(req) },
                { "name": 'ReferenceCode', "type": Types.VarChar, "value": referenceCode },
                { "name": 'Note', "type": Types.NVarChar, "value": note }],

            async function(recordset) {
                if (recordset.length==1) {
                    // Explicit URL codes retain their existing behavior; ID-only submissions
                    // update the default only when the user opts in.
                    if (vendorCode || shouldSetDefault) {
                        req.session.vendorCode = referenceCode;
                    }

                    res.status(200).send(createHTML('assets/ok.html', { "VendorCode": (referenceCode || '(No exhibitor code)') }));
                    return;
                } else {
                    res.status(500).send(createHTML('assets/error.html', { "Msg": "That code didn't look right." }));
                    return;
                }
            });
    } catch(e) {
        res.status(500).send(createHTML('assets/error.html', { "Msg": "There was a problem." }));
        return;
    }

};

function getAuthorizedEventId(req) {
    const eventId = Number(req.session.scannerEventId);
    const expires = Number(req.session.scannerExpires);
    if (!Number.isInteger(eventId) || !Number.isFinite(expires) || expires <= Date.now()) {
        return null;
    }

    return eventId;
}

function getEventVendorCodes(req, next) {
    const eventId = getAuthorizedEventId(req);
    if (eventId === null) {
        next([]);
        return;
    }

    sqlQuery(connectionString, 'EXECUTE Scan.Get_Event_Codes @EventID=@EventID;',
        [{ "name": 'EventID', "type": Types.Int, "value": eventId }],
        function (recordset) {
            next((recordset || []).map(item => item.ReferenceCode).filter(code => typeof code === 'string'));
        });
}

function getSubmittedVendorCode(req) {
    if (!req.body) {
        return '';
    }

    if (req.body.vendorCodeChoice === '__new__') {
        return typeof req.body.newVendorCode === 'string'
            ? req.body.newVendorCode.trim()
            : '';
    }

    if (typeof req.body.vendorCodeChoice === 'string' && req.body.vendorCodeChoice.trim()) {
        return req.body.vendorCodeChoice.trim();
    }

    return typeof req.body.vendorCode === 'string'
        ? req.body.vendorCode.trim()
        : '';
}

function createVendorCodeOptions(codes, selectedCode) {
    const normalizedSelectedCode = typeof selectedCode === 'string' ? selectedCode.trim() : '';
    const hasSelectedCode = codes.includes(normalizedSelectedCode);
    const options = codes.map(code =>
        '<option value="' + htmlAttributeEncode(code) + '"' +
        (code === normalizedSelectedCode ? ' selected' : '') + '>' +
        simpleHtmlEncode(code) + '</option>'
    ).join('');

    return '<div class="vendor-code-selector" data-vendor-code-selector>' +
        '<label for="vendorCodeChoice">Vendor code</label>' +
        '<select id="vendorCodeChoice" name="vendorCodeChoice">' +
        options +
        '<option value="__new__"' + (hasSelectedCode ? '' : ' selected') + '>Enter a new vendor code</option>' +
        '</select>' +
        '<input id="newVendorCode" name="newVendorCode" type="text" placeholder="New vendor code" value="' +
            (hasSelectedCode ? '' : htmlAttributeEncode(normalizedSelectedCode)) + '">' +
        '</div>';
}

function requireScannerAuthorization(req, res) {
    if (getAuthorizedEventId(req) !== null) {
        return true;
    }

    res.status(403).send(createHTML('assets/error.html', {
        "Msg": "Scan the event organizer's authorization QR code on this phone first."
    }));
    return false;
}





/*-----------------------------------------------------------------------------
  View all scans:
  ---------------------------------------------------------------------------*/

app.get('/report/:event', function (req, res, next) {
    
      httpHeaders(res);
      try {
          // Name the connection after the host:
          connectionString.options.appName=req.headers.host;
  
          sqlQuery(connectionString, 'EXECUTE Scan.Get_Scans @EventCode=@EventCode;',
              [   { "name": 'EventCode', "type": Types.UniqueIdentifier, "value": decodeURI(req.params.event) }],
  
              async function(recordset) {
                if (!recordset || recordset.length === 0) {
                    res.status(404).send(createHTML('assets/error.html', { "Msg": "Report not found." }));
                    return;
                }
                res.status(200).json(recordset);
                return;
              });
      } catch(e) {
          res.status(500).send(createHTML('assets/error.html', { "Msg": "There was a problem." }));
          return;
      }
  
  });
  
  
  
  
  
/*-----------------------------------------------------------------------------
  View one random scan:
  ---------------------------------------------------------------------------*/

app.get('/random/:event/:vendorCode', randomScan);
app.get('/random/:event', randomScan);

function randomScan (req, res, next) {

    // If we passed a vendor code, use that, otherwise, set referenceCode=null (any/no vendor)
    var referenceCode=decodeURI(req.params.vendorCode || '');

    httpHeaders(res);
    try {
        // Name the connection after the host:
        connectionString.options.appName=req.headers.host;

        sqlQuery(connectionString, 'EXECUTE Scan.Get_Random @ReferenceCode=@ReferenceCode, @EventCode=@EventCode;',
            [   { "name": 'EventCode', "type": Types.UniqueIdentifier, "value": decodeURI(req.params.event) },
                { "name": 'ReferenceCode', "type": Types.NVarChar, "value": referenceCode }],

            async function(recordset) {
              res.status(200).json(recordset);
              return;
            });
    } catch(e) {
        res.status(500).send(createHTML('assets/error.html', { "Msg": "There was a problem." }));
        return;
    }

}



















// Input form to generate the PDF document:
app.get('/pdf', pdfForm);
app.get('/pdf/:event', pdfForm);

function pdfForm (req, res, next) {
    res.status(200).send(createHTML('assets/pdf.html', { "Event": (decodeURI(req.params.event) || '') }));
}

// Input form to generate the organizer authorization QR code PDF:
app.get('/authorization-pdf', authorizationPdfForm);
app.get('/authorization-pdf/:eventCode', authorizationPdfForm);

function authorizationPdfForm (req, res, next) {
    res.status(200).send(createHTML('assets/authorization-pdf.html', {
        "EventCode": simpleHtmlEncode(decodeURI(req.params.eventCode || ''))
    }));
}

// Generate a printable organizer authorization QR code:
app.post('/authorization-pdf', async function (req, res, next) {
    const eventCode = typeof req.body.eventCode === 'string'
        ? req.body.eventCode.trim()
        : '';

    if (!eventCode) {
        res.status(400).send('EventCode is required.');
        return;
    }

    sqlQuery(connectionString,
        'EXECUTE Scan.Get_Authorization_Code @EventCode=@EventCode;',
        [{ "name": 'EventCode', "type": Types.UniqueIdentifier, "value": eventCode }],
        async function(recordset) {
            if (!recordset || recordset.length !== 1) {
                res.status(404).send('Invalid or missing event code.');
                return;
            }

            const event = recordset[0];
            const authorizationUrl = req.protocol + '://' + req.get('host') +
                '/authorize/' + encodeURIComponent(String(event.ScannerSecret));

            try {
                const qrImage = await qr.toBuffer(authorizationUrl, {
                    type: 'png',
                    width: 500,
                    margin: 2
                });
                const pdf = new PDFGenerator({
                    size: 'LETTER',
                    margins: { top: 54, bottom: 54, left: 54, right: 54 }
                });

                res.type('application/pdf');
                res.attachment('scanner-authorization-' + String(event.Event).replace(/[^a-z0-9]+/gi, '-') + '.pdf');
                pdf.pipe(res);
                pdf.fontSize(24).text('Scanner authorization');
                pdf.moveDown(0.5);
                pdf.fontSize(18).text(String(event.Event || 'Event'));
                pdf.moveDown(1);
                pdf.image(qrImage, { fit: [450, 450], align: 'center' });
                pdf.moveDown(1);
                pdf.fontSize(10).text('Or open this authorization URL on a laptop:', {
                    align: 'center'
                });
                pdf.moveDown(0.35);
                pdf.fontSize(9).text(authorizationUrl, {
                    align: 'center',
                    link: authorizationUrl,
                    underline: true
                });
                pdf.moveDown(1);
                pdf.fontSize(11).text(
                    'Each sponsor or Registration phone must scan this code before scanning badges.',
                    { align: 'center' }
                );
                pdf.end();
            } catch (err) {
                console.error('Authorization QR PDF generation failed:', err);
                if (!res.headersSent) {
                    res.status(500).send('Unable to generate the authorization QR code PDF.');
                }
            }
        });
});


// Generate the PDF document:
app.post('/pdf', async function (req, res, next) {

    // Create the /pdf directory if it doesn't already exist
    fs.mkdirSync(__dirname+'/pdf', { recursive: true });

    // Create the /qr directory if it doesn't already exist
    fs.mkdirSync(__dirname+'/qr', { recursive: true });

    const pageSizes={
        "A3": { "pageWidth": 841.89, "pageHeight": 1190.55 },
        "A4": { "pageWidth": 595.28, "pageHeight": 841.89 },
        "A5": { "pageWidth": 419.53, "pageHeight": 595.28 },
        "A6": { "pageWidth": 297.64, "pageHeight": 419.53 },
        "EXECUTIVE": { "pageWidth": 521.86, "pageHeight": 756.00 },
        "LEGAL": { "pageWidth": 612.00, "pageHeight": 1008.00 },
        "LETTER": { "pageWidth": 612.00, "pageHeight": 792.00 },
        "TABLOID": { "pageWidth": 792.00, "pageHeight": 1224.00 },
        "AVERY_5392": {
            "pageWidth": 612.00,
            "pageHeight": 792.00,
            "badgeHorizontalCount": 2,
            "badgeVerticalCount": 3,
            "badgeWidth": 288.00,
            "badgeHeight": 216.00,
            "badgeLefts": [18.00, 306.00],
            "badgeTops": [72.00, 288.00, 504.00],
            "avery": {
                "reservedZones": [
                    { "top": 0.00, "bottom": 30.24 },
                    { "top": 192.96, "bottom": 216.00 }
                ],
                "usableTop": 30.24,
                "usableBottom": 191.52,
                "firstNameLeft": 7.20,
                "firstNameTop": 37.44,
                "firstNameWidth": 273.60,
                "firstNameHeight": 36.00,
                "firstNameFontSize": 28,
                "lastNameLeft": 7.20,
                "lastNameTop": 74.88,
                "lastNameWidth": 273.60,
                "lastNameHeight": 23.04,
                "lastNameFontSize": 14,
                "qrLeft": 12.96,
                "qrTop": 93.60,
                "qrSize": 97.20,
                "detailsLeft": 122.40,
                "detailsTop": 108.00,
                "detailsWidth": 152.64,
                "detailsHeight": 79.20,
                "detailsRoleReserve": 18.00,
                "companyFontSize": 10,
                "jobTitleFontSize": 7.5
            }
        }
    };

    const requestedPageSize = req.body.paperSize || 'A4';
    const pageSize = pageSizes[requestedPageSize] ? requestedPageSize : 'A4';
    const selectedPage = pageSizes[pageSize];
    console.log('PDF page layout:', {
        requested: requestedPageSize,
        resolved: pageSize,
        badgeColumns: selectedPage.badgeHorizontalCount,
        badgeRows: selectedPage.badgeVerticalCount
    });
    var pdfConfig={
        "documentInfo": {
            Title: 'Attendee badges',
            Author: req.headers.host,
            Subject: req.headers.host,
            CreationDate: new Date()
        },

        // https://pdfkit.org/docs/paper_sizes.html
        "pageSettings": {
            "font": __dirname+'/assets/Montserrat-SemiBold.ttf',
            "size": pageSize === 'AVERY_5392'
                ? [selectedPage.pageWidth, selectedPage.pageHeight]
                : pageSize,
            "margins": { top: 0, bottom: 0, left: 0, right: 0 }
        },
        "pageWidth": selectedPage.pageWidth,
        "pageHeight": selectedPage.pageHeight,
        "pageTopMargin": 40,
        "topPercent": 0.5,

        "qrSizePercent": parseFloat(req.body.qrSize || '0.15'),
        "badgeHorizontalCount": selectedPage.badgeHorizontalCount ||
            parseInt((req.body.badgeCount || '2,2').split(',')[0] || '2'),
        "badgeVerticalCount": selectedPage.badgeVerticalCount ||
            parseInt((req.body.badgeCount || '2,2').split(',')[1] || '2'),
        "badgeWidth": selectedPage.badgeWidth,
        "badgeHeight": selectedPage.badgeHeight,
        "badgeLefts": selectedPage.badgeLefts,
        "badgeTops": selectedPage.badgeTops,
        "avery": selectedPage.avery,

        "siteName": req.headers.host
    };

    try {
        var selectedIdentities=[];
        if (req.body.identities && req.body.identities.trim()) {
            selectedIdentities=await parseDelimitedText(req.body.identities);
        }
        console.log('Submitted identities: ' +
            JSON.stringify(selectedIdentities.map(identity => ({ id: identity.id, name: identity.name }))));

        const shouldUpdateIdentities=req.body.updateidentities === 'on';
        const shouldOnlyPrintIdentities=req.body.onlyprintidentities === 'on';
        if (selectedIdentities.length > 0 && selectedIdentities.some(identity =>
            !Number.isInteger(identity.id))) {
            res.status(400).send('Each submitted identity must have a valid id.');
            return;
        }
        if (shouldUpdateIdentities) {
            const requiredUpdateFields=[
                'id', 'email', 'firstName', 'lastName', 'name',
                'description', 'title', 'phone', 'location', 'role'
            ];
            const invalidRow=selectedIdentities.find(identity =>
                !requiredUpdateFields.every(field =>
                    Object.prototype.hasOwnProperty.call(identity, field)) ||
                !Number.isInteger(identity.id));

            if (invalidRow) {
                res.status(400).send(
                    'Saving identity details requires columns: id, email, firstname, lastname, ' +
                    'name, description, title, phone, location, and role. Each row must have a valid id.'
                );
                return;
            }
        }
        const getIdentities=shouldUpdateIdentities
            ? 'EXECUTE Scan.Update_Identities @EventCode=@EventCode, @EncryptionKey=@EncryptionKey, @Identities_blob=@blob;\n'
            : '';
        const identityIDs=shouldOnlyPrintIdentities
            ? JSON.stringify(selectedIdentities.map(identity => identity.id))
            : null;

        sqlQuery(connectionString, getIdentities+
                                   'EXECUTE Scan.Get_Identities @EventCode=@EventCode, @EncryptionKey=@EncryptionKey, @IdentityIDs=@IdentityIDs;',
            [   { "name": 'EventCode', "type": Types.UniqueIdentifier, "value": req.body.event },
                { "name": 'EncryptionKey', "type": Types.NVarChar, "value": req.body.encryptionKey },
                { "name": 'blob', "type": Types.NVarChar, "value": JSON.stringify(selectedIdentities) },
                { "name": 'IdentityIDs', "type": Types.NVarChar, "value": identityIDs }],

            async function(recordset) {
                if (!recordset || !recordset[0]) {
                    res.status(401).send('Invalid or missing event.');
                    return;
                }

                const blob=JSON.parse(recordset[0].blob);


                if (blob.identities!==undefined) {
                    console.log('Loaded identities:',
                        JSON.stringify(blob.identities.map(identity =>
                            ({ id: identity.id, name: identity.name }))));

                    // Create the event directory if it doesn't already exist
                    const dir=__dirname+'/qr/'+(blob.eventName.toLowerCase());
                    fs.mkdirSync(dir, { recursive: true });

                    var pdf = new PDFGenerator(pdfConfig.pageSettings);
                    pdf.fontSize(parseInt(req.body.fontSize || '16'));
                    pdfConfig.documentInfo.Subject=blob.eventName;
                    pdf.info=pdfConfig.documentInfo;

                    //pdf.pipe(fs.createWriteStream('./pdf/Badges_'+blob.eventId+'.pdf'));
                    res.type('application/pdf');
                    pdf.pipe(res) // send back as http response

                    var badgeWidth=pdfConfig.badgeWidth ||
                        pdfConfig.pageWidth/pdfConfig.badgeHorizontalCount;
                    var badgeHeight=pdfConfig.badgeHeight ||
                        pdfConfig.pageHeight/pdfConfig.badgeVerticalCount;
                    var nameFontSize=parseInt(req.body.fontSize || '16');
                    var descriptionFontSize=Math.max(8, Math.round(nameFontSize*0.6));
                    var badgeCounter=0;
                    var isAvery5392=pageSize === 'AVERY_5392';
                    console.log('PDF renderer:', {
                        layout: isAvery5392 ? 'AVERY_5392' : 'GENERIC',
                        pageSize: pageSize,
                        pageWidth: pdfConfig.pageWidth,
                        pageHeight: pdfConfig.pageHeight,
                        badgeWidth: badgeWidth,
                        badgeHeight: badgeHeight,
                        badgeHorizontalCount: pdfConfig.badgeHorizontalCount,
                        badgeVerticalCount: pdfConfig.badgeVerticalCount,
                        hasAveryZones: Boolean(pdfConfig.avery)
                    });

                    for (const member of blob.identities) {

                        if (badgeCounter>0 && badgeCounter%(pdfConfig.badgeHorizontalCount*pdfConfig.badgeVerticalCount)==0) {
                            pdf.addPage(pdfConfig.pageSettings);
                        }

                        var column=badgeCounter%pdfConfig.badgeHorizontalCount;
                        var row=Math.floor((badgeCounter%(pdfConfig.badgeHorizontalCount*pdfConfig.badgeVerticalCount))/
                            pdfConfig.badgeHorizontalCount);
                        var x=pdfConfig.badgeLefts ? pdfConfig.badgeLefts[column] : badgeWidth*column;
                        var y=pdfConfig.badgeTops ? pdfConfig.badgeTops[row] : badgeHeight*row;

                        if (badgeCounter < 3) {
                            console.log('PDF badge placement:', {
                                badgeNumber: badgeCounter + 1,
                                renderer: isAvery5392 ? 'AVERY_5392' : 'GENERIC',
                                column: column,
                                row: row,
                                x: x,
                                y: y,
                                firstNamePresent: Boolean(member.firstName),
                                lastNamePresent: Boolean(member.lastName),
                                fullNamePresent: Boolean(member.name),
                                hasId: Boolean(member.id)
                            });
                        }

                        if (isAvery5392) {
                            // Keep all variable content below the pre-printed header.
                            pdf.fontSize(pdfConfig.avery.firstNameFontSize);
                            validateAveryElement(pdfConfig.avery, 'first_name',
                                pdfConfig.avery.firstNameLeft,
                                pdfConfig.avery.firstNameTop,
                                pdfConfig.avery.firstNameWidth,
                                pdfConfig.avery.firstNameHeight);
                            pdf.text(member.firstName || member.name || '',
                                x+pdfConfig.avery.firstNameLeft,
                                y+pdfConfig.avery.firstNameTop, {
                                    align: 'center',
                                    width: pdfConfig.avery.firstNameWidth,
                                    height: pdfConfig.avery.firstNameHeight
                                });

                            if (member.lastName) {
                                pdf.fontSize(pdfConfig.avery.lastNameFontSize);
                                validateAveryElement(pdfConfig.avery, 'last_name',
                                    pdfConfig.avery.lastNameLeft,
                                    pdfConfig.avery.lastNameTop,
                                    pdfConfig.avery.lastNameWidth,
                                    pdfConfig.avery.lastNameHeight);
                                pdf.text(member.lastName,
                                    x+pdfConfig.avery.lastNameLeft,
                                    y+pdfConfig.avery.lastNameTop, {
                                        align: 'center',
                                        width: pdfConfig.avery.lastNameWidth,
                                        height: pdfConfig.avery.lastNameHeight
                                    });
                            }

                            if (member.id) {
                                await qr.toFile(dir+'/'+member.id+'.png',
                                    'https://'+pdfConfig.siteName+'/'+member.id, { scale: 10 });
                                validateAveryElement(pdfConfig.avery, 'qr_code',
                                    pdfConfig.avery.qrLeft,
                                    pdfConfig.avery.qrTop,
                                    pdfConfig.avery.qrSize,
                                    pdfConfig.avery.qrSize);
                                pdf.image(dir+'/'+member.id+'.png',
                                    x+pdfConfig.avery.qrLeft, y+pdfConfig.avery.qrTop,
                                    { width: pdfConfig.avery.qrSize, height: pdfConfig.avery.qrSize });
                            }

                            var details=[];
                            if (member.description) {
                                details.push(member.description);
                            }
                            var jobTitle=member.jobTitle || member.title;
                            if (jobTitle) {
                                details.push(jobTitle);
                            }
                            if (details.length > 0) {
                                pdf.fontSize(pdfConfig.avery.companyFontSize);
                                validateAveryElement(pdfConfig.avery, 'details',
                                    pdfConfig.avery.detailsLeft,
                                    pdfConfig.avery.detailsTop,
                                    pdfConfig.avery.detailsWidth,
                                    pdfConfig.avery.detailsHeight -
                                        pdfConfig.avery.detailsRoleReserve);
                                pdf.text(details.join('\n'),
                                    x+pdfConfig.avery.detailsLeft,
                                    y+pdfConfig.avery.detailsTop, {
                                        align: 'left',
                                        width: pdfConfig.avery.detailsWidth,
                                        height: pdfConfig.avery.detailsHeight -
                                            pdfConfig.avery.detailsRoleReserve,
                                        lineGap: 1
                                    });
                            }
                            if (member.role) {
                                pdf.fontSize(pdfConfig.avery.companyFontSize);
                                validateAveryElement(pdfConfig.avery, 'role',
                                    pdfConfig.avery.detailsLeft,
                                    pdfConfig.avery.detailsTop +
                                        pdfConfig.avery.detailsHeight -
                                        pdfConfig.avery.detailsRoleReserve,
                                    pdfConfig.avery.detailsWidth,
                                    pdfConfig.avery.detailsRoleReserve);
                                pdf.text(member.role,
                                    x+pdfConfig.avery.detailsLeft,
                                    y+pdfConfig.avery.detailsTop +
                                        pdfConfig.avery.detailsHeight -
                                        pdfConfig.avery.detailsRoleReserve, {
                                        align: 'right',
                                        width: pdfConfig.avery.detailsWidth,
                                        height: pdfConfig.avery.detailsRoleReserve
                                    });
                            }

                        } else if (member.id) {
                            await qr.toFile(dir+'/'+member.id+'.png', 'https://'+pdfConfig.siteName+'/'+member.id, { scale: 10 });

                            // Add the QR code:
                            pdf.image(dir+'/'+member.id+'.png',
                                x+badgeWidth/2-badgeHeight*pdfConfig.qrSizePercent/2,
                                y+badgeHeight*pdfConfig.topPercent-pdfConfig.pageTopMargin,
                                { width: badgeHeight*pdfConfig.qrSizePercent, height: badgeHeight*pdfConfig.qrSizePercent });
                        }

                        // Add the name:
                        if (!isAvery5392 && member.name) {
                            pdf.fontSize(nameFontSize);
                            pdf.text(member.name, x, y+badgeHeight*(pdfConfig.topPercent+pdfConfig.qrSizePercent*1.1)-pdfConfig.pageTopMargin, {
                                bold: true,
                                align: 'center',
                                width: badgeWidth
                            });
                        }

                        // Add the description/org/role:
                        if (!isAvery5392 && member.description) {
                            pdf.fontSize(descriptionFontSize);
                            pdf.text(member.description, {
                                align: 'center',
                                width: badgeWidth
                            });
                        }

                        // Add a frame for debugging:
                        //pdf.rect(x, y, badgeWidth, badgeHeight).stroke();

                        badgeCounter++;
                    }

                    pdf.end();
                    //res.status(200).json(recordset);
                } else {
                    res.status(400).send("No identities found.");
                }

                return;
        });
    } catch(e) {
        console.log('Oh no');
        console.log(e);

        res.status(500);
    }

});


function validateAveryElement(averyConfig, elementName, x, y, width, height) {
    var elementBottom=y+height;
    var reservedZone=averyConfig.reservedZones.find(zone =>
        y<zone.bottom && elementBottom>zone.top);

    if (reservedZone) {
        throw new Error('Avery element "'+elementName+
            '" intersects a reserved zone.');
    }
}


// Function to parse the text
async function parseDelimitedText(dataset) {

    dataset=dataset.split('\r\n').join('\n');

    var headers=dataset.split('\n')[0]
        .toLowerCase()
        .split(' ').join('')
        .split('-').join('')
        .split('.').join('')
        .split('_').join('');

    dataset=headers+'\n'+dataset.split('\n').slice(1).join('\n');

    var delimiter;
    var delimiterCount=dataset.split('\n').length;

    if (dataset.split(';').length>=delimiterCount)  { delimiterCount=dataset.split(';').length;  delimiter=';'; }
    if (dataset.split(',').length>=delimiterCount)  { delimiterCount=dataset.split(',').length;  delimiter=','; }
    if (dataset.split('\t').length>=delimiterCount) { delimiterCount=dataset.split('\t').length; delimiter='\t'; }

    headers=headers
        .split('"').join('')
        .split("'").join('')
        .split(delimiter);

    var parsedCsv=await new Promise((resolve, reject) => {
        csv.parse(dataset, {
            "delimiter": delimiter,
            "columns": true,
            "trim": true
        }, (err, records) => {
            if (err) {
                reject(err);
            } else {
                resolve(records);
            }
        });
    });

    console.log('Headers:', headers);

    var idHeader=selectHeader(headers, ['id']);
    var emailHeader=selectHeader(headers, ['email']);
    var firstNameHeader=selectHeader(headers, ['firstname', 'givenname']);
    var lastNameHeader=selectHeader(headers, ['lastname', 'familyname']);
    var nameHeader=selectHeader(headers, ['name']);
    var phoneHeader=selectHeader(headers, ['phone', 'mobile']);
    var descriptionHeader=selectHeader(headers, ['org', 'company']);
    var jobTitleHeader=selectHeader(headers, ['jobtitle', 'title']);
    var roleHeader=selectHeader(headers, ['role']);
    var location=selectHeader(headers, ['location', 'city', 'state', 'country']);

    var data=parsedCsv.map(row => {
        var obj={};
        if (idHeader) { obj.id=parseInt(row[idHeader]); }
        if (emailHeader) { obj.email=row[emailHeader]; }
        if (firstNameHeader) { obj.firstName=row[firstNameHeader]; }
        if (lastNameHeader) { obj.lastName=row[lastNameHeader]; }
        if (firstNameHeader || lastNameHeader) {
            obj.name=[obj.firstName, obj.lastName].filter(Boolean).join(' ');
        } else if (nameHeader) {
            obj.name=row[nameHeader];
        }
        if (phoneHeader) { obj.phone=row[phoneHeader]; }
        if (descriptionHeader) { obj.description=row[descriptionHeader]; }
        if (jobTitleHeader) { obj.title=row[jobTitleHeader]; }
        if (roleHeader) { obj.role=row[roleHeader]; }
        if (location) { obj.location=row[location]; }
        return obj;
    });

    return data;
}

function selectHeader(headers, candidates) {
    var headerNo=-1;

    // Exact match
    candidates.forEach(candidate => {
        if (headerNo==-1) { headerNo=headers.findIndex((col) => col==candidate ); }
    });
    // Starts with
    candidates.forEach(candidate => {
        if (headerNo==-1) { headerNo=headers.findIndex((col) => col.indexOf(candidate)==0); }
    });
    // Ends with
    candidates.forEach(candidate => {
        if (headerNo==-1) { headerNo=headers.findIndex((col) => col.indexOf(candidate)>=0 && col.indexOf(candidate)==col.length-candidate.length); }
    });
    // Contains
    candidates.forEach(candidate => {
        if (headerNo==-1) { headerNo=headers.findIndex((col) => col.indexOf(candidate)>=0); }
    });

    console.log(candidates, headers[headerNo]);
    if (headerNo>=0) { return headers[headerNo]; }
}







/*-----------------------------------------------------------------------------
  Expire/evict old events from the database:
  ---------------------------------------------------------------------------*/

app.get('/expire', function (req, res, next) {

    var id=0;

    // Name the connection after the host:
    connectionString.options.appName=req.headers.host;

    try {
        sqlQuery(connectionString, 'EXECUTE Scan.Expire;', [],

        async function(recordset) {
            if (recordset) {
                recordset.forEach(item => {
                    console.log('Expired event: ' + item.ExpiredEvent);
                    var dir=__dirname+'/qr/'+item.ExpiredEvent.toLowerCase();
                    //fs.rmdirSync(dir, { recursive: true });

                    // Remove all the cached images in the directory.
                    removeDir(dir);
                });
            }
            res.status(200).send(createHTML('assets/ok.html', {}));
        });
    } catch(err) {
        res.status(500).send(createHTML('assets/error.html', { "Msg": "There was a problem" }));
    }

});


// Modified from: https://coderrocketfuel.com/article/remove-both-empty-and-non-empty-directories-using-node-js
// Recursively deletes files and directories in a path.
const removeDir = function(path) {
    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);
  
        files.forEach(function(filename) {
            if (fs.statSync(path + "/" + filename).isDirectory()) {
                removeDir(path + "/" + filename);
            } else {
                fs.unlinkSync(path + "/" + filename);
            }
        });

        fs.rmdirSync(path);
    }
}






/*-----------------------------------------------------------------------------
  Other related assets, like CSS or other files:
  ---------------------------------------------------------------------------*/

app.get('/assets/:asset', function (req, res, next) {

    httpHeaders(res);

    var options = {
        maxAge: 60 * 60 * 1000,         // Max age 1 hour (so we can cache stylesheets, etc)
        root: __dirname + '/assets/',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    res.sendFile(req.params.asset, options, function(err) {
        if (err) {
            res.sendStatus(404);
            return;
        }
    });
});









/*-----------------------------------------------------------------------------
  Canned SQL interface:
  ---------------------------------------------------------------------------*/

function sqlQuery(connectionString, statement, parameters, next) {
    // Connect:
    var conn = new Connection(connectionString);
    var rows=[];
    var columns=[];
    var errMsg;

    conn.on('infoMessage', connectionError);
    conn.on('errorMessage', connectionError);
    conn.on('error', connectionGeneralError);
    conn.on('end', connectionEnd);

    conn.connect(err => {
        if (err) {
            console.log(err);
            next();
        } else {
            exec();
        }
    });

    function exec() {
        var request = new Request(statement, statementComplete);

        parameters.forEach(function(parameter) {
            request.addParameter(parameter.name, parameter.type, parameter.value);
        });

        request.on('columnMetadata', columnMetadata);
        request.on('row', row);
        request.on('done', requestDone);
        request.on('requestCompleted', requestCompleted);
      
        conn.execSql(request);
    }

    function columnMetadata(columnsMetadata) {
        columnsMetadata.forEach(function(column) {
            columns.push(column);
        });
    }

    function row(rowColumns) {
        var values = {};
        rowColumns.forEach(function(column) {
            values[column.metadata.colName] = column.value;
        });
        rows.push(values);
    }

    function statementComplete(err, rowCount) {
        if (err) {
            console.log('Statement failed: ' + err);
            errMsg=err;
            next();
        } else {
            //console.log('Statement succeeded: ' + rowCount + ' rows');
        }
    }

    function requestDone(rowCount, more) {
        console.log('Request done: ' + rowCount + ' rows');
    }

    function requestCompleted() {
        //console.log('Request completed');
        conn.close();
        if (!errMsg) {
            next(rows);
        }
    }
      
    function connectionEnd() {
        //console.log('Connection closed');
    }

    function connectionError(info) {
        if (info.number!=5701 && info.number!=5703) {
            // 5701: Changed database context to...
            // 5703: Changed language setting to...
            console.log('Msg '+info.number + ': ' + info.message);
        }
    }

    function connectionGeneralError(err) {
        console.log('General database error:');
        console.log(err);
    }

}



function simpleHtmlEncode(plaintext) {
    var html=plaintext;
    html=String(html).replace(/&/g, '&amp;');
    html=html.replace(/</g, '&lt;');
    html=html.replace(/>/g, '&gt;');
    return(html);
}

function htmlAttributeEncode(plaintext) {
    return simpleHtmlEncode(plaintext)
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


/*-----------------------------------------------------------------------------
  Format an HTML template:
  ---------------------------------------------------------------------------*/

function createHTML(templateFile, values) {
    var rn=Math.random();

    // Read the template file:
    var htmlTemplate = fs.readFileSync(path.resolve(__dirname, './'+templateFile), 'utf8').toString();

    // Loop through the JSON blob given as the argument to this function,
    // replace all occurrences of <%=param%> in the template with their
    // respective values.
    for (var param in values) {
        if (values.hasOwnProperty(param)) {
            htmlTemplate = htmlTemplate.split('\<\%\='+param+'\%\>').join(values[param]);
        }
    }

    // Special parameter that contains a random number (for caching reasons):
    htmlTemplate = htmlTemplate.split('\<\%\=rand\%\>').join(rn);
    
    // Clean up any remaining parameters in the template
    // that we haven't replaced with values from the JSON argument:
    while (htmlTemplate.includes('<%=')) {
        param=htmlTemplate.substr(htmlTemplate.indexOf('<%='), 100);
        param=param.substr(0, param.indexOf('%>')+2);
        htmlTemplate = htmlTemplate.split(param).join('');
    }

    // DONE.
    return(htmlTemplate);
}




/*-----------------------------------------------------------------------------
  Set a bunch of standard HTTP headers:
  ---------------------------------------------------------------------------*/

function httpHeaders(res) {
/*
    // The "preload" directive also enables the site to be pinned (HSTS with Preload)
    const hstsPreloadHeader = 'max-age=31536000; includeSubDomains; preload'
    res.header('Strict-Transport-Security', hstsPreloadHeader); // HTTP Strict Transport Security with preload
*/
    // Limits use of external script/css/image resources
    res.header('Content-Security-Policy', "default-src 'self'; style-src 'self' fonts.googleapis.com; script-src 'self' https://static.cloudflareinsights.com; font-src fonts.gstatic.com");

    // Don't allow this site to be embedded in a frame; helps mitigate clickjacking attacks
    res.header('X-Frame-Options', 'sameorigin');

    // Prevent MIME sniffing; instruct client to use the declared content type
    res.header('X-Content-Type-Options', 'nosniff');

    // Don't send a referrer to a linked page, to avoid transmitting sensitive information
    res.header('Referrer-Policy', 'no-referrer');

    // Limit access to local devices
    res.header('Permissions-Policy', "camera=(), display-capture=(), microphone=(), geolocation=(), usb=()"); // replaces Feature-Policy

    return;
}
