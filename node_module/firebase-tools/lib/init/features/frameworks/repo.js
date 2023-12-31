"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateRepository = exports.getOrCreateConnection = exports.linkGitHubRepository = void 0;
const api_1 = require("../../../api");
const error_1 = require("../../../error");
const gcb = require("../../../gcp/cloudbuild");
const logger_1 = require("../../../logger");
const poller = require("../../../operation-poller");
const utils = require("../../../utils");
const prompt_1 = require("../../../prompt");
const gcbPollerOptions = {
    apiOrigin: api_1.cloudbuildOrigin,
    apiVersion: "v2",
    masterTimeout: 25 * 60 * 1000,
    maxBackoff: 10000,
};
function extractRepoSlugFromURI(remoteUri) {
    const match = /github.com\/(.+).git/.exec(remoteUri);
    if (!match) {
        return undefined;
    }
    return match[1];
}
function generateRepositoryId(remoteUri) {
    var _a;
    return (_a = extractRepoSlugFromURI(remoteUri)) === null || _a === void 0 ? void 0 : _a.replaceAll("/", "-");
}
function generateConnectionId(location) {
    return `frameworks-${location}`;
}
async function linkGitHubRepository(projectId, location) {
    const connectionId = generateConnectionId(location);
    await getOrCreateConnection(projectId, location, connectionId);
    let remoteUri = await promptRepositoryURI(projectId, location, connectionId);
    while (remoteUri === "") {
        await utils.openInBrowser("https://github.com/apps/google-cloud-build/installations/new");
        await (0, prompt_1.promptOnce)({
            type: "input",
            message: "Press ENTER once you have finished configuring your installation's access settings.",
        });
        remoteUri = await promptRepositoryURI(projectId, location, connectionId);
    }
    const repo = await getOrCreateRepository(projectId, location, connectionId, remoteUri);
    logger_1.logger.info(`Successfully linked GitHub repository at remote URI ${remoteUri}.`);
    return repo;
}
exports.linkGitHubRepository = linkGitHubRepository;
async function promptRepositoryURI(projectId, location, connectionId) {
    const resp = await gcb.fetchLinkableRepositories(projectId, location, connectionId);
    if (!resp.repositories || resp.repositories.length === 0) {
        throw new error_1.FirebaseError("The GitHub App does not have access to any repositories. Please configure " +
            "your app installation permissions at https://github.com/settings/installations.");
    }
    const choices = resp.repositories.map((repo) => ({
        name: extractRepoSlugFromURI(repo.remoteUri) || repo.remoteUri,
        value: repo.remoteUri,
    }));
    choices.push({
        name: "Missing a repo? Select this option to configure your installation's access settings",
        value: "",
    });
    return await (0, prompt_1.promptOnce)({
        type: "list",
        message: "Which of the following repositories would you like to link?",
        choices,
    });
}
async function promptConnectionAuth(conn, projectId, location, connectionId) {
    logger_1.logger.info(conn.installationState.message);
    logger_1.logger.info(conn.installationState.actionUri);
    await utils.openInBrowser(conn.installationState.actionUri);
    await (0, prompt_1.promptOnce)({
        type: "input",
        message: "Press any key once you have authorized the app (Cloud Build) to access your GitHub repo.",
    });
    return await gcb.getConnection(projectId, location, connectionId);
}
async function getOrCreateConnection(projectId, location, connectionId) {
    let conn;
    try {
        conn = await gcb.getConnection(projectId, location, connectionId);
    }
    catch (err) {
        if (err.status === 404) {
            const op = await gcb.createConnection(projectId, location, connectionId);
            conn = await poller.pollOperation(Object.assign(Object.assign({}, gcbPollerOptions), { pollerName: `create-${location}-${connectionId}`, operationResourceName: op.name }));
        }
        else {
            throw err;
        }
    }
    while (conn.installationState.stage !== "COMPLETE") {
        conn = await promptConnectionAuth(conn, projectId, location, connectionId);
    }
    return conn;
}
exports.getOrCreateConnection = getOrCreateConnection;
async function getOrCreateRepository(projectId, location, connectionId, remoteUri) {
    const repositoryId = generateRepositoryId(remoteUri);
    if (!repositoryId) {
        throw new error_1.FirebaseError(`Failed to generate repositoryId for URI "${remoteUri}".`);
    }
    let repo;
    try {
        repo = await gcb.getRepository(projectId, location, connectionId, repositoryId);
        const repoSlug = extractRepoSlugFromURI(repo.remoteUri);
        if (repoSlug) {
            throw new error_1.FirebaseError(`${repoSlug} has already been linked.`);
        }
    }
    catch (err) {
        if (err.status === 404) {
            const op = await gcb.createRepository(projectId, location, connectionId, repositoryId, remoteUri);
            repo = await poller.pollOperation(Object.assign(Object.assign({}, gcbPollerOptions), { pollerName: `create-${location}-${connectionId}-${repositoryId}`, operationResourceName: op.name }));
        }
        else {
            throw err;
        }
    }
    return repo;
}
exports.getOrCreateRepository = getOrCreateRepository;
