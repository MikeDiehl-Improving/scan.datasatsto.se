// Shared mock for the `tedious` SQL Server driver, used by tests that exercise
// server.js routes backed by sqlQuery() without hitting a real database.
//
// server.js is a CommonJS module and calls `require('tedious')` internally.
// Vitest's `vi.mock()` does not intercept that require (it uses Node's real
// `createRequire`, bypassing the mocked module graph), so instead this patches
// the low-level `Module._load` hook directly. Import this file BEFORE
// `../../server.js` in any test that needs it (an import's module body runs
// before a later sibling import's, per ES module evaluation order), so the
// patch is installed before server.js's top-level `require('tedious')` runs.
import Module from 'node:module';

const tediousQueue = [];

export function queueTediousRows(rows) {
    tediousQueue.push({ rows, error: null });
}

export function queueTediousError(error) {
    tediousQueue.push({ rows: [], error });
}

export function resetTediousQueue() {
    tediousQueue.length = 0;
}

class MockTediousRequest {
    constructor(sqlText, callback) {
        this.sqlText = sqlText;
        this.callback = callback;
        this._listeners = {};
    }
    addParameter() {}
    on(event, handler) {
        this._listeners[event] = handler;
        return this;
    }
}

class MockTediousConnection {
    constructor(config) {
        this.config = config;
        this._listeners = {};
    }
    on(event, handler) {
        this._listeners[event] = handler;
        return this;
    }
    connect(cb) {
        process.nextTick(() => cb(null));
    }
    execSql(request) {
        process.nextTick(() => {
            const next = tediousQueue.shift() || { rows: [], error: null };

            if (next.error) {
                if (request.callback) { request.callback(next.error); }
                return;
            }

            const rows = next.rows;
            if (rows.length > 0 && request._listeners.columnMetadata) {
                request._listeners.columnMetadata(Object.keys(rows[0]).map((name) => ({ colName: name })));
            }
            rows.forEach((row) => {
                if (request._listeners.row) {
                    request._listeners.row(Object.entries(row).map(([colName, value]) => ({ metadata: { colName }, value })));
                }
            });
            if (request._listeners.done) { request._listeners.done(rows.length, false); }
            if (request.callback) { request.callback(null, rows.length); }
            if (request._listeners.requestCompleted) { request._listeners.requestCompleted(); }
        });
    }
    close() {
        if (this._listeners.end) { this._listeners.end(); }
    }
}

const mockedTediousExports = {
    Connection: MockTediousConnection,
    Request: MockTediousRequest,
    TYPES: new Proxy({}, { get: () => 'MOCK_TYPE' }),
    ISOLATION_LEVEL: new Proxy({}, { get: () => 0 }),
};

if (!Module._load.__isTediousMockPatch) {
    const originalLoad = Module._load;
    const patchedLoad = function (request, parent, isMain) {
        if (request === 'tedious') {
            return mockedTediousExports;
        }
        return originalLoad.apply(this, arguments);
    };
    patchedLoad.__isTediousMockPatch = true;
    Module._load = patchedLoad;
}
