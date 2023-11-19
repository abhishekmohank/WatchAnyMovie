"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const command_1 = require("../command");
const projectUtils_1 = require("../projectUtils");
const error_1 = require("../error");
const gcp = require("../gcp/frameworks");
const prompt_1 = require("../prompt");
const utils = require("../utils");
exports.command = new command_1.Command("backends:delete")
    .description("Delete a backend from a Firebase project")
    .option("-l, --location <location>", "App Backend location", "us-central1")
    .option("-s, --backendId <backendId>", "Backend Id", "")
    .withForce()
    .action(async (options) => {
    const projectId = (0, projectUtils_1.needProjectId)(options);
    const location = options.location;
    const backendId = options.backendId;
    if (!backendId) {
        throw new error_1.FirebaseError("Backend id can't be empty.");
    }
    const confirmDeletion = await (0, prompt_1.promptOnce)({
        type: "confirm",
        name: "force",
        default: false,
        message: "You are about to delete the backend with id: " + backendId + "\n  Are you sure?",
    }, options);
    if (!confirmDeletion) {
        throw new error_1.FirebaseError("Deletion aborted.");
    }
    try {
        await gcp.deleteBackend(projectId, location, backendId);
        utils.logSuccess(`Successfully deleted the backend: ${backendId}`);
    }
    catch (err) {
        throw new error_1.FirebaseError(`Failed to delete backend: ${backendId}. Please check the parameters you have provided.`, { original: err });
    }
});
