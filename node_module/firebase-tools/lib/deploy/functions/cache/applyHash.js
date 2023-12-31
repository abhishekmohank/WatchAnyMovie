"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyBackendHashToBackends = void 0;
const backend_1 = require("../backend");
const hash_1 = require("./hash");
function applyBackendHashToBackends(wantBackends, context) {
    var _a;
    for (const [codebase, wantBackend] of Object.entries(wantBackends)) {
        const source = (_a = context === null || context === void 0 ? void 0 : context.sources) === null || _a === void 0 ? void 0 : _a[codebase];
        const envHash = (0, hash_1.getEnvironmentVariablesHash)(wantBackend);
        applyBackendHashToEndpoints(wantBackend, envHash, source === null || source === void 0 ? void 0 : source.functionsSourceV1Hash, source === null || source === void 0 ? void 0 : source.functionsSourceV2Hash);
    }
}
exports.applyBackendHashToBackends = applyBackendHashToBackends;
function applyBackendHashToEndpoints(wantBackend, envHash, sourceV1Hash, sourceV2Hash) {
    for (const endpoint of (0, backend_1.allEndpoints)(wantBackend)) {
        const secretsHash = (0, hash_1.getSecretsHash)(endpoint);
        const isV2 = endpoint.platform === "gcfv2";
        const sourceHash = isV2 ? sourceV2Hash : sourceV1Hash;
        endpoint.hash = (0, hash_1.getEndpointHash)(sourceHash, envHash, secretsHash);
    }
}
