"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaults = void 0;
function setDefaultsImpl({ allowIcannDomains = true, allowPrivateDomains = false, detectIp = true, extractHostname = true, mixedInputs = true, validHosts = null, validateHostname = true, }) {
    return {
        allowIcannDomains,
        allowPrivateDomains,
        detectIp,
        extractHostname,
        mixedInputs,
        validHosts,
        validateHostname,
    };
}
const DEFAULT_OPTIONS = setDefaultsImpl({});
function setDefaults(options) {
    if (options === undefined) {
        return DEFAULT_OPTIONS;
    }
    return setDefaultsImpl(options);
}
exports.setDefaults = setDefaults;
//# sourceMappingURL=options.js.map