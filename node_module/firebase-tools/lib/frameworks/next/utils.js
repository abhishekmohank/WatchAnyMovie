"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextVersion = exports.getBuildId = exports.getHeadersFromMetaFiles = exports.getNonStaticServerComponents = exports.getNonStaticRoutes = exports.getMiddlewareMatcherRegexes = exports.allDependencyNames = exports.isUsingAppDirectory = exports.isUsingNextImageInAppDirectory = exports.isUsingImageOptimization = exports.isUsingMiddleware = exports.hasUnoptimizedImage = exports.usesNextImage = exports.usesAppDirRouter = exports.getNextjsRewritesToUse = exports.isHeaderSupportedByHosting = exports.isRedirectSupportedByHosting = exports.isRewriteSupportedByHosting = exports.cleanI18n = exports.cleanCustomRouteI18n = exports.cleanEscapedChars = exports.I18N_SOURCE = void 0;
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const glob_1 = require("glob");
const semver_1 = require("semver");
const utils_1 = require("../utils");
const constants_1 = require("./constants");
const fsutils_1 = require("../../fsutils");
exports.I18N_SOURCE = /\/:nextInternalLocale(\([^\)]+\))?/;
function cleanEscapedChars(path) {
    return path.replace(/\\([(){}:+?*])/g, (a, b) => b);
}
exports.cleanEscapedChars = cleanEscapedChars;
function cleanCustomRouteI18n(path) {
    return path.replace(exports.I18N_SOURCE, "");
}
exports.cleanCustomRouteI18n = cleanCustomRouteI18n;
function cleanI18n(it) {
    const [, localesRegex] = it.source.match(exports.I18N_SOURCE) || [undefined, undefined];
    const source = localesRegex ? cleanCustomRouteI18n(it.source) : it.source;
    const destination = "destination" in it && localesRegex ? cleanCustomRouteI18n(it.destination) : it.destination;
    const regex = "regex" in it && localesRegex ? it.regex.replace(`(?:/${localesRegex})`, "") : it.regex;
    return Object.assign(Object.assign({}, it), { source,
        destination,
        regex });
}
exports.cleanI18n = cleanI18n;
function isRewriteSupportedByHosting(rewrite) {
    return !("has" in rewrite ||
        "missing" in rewrite ||
        (0, utils_1.isUrl)(rewrite.destination) ||
        rewrite.destination.includes("?"));
}
exports.isRewriteSupportedByHosting = isRewriteSupportedByHosting;
function isRedirectSupportedByHosting(redirect) {
    return !("has" in redirect ||
        "missing" in redirect ||
        "internal" in redirect ||
        redirect.destination.includes("?"));
}
exports.isRedirectSupportedByHosting = isRedirectSupportedByHosting;
function isHeaderSupportedByHosting(header) {
    return !("has" in header || "missing" in header);
}
exports.isHeaderSupportedByHosting = isHeaderSupportedByHosting;
function getNextjsRewritesToUse(nextJsRewrites) {
    if (Array.isArray(nextJsRewrites)) {
        return nextJsRewrites.map(cleanI18n);
    }
    if (nextJsRewrites === null || nextJsRewrites === void 0 ? void 0 : nextJsRewrites.beforeFiles) {
        return nextJsRewrites.beforeFiles.map(cleanI18n);
    }
    return [];
}
exports.getNextjsRewritesToUse = getNextjsRewritesToUse;
function usesAppDirRouter(sourceDir) {
    const appPathRoutesManifestPath = (0, path_1.join)(sourceDir, constants_1.APP_PATH_ROUTES_MANIFEST);
    return (0, fs_1.existsSync)(appPathRoutesManifestPath);
}
exports.usesAppDirRouter = usesAppDirRouter;
async function usesNextImage(sourceDir, distDir) {
    const exportMarker = await (0, utils_1.readJSON)((0, path_1.join)(sourceDir, distDir, constants_1.EXPORT_MARKER));
    return exportMarker.isNextImageImported;
}
exports.usesNextImage = usesNextImage;
async function hasUnoptimizedImage(sourceDir, distDir) {
    const imagesManifest = await (0, utils_1.readJSON)((0, path_1.join)(sourceDir, distDir, constants_1.IMAGES_MANIFEST));
    return imagesManifest.images.unoptimized;
}
exports.hasUnoptimizedImage = hasUnoptimizedImage;
async function isUsingMiddleware(dir, isDevMode) {
    if (isDevMode) {
        const [middlewareJs, middlewareTs] = await Promise.all([
            (0, fs_extra_1.pathExists)((0, path_1.join)(dir, "middleware.js")),
            (0, fs_extra_1.pathExists)((0, path_1.join)(dir, "middleware.ts")),
        ]);
        return middlewareJs || middlewareTs;
    }
    else {
        const middlewareManifest = await (0, utils_1.readJSON)((0, path_1.join)(dir, "server", constants_1.MIDDLEWARE_MANIFEST));
        return Object.keys(middlewareManifest.middleware).length > 0;
    }
}
exports.isUsingMiddleware = isUsingMiddleware;
async function isUsingImageOptimization(projectDir, distDir) {
    let isNextImageImported = await usesNextImage(projectDir, distDir);
    if (!isNextImageImported && isUsingAppDirectory((0, path_1.join)(projectDir, distDir))) {
        if (await isUsingNextImageInAppDirectory(projectDir, distDir)) {
            isNextImageImported = true;
        }
    }
    if (isNextImageImported) {
        const imagesManifest = await (0, utils_1.readJSON)((0, path_1.join)(projectDir, distDir, constants_1.IMAGES_MANIFEST));
        return !imagesManifest.images.unoptimized;
    }
    return false;
}
exports.isUsingImageOptimization = isUsingImageOptimization;
async function isUsingNextImageInAppDirectory(projectDir, nextDir) {
    const files = (0, glob_1.sync)((0, path_1.join)(projectDir, nextDir, "server", "**", "*client-reference-manifest.js"));
    for (const filepath of files) {
        const fileContents = await (0, promises_1.readFile)(filepath);
        if (fileContents.includes("node_modules/next/dist/client/image")) {
            return true;
        }
    }
    return false;
}
exports.isUsingNextImageInAppDirectory = isUsingNextImageInAppDirectory;
function isUsingAppDirectory(dir) {
    const appPathRoutesManifestPath = (0, path_1.join)(dir, constants_1.APP_PATH_ROUTES_MANIFEST);
    return (0, fsutils_1.fileExistsSync)(appPathRoutesManifestPath);
}
exports.isUsingAppDirectory = isUsingAppDirectory;
function allDependencyNames(mod) {
    if (!mod.dependencies)
        return [];
    const dependencyNames = Object.keys(mod.dependencies).reduce((acc, it) => [...acc, it, ...allDependencyNames(mod.dependencies[it])], []);
    return dependencyNames;
}
exports.allDependencyNames = allDependencyNames;
function getMiddlewareMatcherRegexes(middlewareManifest) {
    const middlewareObjectValues = Object.values(middlewareManifest.middleware);
    let middlewareMatchers;
    if (middlewareManifest.version === 1) {
        middlewareMatchers = middlewareObjectValues.map((page) => ({ regexp: page.regexp }));
    }
    else {
        middlewareMatchers = middlewareObjectValues
            .map((page) => page.matchers)
            .flat();
    }
    return middlewareMatchers.map((matcher) => new RegExp(matcher.regexp));
}
exports.getMiddlewareMatcherRegexes = getMiddlewareMatcherRegexes;
function getNonStaticRoutes(pagesManifestJSON, prerenderedRoutes, dynamicRoutes) {
    const nonStaticRoutes = Object.entries(pagesManifestJSON)
        .filter(([it, src]) => !((0, path_1.extname)(src) !== ".js" ||
        ["/_app", "/_error", "/_document"].includes(it) ||
        prerenderedRoutes.includes(it) ||
        dynamicRoutes.includes(it)))
        .map(([it]) => it);
    return nonStaticRoutes;
}
exports.getNonStaticRoutes = getNonStaticRoutes;
function getNonStaticServerComponents(appPathsManifest, appPathRoutesManifest, prerenderedRoutes, dynamicRoutes) {
    const nonStaticServerComponents = Object.entries(appPathsManifest)
        .filter(([it, src]) => {
        if ((0, path_1.extname)(src) !== ".js")
            return;
        const path = appPathRoutesManifest[it];
        return !(prerenderedRoutes.includes(path) || dynamicRoutes.includes(path));
    })
        .map(([it]) => it);
    return nonStaticServerComponents;
}
exports.getNonStaticServerComponents = getNonStaticServerComponents;
async function getHeadersFromMetaFiles(sourceDir, distDir, basePath, appPathRoutesManifest) {
    const headers = [];
    await Promise.all(Object.entries(appPathRoutesManifest).map(async ([key, source]) => {
        if ((0, path_1.basename)(key) !== "route")
            return;
        const parts = source.split("/").filter((it) => !!it);
        const partsOrIndex = parts.length > 0 ? parts : ["index"];
        const routePath = (0, path_1.join)(sourceDir, distDir, "server", "app", ...partsOrIndex);
        const metadataPath = `${routePath}.meta`;
        if ((0, fsutils_1.dirExistsSync)(routePath) && (0, fsutils_1.fileExistsSync)(metadataPath)) {
            const meta = await (0, utils_1.readJSON)(metadataPath);
            if (meta.headers)
                headers.push({
                    source: path_1.posix.join(basePath, source),
                    headers: Object.entries(meta.headers).map(([key, value]) => ({ key, value })),
                });
        }
    }));
    return headers;
}
exports.getHeadersFromMetaFiles = getHeadersFromMetaFiles;
async function getBuildId(distDir) {
    const buildId = await (0, promises_1.readFile)((0, path_1.join)(distDir, "BUILD_ID"));
    return buildId.toString();
}
exports.getBuildId = getBuildId;
function getNextVersion(cwd) {
    const dependency = (0, utils_1.findDependency)("next", { cwd, depth: 0, omitDev: false });
    if (!dependency)
        return undefined;
    const nextVersionSemver = (0, semver_1.coerce)(dependency.version);
    if (!nextVersionSemver)
        return dependency.version;
    return nextVersionSemver.toString();
}
exports.getNextVersion = getNextVersion;
