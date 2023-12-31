"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const clc = require("colorette");
const command_1 = require("../command");
const utils = require("../utils");
const auth = require("../auth");
const error_1 = require("../error");
exports.command = new command_1.Command("login:use <email>")
    .description("set the default account to use for this project directory")
    .action((email, options) => {
    const allAccounts = auth.getAllAccounts();
    const accountExists = allAccounts.some((a) => a.user.email === email);
    if (!accountExists) {
        throw new error_1.FirebaseError(`Account ${email} does not exist, run "${clc.bold("firebase login:list")}" to see valid accounts`);
    }
    const projectDir = options.projectRoot;
    if (!projectDir) {
        throw new error_1.FirebaseError("Could not determine active Firebase project directory");
    }
    auth.setProjectAccount(projectDir, email);
    utils.logSuccess(`Set default account ${email} for current project directory.`);
    return email;
});
