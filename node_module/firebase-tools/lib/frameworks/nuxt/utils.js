"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nuxtConfigFilesExist = exports.getNuxtVersion = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const utils_1 = require("../utils");
function getNuxtVersion(cwd) {
    var _a;
    return (_a = (0, utils_1.findDependency)("nuxt", {
        cwd,
        depth: 0,
        omitDev: false,
    })) === null || _a === void 0 ? void 0 : _a.version;
}
exports.getNuxtVersion = getNuxtVersion;
async function nuxtConfigFilesExist(dir) {
    const configFilesExist = await Promise.all([
        (0, fs_extra_1.pathExists)((0, path_1.join)(dir, "nuxt.config.js")),
        (0, fs_extra_1.pathExists)((0, path_1.join)(dir, "nuxt.config.ts")),
    ]);
    return configFilesExist.some((it) => it);
}
exports.nuxtConfigFilesExist = nuxtConfigFilesExist;
