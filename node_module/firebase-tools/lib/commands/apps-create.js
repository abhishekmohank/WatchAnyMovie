"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const clc = require("colorette");
const ora = require("ora");
const command_1 = require("../command");
const projectUtils_1 = require("../projectUtils");
const error_1 = require("../error");
const apps_1 = require("../management/apps");
const prompt_1 = require("../prompt");
const requireAuth_1 = require("../requireAuth");
const logger_1 = require("../logger");
const DISPLAY_NAME_QUESTION = {
    type: "input",
    name: "displayName",
    default: "",
    message: "What would you like to call your app?",
};
function logPostAppCreationInformation(appMetadata, appPlatform) {
    logger_1.logger.info("");
    logger_1.logger.info(`🎉🎉🎉 Your Firebase ${appPlatform} App is ready! 🎉🎉🎉`);
    logger_1.logger.info("");
    logger_1.logger.info("App information:");
    logger_1.logger.info(`  - App ID: ${appMetadata.appId}`);
    if (appMetadata.displayName) {
        logger_1.logger.info(`  - Display name: ${appMetadata.displayName}`);
    }
    if (appPlatform === apps_1.AppPlatform.IOS) {
        const iosAppMetadata = appMetadata;
        logger_1.logger.info(`  - Bundle ID: ${iosAppMetadata.bundleId}`);
        if (iosAppMetadata.appStoreId) {
            logger_1.logger.info(`  - App Store ID: ${iosAppMetadata.appStoreId}`);
        }
    }
    else if (appPlatform === apps_1.AppPlatform.ANDROID) {
        logger_1.logger.info(`  - Package name: ${appMetadata.packageName}`);
    }
    logger_1.logger.info("");
    logger_1.logger.info("You can run this command to print out your new app's Google Services config:");
    logger_1.logger.info(`  firebase apps:sdkconfig ${appPlatform} ${appMetadata.appId}`);
}
async function initiateIosAppCreation(options) {
    if (!options.nonInteractive) {
        await (0, prompt_1.prompt)(options, [
            DISPLAY_NAME_QUESTION,
            {
                type: "input",
                default: "",
                name: "bundleId",
                message: "Please specify your iOS app bundle ID:",
            },
            {
                type: "input",
                default: "",
                name: "appStoreId",
                message: "Please specify your iOS app App Store ID:",
            },
        ]);
    }
    if (!options.bundleId) {
        throw new error_1.FirebaseError("Bundle ID for iOS app cannot be empty");
    }
    const spinner = ora("Creating your iOS app").start();
    try {
        const appData = await (0, apps_1.createIosApp)(options.project, {
            displayName: options.displayName,
            bundleId: options.bundleId,
            appStoreId: options.appStoreId,
        });
        spinner.succeed();
        return appData;
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
}
async function initiateAndroidAppCreation(options) {
    if (!options.nonInteractive) {
        await (0, prompt_1.prompt)(options, [
            DISPLAY_NAME_QUESTION,
            {
                type: "input",
                default: "",
                name: "packageName",
                message: "Please specify your Android app package name:",
            },
        ]);
    }
    if (!options.packageName) {
        throw new error_1.FirebaseError("Package name for Android app cannot be empty");
    }
    const spinner = ora("Creating your Android app").start();
    try {
        const appData = await (0, apps_1.createAndroidApp)(options.project, {
            displayName: options.displayName,
            packageName: options.packageName,
        });
        spinner.succeed();
        return appData;
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
}
async function initiateWebAppCreation(options) {
    if (!options.nonInteractive) {
        await (0, prompt_1.prompt)(options, [DISPLAY_NAME_QUESTION]);
    }
    if (!options.displayName) {
        throw new error_1.FirebaseError("Display name for Web app cannot be empty");
    }
    const spinner = ora("Creating your Web app").start();
    try {
        const appData = await (0, apps_1.createWebApp)(options.project, { displayName: options.displayName });
        spinner.succeed();
        return appData;
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
}
exports.command = new command_1.Command("apps:create [platform] [displayName]")
    .description("create a new Firebase app. [platform] can be IOS, ANDROID or WEB (case insensitive).")
    .option("-a, --package-name <packageName>", "required package name for the Android app")
    .option("-b, --bundle-id <bundleId>", "required bundle id for the iOS app")
    .option("-s, --app-store-id <appStoreId>", "(optional) app store id for the iOS app")
    .before(requireAuth_1.requireAuth)
    .action(async (platform = "", displayName, options) => {
    const projectId = (0, projectUtils_1.needProjectId)(options);
    if (!options.nonInteractive && !platform) {
        platform = await (0, prompt_1.promptOnce)({
            type: "list",
            message: "Please choose the platform of the app:",
            choices: [
                { name: "iOS", value: apps_1.AppPlatform.IOS },
                { name: "Android", value: apps_1.AppPlatform.ANDROID },
                { name: "Web", value: apps_1.AppPlatform.WEB },
            ],
        });
    }
    const appPlatform = (0, apps_1.getAppPlatform)(platform);
    if (appPlatform === apps_1.AppPlatform.ANY) {
        throw new error_1.FirebaseError("App platform must be provided");
    }
    logger_1.logger.info(`Create your ${appPlatform} app in project ${clc.bold(projectId)}:`);
    options.displayName = displayName;
    let appData;
    switch (appPlatform) {
        case apps_1.AppPlatform.IOS:
            appData = await initiateIosAppCreation(options);
            break;
        case apps_1.AppPlatform.ANDROID:
            appData = await initiateAndroidAppCreation(options);
            break;
        case apps_1.AppPlatform.WEB:
            appData = await initiateWebAppCreation(options);
            break;
        default:
            throw new error_1.FirebaseError("Unexpected error. This should not happen");
    }
    logPostAppCreationInformation(appData, appPlatform);
    return appData;
});
