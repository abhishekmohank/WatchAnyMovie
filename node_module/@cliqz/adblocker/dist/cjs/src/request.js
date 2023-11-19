"use strict";
/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRequest = exports.getHostnameHashesFromLabelsBackward = exports.getEntityHashesFromLabelsBackward = exports.getHostnameWithoutPublicSuffix = exports.getHashesFromLabelsBackward = exports.hashHostnameBackward = exports.NORMALIZED_TYPE_TOKEN = void 0;
const guess_url_type_1 = require("@remusao/guess-url-type");
const tldts_experimental_1 = require("tldts-experimental");
const data_view_1 = require("./data-view");
const tokens_buffer_1 = require("./tokens-buffer");
const utils_1 = require("./utils");
const TLDTS_OPTIONS = {
    extractHostname: true,
    mixedInputs: false,
    validateHostname: false,
};
exports.NORMALIZED_TYPE_TOKEN = {
    beacon: utils_1.fastHash('type:beacon'),
    csp_report: utils_1.fastHash('type:csp'),
    document: utils_1.fastHash('type:document'),
    eventsource: utils_1.fastHash('type:other'),
    fetch: utils_1.fastHash('type:xhr'),
    font: utils_1.fastHash('type:font'),
    image: utils_1.fastHash('type:image'),
    imageset: utils_1.fastHash('type:image'),
    mainFrame: utils_1.fastHash('type:document'),
    main_frame: utils_1.fastHash('type:document'),
    manifest: utils_1.fastHash('type:other'),
    media: utils_1.fastHash('type:media'),
    object: utils_1.fastHash('type:object'),
    object_subrequest: utils_1.fastHash('type:object'),
    other: utils_1.fastHash('type:other'),
    ping: utils_1.fastHash('type:ping'),
    script: utils_1.fastHash('type:script'),
    speculative: utils_1.fastHash('type:other'),
    stylesheet: utils_1.fastHash('type:stylesheet'),
    subFrame: utils_1.fastHash('type:subdocument'),
    sub_frame: utils_1.fastHash('type:subdocument'),
    texttrack: utils_1.fastHash('type:other'),
    web_manifest: utils_1.fastHash('type:other'),
    websocket: utils_1.fastHash('type:websocket'),
    xhr: utils_1.fastHash('type:xhr'),
    xml_dtd: utils_1.fastHash('type:other'),
    xmlhttprequest: utils_1.fastHash('type:xhr'),
    xslt: utils_1.fastHash('type:other'),
};
function hashHostnameBackward(hostname) {
    let hash = utils_1.HASH_SEED;
    for (let j = hostname.length - 1; j >= 0; j -= 1) {
        hash = (hash * 33) ^ hostname.charCodeAt(j);
    }
    return hash >>> 0;
}
exports.hashHostnameBackward = hashHostnameBackward;
function getHashesFromLabelsBackward(hostname, end, startOfDomain) {
    tokens_buffer_1.TOKENS_BUFFER.reset();
    let hash = utils_1.HASH_SEED;
    // Compute hash backward, label per label
    for (let i = end - 1; i >= 0; i -= 1) {
        const code = hostname.charCodeAt(i);
        // Process label
        if (code === 46 /* '.' */ && i < startOfDomain) {
            tokens_buffer_1.TOKENS_BUFFER.push(hash >>> 0);
        }
        // Update hash
        hash = (hash * 33) ^ code;
    }
    tokens_buffer_1.TOKENS_BUFFER.push(hash >>> 0);
    return tokens_buffer_1.TOKENS_BUFFER.slice();
}
exports.getHashesFromLabelsBackward = getHashesFromLabelsBackward;
/**
 * Given a hostname and its domain, return the hostname without the public
 * suffix. We know that the domain, with one less label on the left, will be a
 * the public suffix; and from there we know which trailing portion of
 * `hostname` we should remove.
 */
