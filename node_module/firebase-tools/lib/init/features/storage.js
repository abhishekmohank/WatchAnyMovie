"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doSetup = void 0;
const clc = require("colorette");
const fs = require("fs");
const logger_1 = require("../../logger");
const prompt_1 = require("../../prompt");
const ensureCloudResourceLocation_1 = require("../../ensureCloudResourceLocation");
const RULES_TEMPLATE = fs.readFileSync(__dirname + "/../../../templates/init/storage/storage.rules", "utf8");
async function doSetup(setup, config) {
    setup.config.storage = {};
    (0, ensureCloudResourceLocation_1.ensureLocationSet)(setup.projectLocation, "Cloud Storage");
    logger_1.logger.info();
    logger_1.logger.info("Firebase Storage Security Rules allow you to define how and when to allow");
    logger_1.logger.info("uploads and downloads. You can keep these rules in your project directory");
    logger_1.logger.info("and publish them with " + clc.bold("firebase deploy") + ".");
    logger_1.logger.info();
    const storageRulesFile = await (0, prompt_1.promptOnce)({
        type: "input",
        name: "rules",
        message: "What file should be used for Storage Rules?",
        default: "storage.rules",
    });
    setup.config.storage.rules = storageRulesFile;
    await config.askWriteProjectFile(setup.config.storage.rules, RULES_TEMPLATE);
}
exports.doSetup = doSetup;
