"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ɵcodegenFunctionsDirectory = exports.shouldUseDevModeHandle = exports.getValidBuildTargets = exports.ɵcodegenPublicDirectory = exports.getDevModeHandle = exports.build = exports.init = exports.discover = exports.docsUrl = exports.type = exports.support = exports.name = void 0;
const path_1 = require("path");
const child_process_1 = require("child_process");
const cross_spawn_1 = require("cross-spawn");
const fs_extra_1 = require("fs-extra");
const promises_1 = require("fs/promises");
const prompt_1 = require("../../prompt");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
const constants_1 = require("../constants");
const error_1 = require("../../error");
exports.name = "Angular";
exports.support = "preview";
exports.type = 3;
exports.docsUrl = "https://firebase.google.com/docs/hosting/frameworks/angular";
const DEFAULT_BUILD_SCRIPT = ["ng build"];
async function discover(dir) {
    if (!(await (0, fs_extra_1.pathExists)((0, path_1.join)(dir, "package.json"))))
        return;
    if (!(await (0, fs_extra_1.pathExists)((0, path_1.join)(dir, "angular.json"))))
        return;
    return { mayWantBackend: true, publicDirectory: (0, path_1.join)(dir, "src", "assets") };
}
exports.discover = discover;
async function init(setup, config) {
    (0, child_process_1.execSync)(`npx --yes -p @angular/cli@latest ng new ${setup.projectId} --directory ${setup.hosting.source} --skip-git`, {
        stdio: "inherit",
        cwd: config.projectDir,
    });
    const useAngularUniversal = await (0, prompt_1.promptOnce)({
        name: "useAngularUniversal",
        type: "confirm",
        default: false,
        message: `Would you like to setup Angular Universal?`,
    });
    if (useAngularUniversal) {
        (0, child_process_1.execSync)("ng add @nguniversal/express-engine --skip-confirmation", {
            stdio: "inherit",
            cwd: (0, path_1.join)(config.projectDir, setup.hosting.source),
        });
    }
}
exports.init = init;
async function build(dir, configuration) {
    const { targets, serverTarget, serveOptimizedImages, locales, baseHref: baseUrl, } = await (0, utils_2.getBuildConfig)(dir, configuration);
    await (0, utils_1.warnIfCustomBuildScript)(dir, exports.name, DEFAULT_BUILD_SCRIPT);
    for (const target of targets) {
        const cli = (0, utils_1.getNodeModuleBin)("ng", dir);
        const result = (0, cross_spawn_1.sync)(cli, ["run", target], {
            cwd: dir,
            stdio: "inherit",
        });
        if (result.status !== 0)
            throw new error_1.FirebaseError(`Unable to build ${target}`);
    }
    const wantsBackend = !!serverTarget || serveOptimizedImages;
    const rewrites = serverTarget
        ? []
        : [
            {
                source: path_1.posix.join(baseUrl, "**"),
                destination: path_1.posix.join(baseUrl, "index.html"),
            },
        ];
    const i18n = !!locales;
    return { wantsBackend, i18n, rewrites, baseUrl };
}
exports.build = build;
async function getDevModeHandle(dir, configuration) {
    const { targetStringFromTarget } = (0, utils_1.relativeRequire)(dir, "@angular-devkit/architect");
    const { serveTarget } = await (0, utils_2.getContext)(dir, configuration);
    if (!serveTarget)
        throw new Error("Could not find the serveTarget");
    const host = new Promise((resolve, reject) => {
        const cli = (0, utils_1.getNodeModuleBin)("ng", dir);
        const serve = (0, cross_spawn_1.spawn)(cli, ["run", targetStringFromTarget(serveTarget), "--host", "localhost"], {
            cwd: dir,
        });
        serve.stdout.on("data", (data) => {
            process.stdout.write(data);
            const match = data.toString().match(/(http:\/\/localhost:\d+)/);
            if (match)
                resolve(match[1]);
        });
        serve.stderr.on("data", (data) => {
            process.stderr.write(data);
        });
        serve.on("exit", reject);
    });
    return (0, utils_1.simpleProxy)(await host);
}
exports.getDevModeHandle = getDevModeHandle;
async function ɵcodegenPublicDirectory(sourceDir, destDir, configuration) {
    const { outputPath, baseHref, defaultLocale, locales } = await (0, utils_2.getBrowserConfig)(sourceDir, configuration);
    await (0, promises_1.mkdir)((0, path_1.join)(destDir, baseHref), { recursive: true });
    if (locales) {
        await Promise.all([
            defaultLocale
                ? await (0, fs_extra_1.copy)((0, path_1.join)(sourceDir, outputPath, defaultLocale), (0, path_1.join)(destDir, baseHref))
                : Promise.resolve(),
            ...locales.map(async (locale) => {
                await (0, promises_1.mkdir)((0, path_1.join)(destDir, constants_1.I18N_ROOT, locale, baseHref), { recursive: true });
                await (0, fs_extra_1.copy)((0, path_1.join)(sourceDir, outputPath, locale), (0, path_1.join)(destDir, constants_1.I18N_ROOT, locale, baseHref));
            }),
        ]);
    }
    else {
        await (0, fs_extra_1.copy)((0, path_1.join)(sourceDir, outputPath), (0, path_1.join)(destDir, baseHref));
    }
}
exports.ɵcodegenPublicDirectory = ɵcodegenPublicDirectory;
async function getValidBuildTargets(purpose, dir) {
    const validTargetNames = new Set(["development", "production"]);
    try {
        const { workspaceProject, browserTarget, serverTarget, serveTarget } = await (0, utils_2.getContext)(dir);
        const { target } = ((purpose === "emulate" && serveTarget) || serverTarget || browserTarget);
        const workspaceTarget = workspaceProject.targets.get(target);
        Object.keys(workspaceTarget.configurations || {}).forEach((it) => validTargetNames.add(it));
    }
    catch (e) {
    }
    const allTargets = await (0, utils_2.getAllTargets)(purpose, dir);
    return [...validTargetNames, ...allTargets];
}
exports.getValidBuildTargets = getValidBuildTargets;
async function shouldUseDevModeHandle(targetOrConfiguration, dir) {
    const { serveTarget } = await (0, utils_2.getContext)(dir, targetOrConfiguration);
    if (!serveTarget)
        return false;
    return serveTarget.configuration !== "production";
}
exports.shouldUseDevModeHandle = shouldUseDevModeHandle;
async function ɵcodegenFunctionsDirectory(sourceDir, destDir, configuration) {
    var _a;
    var _b;
    const { packageJson, serverOutputPath, browserOutputPath, defaultLocale, serverLocales, browserLocales, bundleDependencies, externalDependencies, baseHref, serveOptimizedImages, } = await (0, utils_2.getServerConfig)(sourceDir, configuration);
    const dotEnv = { __NG_BROWSER_OUTPUT_PATH__: browserOutputPath };
    let rewriteSource = undefined;
    await Promise.all([
        serverOutputPath
            ? (0, promises_1.mkdir)((0, path_1.join)(destDir, serverOutputPath), { recursive: true }).then(() => (0, fs_extra_1.copy)((0, path_1.join)(sourceDir, serverOutputPath), (0, path_1.join)(destDir, serverOutputPath)))
            : Promise.resolve(),
        (0, promises_1.mkdir)((0, path_1.join)(destDir, browserOutputPath), { recursive: true }).then(() => (0, fs_extra_1.copy)((0, path_1.join)(sourceDir, browserOutputPath), (0, path_1.join)(destDir, browserOutputPath))),
    ]);
    if (bundleDependencies) {
        const dependencies = {};
        for (const externalDependency of externalDependencies) {
            const packageVersion = (_a = (0, utils_1.findDependency)(externalDependency)) === null || _a === void 0 ? void 0 : _a.version;
            if (packageVersion) {
                dependencies[externalDependency] = packageVersion;
            }
        }
        packageJson.dependencies = dependencies;
    }
    else if (serverOutputPath) {
        packageJson.dependencies || (packageJson.dependencies = {});
    }
    else {
        packageJson.dependencies = {};
    }
    if (serveOptimizedImages) {
        (_b = packageJson.dependencies)["sharp"] || (_b["sharp"] = constants_1.SHARP_VERSION);
    }
    let bootstrapScript;
    if (browserLocales) {
        const locales = serverLocales === null || serverLocales === void 0 ? void 0 : serverLocales.filter((it) => browserLocales.includes(it));
        bootstrapScript = `const localizedApps = new Map();
const ffi18n = import("firebase-frameworks/i18n");
exports.handle = function(req,res) {
  ffi18n.then(({ getPreferredLocale }) => {
    const locale = ${locales
            ? `getPreferredLocale(req, ${JSON.stringify(locales)}, ${JSON.stringify(defaultLocale)})`
            : `""`};
    if (localizedApps.has(locale)) {
      localizedApps.get(locale)(req,res);
    } else {
      const app = require(\`./${serverOutputPath}/\${locale}/main.js\`).app(locale);
      localizedApps.set(locale, app);
      app(req,res);
    }
  });
};\n`;
    }
    else if (serverOutputPath) {
        bootstrapScript = `exports.handle = require('./${serverOutputPath}/main.js').app();\n`;
    }
    else {
        bootstrapScript = `exports.handle = (res, req) => req.sendStatus(404);\n`;
        rewriteSource = path_1.posix.join(baseHref, "__image__");
    }
    return { bootstrapScript, packageJson, dotEnv, rewriteSource };
}
exports.ɵcodegenFunctionsDirectory = ɵcodegenFunctionsDirectory;
