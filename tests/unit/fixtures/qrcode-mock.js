// Shared mock for the `qrcode` package, used by tests that exercise
// server.js routes that generate QR images/data URLs (e.g. attendee registration).
//
// Same rationale/technique as tedious-mock.js: server.js calls `require('qrcode')`
// internally (CJS), which Vitest's `vi.mock()` cannot intercept in this project's
// setup, so this patches `Module._load` directly. Import this file BEFORE
// `../../server.js` in any test that needs it.
import Module from 'node:module';

let nextToFileError = null;
let nextDataUrlError = null;
let nextDataUrl = 'data:image/png;base64,MOCKQRDATA';

export function queueQrToFileError(error) {
    nextToFileError = error;
}

export function queueQrToDataURLError(error) {
    nextDataUrlError = error;
}

export function resetQrMock() {
    nextToFileError = null;
    nextDataUrlError = null;
    nextDataUrl = 'data:image/png;base64,MOCKQRDATA';
}

const mockedQrcodeExports = {
    toFile: (path, text, cb) => {
        process.nextTick(() => cb(nextToFileError || null));
    },
    toDataURL: (text, cb) => {
        process.nextTick(() => cb(nextDataUrlError || null, nextDataUrlError ? null : nextDataUrl));
    },
};

if (!Module._load.__isQrcodeMockPatch) {
    const originalLoad = Module._load;
    const patchedLoad = function (request, parent, isMain) {
        if (request === 'qrcode') {
            return mockedQrcodeExports;
        }
        return originalLoad.apply(this, arguments);
    };
    patchedLoad.__isQrcodeMockPatch = true;
    Module._load = patchedLoad;
}
