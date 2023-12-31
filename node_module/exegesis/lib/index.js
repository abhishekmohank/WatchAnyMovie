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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileApi = exports.writeHttpResult = exports.compileRunner = exports.compileApiInterface = exports.ValidationError = exports.HttpError = void 0;
const promise_breaker_1 = __importDefault(require("promise-breaker"));
const pump_1 = __importDefault(require("pump"));
const json_schema_ref_parser_1 = __importDefault(require("@apidevtools/json-schema-ref-parser"));
const options_1 = require("./options");
const oas3_1 = require("./oas3");
const exegesisRunner_1 = __importDefault(require("./core/exegesisRunner"));
var errors_1 = require("./errors");
Object.defineProperty(exports, "HttpError", { enumerable: true, get: function () { return errors_1.HttpError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_1.ValidationError; } });
const PluginsManager_1 = __importDefault(require("./core/PluginsManager"));
// Export all our public types.
__exportStar(require("./types"), exports);
/**
 * Reads a JSON or YAML file and bundles all $refs, resulting in a single
 * document with only internal refs.
 *
 * @param openApiDocFile - The file containing the document, or a JSON object.
 * @returns - Returns the bundled document
 */
function bundle(openApiDocFile) {
    const refParser = new json_schema_ref_parser_1.default();
    return refParser.bundle(openApiDocFile, { dereference: { circular: false } });
}
function compileDependencies(openApiDoc, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const compiledOptions = (0, options_1.compileOptions)(options);
        const bundledDoc = yield bundle(openApiDoc);
        const plugins = new PluginsManager_1.default(bundledDoc, (options || {}).plugins || []);
        yield plugins.preCompile({ apiDoc: bundledDoc, options });
        const apiInterface = yield (0, oas3_1.compile)(bundledDoc, compiledOptions);
        return { compiledOptions, apiInterface, plugins };
    });
}
function compileApiInterface(openApiDoc, options, done) {
    return promise_breaker_1.default.addCallback(done, () => __awaiter(this, void 0, void 0, function* () {
        return (yield compileDependencies(openApiDoc, options)).apiInterface;
    }));
}
exports.compileApiInterface = compileApiInterface;
function compileRunner(openApiDoc, options, done) {
    return promise_breaker_1.default.addCallback(done, () => __awaiter(this, void 0, void 0, function* () {
        options = options || {};
        const { compiledOptions, apiInterface, plugins } = yield compileDependencies(openApiDoc, options);
        return (0, exegesisRunner_1.default)(apiInterface, {
            autoHandleHttpErrors: compiledOptions.autoHandleHttpErrors,
            plugins,
            onResponseValidationError: compiledOptions.onResponseValidationError,
            validateDefaultResponses: compiledOptions.validateDefaultResponses,
            originalOptions: options,
        });
    }));
}
exports.compileRunner = compileRunner;
function writeHttpResult(httpResult, res, done) {
    return promise_breaker_1.default.addCallback(done, () => __awaiter(this, void 0, void 0, function* () {
        Object.keys(httpResult.headers).forEach((header) => res.setHeader(header, httpResult.headers[header]));
        res.statusCode = httpResult.status;
        if (httpResult.body) {
            const body = httpResult.body;
            yield promise_breaker_1.default.call((done2) => (0, pump_1.default)(body, res, done2));
        }
        else {
            res.end();
        }
    }));
}
exports.writeHttpResult = writeHttpResult;
function compileApi(openApiDoc, options, done) {
    return promise_breaker_1.default.addCallback(done, () => __awaiter(this, void 0, void 0, function* () {
        const runner = yield compileRunner(openApiDoc, options);
        return function exegesisMiddleware(req, res, next) {
            runner(req, res)
                .then((result) => {
                let answer;
                if (!result) {
                    if (next) {
                        next();
                    }
                }
                else if (res.headersSent) {
                    // Someone else has already written a response.  :(
                }
                else if (result) {
                    answer = writeHttpResult(result, res);
                }
                else {
                    if (next) {
                        next();
                    }
                }
                return answer;
            })
                .catch((err) => {
                if (next) {
                    next(err);
                }
                else {
                    res.statusCode = err.status || 500;
                    res.end('error');
                }
            });
        };
    }));
}
exports.compileApi = compileApi;
//# sourceMappingURL=index.js.map