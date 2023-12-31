"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonPointerStripPrefix = exports.jsonPointerStartsWith = exports.toUriFragment = void 0;
const jsonPtr = __importStar(require("json-ptr"));
function normalize(path) {
    return jsonPtr.encodePointer(jsonPtr.JsonPointer.decode(path));
}
function toUriFragment(path) {
    return jsonPtr.encodeUriFragmentIdentifier(jsonPtr.JsonPointer.decode(path));
}
exports.toUriFragment = toUriFragment;
function jsonPointerStartsWith(path, prefix) {
    path = normalize(path);
    prefix = normalize(prefix);
    return path.startsWith(prefix);
}
exports.jsonPointerStartsWith = jsonPointerStartsWith;
function jsonPointerStripPrefix(path, prefix) {
    const isUriFragment = path.startsWith('#');
    path = normalize(path);
    prefix = normalize(prefix);
    if (path.startsWith(prefix)) {
        const answer = path.slice(prefix.length);
        if (isUriFragment) {
            return toUriFragment(answer);
        }
        else {
            return answer;
        }
    }
    else {
        return path;
    }
}
exports.jsonPointerStripPrefix = jsonPointerStripPrefix;
//# sourceMappingURL=jsonPaths.js.map