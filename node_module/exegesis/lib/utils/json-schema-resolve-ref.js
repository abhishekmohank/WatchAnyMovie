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
exports.resolveRef = void 0;
const jsonPtr = __importStar(require("json-ptr"));
function resolveRefPriv(document, ref) {
    if (!ref.startsWith('#/') && !ref.startsWith('/') && ref !== '') {
        throw new Error(`Cannot resolve non-local ref ${ref}`);
    }
    const path = jsonPtr.JsonPointer.decode(ref).slice();
    let currentDoc = document;
    while (path.length > 0) {
        const pathname = path.shift();
        currentDoc = currentDoc && currentDoc[pathname];
        while (currentDoc && currentDoc.$ref) {
            currentDoc = resolveRefPriv(document, currentDoc.$ref);
        }
    }
    return currentDoc;
}
function resolveRef(document, ref) {
    if (ref instanceof String) {
        return resolveRef(document, ref.toString());
    }
    else if (typeof ref === 'string') {
        return resolveRefPriv(document, ref);
    }
    else if (ref.$ref) {
        return resolveRefPriv(document, ref.$ref);
    }
    else {
        return ref;
    }
}
exports.resolveRef = resolveRef;
//# sourceMappingURL=json-schema-resolve-ref.js.map