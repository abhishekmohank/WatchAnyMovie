"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthEmulator = exports.SingleProjectMode = void 0;
const fs = require("fs");
const path = require("path");
const http = require("http");
const utils = require("../../utils");
const constants_1 = require("../constants");
const emulatorLogger_1 = require("../emulatorLogger");
const types_1 = require("../types");
const server_1 = require("./server");
const error_1 = require("../../error");
const track_1 = require("../../track");
var SingleProjectMode;
(function (SingleProjectMode) {
    SingleProjectMode[SingleProjectMode["NO_WARNING"] = 0] = "NO_WARNING";
    SingleProjectMode[SingleProjectMode["WARNING"] = 1] = "WARNING";
    SingleProjectMode[SingleProjectMode["ERROR"] = 2] = "ERROR";
})(SingleProjectMode = exports.SingleProjectMode || (exports.SingleProjectMode = {}));
class AuthEmulator {
    constructor(args) {
        this.args = args;
    }
    async start() {
        const { host, port } = this.getInfo();
        const app = await (0, server_1.createApp)(this.args.projectId, this.args.singleProjectMode);
        const server = app.listen(port, host);
        this.destroyServer = utils.createDestroyer(server);
    }
    async connect() {
    }
    stop() {
        return this.destroyServer ? this.destroyServer() : Promise.resolve();
    }
    getInfo() {
        const host = this.args.host || constants_1.Constants.getDefaultHost();
        const port = this.args.port || constants_1.Constants.getDefaultPort(types_1.Emulators.AUTH);
        return {
            name: this.getName(),
            host,
            port,
        };
    }
    getName() {
        return types_1.Emulators.AUTH;
    }
    async importData(authExportDir, projectId, options) {
        void (0, track_1.trackEmulator)("emulator_import", {
            initiated_by: options.initiatedBy,
            emulator_name: types_1.Emulators.AUTH,
        });
        const logger = emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.AUTH);
        const { host, port } = this.getInfo();
        const configPath = path.join(authExportDir, "config.json");
        const configStat = await stat(configPath);
        if (configStat === null || configStat === void 0 ? void 0 : configStat.isFile()) {
            logger.logLabeled("BULLET", "auth", `Importing config from ${configPath}`);
            await importFromFile({
                method: "PATCH",
                host: utils.connectableHostname(host),
                port,
                path: `/emulator/v1/projects/${projectId}/config`,
                headers: {
                    Authorization: "Bearer owner",
                    "Content-Type": "application/json",
                },
            }, configPath);
        }
        else {
            logger.logLabeled("WARN", "auth", `Skipped importing config because ${configPath} does not exist.`);
        }
        const accountsPath = path.join(authExportDir, "accounts.json");
        const accountsStat = await stat(accountsPath);
        if (accountsStat === null || accountsStat === void 0 ? void 0 : accountsStat.isFile()) {
            logger.logLabeled("BULLET", "auth", `Importing accounts from ${accountsPath}`);
            await importFromFile({
                method: "POST",
                host: utils.connectableHostname(host),
                port,
                path: `/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchCreate`,
                headers: {
                    Authorization: "Bearer owner",
                    "Content-Type": "application/json",
                },
            }, accountsPath, { ignoreErrors: ["MISSING_USER_ACCOUNT"] });
        }
        else {
            logger.logLabeled("WARN", "auth", `Skipped importing accounts because ${accountsPath} does not exist.`);
        }
    }
}
exports.AuthEmulator = AuthEmulator;
function stat(path) {
    return new Promise((resolve, reject) => fs.stat(path, (err, stats) => {
        if (err) {
            if (err.code === "ENOENT") {
                return resolve(undefined);
            }
            return reject(err);
        }
        else {
            return resolve(stats);
        }
    }));
}
function importFromFile(reqOptions, path, options = {}) {
    const readStream = fs.createReadStream(path);
    return new Promise((resolve, reject) => {
        const req = http.request(reqOptions, (response) => {
            if (response.statusCode === 200) {
                resolve();
            }
            else {
                let data = "";
                response
                    .on("data", (d) => {
                    data += d.toString();
                })
                    .on("error", reject)
                    .on("end", () => {
                    const ignoreErrors = options === null || options === void 0 ? void 0 : options.ignoreErrors;
                    if (ignoreErrors === null || ignoreErrors === void 0 ? void 0 : ignoreErrors.length) {
                        let message;
                        try {
                            message = JSON.parse(data).error.message;
                        }
                        catch (_a) {
                            message = undefined;
                        }
                        if (message && ignoreErrors.includes(message)) {
                            return resolve();
                        }
                    }
                    return reject(new error_1.FirebaseError(`Received HTTP status code: ${response.statusCode}\n${data}`));
                });
            }
        });
        req.on("error", reject);
        readStream.pipe(req, { end: true });
    }).catch((e) => {
        throw new error_1.FirebaseError(`Error during Auth Emulator import: ${e.message}`, {
            original: e,
            exit: 1,
        });
    });
}
