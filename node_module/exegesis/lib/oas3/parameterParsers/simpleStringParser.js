"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGenericSimpleParser = exports.simpleStringArrayParser = exports.simpleArrayParser = exports.simpleStringParser = exports.getSimpleStringParser = void 0;
const json_schema_infer_types_1 = __importDefault(require("../../utils/json-schema-infer-types"));
const common_1 = require("./common");
function getSimpleStringParser(schema, explode) {
    const allowedTypes = (0, common_1.removeSimpleTypes)((0, json_schema_infer_types_1.default)(schema));
    if (allowedTypes.length === 1 && allowedTypes[0] === 'string') {
        return simpleStringParser;
    }
    else if (allowedTypes.length === 1 && allowedTypes[0] === 'array') {
        return simpleArrayParser;
    }
    else if (allowedTypes.includes('string') &&
        allowedTypes.includes('array') &&
        !allowedTypes.includes('object')) {
        return simpleStringArrayParser;
    }
    else {
        return generateGenericSimpleParser(schema, explode);
    }
}
exports.getSimpleStringParser = getSimpleStringParser;
// This is for the case where the result is only allowed to be a string.
function simpleStringParser(value) {
    return !value ? value : decodeURIComponent(value);
}
exports.simpleStringParser = simpleStringParser;
// This is for the case where the result allowed to be a string or an array.
function simpleArrayParser(value) {
    return value === undefined || value === null ? value : value.split(',').map(decodeURIComponent);
}
exports.simpleArrayParser = simpleArrayParser;
function simpleStringArrayParser(value) {
    const result = simpleArrayParser(value);
    if (!result) {
        return result;
    }
    else if (result.length === 0) {
        return '';
    }
    else if (result.length === 1) {
        return result[0];
    }
    else {
        return result;
    }
}
exports.simpleStringArrayParser = simpleStringArrayParser;
function generateGenericSimpleParser(schema, explode) {
    const allowedTypes = (0, common_1.removeSimpleTypes)((0, json_schema_infer_types_1.default)(schema));
    const allowedTypesMap = (0, common_1.allowedTypesToMap)(allowedTypes);
    return function genericSimplerParser(value) {
        const result = simpleArrayParser(value);
        if (result === null || result === undefined) {
            return value;
        }
        else if (result.length === 0 && allowedTypesMap.string) {
            return '';
        }
        else if (result.length === 1 && allowedTypesMap.string) {
            return result[0];
        }
        else if (allowedTypesMap.array) {
            return result;
        }
        else if (!explode) {
            // Has to be object
            return (0, common_1.arrayToObject)(result);
        }
        else {
            // Exploded object
            return result.reduce((object, pair) => {
                const [k, v] = pair.split('=');
                object[decodeURIComponent(k)] = decodeURIComponent(v);
                return object;
            }, {});
        }
    };
}
exports.generateGenericSimpleParser = generateGenericSimpleParser;
//# sourceMappingURL=simpleStringParser.js.map