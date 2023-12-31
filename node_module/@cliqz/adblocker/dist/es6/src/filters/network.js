/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Domains } from '../engine/domains';
import { sizeOfNetworkCSP, sizeOfNetworkFilter, sizeOfNetworkHostname, sizeOfNetworkRedirect, sizeOfUTF8, } from '../data-view';
import { toASCII } from '../punycode';
import { NORMALIZED_TYPE_TOKEN } from '../request';
import { TOKENS_BUFFER } from '../tokens-buffer';
import { bitCount, clearBit, fastHash, fastStartsWith, fastStartsWithFrom, getBit, hasUnicode, isAlpha, isDigit, setBit, tokenizeInPlace, tokenizeRegexInPlace, tokenizeWithWildcardsInPlace, } from '../utils';
const HTTP_HASH = fastHash('http');
const HTTPS_HASH = fastHash('https');
function isAllowedHostname(ch) {
    return (isDigit(ch) || isAlpha(ch) || ch === 95 /* '_' */ || ch === 45 /* '-' */ || ch === 46 /* '.' */);
}
const NORMALIZE_OPTIONS = {
    'document': 'doc',
    'first-party': '1p',
    'generichide': 'ghide',
    'object-subrequest': 'object',
    'stylesheet': 'css',
    'subdocument': 'frame',
    'third-party': '3p',
    'xmlhttprequest': 'xhr',
    '~first-party': '3p',
    '~third-party': '1p',
    'all': '',
};
/**
 * Normalize a raw filter by replacing options with their canonical forms. For
 * example `||foo.com$stylesheet,first-party,xhr` would be normalized to
 * `||foo.com$css,1p,xhr`.
 */
const REGEX = /all|~third-party|~first-party|third-party|first-party|object-subrequest|stylesheet|subdocument|xmlhttprequest|document|generichide/g;
export function normalizeRawFilterOptions(rawFilter) {
    rawFilter = rawFilter.toLowerCase();
    let indexOfOptions = rawFilter.lastIndexOf('$');
    if (indexOfOptions === -1) {
        return rawFilter;
    }
    // Remove trailing '*' if possible
    if (indexOfOptions !== 0 && rawFilter[indexOfOptions - 1] === '*') {
        rawFilter = rawFilter.slice(0, indexOfOptions - 1) + rawFilter.slice(indexOfOptions);
        indexOfOptions -= 1;
    }
    // Normalize options
    const options = rawFilter.slice(indexOfOptions + 1);
    const normalizedOptions = options
        .replace(REGEX, (option) => {
        const normalized = NORMALIZE_OPTIONS[option];
        if (normalized === undefined) {
            return option;
        }
        return normalized;
    })
        .split(',')
        .sort()
        .join(',');
    if (options === normalizedOptions) {
        return rawFilter;
    }
    if (normalizedOptions === '') {
        return rawFilter.slice(0, indexOfOptions);
    }
    return `${rawFilter.slice(0, indexOfOptions)}$${normalizedOptions}`;
}
/**
 * Mask used when a network filter can be applied on any content type.
 */
const FROM_ANY = 1 /* fromDocument */ |
    2 /* fromFont */ |
    16 /* fromImage */ |
    32 /* fromMedia */ |
    64 /* fromObject */ |
    128 /* fromOther */ |
    256 /* fromPing */ |
    512 /* fromScript */ |
    1024 /* fromStylesheet */ |
    2048 /* fromSubdocument */ |
    4096 /* fromWebsocket */ |
    8192 /* fromXmlHttpRequest */;
/**
 * Map content type value to mask the corresponding mask.
 * ref: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIContentPolicy
 */
const REQUEST_TYPE_TO_MASK = {
    beacon: 256 /* fromPing */,
    document: 1 /* fromDocument */,
    fetch: 8192 /* fromXmlHttpRequest */,
    font: 2 /* fromFont */,
    image: 16 /* fromImage */,
    imageset: 16 /* fromImage */,
    mainFrame: 1 /* fromDocument */,
    main_frame: 1 /* fromDocument */,
    media: 32 /* fromMedia */,
    object: 64 /* fromObject */,
    object_subrequest: 64 /* fromObject */,
    ping: 256 /* fromPing */,
    script: 512 /* fromScript */,
    stylesheet: 1024 /* fromStylesheet */,
    subFrame: 2048 /* fromSubdocument */,
    sub_frame: 2048 /* fromSubdocument */,
    websocket: 4096 /* fromWebsocket */,
    xhr: 8192 /* fromXmlHttpRequest */,
    xmlhttprequest: 8192 /* fromXmlHttpRequest */,
    // Other
    csp_report: 128 /* fromOther */,
    eventsource: 128 /* fromOther */,
    manifest: 128 /* fromOther */,
    other: 128 /* fromOther */,
    speculative: 128 /* fromOther */,
    texttrack: 128 /* fromOther */,
    web_manifest: 128 /* fromOther */,
    xml_dtd: 128 /* fromOther */,
    xslt: 128 /* fromOther */,
};
function getListOfRequestTypesNegated(filter) {
    const types = [];
    if (filter.fromDocument() === false) {
        types.push('document');
    }
    if (filter.fromImage() === false) {
        types.push('image');
    }
    if (filter.fromMedia() === false) {
        types.push('media');
    }
    if (filter.fromObject() === false) {
        types.push('object');
    }
    if (filter.fromOther() === false) {
        types.push('other');
    }
    if (filter.fromPing() === false) {
        types.push('ping');
    }
    if (filter.fromScript() === false) {
        types.push('script');
    }
    if (filter.fromStylesheet() === false) {
        types.push('stylesheet');
    }
    if (filter.fromSubdocument() === false) {
        types.push('sub_frame');
    }
    if (filter.fromWebsocket() === false) {
        types.push('websocket');
    }
    if (filter.fromXmlHttpRequest() === false) {
        types.push('xhr');
    }
    if (filter.fromFont() === false) {
        types.push('font');
    }
    return types;
}
function getListOfRequestTypes(filter) {
    const types = [];
    if (filter.fromDocument()) {
        types.push('document');
    }
    if (filter.fromImage()) {
        types.push('image');
    }
    if (filter.fromMedia()) {
        types.push('media');
    }
    if (filter.fromObject()) {
        types.push('object');
    }
    if (filter.fromOther()) {
        types.push('other');
    }
    if (filter.fromPing()) {
        types.push('ping');
    }
    if (filter.fromScript()) {
        types.push('script');
    }
    if (filter.fromStylesheet()) {
        types.push('stylesheet');
    }
    if (filter.fromSubdocument()) {
        types.push('sub_frame');
    }
    if (filter.fromWebsocket()) {
        types.push('websocket');
    }
    if (filter.fromXmlHttpRequest()) {
        types.push('xhr');
    }
    if (filter.fromFont()) {
        types.push('font');
    }
    return types;
}
function computeFilterId(csp, mask, filter, hostname, domains, denyallow, redirect) {
    let hash = (7907 * 33) ^ mask;
    if (csp !== undefined) {
        for (let i = 0; i < csp.length; i += 1) {
            hash = (hash * 33) ^ csp.charCodeAt(i);
        }
    }
    if (domains !== undefined) {
        hash = domains.updateId(hash);
    }
    if (denyallow !== undefined) {
        hash = denyallow.updateId(hash);
    }
    if (filter !== undefined) {
        for (let i = 0; i < filter.length; i += 1) {
            hash = (hash * 33) ^ filter.charCodeAt(i);
        }
    }
    if (hostname !== undefined) {
        for (let i = 0; i < hostname.length; i += 1) {
            hash = (hash * 33) ^ hostname.charCodeAt(i);
        }
    }
    if (redirect !== undefined) {
        for (let i = 0; i < redirect.length; i += 1) {
            hash = (hash * 33) ^ redirect.charCodeAt(i);
        }
    }
    return hash >>> 0;
}
/**
 * Compiles a filter pattern to a regex. This is only performed *lazily* for
 * filters containing at least a * or ^ symbol. Because Regexes are expansive,
 * we try to convert some patterns to plain filters.
 */
