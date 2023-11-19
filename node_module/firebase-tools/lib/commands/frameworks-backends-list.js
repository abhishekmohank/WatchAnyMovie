"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const command_1 = require("../command");
const projectUtils_1 = require("../projectUtils");
const gcp = require("../gcp/frameworks");
const error_1 = require("../error");
const logger_1 = require("../logger");
const colorette_1 = require("colorette");
const Table = require("cli-table");
exports.command = new command_1.Command("backends:list")
    .description("List backends of a Firebase project.")
    .option("-l, --location <location>", "App Backend location", "us-central1")
    .action(async (options) => {
    const projectId = (0, projectUtils_1.needProjectId)(options);
    const location = options.location;
    const table = new Table({
        head: ["Backend Id", "Repository Name", "URL", "Location", "Created Date", "Updated Date"],
        style: { head: ["green"] },
    });
    let backendsList;
    try {
        backendsList = await gcp.listBackends(projectId, location);
        for (const backend of backendsList.backends) {
            const entry = [
                backend.name,
                backend.codebase.repository,
                backend.uri,
                backend.createTime,
                backend.updateTime,
            ];
            table.push(entry);
        }
        logger_1.logger.info(`Backends for project ${(0, colorette_1.bold)(projectId)}`);
        logger_1.logger.info(table.toString());
    }
    catch (err) {
        throw new error_1.FirebaseError(`Unable to list backends present in project: ${projectId}. Please check the parameters you have provided.`, { original: err });
    }
    return backendsList;
});
