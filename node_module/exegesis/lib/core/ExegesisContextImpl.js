"use strict";
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
const promise_breaker_1 = __importDefault(require("promise-breaker"));
const deep_freeze_1 = __importDefault(require("deep-freeze"));
const ExegesisResponseImpl_1 = __importDefault(require("./ExegesisResponseImpl"));
const errors_1 = require("../errors");
const EMPTY_PARAMS = (0, deep_freeze_1.default)({
    query: Object.create(null),
    header: Object.create(null),
    server: Object.create(null),
    path: Object.create(null),
    cookie: Object.create(null),
});
const EMPTY_PARAM_LOCATIONS = (0, deep_freeze_1.default)({
    query: Object.create(null),
    header: Object.create(null),
    path: Object.create(null),
    cookie: Object.create(null),
});
const EMPTY_ROUTE = (0, deep_freeze_1.default)({
    path: '',
});
class ExegesisContextImpl {
    constructor(req, // http2.Http2ServerRequest,
    res, // http2.Http2ServerResponse,
    api, options) {
        this.parameterLocations = EMPTY_PARAM_LOCATIONS;
        this.route = EMPTY_ROUTE;
        this.baseUrl = '';
        this._paramsResolved = false;
        this._bodyResolved = false;
        const responseValidationEnabled = !!options.onResponseValidationError;
        this.req = req;
        this.origRes = res;
        this.res = new ExegesisResponseImpl_1.default(res, responseValidationEnabled);
        this.api = api;
        this.options = options;
        // Temporarily set params to EMPTY_PARAMS.  While we're being a
        // 'plugin context', this will be empty, but it will be filled in
        // before we get to the controllers.
        this.params = EMPTY_PARAMS;
    }
    _setOperation(baseUrl, path, operation) {
        this.baseUrl = baseUrl;
        this.route = { path };
        this._operation = operation;
        this.parameterLocations = operation.parameterLocations;
        // Set `req.baseUrl` and `req.path` to make this behave like Express.
        const req = this.req;
        if (req.baseUrl) {
            req.baseUrl = `${req.baseUrl}${baseUrl}`;
        }
        else {
            req.baseUrl = baseUrl;
        }
        req.route = { path };
    }
    makeError(statusCode, message) {
        return new errors_1.HttpError(statusCode, message);
    }
    makeValidationError(message, parameterLocation) {
        return new errors_1.ValidationError([{ message, location: parameterLocation }]);
    }
    /**
     * Returns true if the response has already been sent.
     */
    isResponseFinished() {
        return this.res.ended || this.origRes.headersSent;
    }
    getParams(done) {
        return promise_breaker_1.default.addCallback(done, () => {
            if (!this._paramsResolved) {
                if (!this._operation) {
                    throw new Error('Cannot get parameters - no resolved operation.');
                }
                this.params = this._operation.parseParameters();
                const errors = this._operation.validateParameters(this.params);
                if (errors && errors.length > 0) {
                    const err = new errors_1.ValidationError(errors);
                    throw err;
                }
                this._paramsResolved = true;
            }
            return this.params;
        });
    }
    getRequestBody(done) {
        return promise_breaker_1.default.addCallback(done, () => __awaiter(this, void 0, void 0, function* () {
            if (!this._operation) {
                throw new Error('Cannot get parameters - no resolved operation.');
            }
            if (!this._bodyResolved) {
                let body;
                // Parse the body.
                if (this._operation.bodyParser) {
                    const bodyParser = this._operation.bodyParser;
                    body = yield promise_breaker_1.default.call((done) => bodyParser.parseReq(this.req, this.origRes, done));
                    body = body || this.req.body;
                }
                // Validate the body.  We need to validate the body even if we
                // didn't parse a body, since this is where we check if the
                // body is required.
                if (this._operation.validateBody) {
                    const validationResult = this._operation.validateBody(body);
                    if (validationResult.errors && validationResult.errors.length > 0) {
                        throw new errors_1.ValidationError(validationResult.errors);
                    }
                    body = validationResult.value;
                }
                // Assign the body to the appropriate places
                this.requestBody = this.req.body = body;
                this._bodyResolved = true;
            }
            return this.requestBody;
        }));
    }
}
exports.default = ExegesisContextImpl;
//# sourceMappingURL=ExegesisContextImpl.js.map