"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const command_1 = require("../command");
const projectUtils_1 = require("../projectUtils");
const gcp = require("../gcp/frameworks");
const error_1 = require("../error");
const logger_1 = require("../logger");
const Table = require("cli-table");
exports.command = new command_1.Command("backends:get")
    .description("Get backend details of a Firebase project")
    .option("-l, --location <location>", "App Backend location", "us-central1")
    .option("--s, --backendId <backendId>", "Backend Id", "")
    .action(async (options) => {
    const projectId = (0, projectUtils_1.needProjectId)(options);
    const location = options.location;
    const backendId = options.backendId;
    if (!backendId) {
        throw new error_1.FirebaseError("Backend id can't be empty.");
    }
    let backend;
    try {
        backend = await gcp.getBackend(projectId, location, backendId);
        const table = new Table({
            head: ["Backend Id", "Repository Name", "URL", "Location", "Created Date", "Updated Date"],
            style: { head: ["green"] },
        });
        table.push([
            backend.name,
            backend.codebase.repository,
            backend.uri,
            backend.createTime,
            backend.updateTime,
        ]);
        logger_1.logger.info(table.toString());
    }
    catch (err) {
        throw new error_1.FirebaseError(`Failed to get backend: ${backendId}. Please check the parameters you have provided.`, { original: err });
    }
    return backend;
});