function getHostnameWithoutPublicSuffix(hostname, domain) {
    let hostnameWithoutPublicSuffix = null;
    const indexOfDot = domain.indexOf('.');
    if (indexOfDot !== -1) {
        const publicSuffix = domain.slice(indexOfDot + 1);
        hostnameWithoutPublicSuffix = hostname.slice(0, -publicSuffix.length - 1);
    }
    return hostnameWithoutPublicSuffix;
}
exports.getHostnameWithoutPublicSuffix = getHostnameWithoutPublicSuffix;
function getEntityHashesFromLabelsBackward(hostname, domain) {
    const hostnameWithoutPublicSuffix = getHostnameWithoutPublicSuffix(hostname, domain);
    if (hostnameWithoutPublicSuffix !== null) {
        return getHashesFromLabelsBackward(hostnameWithoutPublicSuffix, hostnameWithoutPublicSuffix.length, hostnameWithoutPublicSuffix.length);
    }
    return data_view_1.EMPTY_UINT32_ARRAY;
}
exports.getEntityHashesFromLabelsBackward = getEntityHashesFromLabelsBackward;
function getHostnameHashesFromLabelsBackward(hostname, domain) {
    return getHashesFromLabelsBackward(hostname, hostname.length, hostname.length - domain.length);
}
exports.getHostnameHashesFromLabelsBackward = getHostnameHashesFromLabelsBackward;
function isThirdParty(hostname, domain, sourceHostname, sourceDomain) {
    if (domain.length !== 0 && sourceDomain.length !== 0) {
        return domain !== sourceDomain;
    }
    else if (domain.length !== 0 && sourceHostname.length !== 0) {
        return domain !== sourceHostname;
    }
    else if (sourceDomain.length !== 0 && hostname.length !== 0) {
        return hostname !== sourceDomain;
    }
    return false;
}
class Request {
    constructor({ requestId, tabId, type, domain, hostname, url, sourceDomain, sourceHostname, _originalRequestDetails, }) {
        // Lazy attributes
        this.tokens = undefined;
        this.hostnameHashes = undefined;
        this.entityHashes = undefined;
        this._originalRequestDetails = _originalRequestDetails;
        this.id = requestId;
        this.tabId = tabId;
        this.type = type;
        this.url = url;
        this.hostname = hostname;
        this.domain = domain;
        this.sourceHostnameHashes =
            sourceHostname.length === 0
                ? data_view_1.EMPTY_UINT32_ARRAY
                : getHostnameHashesFromLabelsBackward(sourceHostname, sourceDomain);
        this.sourceEntityHashes =
            sourceHostname.length === 0
                ? data_view_1.EMPTY_UINT32_ARRAY
                : getEntityHashesFromLabelsBackward(sourceHostname, sourceDomain);
        // Decide on partiness
        this.isThirdParty = isThirdParty(hostname, domain, sourceHostname, sourceDomain);
        this.isFirstParty = !this.isThirdParty;
        // Check protocol
        this.isSupported = true;
        if (this.type === 'websocket' || this.url.startsWith('ws:') || this.url.startsWith('wss:')) {
            this.isHttp = false;
            this.isHttps = false;
            this.type = 'websocket';
            this.isSupported = true;
        }
        else if (this.url.startsWith('http:')) {
            this.isHttp = true;
            this.isHttps = false;
        }
        else if (this.url.startsWith('https:')) {
            this.isHttps = true;
            this.isHttp = false;
        }
        else if (this.url.startsWith('data:')) {
            this.isHttp = false;
            this.isHttps = false;
            // Only keep prefix of URL
            const indexOfComa = this.url.indexOf(',');
            if (indexOfComa !== -1) {
                this.url = this.url.slice(0, indexOfComa);
            }
        }
        else {
            this.isHttp = false;
            this.isHttps = false;
            this.isSupported = false;
        }
    }
    /**
     * Create an instance of `Request` from raw request details.
     */
    static fromRawDetails({ requestId = '0', tabId = 0, url = '', hostname, domain, sourceUrl = '', sourceHostname, sourceDomain, type = 'main_frame', _originalRequestDetails, }) {
        url = url.toLowerCase();
        if (hostname === undefined || domain === undefined) {
            const parsed = tldts_experimental_1.parse(url, TLDTS_OPTIONS);
            hostname = hostname || parsed.hostname || '';
            domain = domain || parsed.domain || '';
        }
        // Initialize source URL
        if (sourceHostname === undefined || sourceDomain === undefined) {
            const parsed = tldts_experimental_1.parse(sourceHostname || sourceDomain || sourceUrl, TLDTS_OPTIONS);
            sourceHostname = sourceHostname || parsed.hostname || '';
            sourceDomain = sourceDomain || parsed.domain || sourceHostname || '';
        }
        return new Request({
            requestId,
            tabId,
            domain,
            hostname,
            url,
            sourceDomain,
            sourceHostname,
            sourceUrl,
            type,
            _originalRequestDetails,
        });
    }
    getHostnameHashes() {
        if (this.hostnameHashes === undefined) {
            this.hostnameHashes =
                this.hostname.length === 0
                    ? data_view_1.EMPTY_UINT32_ARRAY
                    : getHostnameHashesFromLabelsBackward(this.hostname, this.domain);
        }
        return this.hostnameHashes;
    }
    getEntityHashes() {
        if (this.entityHashes === undefined) {
            this.entityHashes =
                this.hostname.length === 0
                    ? data_view_1.EMPTY_UINT32_ARRAY
                    : getEntityHashesFromLabelsBackward(this.hostname, this.domain);
        }
        return this.entityHashes;
    }
    getTokens() {
        if (this.tokens === undefined) {
            tokens_buffer_1.TOKENS_BUFFER.reset();
            for (const hash of this.sourceHostnameHashes) {
                tokens_buffer_1.TOKENS_BUFFER.push(hash);
            }
            // Add token corresponding to request type
            tokens_buffer_1.TOKENS_BUFFER.push(exports.NORMALIZED_TYPE_TOKEN[this.type]);
            utils_1.tokenizeNoSkipInPlace(this.url, tokens_buffer_1.TOKENS_BUFFER);
            this.tokens = tokens_buffer_1.TOKENS_BUFFER.slice();
        }
        return this.tokens;
    }
    isMainFrame() {
        return this.type === 'main_frame' || this.type === 'mainFrame';
    }
    isSubFrame() {
        return this.type === 'sub_frame' || this.type === 'subFrame';
    }
    /**
     * Calling this method will attempt to guess the type of a request based on
     * information found in `url` only. This can be useful to try and fine-tune
     * the type of a Request when it is not otherwise available or if it was
     * inferred as 'other'.
     */
    guessTypeOfRequest() {
        const currentType = this.type;
        this.type = guess_url_type_1.default(this.url);
        if (currentType !== this.type) {
            this.tokens = undefined;
        }
        return this.type;
    }
}
exports.default = Request;
/**
 * Kept for backward compatibility. The recommended way is to call
 * `Request.fromRawDetails` directly.
 */
function makeRequest(details) {
    return Request.fromRawDetails(details);
}
exports.makeRequest = makeRequest;
//# sourceMappingURL=request.js.map