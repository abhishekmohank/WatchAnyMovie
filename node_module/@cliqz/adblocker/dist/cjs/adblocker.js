"use strict";
/*!
 * Copyright (c) 2017-2019 Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingHtmlFilter = exports.Resources = exports.Config = exports.isUTF8 = exports.tokenize = exports.parseFilters = exports.parseFilter = exports.mergeDiffs = exports.getLinesWithFilters = exports.generateDiff = exports.f = exports.detectFilterType = exports.NetworkFilter = exports.CosmeticFilter = exports.getHostnameHashesFromLabelsBackward = exports.makeRequest = exports.Request = exports.ReverseIndex = exports.ENGINE_VERSION = exports.FiltersEngine = void 0;
var engine_1 = require("./src/engine/engine");
Object.defineProperty(exports, "FiltersEngine", { enumerable: true, get: function () { return engine_1.default; } });
Object.defineProperty(exports, "ENGINE_VERSION", { enumerable: true, get: function () { return engine_1.ENGINE_VERSION; } });
var reverse_index_1 = require("./src/engine/reverse-index");
Object.defineProperty(exports, "ReverseIndex", { enumerable: true, get: function () { return reverse_index_1.default; } });
var request_1 = require("./src/request");
Object.defineProperty(exports, "Request", { enumerable: true, get: function () { return request_1.default; } });
Object.defineProperty(exports, "makeRequest", { enumerable: true, get: function () { return request_1.makeRequest; } });
Object.defineProperty(exports, "getHostnameHashesFromLabelsBackward", { enumerable: true, get: function () { return request_1.getHostnameHashesFromLabelsBackward; } });
var cosmetic_1 = require("./src/filters/cosmetic");
Object.defineProperty(exports, "CosmeticFilter", { enumerable: true, get: function () { return cosmetic_1.default; } });
var network_1 = require("./src/filters/network");
Object.defineProperty(exports, "NetworkFilter", { enumerable: true, get: function () { return network_1.default; } });
var lists_1 = require("./src/lists");
Object.defineProperty(exports, "detectFilterType", { enumerable: true, get: function () { return lists_1.detectFilterType; } });
Object.defineProperty(exports, "f", { enumerable: true, get: function () { return lists_1.f; } });
Object.defineProperty(exports, "generateDiff", { enumerable: true, get: function () { return lists_1.generateDiff; } });
Object.defineProperty(exports, "getLinesWithFilters", { enumerable: true, get: function () { return lists_1.getLinesWithFilters; } });
Object.defineProperty(exports, "mergeDiffs", { enumerable: true, get: function () { return lists_1.mergeDiffs; } });
Object.defineProperty(exports, "parseFilter", { enumerable: true, get: function () { return lists_1.parseFilter; } });
Object.defineProperty(exports, "parseFilters", { enumerable: true, get: function () { return lists_1.parseFilters; } });
__exportStar(require("./src/fetch"), exports);
var utils_1 = require("./src/utils");
Object.defineProperty(exports, "tokenize", { enumerable: true, get: function () { return utils_1.tokenizeNoSkip; } });
var encoding_1 = require("./src/encoding");
Object.defineProperty(exports, "isUTF8", { enumerable: true, get: function () { return encoding_1.isUTF8; } });
var config_1 = require("./src/config");
Object.defineProperty(exports, "Config", { enumerable: true, get: function () { return config_1.default; } });
var resources_1 = require("./src/resources");
Object.defineProperty(exports, "Resources", { enumerable: true, get: function () { return resources_1.default; } });
var html_filtering_1 = require("./src/html-filtering");
Object.defineProperty(exports, "StreamingHtmlFilter", { enumerable: true, get: function () { return html_filtering_1.default; } });
//# sourceMappingURL=adblocker.js.map