function compileRegex(filter, isLeftAnchor, isRightAnchor, isFullRegex) {
    if (isFullRegex === true) {
        return new RegExp(filter.slice(1, filter.length - 1), 'i');
    }
    // Escape special regex characters: |.$+?{}()[]\
    filter = filter.replace(/([|.$+?{}()[\]\\])/g, '\\$1');
    // * can match anything
    filter = filter.replace(/\*/g, '.*');
    // ^ can match any separator or the end of the pattern
    filter = filter.replace(/\^/g, '(?:[^\\w\\d_.%-]|$)');
    // Should match end of url
    if (isRightAnchor) {
        filter = `${filter}$`;
    }
    if (isLeftAnchor) {
        filter = `^${filter}`;
    }
    return new RegExp(filter);
}
const MATCH_ALL = new RegExp('');
export default class NetworkFilter {
    constructor({ csp, filter, hostname, mask, domains, denyallow, rawLine, redirect, regex, }) {
        this.csp = csp;
        this.filter = filter;
        this.hostname = hostname;
        this.mask = mask;
        this.domains = domains;
        this.denyallow = denyallow;
        this.redirect = redirect;
        this.rawLine = rawLine;
        this.id = undefined;
        this.regex = regex;
    }
    static parse(line, debug = false) {
        // Represent options as a bitmask
        let mask = 32768 /* thirdParty */ |
            16384 /* firstParty */ |
            8 /* fromHttps */ |
            4 /* fromHttp */;
        // Temporary masks for positive (e.g.: $script) and negative (e.g.: $~script)
        // content type options.
        let cptMaskPositive = 0;
        let cptMaskNegative = FROM_ANY;
        let hostname;
        let domains;
        let denyallow;
        let redirect;
        let csp;
        // Start parsing
        let filterIndexStart = 0;
        let filterIndexEnd = line.length;
        // @@filter == Exception
        if (line.charCodeAt(0) === 64 /* '@' */ && line.charCodeAt(1) === 64 /* '@' */) {
            filterIndexStart += 2;
            mask = setBit(mask, 134217728 /* isException */);
        }
        // filter$options == Options
        // ^     ^
        // |     |
        // |     optionsIndex
        // filterIndexStart
        const optionsIndex = line.lastIndexOf('$');
        if (optionsIndex !== -1 && line.charCodeAt(optionsIndex + 1) !== 47 /* '/' */) {
            // Parse options and set flags
            filterIndexEnd = optionsIndex;
            // --------------------------------------------------------------------- //
            // parseOptions
            // --------------------------------------------------------------------- //
            for (const rawOption of line.slice(optionsIndex + 1).split(',')) {
                const negation = rawOption.charCodeAt(0) === 126; /* '~' */
                let option = negation === true ? rawOption.slice(1) : rawOption;
                // Check for options: option=value1|value2
                let optionValue = '';
                const indexOfEqual = option.indexOf('=');
                if (indexOfEqual !== -1) {
                    optionValue = option.slice(indexOfEqual + 1);
                    option = option.slice(0, indexOfEqual);
                }
                switch (option) {
                    case 'denyallow': {
                        denyallow = Domains.parse(optionValue.split('|'));
                        break;
                    }
                    case 'domain': {
                        // domain list starting or ending with '|' is invalid
                        if (optionValue.charCodeAt(0) === 124 /* '|' */ ||
                            optionValue.charCodeAt(optionValue.length - 1) === 124 /* '|' */) {
                            return null;
                        }
                        domains = Domains.parse(optionValue.split('|'));
                        break;
                    }
                    case 'badfilter':
                        mask = setBit(mask, 131072 /* isBadFilter */);
                        break;
                    case 'important':
                        // Note: `negation` should always be `false` here.
                        if (negation) {
                            return null;
                        }
                        mask = setBit(mask, 1048576 /* isImportant */);
                        break;
                    case 'match-case':
                        // Note: `negation` should always be `false` here.
                        if (negation) {
                            return null;
                        }
                        // We currently consider all filters to be case-insensitive.
                        break;
                    case '3p':
                    case 'third-party':
                        if (negation) {
                            // ~third-party means we should clear the flag
                            mask = clearBit(mask, 32768 /* thirdParty */);
                        }
                        else {
                            // third-party means ~first-party
                            mask = clearBit(mask, 16384 /* firstParty */);
                        }
                        break;
                    case '1p':
                    case 'first-party':
                        if (negation) {
                            // ~first-party means we should clear the flag
                            mask = clearBit(mask, 16384 /* firstParty */);
                        }
                        else {
                            // first-party means ~third-party
                            mask = clearBit(mask, 32768 /* thirdParty */);
                        }
                        break;
                    case 'redirect-rule':
                    case 'redirect':
                        // Negation of redirection doesn't make sense
                        if (negation) {
                            return null;
                        }
                        // Ignore this filter if no redirection resource is specified
                        if (optionValue.length === 0) {
                            return null;
                        }
                        if (option === 'redirect-rule') {
                            mask = setBit(mask, 536870912 /* isRedirectRule */);
                        }
                        redirect = optionValue;
                        break;
                    case 'csp':
                        if (negation) {
                            return null;
                        }
                        mask = setBit(mask, 262144 /* isCSP */);
                        if (optionValue.length > 0) {
                            csp = optionValue;
                        }
                        break;
                    case 'ehide':
                    case 'elemhide':
                        if (negation) {
                            return null;
                        }
                        mask = setBit(mask, 524288 /* isGenericHide */);
                        mask = setBit(mask, 2097152 /* isSpecificHide */);
                        break;
                    case 'shide':
                    case 'specifichide':
                        if (negation) {
                            return null;
                        }
                        mask = setBit(mask, 2097152 /* isSpecificHide */);
                        break;
                    case 'ghide':
                    case 'generichide':
                        if (negation) {
                            return null;
                        }
                        mask = setBit(mask, 524288 /* isGenericHide */);
                        break;
                    case 'inline-script':
                        if (negation) {
                            return null;
                        }
                        mask = setBit(mask, 262144 /* isCSP */);
                        csp =
                            "script-src 'self' 'unsafe-eval' http: https: data: blob: mediastream: filesystem:";
                        break;
                    case 'inline-font':
                        if (negation) {
                            return null;
                        }
                        mask = setBit(mask, 262144 /* isCSP */);
                        csp =
                            "font-src 'self' 'unsafe-eval' http: https: data: blob: mediastream: filesystem:";
                        break;
                    default: {
                        // Handle content type options separatly
                        let optionMask = 0;
                        switch (option) {
                            case 'all':
                                if (negation) {
                                    return null;
                                }
                                // NOTE: Currently a filter cannot be both blocking and CSP, so
                                // we will have to create multiple filters to keep the semantics
                                // of 'all'.
                                // mask = setBit(mask, NETWORK_FILTER_MASK.isCSP);
                                // csp = [
                                //   "script-src 'self' 'unsafe-eval' http: https: data: blob: mediastream: filesystem:",
                                //   "font-src 'self' 'unsafe-eval' http: https: data: blob: mediastream: filesystem:",
                                // ].join('; ');
                                break;
                            case 'image':
                                optionMask = 16 /* fromImage */;
                                break;
                            case 'media':
                                optionMask = 32 /* fromMedia */;
                                break;
                            case 'object':
                            case 'object-subrequest':
                                optionMask = 64 /* fromObject */;
                                break;
                            case 'other':
                                optionMask = 128 /* fromOther */;
                                break;
                            case 'ping':
                            case 'beacon':
                                optionMask = 256 /* fromPing */;
                                break;
                            case 'script':
                                optionMask = 512 /* fromScript */;
                                break;
                            case 'css':
                            case 'stylesheet':
                                optionMask = 1024 /* fromStylesheet */;
                                break;
                            case 'frame':
                            case 'subdocument':
                                optionMask = 2048 /* fromSubdocument */;
                                break;
                            case 'xhr':
                            case 'xmlhttprequest':
                                optionMask = 8192 /* fromXmlHttpRequest */;
                                break;
                            case 'websocket':
                                optionMask = 4096 /* fromWebsocket */;
                                break;
                            case 'font':
                                optionMask = 2 /* fromFont */;
                                break;
                            case 'doc':
                            case 'document':
                                optionMask = 1 /* fromDocument */;
                                break;
                            default:
                                // Disable this filter if we don't support all the options
                                return null;
                        }
                        // We got a valid cpt option, update mask
                        if (negation) {
                            cptMaskNegative = clearBit(cptMaskNegative, optionMask);
                        }
                        else {
                            cptMaskPositive = setBit(cptMaskPositive, optionMask);
                        }
                        break;
                    }
                }
            }
            // End of option parsing
            // --------------------------------------------------------------------- //
        }
        if (cptMaskPositive === 0) {
            mask |= cptMaskNegative;
        }
        else if (cptMaskNegative === FROM_ANY) {
            mask |= cptMaskPositive;
        }
        else {
            mask |= cptMaskPositive & cptMaskNegative;
        }
        // Identify kind of pattern
        let filter;
        // Detect Regexps (i.e.: /pattern/)
        if (filterIndexEnd - filterIndexStart >= 2 &&
            line.charCodeAt(filterIndexStart) === 47 /* '/' */ &&
            line.charCodeAt(filterIndexEnd - 1) === 47 /* '/' */) {
            // Some extra ideas which could be applied to RegExp filters:
            // * convert rules without any special RegExp syntax to plain patterns
            // * remove extra `isFullRegex` flag since `isRegex` might be enough
            // * apply some optimizations on the fly: /^https?:\\/\\/rest => isHttp + isHttps + rest
            filter = line.slice(filterIndexStart, filterIndexEnd);
            // Validate RegExp to make sure this rule is fine
            try {
                compileRegex(filter, false /* isLeftAnchor */, false /* isRightAnchor */, true /* isFullRegex */);
            }
            catch (ex) {
                return null; // invalid RegExp
            }
            mask = setBit(mask, 4194304 /* isFullRegex */);
        }
        else {
            // Deal with hostname pattern
            if (filterIndexEnd > 0 && line.charCodeAt(filterIndexEnd - 1) === 124 /* '|' */) {
                mask = setBit(mask, 67108864 /* isRightAnchor */);
                filterIndexEnd -= 1;
            }
            if (filterIndexStart < filterIndexEnd &&
                line.charCodeAt(filterIndexStart) === 124 /* '|' */) {
                if (filterIndexStart < filterIndexEnd - 1 &&
                    line.charCodeAt(filterIndexStart + 1) === 124 /* '|' */) {
                    mask = setBit(mask, 268435456 /* isHostnameAnchor */);
                    filterIndexStart += 2;
                }
                else {
                    mask = setBit(mask, 33554432 /* isLeftAnchor */);
                    filterIndexStart += 1;
                }
            }
            // const isRegex = checkIsRegex(line, filterIndexStart, filterIndexEnd);
            // mask = setNetworkMask(mask, NETWORK_FILTER_MASK.isRegex, isRegex);
            if (getBit(mask, 268435456 /* isHostnameAnchor */)) {
                // Split at the first character which is not allowed in a hostname
                let firstSeparator = filterIndexStart;
                while (firstSeparator < filterIndexEnd &&
                    isAllowedHostname(line.charCodeAt(firstSeparator)) === true) {
                    firstSeparator += 1;
                }
                // No separator found so hostname has full length
                if (firstSeparator === filterIndexEnd) {
                    hostname = line.slice(filterIndexStart, filterIndexEnd);
                    filterIndexStart = filterIndexEnd;
                    // mask = setBit(mask, NETWORK_FILTER_MASK.isLeftAnchor);
                }
                else {
                    // Found a separator
                    hostname = line.slice(filterIndexStart, firstSeparator);
                    filterIndexStart = firstSeparator;
                    const separatorCode = line.charCodeAt(firstSeparator);
                    if (separatorCode === 94 /* '^' */) {
                        // If the only symbol remaining for the selector is '^' then ignore it
                        // but set the filter as right anchored since there should not be any
                        // other label on the right
                        if (filterIndexEnd - filterIndexStart === 1) {
                            filterIndexStart = filterIndexEnd;
                            mask = setBit(mask, 67108864 /* isRightAnchor */);
                        }
                        else {
                            mask = setBit(mask, 8388608 /* isRegex */);
                            mask = setBit(mask, 33554432 /* isLeftAnchor */);
                        }
                    }
                    else if (separatorCode === 42 /* '*' */) {
                        mask = setBit(mask, 8388608 /* isRegex */);
                        // mask = setBit(mask, NETWORK_FILTER_MASK.isLeftAnchor);
                    }
                    else {
                        mask = setBit(mask, 33554432 /* isLeftAnchor */);
                    }
                }
            }
            // Remove trailing '*'
            if (filterIndexEnd - filterIndexStart > 0 &&
                line.charCodeAt(filterIndexEnd - 1) === 42 /* '*' */) {
                filterIndexEnd -= 1;
            }
            // Remove leading '*' if the filter is not hostname anchored.
            if (getBit(mask, 268435456 /* isHostnameAnchor */) === false &&
                filterIndexEnd - filterIndexStart > 0 &&
                line.charCodeAt(filterIndexStart) === 42 /* '*' */) {
                mask = clearBit(mask, 33554432 /* isLeftAnchor */);
                filterIndexStart += 1;
            }
            // Transform filters on protocol (http, https, ws)
            if (getBit(mask, 33554432 /* isLeftAnchor */)) {
                if (filterIndexEnd - filterIndexStart === 5 &&
                    fastStartsWithFrom(line, 'ws://', filterIndexStart)) {
                    mask = setBit(mask, 4096 /* fromWebsocket */);
                    mask = clearBit(mask, 33554432 /* isLeftAnchor */);
                    mask = clearBit(mask, 4 /* fromHttp */);
                    mask = clearBit(mask, 8 /* fromHttps */);
                    filterIndexStart = filterIndexEnd;
                }
                else if (filterIndexEnd - filterIndexStart === 7 &&
                    fastStartsWithFrom(line, 'http://', filterIndexStart)) {
                    mask = setBit(mask, 4 /* fromHttp */);
                    mask = clearBit(mask, 8 /* fromHttps */);
                    mask = clearBit(mask, 33554432 /* isLeftAnchor */);
                    filterIndexStart = filterIndexEnd;
                }
                else if (filterIndexEnd - filterIndexStart === 8 &&
                    fastStartsWithFrom(line, 'https://', filterIndexStart)) {
                    mask = setBit(mask, 8 /* fromHttps */);
                    mask = clearBit(mask, 4 /* fromHttp */);
                    mask = clearBit(mask, 33554432 /* isLeftAnchor */);
                    filterIndexStart = filterIndexEnd;
                }
                else if (filterIndexEnd - filterIndexStart === 8 &&
                    fastStartsWithFrom(line, 'http*://', filterIndexStart)) {
                    mask = setBit(mask, 8 /* fromHttps */);
                    mask = setBit(mask, 4 /* fromHttp */);
                    mask = clearBit(mask, 33554432 /* isLeftAnchor */);
                    filterIndexStart = filterIndexEnd;
                }
            }
            if (filterIndexEnd - filterIndexStart > 0) {
                filter = line.slice(filterIndexStart, filterIndexEnd).toLowerCase();
                mask = setNetworkMask(mask, 16777216 /* isUnicode */, hasUnicode(filter));
                if (getBit(mask, 8388608 /* isRegex */) === false) {
                    mask = setNetworkMask(mask, 8388608 /* isRegex */, checkIsRegex(filter, 0, filter.length));
                }
            }
            // TODO
            // - ignore hostname anchor is not hostname provided
            if (hostname !== undefined) {
                hostname = hostname.toLowerCase();
                if (hasUnicode(hostname)) {
                    mask = setNetworkMask(mask, 16777216 /* isUnicode */, true);
                    hostname = toASCII(hostname);
                }
            }
        }
        return new NetworkFilter({
            csp,
            filter,
            hostname,
            mask,
            domains,
            denyallow,
            rawLine: debug === true ? line : undefined,
            redirect,
            regex: undefined,
        });
    }
    /**
     * Deserialize network filters. The code accessing the buffer should be
     * symetrical to the one in `serializeNetworkFilter`.
     */
    static deserialize(buffer) {
        const mask = buffer.getUint32();
        const optionalParts = buffer.getUint8();
        const isUnicode = getBit(mask, 16777216 /* isUnicode */);
        // The order of these statements is important. Since `buffer.getX()` will
        // internally increment the position of next byte to read, they need to be
        // retrieved in the exact same order they were serialized (check
        // `serializeNetworkFilter`).
        return new NetworkFilter({
            // Mandatory field
            mask,
            // Optional parts
            csp: (optionalParts & 1) === 1 ? buffer.getNetworkCSP() : undefined,
            filter: (optionalParts & 2) === 2
                ? isUnicode
                    ? buffer.getUTF8()
                    : buffer.getNetworkFilter()
                : undefined,
            hostname: (optionalParts & 4) === 4 ? buffer.getNetworkHostname() : undefined,
            domains: (optionalParts & 8) === 8 ? Domains.deserialize(buffer) : undefined,
            rawLine: (optionalParts & 16) === 16 ? buffer.getUTF8() : undefined,
            redirect: (optionalParts & 32) === 32 ? buffer.getNetworkRedirect() : undefined,
            denyallow: (optionalParts & 64) === 64 ? Domains.deserialize(buffer) : undefined,
            regex: undefined,
        });
    }
    isCosmeticFilter() {
        return false;
    }
    isNetworkFilter() {
        return true;
    }
    match(request) {
        return checkOptions(this, request) && checkPattern(this, request);
    }
    /**
     * To allow for a more compact representation of network filters, the
     * representation is composed of a mandatory header, and some optional
     *
     * Header:
     * =======
     *
     *  | opt | mask
     *     8     32
     *
     * For an empty filter having no pattern, hostname, the minimum size is: 42 bits.
     *
     * Then for each optional part (filter, hostname optDomains, optNotDomains,
     * redirect), it takes 16 bits for the length of the string + the length of the
     * string in bytes.
     *
     * The optional parts are written in order of there number of occurrence in the
     * filter list used by the adblocker. The most common being `hostname`, then
     * `filter`, `optDomains`, `optNotDomains`, `redirect`.
     *
     * Example:
     * ========
     *
     * @@||cliqz.com would result in a serialized version:
     *
     * | 1 | mask | 9 | c | l | i | q | z | . | c | o | m  (16 bytes)
     *
     * In this case, the serialized version is actually bigger than the original
     * filter, but faster to deserialize. In the future, we could optimize the
     * representation to compact small filters better.
     *
     * Ideas:
     *  * variable length encoding for the mask (if not option, take max 1 byte).
     *  * first byte could contain the mask as well if small enough.
     *  * when packing ascii string, store several of them in each byte.
     */
    serialize(buffer) {
        buffer.pushUint32(this.mask);
        const index = buffer.getPos();
        buffer.pushUint8(0);
        // This bit-mask indicates which optional parts of the filter were serialized.
        let optionalParts = 0;
        if (this.csp !== undefined) {
            optionalParts |= 1;
            buffer.pushNetworkCSP(this.csp);
        }
        if (this.filter !== undefined) {
            optionalParts |= 2;
            if (this.isUnicode()) {
                buffer.pushUTF8(this.filter);
            }
            else {
                buffer.pushNetworkFilter(this.filter);
            }
        }
        if (this.hostname !== undefined) {
            optionalParts |= 4;
            buffer.pushNetworkHostname(this.hostname);
        }
        if (this.domains !== undefined) {
            optionalParts |= 8;
            this.domains.serialize(buffer);
        }
        if (this.rawLine !== undefined) {
            optionalParts |= 16;
            buffer.pushUTF8(this.rawLine);
        }
        if (this.redirect !== undefined) {
            optionalParts |= 32;
            buffer.pushNetworkRedirect(this.redirect);
        }
        if (this.denyallow !== undefined) {
            optionalParts |= 64;
            this.denyallow.serialize(buffer);
        }
        buffer.setByte(index, optionalParts);
    }
    getSerializedSize(compression) {
        let estimate = 4 + 1; // mask = 4 bytes // optional parts = 1 byte
        if (this.csp !== undefined) {
            estimate += sizeOfNetworkCSP(this.csp, compression);
        }
        if (this.filter !== undefined) {
            if (this.isUnicode() === true) {
                estimate += sizeOfUTF8(this.filter);
            }
            else {
                estimate += sizeOfNetworkFilter(this.filter, compression);
            }
        }
        if (this.hostname !== undefined) {
            estimate += sizeOfNetworkHostname(this.hostname, compression);
        }
        if (this.domains !== undefined) {
            estimate += this.domains.getSerializedSize();
        }
        if (this.rawLine !== undefined) {
            estimate += sizeOfUTF8(this.rawLine);
        }
        if (this.redirect !== undefined) {
            estimate += sizeOfNetworkRedirect(this.redirect, compression);
        }
        if (this.denyallow !== undefined) {
            estimate += this.denyallow.getSerializedSize();
        }
        return estimate;
    }
    /**
     * Tries to recreate the original representation of the filter (adblock
     * syntax) from the internal representation. If `rawLine` is set (when filters
     * are parsed in `debug` mode for example), then it is returned directly.
     * Otherwise, we try to stick as closely as possible to the original form;
     * there are things which cannot be recovered though, like domains options
     * of which only hashes are stored.
     */
    toString() {
        if (this.rawLine !== undefined) {
            return this.rawLine;
        }
        let filter = '';
        if (this.isException()) {
            filter += '@@';
        }
        if (this.isHostnameAnchor()) {
            filter += '||';
        }
        else if (this.fromHttp() !== this.fromHttps()) {
            if (this.fromHttp()) {
                filter += '|http://';
            }
            else {
                filter += '|https://';
            }
        }
        else if (this.isLeftAnchor()) {
            filter += '|';
        }
        if (this.hasHostname()) {
            filter += this.getHostname();
            filter += '^';
        }
        if (this.isFullRegex()) {
            filter += `/${this.getRegex().source}/`;
        }
        else if (this.isRegex()) {
            filter += this.getRegex().source;
        }
        else {
            filter += this.getFilter();
        }
        if (this.isRightAnchor()) {
            filter += '|';
        }
        // Options
        const options = [];
        if (this.fromAny() === false) {
            const numberOfCptOptions = bitCount(this.getCptMask());
            const numberOfNegatedOptions = bitCount(FROM_ANY) - numberOfCptOptions;
            if (numberOfNegatedOptions < numberOfCptOptions) {
                for (const type of getListOfRequestTypesNegated(this)) {
                    options.push(`~${type}`);
                }
            }
            else {
                for (const type of getListOfRequestTypes(this)) {
                    options.push(type);
                }
            }
        }
        if (this.isImportant()) {
            options.push('important');
        }
        if (this.isRedirectRule()) {
            options.push(`redirect-rule=${this.getRedirect()}`);
        }
        else if (this.isRedirect()) {
            options.push(`redirect=${this.getRedirect()}`);
        }
        if (this.isCSP()) {
            options.push(`csp=${this.csp}`);
        }
        if (this.isElemHide()) {
            options.push('elemhide');
        }
        if (this.isSpecificHide()) {
            options.push('specifichide');
        }
        if (this.isGenericHide()) {
            options.push('generichide');
        }
        if (this.firstParty() !== this.thirdParty()) {
            if (this.firstParty()) {
                options.push('1p');
            }
            if (this.thirdParty()) {
                options.push('3p');
            }
        }
        if (this.domains !== undefined) {
            options.push('domain=<hashed>');
        }
        if (this.denyallow !== undefined) {
            options.push('denyallow=<hashed>');
        }
        if (this.isBadFilter()) {
            options.push('badfilter');
        }
        if (options.length > 0) {
            filter += `$${options.join(',')}`;
        }
        return filter;
    }
    // Public API (Read-Only)
    getIdWithoutBadFilter() {
        // This method computes the id ignoring the $badfilter option (which will
        // correspond to the ID of filters being discarded). This allows us to
        // eliminate bad filters by comparing IDs, which is more robust and faster
        // than string comparison.
        return computeFilterId(this.csp, this.mask & ~131072 /* isBadFilter */, this.filter, this.hostname, this.domains, this.denyallow, this.redirect);
    }
    getId() {
        if (this.id === undefined) {
            this.id = computeFilterId(this.csp, this.mask, this.filter, this.hostname, this.domains, this.denyallow, this.redirect);
        }
        return this.id;
    }
    hasFilter() {
        return this.filter !== undefined;
    }
    hasDomains() {
        return this.domains !== undefined;
    }
    getMask() {
        return this.mask;
    }
    getCptMask() {
        return this.getMask() & FROM_ANY;
    }
    isRedirect() {
        return this.redirect !== undefined;
    }
    isRedirectRule() {
        return getBit(this.mask, 536870912 /* isRedirectRule */);
    }
    getRedirect() {
        return this.redirect || '';
    }
    hasHostname() {
        return this.hostname !== undefined;
    }
    getHostname() {
        return this.hostname || '';
    }
    getFilter() {
        return this.filter || '';
    }
    getRegex() {
        if (this.regex === undefined) {
            this.regex =
                this.filter !== undefined && this.isRegex()
                    ? compileRegex(this.filter, this.isLeftAnchor(), this.isRightAnchor(), this.isFullRegex())
                    : MATCH_ALL;
        }
        return this.regex;
    }
    getTokens() {
        TOKENS_BUFFER.reset();
        // If there is only one domain and no domain negation, we also use this
        // domain as a token.
        if (this.domains !== undefined &&
            this.domains.hostnames !== undefined &&
            this.domains.entities === undefined &&
            this.domains.notHostnames === undefined &&
            this.domains.notEntities === undefined &&
            this.domains.hostnames.length === 1) {
            TOKENS_BUFFER.push(this.domains.hostnames[0]);
        }
        // Get tokens from filter
        if (this.isFullRegex() === false) {
            if (this.filter !== undefined) {
                const skipLastToken = this.isPlain() && !this.isRightAnchor();
                const skipFirstToken = !this.isLeftAnchor();
                tokenizeWithWildcardsInPlace(this.filter, skipFirstToken, skipLastToken, TOKENS_BUFFER);
            }
            // Append tokens from hostname, if any
            if (this.hostname !== undefined) {
                tokenizeInPlace(this.hostname, false, this.filter !== undefined && this.filter.charCodeAt(0) === 42 /* '*' */, TOKENS_BUFFER);
            }
        }
        else if (this.filter !== undefined) {
            tokenizeRegexInPlace(this.filter, TOKENS_BUFFER);
        }
        // If we got no tokens for the filter/hostname part, then we will dispatch
        // this filter in multiple buckets based on the domains option.
        if (TOKENS_BUFFER.empty() === true &&
            this.domains !== undefined &&
            this.domains.hostnames !== undefined &&
            this.domains.entities === undefined &&
            this.domains.notHostnames === undefined &&
            this.domains.notEntities === undefined) {
            const result = [];
            for (const hostname of this.domains.hostnames) {
                const arr = new Uint32Array(1);
                arr[0] = hostname;
                result.push(arr);
            }
            return result;
        }
        // Add optional token for types
        if (TOKENS_BUFFER.empty() === true && this.fromAny() === false) {
            const types = getListOfRequestTypes(this);
            if (types.length !== 0) {
                const result = [];
                for (const type of types) {
                    const arr = new Uint32Array(1);
                    arr[0] = NORMALIZED_TYPE_TOKEN[type];
                    result.push(arr);
                }
                return result;
            }
        }
        // Add optional token for protocol
        if (this.fromHttp() === true && this.fromHttps() === false) {
            TOKENS_BUFFER.push(HTTP_HASH);
        }
        else if (this.fromHttps() === true && this.fromHttp() === false) {
            TOKENS_BUFFER.push(HTTPS_HASH);
        }
        return [TOKENS_BUFFER.slice()];
    }
    /**
     * Check if this filter should apply to a request with this content type.
     */
    isCptAllowed(cpt) {
        const mask = REQUEST_TYPE_TO_MASK[cpt];
        if (mask !== undefined) {
            return getBit(this.mask, mask);
        }
        // If content type is not supported (or not specified), we return `true`
        // only if the filter does not specify any resource type.
        return this.fromAny();
    }
    isException() {
        return getBit(this.mask, 134217728 /* isException */);
    }
    isHostnameAnchor() {
        return getBit(this.mask, 268435456 /* isHostnameAnchor */);
    }
    isRightAnchor() {
        return getBit(this.mask, 67108864 /* isRightAnchor */);
    }
    isLeftAnchor() {
        return getBit(this.mask, 33554432 /* isLeftAnchor */);
    }
    isImportant() {
        return getBit(this.mask, 1048576 /* isImportant */);
    }
    isFullRegex() {
        return getBit(this.mask, 4194304 /* isFullRegex */);
    }
    isRegex() {
        return (getBit(this.mask, 8388608 /* isRegex */) ||
            getBit(this.mask, 4194304 /* isFullRegex */));
    }
    isPlain() {
        return !this.isRegex();
    }
    isCSP() {
        return getBit(this.mask, 262144 /* isCSP */);
    }
    isElemHide() {
        return this.isSpecificHide() && this.isGenericHide();
    }
    isSpecificHide() {
        return getBit(this.mask, 2097152 /* isSpecificHide */);
    }
    isGenericHide() {
        return getBit(this.mask, 524288 /* isGenericHide */);
    }
    isBadFilter() {
        return getBit(this.mask, 131072 /* isBadFilter */);
    }
    isUnicode() {
        return getBit(this.mask, 16777216 /* isUnicode */);
    }
    fromAny() {
        return this.getCptMask() === FROM_ANY;
    }
    thirdParty() {
        return getBit(this.mask, 32768 /* thirdParty */);
    }
    firstParty() {
        return getBit(this.mask, 16384 /* firstParty */);
    }
    fromImage() {
        return getBit(this.mask, 16 /* fromImage */);
    }
    fromMedia() {
        return getBit(this.mask, 32 /* fromMedia */);
    }
    fromObject() {
        return getBit(this.mask, 64 /* fromObject */);
    }
    fromOther() {
        return getBit(this.mask, 128 /* fromOther */);
    }
    fromPing() {
        return getBit(this.mask, 256 /* fromPing */);
    }
    fromScript() {
        return getBit(this.mask, 512 /* fromScript */);
    }
    fromStylesheet() {
        return getBit(this.mask, 1024 /* fromStylesheet */);
    }
    fromDocument() {
        return getBit(this.mask, 1 /* fromDocument */);
    }
    fromSubdocument() {
        return getBit(this.mask, 2048 /* fromSubdocument */);
    }
    fromWebsocket() {
        return getBit(this.mask, 4096 /* fromWebsocket */);
    }
    fromHttp() {
        return getBit(this.mask, 4 /* fromHttp */);
    }
    fromHttps() {
        return getBit(this.mask, 8 /* fromHttps */);
    }
    fromXmlHttpRequest() {
        return getBit(this.mask, 8192 /* fromXmlHttpRequest */);
    }
    fromFont() {
        return getBit(this.mask, 2 /* fromFont */);
    }
}
// ---------------------------------------------------------------------------
// Filter parsing
// ---------------------------------------------------------------------------
function setNetworkMask(mask, m, value) {
    if (value === true) {
        return setBit(mask, m);
    }
    return clearBit(mask, m);
}
/**
 * Check if the sub-string contained between the indices start and end is a
 * regex filter (it contains a '*' or '^' char).
 */
