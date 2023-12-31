"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedTypesToMap = exports.removeSimpleTypes = exports.arrayToObject = void 0;
const lodash_1 = __importDefault(require("lodash"));
function arrayToObject(values) {
    if (!values) {
        return values;
    }
    if (typeof values === 'string') {
        // ???
        return values;
    }
    const result = {};
    for (let i = 0; i < values.length; i = i + 2) {
        // Note if the array is an odd length, we'll end up with an "undefined" parameter at the end.
        result[values[i]] = values[i + 1];
    }
    return result;
}
exports.arrayToObject = arrayToObject;
// Converts all simple types that are not "string" into "string".
function removeSimpleTypes(allowedTypes) {
    return lodash_1.default.uniq(allowedTypes.map((t) => {
        if (t === 'object') {
            return 'object';
        }
        else if (t === 'array') {
            return 'array';
        }
        else {
            return 'string';
        }
    }));
}
exports.removeSimpleTypes = removeSimpleTypes;
function allowedTypesToMap(allowedTypes) {
    return allowedTypes.reduce((m, t) => {
        m[t] = true;
        return m;
    }, {});
}
exports.allowedTypesToMap = allowedTypesToMap;
//# sourceMappingURL=common.js.map