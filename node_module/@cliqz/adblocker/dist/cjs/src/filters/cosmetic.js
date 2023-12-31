"use strict";
/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_HIDDING_STYLE = void 0;
const domains_1 = require("../engine/domains");
const data_view_1 = require("../data-view");
const request_1 = require("../request");
const utils_1 = require("../utils");
const html_filtering_1 = require("../html-filtering");
const EMPTY_TOKENS = [data_view_1.EMPTY_UINT32_ARRAY];
exports.DEFAULT_HIDDING_STYLE = 'display: none !important;';
/**
 * Given a `selector` starting with either '#' or '.' check if what follows is
 * a simple CSS selector: /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/
 */
function isSimpleSelector(selector) {
    for (let i = 1; i < selector.length; i += 1) {
        const code = selector.charCodeAt(i);
        if (!(code === 45 /* '-' */ ||
            code === 95 /* '_' */ ||
            (code >= 48 && code <= 57) /* [0-9] */ ||
            (code >= 65 && code <= 90) /* [A-Z] */ ||
            (code >= 97 && code <= 122)) /* [a-z] */) {
            if (i < selector.length - 1) {
                // Check if what follows is a ' >' or ' ~' or ' +', in which case we
                // also consider it a simple selector and the token this filter can be
                // indexed with is the first selector.
                const nextCode = selector.charCodeAt(i + 1);
                if (code === 91 /* '[' */ ||
                    code === 46 /* '.' */ ||
                    code === 58 /* ':' */ ||
                    (code === 32 /* ' ' */ &&
                        (nextCode === 62 /* '>' */ ||
                            nextCode === 43 /* '+' */ ||
                            nextCode === 126 /* '~' */ ||
                            nextCode === 46 /* '.' */ ||
                            nextCode === 35)) /* '#' */) {
                    return true;
                }
            }
            return false;
        }
    }
    return true;
}
/**
 * Given a `selector` starting with either 'a[' or '[', check if what follows
 * is a simple href attribute selector of the form: 'href^=' or 'href*='.
 */
function isSimpleHrefSelector(selector, start) {
    return (selector.startsWith('href^="', start) ||
        selector.startsWith('href*="', start) ||
        selector.startsWith('href="', start));
}
/**
 * Validate CSS selector. There is a fast path for simple selectors (e.g.: #foo
 * or .bar) which are the most common case. For complex ones, we rely on
 * `Element.matches` (if available).
 */
