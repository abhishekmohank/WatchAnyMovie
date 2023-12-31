"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readdirRecursive = void 0;
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const _ = require("lodash");
const minimatch = require("minimatch");
async function readdirRecursiveHelper(options) {
    const dirContents = (0, fs_extra_1.readdirSync)(options.path);
    const fullPaths = dirContents.map((n) => (0, path_1.join)(options.path, n));
    const filteredPaths = fullPaths.filter((p) => !options.filter(p));
    const filePromises = [];
    for (const p of filteredPaths) {
        const fstat = (0, fs_extra_1.statSync)(p);
        if (fstat.isFile()) {
            filePromises.push(Promise.resolve({ name: p, mode: fstat.mode }));
        }
        if (!fstat.isDirectory()) {
            continue;
        }
        filePromises.push(readdirRecursiveHelper({ path: p, filter: options.filter }));
    }
    const files = await Promise.all(filePromises);
    let flatFiles = _.flattenDeep(files);
    flatFiles = flatFiles.filter((f) => f !== null);
    return flatFiles;
}
async function readdirRecursive(options) {
    const mmopts = { matchBase: true, dot: true };
    const rules = (options.ignore || []).map((glob) => {
        return (p) => minimatch(p, glob, mmopts);
    });
    const filter = (t) => {
        return rules.some((rule) => {
            return rule(t);
        });
    };
    return readdirRecursiveHelper({
        path: options.path,
        filter: filter,
    });
}
exports.readdirRecursive = readdirRecursive;
