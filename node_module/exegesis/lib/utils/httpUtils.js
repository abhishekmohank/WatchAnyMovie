"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestMayHaveBody = exports.httpHasBody = void 0;
function httpHasBody(headers) {
    const contentLength = headers['content-length'];
    return (!!headers['transfer-encoding'] ||
        (contentLength && contentLength !== '0' && contentLength !== 0));
}
exports.httpHasBody = httpHasBody;
// `delete` might have a body. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/DELETE
const HTTP_METHODS_WITHOUT_BODY = ['get', 'head', 'trace', 'options'];
function requestMayHaveBody(method) {
    return HTTP_METHODS_WITHOUT_BODY.indexOf(method.toLowerCase()) === -1;
}
exports.requestMayHaveBody = requestMayHaveBody;
//# sourceMappingURL=httpUtils.js.map