const isValidCss = (() => {
    const div = typeof document !== 'undefined'
        ? document.createElement('div')
        : {
            matches: () => {
                /* noop */
            },
        };
    const matches = (selector) => div.matches(selector);
    const validSelectorRe = /^[#.]?[\w-.]+$/;
    return function isValidCssImpl(selector) {
        if (validSelectorRe.test(selector)) {
            return true;
        }
        try {
            matches(selector);
        }
        catch (ex) {
            return false;
        }
        return true;
    };
})();
function computeFilterId(mask, selector, domains, style) {
    let hash = (5437 * 33) ^ mask;
    if (selector !== undefined) {
        for (let i = 0; i < selector.length; i += 1) {
            hash = (hash * 33) ^ selector.charCodeAt(i);
        }
    }
    if (domains !== undefined) {
        hash = domains.updateId(hash);
    }
    if (style !== undefined) {
        for (let i = 0; i < style.length; i += 1) {
            hash = (hash * 33) ^ style.charCodeAt(i);
        }
    }
    return hash >>> 0;
}
function parseProceduralFilter(line, indexAfterColon) {
    if (utils_1.fastStartsWithFrom(line, '-abp-', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'contains', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'has-text', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'has', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'if-not', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'if', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'matches-css-after', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'matches-css-before', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'matches-css', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'min-text-length', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'nth-ancestor', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'nth-of-type', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'remove', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'upward', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'watch-attrs', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'watch-attr', indexAfterColon) ||
        utils_1.fastStartsWithFrom(line, 'xpath', indexAfterColon)) {
        return null;
    }
    // TODO - here we should parse the selector.
    return line;
}
/***************************************************************************
 *  Cosmetic filters parsing
 * ************************************************************************ */
class CosmeticFilter {
    constructor({ mask, selector, domains, rawLine, style, }) {
        this.mask = mask;
        this.selector = selector;
        this.domains = domains;
        this.style = style;
        this.id = undefined;
        this.rawLine = rawLine;
    }
    /**
     * Given a line that we know contains a cosmetic filter, create a CosmeticFiler
     * instance out of it. This function should be *very* efficient, as it will be
     * used to parse tens of thousands of lines.
     */
    static parse(line, debug = false) {
        // Mask to store attributes. Each flag (unhide, scriptInject, etc.) takes
        // only 1 bit at a specific offset defined in COSMETICS_MASK.  cf:
        // COSMETICS_MASK for the offset of each property
        let mask = 0;
        let selector;
        let domains;
        let style;
        const sharpIndex = line.indexOf('#');
        // Start parsing the line
        const afterSharpIndex = sharpIndex + 1;
        let suffixStartIndex = afterSharpIndex + 1;
        // hostname1,hostname2#@#.selector
        //                    ^^ ^
        //                    || |
        //                    || suffixStartIndex
        //                    |afterSharpIndex
        //                    sharpIndex
        // Check if unhide
        if (line.length > afterSharpIndex && line[afterSharpIndex] === '@') {
            mask = utils_1.setBit(mask, 1 /* unhide */);
            suffixStartIndex += 1;
        }
        // Parse hostnames and entitites as well as their negations.
        //
        // - ~hostname##.selector
        // - hostname##.selector
        // - entity.*##.selector
        // - ~entity.*##.selector
        //
        // Each kind will have its own Uint32Array containing hashes, sorted by
        // number of labels considered. This allows a compact representation of
        // hostnames and fast matching without any string copy.
        if (sharpIndex > 0) {
            domains = domains_1.Domains.parse(line.slice(0, sharpIndex).split(','));
        }
        // Deal with ^script:has-text(...)
        if (line.charCodeAt(suffixStartIndex) === 94 /* '^' */ &&
            utils_1.fastStartsWithFrom(line, 'script:has-text(', suffixStartIndex + 1) &&
            line.charCodeAt(line.length - 1) === 41 /* ')' */) {
            //   ^script:has-text(selector)
            //    ^                       ^
            //    |                       |
            //    |                       |
            //    |                       scriptSelectorIndexEnd
            //    |
            //    scriptSelectorIndexStart
            //
            const scriptSelectorIndexStart = suffixStartIndex + 1;
            const scriptSelectorIndexEnd = line.length;
            mask = utils_1.setBit(mask, 64 /* htmlFiltering */);
            selector = line.slice(scriptSelectorIndexStart, scriptSelectorIndexEnd);
            // Make sure this is a valid selector
            if (html_filtering_1.extractHTMLSelectorFromRule(selector) === undefined) {
                return null;
            }
        }
        else if (line.length - suffixStartIndex > 4 &&
            line.charCodeAt(suffixStartIndex) === 43 /* '+' */ &&
            utils_1.fastStartsWithFrom(line, '+js(', suffixStartIndex)) {
            // Generic scriptlets are invalid, unless they are un-hide
            if ((domains === undefined ||
                (domains.hostnames === undefined && domains.entities === undefined)) &&
                utils_1.getBit(mask, 1 /* unhide */) === false) {
                return null;
            }
            mask = utils_1.setBit(mask, 2 /* scriptInject */);
            selector = line.slice(suffixStartIndex + 4, line.length - 1);
            // An empty scriptlet (i.e. '+js()') can be specified to cancel injections
            // on a specific domain or globally. It does not make sense though to have
            // an empty scriptlet without an exception (i.e. '#@#' is mandatory).
            if (utils_1.getBit(mask, 1 /* unhide */) === false && selector.length === 0) {
                return null;
            }
        }
        else {
            // Detect special syntax
            let indexOfColon = line.indexOf(':', suffixStartIndex);
            while (indexOfColon !== -1) {
                const indexAfterColon = indexOfColon + 1;
                if (utils_1.fastStartsWithFrom(line, 'style', indexAfterColon)) {
                    // ##selector :style(...)
                    if (line[indexAfterColon + 5] === '(' && line[line.length - 1] === ')') {
                        selector = line.slice(suffixStartIndex, indexOfColon);
                        style = line.slice(indexAfterColon + 6, -1);
                    }
                    else {
                        return null;
                    }
                }
                else {
                    const result = parseProceduralFilter(line, indexAfterColon);
                    if (result === null) {
                        return null;
                    }
                }
                indexOfColon = line.indexOf(':', indexAfterColon);
            }
            // If we reach this point, filter is not extended syntax
            if (selector === undefined && suffixStartIndex < line.length) {
                selector = line.slice(suffixStartIndex);
            }
            if (selector === undefined || !isValidCss(selector)) {
                // Not a valid selector
                return null;
            }
        }
        // Check if unicode appears in selector
        if (selector !== undefined) {
            if (utils_1.hasUnicode(selector)) {
                mask = utils_1.setBit(mask, 4 /* isUnicode */);
            }
            // Classify selector
            if (utils_1.getBit(mask, 64 /* htmlFiltering */) === false) {
                const c0 = selector.charCodeAt(0);
                const c1 = selector.charCodeAt(1);
                const c2 = selector.charCodeAt(2);
                // Check if we have a specific case of simple selector (id, class or
                // href) These are the most common filters and will benefit greatly from
                // a custom dispatch mechanism.
                if (utils_1.getBit(mask, 2 /* scriptInject */) === false) {
                    if (c0 === 46 /* '.' */ && isSimpleSelector(selector)) {
                        mask = utils_1.setBit(mask, 8 /* isClassSelector */);
                    }
                    else if (c0 === 35 /* '#' */ && isSimpleSelector(selector)) {
                        mask = utils_1.setBit(mask, 16 /* isIdSelector */);
                    }
                    else if (c0 === 97 /* a */ &&
                        c1 === 91 /* '[' */ &&
                        c2 === 104 /* 'h' */ &&
                        isSimpleHrefSelector(selector, 2)) {
                        mask = utils_1.setBit(mask, 32 /* isHrefSelector */);
                    }
                    else if (c0 === 91 /* '[' */ &&
                        c1 === 104 /* 'h' */ &&
                        isSimpleHrefSelector(selector, 1)) {
                        mask = utils_1.setBit(mask, 32 /* isHrefSelector */);
                    }
                }
            }
        }
        return new CosmeticFilter({
            mask,
            rawLine: debug === true ? line : undefined,
            selector,
            style,
            domains,
        });
    }
    /**
     * Deserialize cosmetic filters. The code accessing the buffer should be
     * symetrical to the one in `serializeCosmeticFilter`.
     */
    static deserialize(buffer) {
        const mask = buffer.getUint8();
        const isUnicode = utils_1.getBit(mask, 4 /* isUnicode */);
        const optionalParts = buffer.getUint8();
        const selector = isUnicode ? buffer.getUTF8() : buffer.getCosmeticSelector();
        // The order of these fields should be the same as when we serialize them.
        return new CosmeticFilter({
            // Mandatory fields
            mask,
            selector,
            // Optional fields
            domains: (optionalParts & 1) === 1 ? domains_1.Domains.deserialize(buffer) : undefined,
            rawLine: (optionalParts & 2) === 2 ? buffer.getUTF8() : undefined,
            style: (optionalParts & 4) === 4 ? buffer.getASCII() : undefined,
        });
    }
    isCosmeticFilter() {
        return true;
    }
    isNetworkFilter() {
        return false;
    }
    /**
     * The format of a cosmetic filter is:
     *
     * | mask | selector length | selector... | hostnames length | hostnames...
     *   32     16                              16
     *
     * The header (mask) is 32 bits, then we have a total of 32 bits to store the
     * length of `selector` and `hostnames` (16 bits each).
     *
     * Improvements similar to the onces mentioned in `serializeNetworkFilters`
     * could be applied here, to get a more compact representation.
     */
    serialize(buffer) {
        // Mandatory fields
        buffer.pushUint8(this.mask);
        const index = buffer.getPos();
        buffer.pushUint8(0);
        if (this.isUnicode()) {
            buffer.pushUTF8(this.selector);
        }
        else {
            buffer.pushCosmeticSelector(this.selector);
        }
        // This bit-mask indicates which optional parts of the filter were serialized.
        let optionalParts = 0;
        if (this.domains !== undefined) {
            optionalParts |= 1;
            this.domains.serialize(buffer);
        }
        if (this.rawLine !== undefined) {
            optionalParts |= 2;
            buffer.pushUTF8(this.rawLine);
        }
        if (this.style !== undefined) {
            optionalParts |= 4;
            buffer.pushASCII(this.style);
        }
        buffer.setByte(index, optionalParts);
    }
    /**
     * Return an estimation of the size (in bytes) needed to persist this filter
     * in a DataView. This does not need to be 100% accurate but should be an
     * upper-bound. It should also be as fast as possible.
     */
    getSerializedSize(compression) {
        let estimate = 1 + 1; // mask (1 byte) + optional parts (1 byte)
        if (this.isUnicode()) {
            estimate += data_view_1.sizeOfUTF8(this.selector);
        }
        else {
            estimate += data_view_1.sizeOfCosmeticSelector(this.selector, compression);
        }
        if (this.domains !== undefined) {
            estimate += this.domains.getSerializedSize();
        }
        if (this.rawLine !== undefined) {
            estimate += data_view_1.sizeOfUTF8(this.rawLine);
        }
        if (this.style !== undefined) {
            estimate += data_view_1.sizeOfASCII(this.style);
        }
        return estimate;
    }
    /**
     * Create a more human-readable version of this filter. It is mainly used for
     * debugging purpose, as it will expand the values stored in the bit mask.
     */
    toString() {
        if (this.rawLine !== undefined) {
            return this.rawLine;
        }
        let filter = '';
        if (this.domains !== undefined) {
            filter += '<hostnames>';
        }
        if (this.isUnhide()) {
            filter += '#@#';
        }
        else {
            filter += '##';
        }
        if (this.isScriptInject()) {
            filter += '+js(';
            filter += this.selector;
            filter += ')';
        }
        else {
            filter += this.selector;
        }
        return filter;
    }
    match(hostname, domain) {
        // Not constraint on hostname, match is true
        if (this.hasHostnameConstraint() === false) {
            return true;
        }
        // No `hostname` available but this filter has some constraints on hostname.
        if (!hostname && this.hasHostnameConstraint()) {
            return false;
        }
        if (this.domains !== undefined) {
            // TODO - this hashing could be re-used between cosmetics by using an
            // abstraction like `Request` (similar to network filters matching).
            // Maybe could we reuse `Request` directly without any change?
            return this.domains.match(hostname.length === 0
                ? data_view_1.EMPTY_UINT32_ARRAY
                : request_1.getHostnameHashesFromLabelsBackward(hostname, domain), hostname.length === 0
                ? data_view_1.EMPTY_UINT32_ARRAY
                : request_1.getEntityHashesFromLabelsBackward(hostname, domain));
        }
        return true;
    }
    /**
     * Get tokens for this filter. It can be indexed multiple times if multiple
     * hostnames are specified (e.g.: host1,host2##.selector).
     */
    getTokens() {
        const tokens = [];
        // Note, we do not need to use negated domains or entities as tokens here
        // since they will by definition not match on their own, unless accompanied
        // by a domain or entity. Instead, they are handled in
        // `CosmeticFilterBucket.getCosmeticsFilters(...)`.
        if (this.domains !== undefined) {
            const { hostnames, entities } = this.domains;
            if (hostnames !== undefined) {
                for (const hostname of hostnames) {
                    tokens.push(new Uint32Array([hostname]));
                }
            }
            if (entities !== undefined) {
                for (const entity of entities) {
                    tokens.push(new Uint32Array([entity]));
                }
            }
        }
        // Here we only take selector into account if the filter is not unHide.
        if (tokens.length === 0 && this.isUnhide() === false) {
            if (this.isIdSelector() || this.isClassSelector()) {
                // Here we try to identify the end of selector si that we can extract a
                // valid token out of it. In all these examples, 'selector' is our
                // token:
                //
                //   .selector[...]
                //   #selector[...]
                //   #selector ~ foo
                //   .selector:not(...)
                //   .selector.foo
                //
                // We now try to identify the first valid end of selector which will
                // also be the end of our token: space, bracket, colon, dot.
                let endOfSelector = 1;
                const selector = this.selector;
                for (; endOfSelector < selector.length; endOfSelector += 1) {
                    const code = selector.charCodeAt(endOfSelector);
                    if (code === 32 /* ' ' */ ||
                        code === 46 /* '.' */ ||
                        code === 58 /* ':' */ ||
                        code === 91 /* '[' */) {
                        break;
                    }
                }
                const arr = new Uint32Array(1);
                arr[0] = utils_1.fastHashBetween(selector, 1, endOfSelector);
                tokens.push(arr);
            }
            else if (this.isHrefSelector() === true) {
                const selector = this.getSelector();
                // Locate 'href' in selector
                let hrefIndex = selector.indexOf('href');
                if (hrefIndex === -1) {
                    return EMPTY_TOKENS;
                }
                hrefIndex += 4;
                // Tokenize optimally depending on the kind of selector: 'href=',
                // 'href*=', 'href^='.
                let skipFirstToken = false;
                let skipLastToken = true;
                if (selector.charCodeAt(hrefIndex) === 42 /* '*' */) {
                    // skip: '*'
                    skipFirstToken = true;
                    hrefIndex += 1;
                }
                else if (selector.charCodeAt(hrefIndex) === 94 /* '^' */) {
                    // skip: '^'
                    hrefIndex += 1;
                }
                else {
                    skipLastToken = false;
                }
                hrefIndex += 2; // skip:  '="'
                // Locate end of href
                const hrefEnd = selector.indexOf('"', hrefIndex);
                if (hrefEnd === -1) {
                    // That cannot happen unless the filter is not well-formed. In this
                    // case, we just return no tokens, which will result in this filter
                    // ending up in the "wildcard" bucket of the index.
                    return EMPTY_TOKENS;
                }
                tokens.push(utils_1.tokenize(this.selector.slice(hrefIndex, hrefEnd), skipFirstToken, skipLastToken));
            }
        }
        if (tokens.length === 0) {
            return EMPTY_TOKENS;
        }
        return tokens;
    }
    getScript(js) {
        let scriptName = this.getSelector();
        let scriptArguments = [];
        if (scriptName.indexOf(',') !== -1) {
            const parts = scriptName.split(',');
            if (parts.length === 0) {
                return undefined;
            }
            const firstPart = parts[0];
            if (firstPart === undefined) {
                return undefined;
            }
            scriptName = firstPart;
            scriptArguments = parts.slice(1).map((s) => s.trim());
        }
        let script = js.get(scriptName);
        if (script !== undefined) {
            for (let i = 0; i < scriptArguments.length; i += 1) {
                script = script.replace(`{{${i + 1}}}`, scriptArguments[i]);
            }
            return script;
        } // TODO - else throw an exception?
        return undefined;
    }
    hasHostnameConstraint() {
        return this.domains !== undefined;
    }
    getId() {
        if (this.id === undefined) {
            this.id = computeFilterId(this.mask, this.selector, this.domains, this.style);
        }
        return this.id;
    }
    hasCustomStyle() {
        return this.style !== undefined;
    }
    getStyle() {
        return this.style || exports.DEFAULT_HIDDING_STYLE;
    }
    getSelector() {
        return this.selector;
    }
    getExtendedSelector() {
        return html_filtering_1.extractHTMLSelectorFromRule(this.selector);
    }
    isUnhide() {
        return utils_1.getBit(this.mask, 1 /* unhide */);
    }
    isScriptInject() {
        return utils_1.getBit(this.mask, 2 /* scriptInject */);
    }
    isCSS() {
        return this.isScriptInject() === false;
    }
    isIdSelector() {
        return utils_1.getBit(this.mask, 16 /* isIdSelector */);
    }
    isClassSelector() {
        return utils_1.getBit(this.mask, 8 /* isClassSelector */);
    }
    isHrefSelector() {
        return utils_1.getBit(this.mask, 32 /* isHrefSelector */);
    }
    isUnicode() {
        return utils_1.getBit(this.mask, 4 /* isUnicode */);
    }
    isHtmlFiltering() {
        return utils_1.getBit(this.mask, 64 /* htmlFiltering */);
    }
    // A generic hide cosmetic filter is one that:
    //
    // * Do not have a domain specified. "Hide this element on all domains"
    // * Have only domain exceptions specified. "Hide this element on all domains except example.com"
    //
    // For example: ~example.com##.ad  is a generic filter as well!
    isGenericHide() {
        var _a, _b;
        return ((_a = this === null || this === void 0 ? void 0 : this.domains) === null || _a === void 0 ? void 0 : _a.hostnames) === undefined && ((_b = this === null || this === void 0 ? void 0 : this.domains) === null || _b === void 0 ? void 0 : _b.entities) === undefined;
    }
}
exports.default = CosmeticFilter;
//# sourceMappingURL=cosmetic.js.map