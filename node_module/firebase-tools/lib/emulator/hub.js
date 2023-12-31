"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmulatorHub = void 0;
const os = require("os");
const fs = require("fs");
const path = require("path");
const utils = require("../utils");
const logger_1 = require("../logger");
const types_1 = require("./types");
const hubExport_1 = require("./hubExport");
const registry_1 = require("./registry");
const ExpressBasedEmulator_1 = require("./ExpressBasedEmulator");
const pkg = require("../../package.json");
class EmulatorHub extends ExpressBasedEmulator_1.ExpressBasedEmulator {
    static readLocatorFile(projectId) {
        const locatorPath = this.getLocatorFilePath(projectId);
        if (!fs.existsSync(locatorPath)) {
            return undefined;
        }
        const data = fs.readFileSync(locatorPath, "utf8").toString();
        const locator = JSON.parse(data);
        if (locator.version !== this.CLI_VERSION) {
            logger_1.logger.debug(`Found locator with mismatched version, ignoring: ${JSON.stringify(locator)}`);
            return undefined;
        }
        return locator;
    }
    static getLocatorFilePath(projectId) {
        const dir = os.tmpdir();
        const filename = `hub-${projectId}.json`;
        return path.join(dir, filename);
    }
    constructor(args) {
        super({
            listen: args.listen,
        });
        this.args = args;
    }
    async start() {
        await super.start();
        await this.writeLocatorFile();
    }
    async createExpressApp() {
        const app = await super.createExpressApp();
        app.get("/", (req, res) => {
            res.json(Object.assign(Object.assign({}, this.getLocator()), { host: utils.connectableHostname(this.args.listen[0].address), port: this.args.listen[0].port }));
        });
        app.get(EmulatorHub.PATH_EMULATORS, (req, res) => {
            const body = {};
            for (const info of registry_1.EmulatorRegistry.listRunningWithInfo()) {
                body[info.name] = Object.assign({ listen: this.args.listenForEmulator[info.name] }, info);
            }
            res.json(body);
        });
        app.post(EmulatorHub.PATH_EXPORT, async (req, res) => {
            const path = req.body.path;
            const initiatedBy = req.body.initiatedBy || "unknown";
            utils.logLabeledBullet("emulators", `Received export request. Exporting data to ${path}.`);
            try {
                await new hubExport_1.HubExport(this.args.projectId, {
                    path,
                    initiatedBy,
                }).exportAll();
                utils.logLabeledSuccess("emulators", "Export complete.");
                res.status(200).send({
                    message: "OK",
                });
            }
            catch (e) {
                const errorString = e.message || JSON.stringify(e);
                utils.logLabeledWarning("emulators", `Export failed: ${errorString}`);
                res.status(500).json({
                    message: errorString,
                });
            }
        });
        app.put(EmulatorHub.PATH_DISABLE_FUNCTIONS, async (req, res) => {
            utils.logLabeledBullet("emulators", `Disabling Cloud Functions triggers, non-HTTP functions will not execute.`);
            const instance = registry_1.EmulatorRegistry.get(types_1.Emulators.FUNCTIONS);
            if (!instance) {
                res.status(400).json({ error: "The Cloud Functions emulator is not running." });
                return;
            }
            const emu = instance;
            await emu.disableBackgroundTriggers();
            res.status(200).json({ enabled: false });
        });
        app.put(EmulatorHub.PATH_ENABLE_FUNCTIONS, async (req, res) => {
            utils.logLabeledBullet("emulators", `Enabling Cloud Functions triggers, non-HTTP functions will execute.`);
            const instance = registry_1.EmulatorRegistry.get(types_1.Emulators.FUNCTIONS);
            if (!instance) {
                res.status(400).send("The Cloud Functions emulator is not running.");
                return;
            }
            const emu = instance;
            await emu.reloadTriggers();
            res.status(200).json({ enabled: true });
        });
        return app;
    }
    async stop() {
        await super.stop();
        await this.deleteLocatorFile();
    }
    getName() {
        return types_1.Emulators.HUB;
    }
    getLocator() {
        const version = pkg.version;
        const origins = [];
        for (const spec of this.args.listen) {
            if (spec.family === "IPv6") {
                origins.push(`http://[${utils.connectableHostname(spec.address)}]:${spec.port}`);
            }
            else {
                origins.push(`http://${utils.connectableHostname(spec.address)}:${spec.port}`);
            }
        }
        return {
            version,
            origins,
        };
    }
    async writeLocatorFile() {
        const projectId = this.args.projectId;
        const locatorPath = EmulatorHub.getLocatorFilePath(projectId);
        const locator = this.getLocator();
        if (fs.existsSync(locatorPath)) {
            utils.logLabeledWarning("emulators", `It seems that you are running multiple instances of the emulator suite for project ${projectId}. This may result in unexpected behavior.`);
        }
        logger_1.logger.debug(`[hub] writing locator at ${locatorPath}`);
        return new Promise((resolve, reject) => {
            fs.writeFile(locatorPath, JSON.stringify(locator), (e) => {
                if (e) {
                    reject(e);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async deleteLocatorFile() {
        const locatorPath = EmulatorHub.getLocatorFilePath(this.args.projectId);
        return new Promise((resolve, reject) => {
            fs.unlink(locatorPath, (e) => {
                if (e) {
                    reject(e);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
exports.EmulatorHub = EmulatorHub;
EmulatorHub.CLI_VERSION = pkg.version;
EmulatorHub.PATH_EXPORT = "/_admin/export";
EmulatorHub.PATH_DISABLE_FUNCTIONS = "/functions/disableBackgroundTriggers";
EmulatorHub.PATH_ENABLE_FUNCTIONS = "/functions/enableBackgroundTriggers";
EmulatorHub.PATH_EMULATORS = "/emulators";