function checkIsRegex(filter, start, end) {
    const indexOfSeparator = filter.indexOf('^', start);
    if (indexOfSeparator !== -1 && indexOfSeparator < end) {
        return true;
    }
    const indexOfWildcard = filter.indexOf('*', start);
    return indexOfWildcard !== -1 && indexOfWildcard < end;
}
/**
 * Handle hostname anchored filters, given 'hostname' from ||hostname and
 * request's hostname, check if there is a match. This is tricky because
 * filters authors rely and different assumptions. We can have prefix of suffix
 * matches of anchor.
 */
export function isAnchoredByHostname(filterHostname, hostname, isFollowedByWildcard) {
    // Corner-case, if `filterHostname` is empty, then it's a match
    if (filterHostname.length === 0) {
        return true;
    }
    // `filterHostname` cannot be longer than actual hostname
    if (filterHostname.length > hostname.length) {
        return false;
    }
    // If they have the same length, they should be equal
    if (filterHostname.length === hostname.length) {
        return filterHostname === hostname;
    }
    // Check if `filterHostname` appears anywhere in `hostname`
    const matchIndex = hostname.indexOf(filterHostname);
    // No match
    if (matchIndex === -1) {
        return false;
    }
    // `filterHostname` is a prefix of `hostname` and needs to match full a label.
    //
    // Examples (filterHostname, hostname):
    //   * (foo, foo.com)
    //   * (sub.foo, sub.foo.com)
    if (matchIndex === 0) {
        return (isFollowedByWildcard === true ||
            hostname.charCodeAt(filterHostname.length) === 46 /* '.' */ ||
            filterHostname.charCodeAt(filterHostname.length - 1) === 46 /* '.' */);
    }
    // `filterHostname` is a suffix of `hostname`.
    //
    // Examples (filterHostname, hostname):
    //    * (foo.com, sub.foo.com)
    //    * (com, foo.com)
    if (hostname.length === matchIndex + filterHostname.length) {
        return (hostname.charCodeAt(matchIndex - 1) === 46 /* '.' */ ||
            filterHostname.charCodeAt(0) === 46 /* '.' */);
    }
    // `filterHostname` is infix of `hostname` and needs match full labels
    return ((isFollowedByWildcard === true ||
        hostname.charCodeAt(filterHostname.length) === 46 /* '.' */ ||
        filterHostname.charCodeAt(filterHostname.length - 1) === 46) /* '.' */ &&
        (hostname.charCodeAt(matchIndex - 1) === 46 || filterHostname.charCodeAt(0) === 46));
}
/**
 * Specialize a network filter depending on its type. It allows for more
 * efficient matching function.
 */
