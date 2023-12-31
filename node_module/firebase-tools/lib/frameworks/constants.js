"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SHOULD_USE_DEV_MODE_HANDLE = exports.GET_DEFAULT_BUILD_TARGETS = exports.I18N_ROOT = exports.ALLOWED_SSR_REGIONS = exports.DEFAULT_REGION = exports.VALID_LOCALE_FORMATS = exports.VALID_ENGINES = exports.NODE_VERSION = exports.SHARP_VERSION = exports.FIREBASE_ADMIN_VERSION = exports.FIREBASE_FUNCTIONS_VERSION = exports.FIREBASE_FRAMEWORKS_VERSION = exports.MAILING_LIST_URL = exports.FEATURE_REQUEST_URL = exports.FILE_BUG_URL = exports.DEFAULT_DOCS_URL = exports.SupportLevelWarnings = exports.NPM_COMMAND_TIMEOUT_MILLIES = void 0;
const clc = require("colorette");
exports.NPM_COMMAND_TIMEOUT_MILLIES = 10000;
exports.SupportLevelWarnings = {
    ["experimental"]: (framework) => `Thank you for trying our ${clc.italic("experimental")} support for ${framework} on Firebase Hosting.
   ${clc.yellow(`While this integration is maintained by Googlers it is not a supported Firebase product.
   Issues filed on GitHub will be addressed on a best-effort basis by maintainers and other community members.`)}`,
    ["preview"]: (framework) => `Thank you for trying our ${clc.italic("early preview")} of ${framework} support on Firebase Hosting.
   ${clc.yellow("During the preview, support is best-effort and breaking changes can be expected. Proceed with caution.")}`,
};
exports.DEFAULT_DOCS_URL = "https://firebase.google.com/docs/hosting/frameworks/frameworks-overview";
exports.FILE_BUG_URL = "https://github.com/firebase/firebase-tools/issues/new?template=bug_report.md";
exports.FEATURE_REQUEST_URL = "https://github.com/firebase/firebase-tools/issues/new?template=feature_request.md";
exports.MAILING_LIST_URL = "https://goo.gle/41enW5X";
exports.FIREBASE_FRAMEWORKS_VERSION = "^0.10.4";
exports.FIREBASE_FUNCTIONS_VERSION = "^4.3.0";
exports.FIREBASE_ADMIN_VERSION = "^11.0.1";
exports.SHARP_VERSION = "^0.32.1";
exports.NODE_VERSION = parseInt(process.versions.node, 10);
exports.VALID_ENGINES = { node: [16, 18, 20] };
exports.VALID_LOCALE_FORMATS = [/^ALL_[a-z]+$/, /^[a-z]+_ALL$/, /^[a-z]+(_[a-z]+)?$/];
exports.DEFAULT_REGION = "us-central1";
exports.ALLOWED_SSR_REGIONS = [
    { name: "us-central1 (Iowa)", value: "us-central1" },
    { name: "us-west1 (Oregon)", value: "us-west1" },
    { name: "us-east1 (South Carolina)", value: "us-east1" },
    { name: "europe-west1 (Belgium)", value: "europe-west1" },
    { name: "asia-east1 (Taiwan)", value: "asia-east1" },
];
exports.I18N_ROOT = "/";
function GET_DEFAULT_BUILD_TARGETS() {
    return Promise.resolve(["production", "development"]);
}
exports.GET_DEFAULT_BUILD_TARGETS = GET_DEFAULT_BUILD_TARGETS;
function DEFAULT_SHOULD_USE_DEV_MODE_HANDLE(target) {
    return Promise.resolve(target === "development");
}
exports.DEFAULT_SHOULD_USE_DEV_MODE_HANDLE = DEFAULT_SHOULD_USE_DEV_MODE_HANDLE;