function checkPattern(filter, request) {
    const pattern = filter.getFilter();
    if (filter.isHostnameAnchor() === true) {
        // Make sure request is anchored by hostname before proceeding to matching
        const filterHostname = filter.getHostname();
        if (isAnchoredByHostname(filterHostname, request.hostname, filter.filter !== undefined && filter.filter.charCodeAt(0) === 42 /* '*' */) === false) {
            return false;
        }
        // At this point we know request is hostname anchored so we match the rest of the filter.
        if (filter.isRegex()) {
            // ||pattern*^
            return filter
                .getRegex()
                .test(request.url.slice(request.url.indexOf(filterHostname) + filterHostname.length));
        }
        else if (filter.isRightAnchor() && filter.isLeftAnchor()) {
            // |||pattern|
            // Since this is not a regex, the filter pattern must follow the hostname
            // with nothing in between. So we extract the part of the URL following
            // after hostname and will perform the matching on it.
            const urlAfterHostname = request.url.slice(request.url.indexOf(filterHostname) + filterHostname.length);
            // Since it must follow immediatly after the hostname and be a suffix of
            // the URL, we conclude that filter must be equal to the part of the
            // url following the hostname.
            return pattern === urlAfterHostname;
        }
        else if (filter.isRightAnchor()) {
            // ||pattern|
            const requestHostname = request.hostname;
            if (filter.hasFilter() === false) {
                // In this specific case it means that the specified hostname should match
                // at the end of the hostname of the request. This allows to prevent false
                // positive like ||foo.bar which would match https://foo.bar.baz where
                // ||foo.bar^ would not.
                return (filterHostname.length === requestHostname.length ||
                    requestHostname.endsWith(filterHostname));
            }
            else {
                // pattern|
                return request.url.endsWith(pattern);
            }
        }
        else if (filter.isLeftAnchor()) {
            // ||pattern + left-anchor => This means that a plain pattern needs to appear
            // exactly after the hostname, with nothing in between.
            // Since this is not a regex, the filter pattern must follow the hostname
            // with nothing in between. So we extract the part of the URL following
            // after hostname and will perform the matching on it.
            return fastStartsWithFrom(request.url, pattern, request.url.indexOf(filterHostname) + filterHostname.length);
        }
        if (filter.hasFilter() === false) {
            return true;
        }
        // We consider this a match if the plain patter (i.e.: filter) appears anywhere.
        return (request.url.indexOf(pattern, request.url.indexOf(filterHostname) + filterHostname.length) !==
            -1);
    }
    else if (filter.isRegex()) {
        // pattern*^
        return filter.getRegex().test(request.url);
    }
    else if (filter.isLeftAnchor() && filter.isRightAnchor()) {
        // |pattern|
        return request.url === pattern;
    }
    else if (filter.isLeftAnchor()) {
        // |pattern
        return fastStartsWith(request.url, pattern);
    }
    else if (filter.isRightAnchor()) {
        // pattern|
        return request.url.endsWith(pattern);
    }
    // pattern
    if (filter.hasFilter() === false) {
        return true;
    }
    return request.url.indexOf(pattern) !== -1;
}
function checkOptions(filter, request) {
    // We first discard requests based on type, protocol and party. This is really
    // cheap and should be done first.
    if (filter.isCptAllowed(request.type) === false ||
        (request.isHttps === true && filter.fromHttps() === false) ||
        (request.isHttp === true && filter.fromHttp() === false) ||
        (filter.firstParty() === false && request.isFirstParty === true) ||
        (filter.thirdParty() === false && request.isThirdParty === true)) {
        return false;
    }
    // If `sourceHostname` is *not* matched by `domain` then the request should be allowed.
    if (filter.domains !== undefined &&
        filter.domains.match(request.sourceHostnameHashes, request.sourceEntityHashes) === false) {
        return false;
    }
    // If `hostname` is matched by `denyallow` then the request should be allowed.
    if (filter.denyallow !== undefined &&
        filter.denyallow.match(request.getHostnameHashes(), request.getEntityHashes()) === true) {
        return false;
    }
    return true;
}
//# sourceMappingURL=network.js.map