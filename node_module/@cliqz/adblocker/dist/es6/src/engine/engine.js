/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import Config from '../config';
import { StaticDataView, sizeOfASCII, sizeOfByte } from '../data-view';
import { EventEmitter } from '../events';
import { adsAndTrackingLists, adsLists, fetchLists, fetchResources, fullLists, } from '../fetch';
import { block } from '../filters/dsl';
import { parseFilters } from '../lists';
import Request from '../request';
import Resources from '../resources';
import CosmeticFilterBucket from './bucket/cosmetic';
import NetworkFilterBucket from './bucket/network';
export const ENGINE_VERSION = 313;
function shouldApplyHideException(filters) {
    if (filters.length === 0) {
        return false;
    }
    // Get $Xhide filter with highest priority:
    // $Xhide,important > $Xhide > @@$Xhide
    let genericHideFilter;
    let currentScore = 0;
    for (const filter of filters) {
        // To encode priority between filters, we create a bitmask with the following:
        // $important,Xhide = 100 (takes precedence)
        // $Xhide           = 010 (exception to @@$Xhide)
        // @@$Xhide         = 001 (forbids Xhide filters)
        const score = (filter.isImportant() ? 4 : 0) | (filter.isException() ? 1 : 2);
        // Highest `score` has precedence
        if (score >= currentScore) {
            currentScore = score;
            genericHideFilter = filter;
        }
    }
    if (genericHideFilter === undefined) {
        return false;
    }
    // Check that there is at least one $generichide match and no exception
    return genericHideFilter.isException();
}
export default class FilterEngine extends EventEmitter {
    constructor({ 
    // Optionally initialize the engine with filters
    cosmeticFilters = [], networkFilters = [], config = new Config(), lists = new Map(), } = {}) {
        super(); // init super-class EventEmitter
        this.config = new Config(config);
        // Subscription management: disabled by default
        this.lists = lists;
        // $csp=
        this.csp = new NetworkFilterBucket({ config: this.config });
        // $elemhide
        // $generichide
        // $specifichide
        this.hideExceptions = new NetworkFilterBucket({ config: this.config });
        // @@filter
        this.exceptions = new NetworkFilterBucket({ config: this.config });
        // $important
        this.importants = new NetworkFilterBucket({ config: this.config });
        // $redirect
        this.redirects = new NetworkFilterBucket({ config: this.config });
        // All other filters
        this.filters = new NetworkFilterBucket({ config: this.config });
        // Cosmetic filters
        this.cosmetics = new CosmeticFilterBucket({ config: this.config });
        // Injections
        this.resources = new Resources();
        if (networkFilters.length !== 0 || cosmeticFilters.length !== 0) {
            this.update({
                newCosmeticFilters: cosmeticFilters,
                newNetworkFilters: networkFilters,
            });
        }
    }
    static fromCached(init, caching) {
        if (caching === undefined) {
            return init();
        }
        const { path, read, write } = caching;
        return read(path)
            .then((buffer) => this.deserialize(buffer))
            .catch(() => init().then((engine) => write(path, engine.serialize()).then(() => engine)));
    }
    static empty(config = {}) {
        return new this({ config });
    }
    /**
     * Create an instance of `FiltersEngine` (or subclass like `ElectronBlocker`,
     * etc.), from the list of subscriptions provided as argument (e.g.:
     * EasyList).
     *
     * Lists are fetched using the instance of `fetch` provided as a first
     * argument. Optionally resources.txt and config can be provided.
     */
    static fromLists(fetch, urls, config = {}, caching) {
        return this.fromCached(() => {
            const listsPromises = fetchLists(fetch, urls);
            const resourcesPromise = fetchResources(fetch);
            return Promise.all([listsPromises, resourcesPromise]).then(([lists, resources]) => {
                const engine = this.parse(lists.join('\n'), config);
                if (resources !== undefined) {
                    engine.updateResources(resources, '' + resources.length);
                }
                return engine;
            });
        }, caching);
    }
    /**
     * Initialize blocker of *ads only*.
     *
     * Attempt to initialize a blocking engine using a pre-built version served
     * from Cliqz's CDN. If this fails (e.g.: if no pre-built engine is available
     * for this version of the library), then falls-back to using `fromLists(...)`
     * method with the same subscriptions.
     */
    static fromPrebuiltAdsOnly(fetchImpl = fetch, caching) {
        return this.fromLists(fetchImpl, adsLists, {}, caching);
    }
    /**
     * Same as `fromPrebuiltAdsOnly(...)` but also contains rules to block
     * tracking (i.e.: using extra lists such as EasyPrivacy and more).
     */
    static fromPrebuiltAdsAndTracking(fetchImpl = fetch, caching) {
        return this.fromLists(fetchImpl, adsAndTrackingLists, {}, caching);
    }
    /**
     * Same as `fromPrebuiltAdsAndTracking(...)` but also contains annoyances
     * rules to block things like cookie notices.
     */
    static fromPrebuiltFull(fetchImpl = fetch, caching) {
        return this.fromLists(fetchImpl, fullLists, {}, caching);
    }
    static parse(filters, options = {}) {
        const config = new Config(options);
        return new this(Object.assign(Object.assign({}, parseFilters(filters, config)), { config }));
    }
    static deserialize(serialized) {
        const buffer = StaticDataView.fromUint8Array(serialized, {
            enableCompression: false,
        });
        // Before starting deserialization, we make sure that the version of the
        // serialized engine is the same as the current source code. If not, we
        // start fresh and create a new engine from the lists.
        const serializedEngineVersion = buffer.getUint16();
        if (ENGINE_VERSION !== serializedEngineVersion) {
            throw new Error(`serialized engine version mismatch, expected ${ENGINE_VERSION} but got ${serializedEngineVersion}`);
        }
        // Create a new engine with same options
        const config = Config.deserialize(buffer);
        // Optionally turn compression ON
        if (config.enableCompression) {
            buffer.enableCompression();
        }
        // Also make sure that the built-in checksum is correct. This allows to
        // detect data corruption and start fresh if the serialized version was
        // altered.
        if (config.integrityCheck) {
            const currentPos = buffer.pos;
            buffer.pos = serialized.length - 4;
            const checksum = buffer.checksum();
            const expected = buffer.getUint32();
            if (checksum !== expected) {
                throw new Error(`serialized engine checksum mismatch, expected ${expected} but got ${checksum}`);
            }
            buffer.pos = currentPos;
        }
        const engine = new this({ config });
        // Deserialize resources
        engine.resources = Resources.deserialize(buffer);
        // Deserialize lists
        const lists = new Map();
        const numberOfLists = buffer.getUint16();
        for (let i = 0; i < numberOfLists; i += 1) {
            lists.set(buffer.getASCII(), buffer.getASCII());
        }
        engine.lists = lists;
        // Deserialize buckets
        engine.importants = NetworkFilterBucket.deserialize(buffer, config);
        engine.redirects = NetworkFilterBucket.deserialize(buffer, config);
        engine.filters = NetworkFilterBucket.deserialize(buffer, config);
        engine.exceptions = NetworkFilterBucket.deserialize(buffer, config);
        engine.csp = NetworkFilterBucket.deserialize(buffer, config);
        engine.cosmetics = CosmeticFilterBucket.deserialize(buffer, config);
        engine.hideExceptions = NetworkFilterBucket.deserialize(buffer, config);
        return engine;
    }
    /**
     * Estimate the number of bytes needed to serialize this instance of
     * `FiltersEngine` using the `serialize(...)` method. It is used internally
     * by `serialize(...)` to allocate a buffer of the right size and you should
     * not have to call it yourself most of the time.
     *
     * There are cases where we cannot estimate statically the exact size of the
     * resulting buffer (due to alignement which need to be performed); this
     * method will return a safe estimate which will always be at least equal to
     * the real number of bytes needed, or bigger (usually of a few bytes only:
     * ~20 bytes is to be expected).
     */
    getSerializedSize() {
        let estimatedSize = sizeOfByte() + // engine version
            this.config.getSerializedSize() +
            this.resources.getSerializedSize() +
            this.filters.getSerializedSize() +
            this.exceptions.getSerializedSize() +
            this.importants.getSerializedSize() +
            this.redirects.getSerializedSize() +
            this.csp.getSerializedSize() +
            this.cosmetics.getSerializedSize() +
            this.hideExceptions.getSerializedSize() +
            4; // checksum
        // Estimate size of `this.lists` which stores information of checksum for each list.
        for (const [name, checksum] of this.lists) {
            estimatedSize += sizeOfASCII(name) + sizeOfASCII(checksum);
        }
        return estimatedSize;
    }
    /**
     * Creates a binary representation of the full engine. It can be stored
     * on-disk for faster loading of the adblocker. The `deserialize` static
     * method of Engine can be used to restore the engine.
     */
    serialize(array) {
        const buffer = StaticDataView.fromUint8Array(array || new Uint8Array(this.getSerializedSize()), this.config);
        buffer.pushUint16(ENGINE_VERSION);
        // Config
        this.config.serialize(buffer);
        // Resources (js, resources)
        this.resources.serialize(buffer);
        // Serialize the state of lists (names and checksums)
        buffer.pushUint16(this.lists.size);
        for (const [name, value] of Array.from(this.lists.entries()).sort()) {
            buffer.pushASCII(name);
            buffer.pushASCII(value);
        }
        // Filters buckets
        this.importants.serialize(buffer);
        this.redirects.serialize(buffer);
        this.filters.serialize(buffer);
        this.exceptions.serialize(buffer);
        this.csp.serialize(buffer);
        this.cosmetics.serialize(buffer);
        this.hideExceptions.serialize(buffer);
        // Optionally append a checksum at the end
        if (this.config.integrityCheck) {
            buffer.pushUint32(buffer.checksum());
        }
        return buffer.subarray();
    }
    /**
     * Update engine with new filters or resources.
     */
    loadedLists() {
        return Array.from(this.lists.keys());
    }
    hasList(name, checksum) {
        return this.lists.has(name) && this.lists.get(name) === checksum;
    }
    /**
     * Update engine with `resources.txt` content.
     */
    updateResources(data, checksum) {
        if (this.resources.checksum === checksum) {
            return false;
        }
        this.resources = Resources.parse(data, { checksum });
        return true;
    }
    getFilters() {
        const cosmeticFilters = [];
        const networkFilters = [];
        return {
            cosmeticFilters: cosmeticFilters.concat(this.cosmetics.getFilters()),
            networkFilters: networkFilters.concat(this.filters.getFilters(), this.exceptions.getFilters(), this.importants.getFilters(), this.redirects.getFilters(), this.csp.getFilters(), this.hideExceptions.getFilters()),
        };
    }
    /**
     * Update engine with new filters as well as optionally removed filters.
     */
    update({ newNetworkFilters = [], newCosmeticFilters = [], removedCosmeticFilters = [], removedNetworkFilters = [], }) {
        let updated = false;
        // Update cosmetic filters
        if (this.config.loadCosmeticFilters &&
            (newCosmeticFilters.length !== 0 || removedCosmeticFilters.length !== 0)) {
            updated = true;
            this.cosmetics.update(newCosmeticFilters, removedCosmeticFilters.length === 0 ? undefined : new Set(removedCosmeticFilters));
        }
        // Update network filters
        if (this.config.loadNetworkFilters &&
            (newNetworkFilters.length !== 0 || removedNetworkFilters.length !== 0)) {
            updated = true;
            const filters = [];
            const csp = [];
            const exceptions = [];
            const importants = [];
            const redirects = [];
            const hideExceptions = [];
            for (const filter of newNetworkFilters) {
                // NOTE: it's important to check for $generichide, $elemhide,
                // $specifichide and $csp before exceptions and important as we store
                // all of them in the same filter bucket. The check for exceptions is
                // done at match-time directly.
                if (filter.isCSP()) {
                    csp.push(filter);
                }
                else if (filter.isGenericHide() || filter.isSpecificHide()) {
                    hideExceptions.push(filter);
                }
                else if (filter.isException()) {
                    exceptions.push(filter);
                }
                else if (filter.isImportant()) {
                    importants.push(filter);
                }
                else if (filter.isRedirect()) {
                    redirects.push(filter);
                }
                else {
                    filters.push(filter);
                }
            }
            const removedNetworkFiltersSet = removedNetworkFilters.length === 0 ? undefined : new Set(removedNetworkFilters);
            // Update buckets in-place
            this.importants.update(importants, removedNetworkFiltersSet);
            this.redirects.update(redirects, removedNetworkFiltersSet);
            this.filters.update(filters, removedNetworkFiltersSet);
            this.exceptions.update(exceptions, removedNetworkFiltersSet);
            this.csp.update(csp, removedNetworkFiltersSet);
            this.hideExceptions.update(hideExceptions, removedNetworkFiltersSet);
        }
        return updated;
    }
    updateFromDiff({ added, removed }) {
        const newCosmeticFilters = [];
        const newNetworkFilters = [];
        const removedCosmeticFilters = [];
        const removedNetworkFilters = [];
        if (removed !== undefined && removed.length !== 0) {
            const { networkFilters, cosmeticFilters } = parseFilters(removed.join('\n'), this.config);
            Array.prototype.push.apply(removedCosmeticFilters, cosmeticFilters);
            Array.prototype.push.apply(removedNetworkFilters, networkFilters);
        }
        if (added !== undefined && added.length !== 0) {
            const { networkFilters, cosmeticFilters } = parseFilters(added.join('\n'), this.config);
            Array.prototype.push.apply(newCosmeticFilters, cosmeticFilters);
            Array.prototype.push.apply(newNetworkFilters, networkFilters);
        }
        return this.update({
            newCosmeticFilters,
            newNetworkFilters,
            removedCosmeticFilters: removedCosmeticFilters.map((f) => f.getId()),
            removedNetworkFilters: removedNetworkFilters.map((f) => f.getId()),
        });
    }
    /**
     * Return a list of HTML filtering rules.
     */
    getHtmlFilters({ 
    // Page information
    url, hostname, domain, }) {
        const htmlSelectors = [];
        if (this.config.enableHtmlFiltering === false || this.config.loadCosmeticFilters === false) {
            return htmlSelectors;
        }
        const rules = this.cosmetics.getHtmlRules({
            domain: domain || '',
            hostname,
        });
        for (const rule of rules) {
            const extended = rule.getExtendedSelector();
            if (extended !== undefined) {
                htmlSelectors.push(extended);
            }
        }
        if (htmlSelectors.length !== 0) {
            this.emit('html-filtered', htmlSelectors, url);
        }
        return htmlSelectors;
    }
    /**
     * Given `hostname` and `domain` of a page (or frame), return the list of
     * styles and scripts to inject in the page.
     */
    getCosmeticsFilters({ 
    // Page information
    url, hostname, domain, 
    // DOM information
    classes, hrefs, ids, 
    // Allows to specify which rules to return
    getBaseRules = true, getInjectionRules = true, getRulesFromDOM = true, getRulesFromHostname = true, }) {
        if (this.config.loadCosmeticFilters === false) {
            return {
                active: false,
                extended: [],
                scripts: [],
                styles: '',
            };
        }
        let allowGenericHides = true;
        let allowSpecificHides = true;
        const exceptions = this.hideExceptions.matchAll(Request.fromRawDetails({
            domain: domain || '',
            hostname,
            url,
            sourceDomain: '',
            sourceHostname: '',
            sourceUrl: '',
        }));
        const genericHides = [];
        const specificHides = [];
        for (const filter of exceptions) {
            if (filter.isElemHide()) {
                allowGenericHides = false;
                allowSpecificHides = false;
                break;
            }
            if (filter.isSpecificHide()) {
                specificHides.push(filter);
            }
            else if (filter.isGenericHide()) {
                genericHides.push(filter);
            }
        }
        if (allowGenericHides === true) {
            allowGenericHides = shouldApplyHideException(genericHides) === false;
        }
        if (allowSpecificHides === true) {
            allowSpecificHides = shouldApplyHideException(specificHides) === false;
        }
        // Lookup injections as well as stylesheets
        const { injections, stylesheet } = this.cosmetics.getCosmeticsFilters({
            domain: domain || '',
            hostname,
            classes,
            hrefs,
            ids,
            allowGenericHides,
            allowSpecificHides,
            getBaseRules,
            getInjectionRules,
            getRulesFromDOM,
            getRulesFromHostname,
        });
        // Perform interpolation for injected scripts
        const scripts = [];
        for (const injection of injections) {
            const script = injection.getScript(this.resources.js);
            if (script !== undefined) {
                this.emit('script-injected', script, url);
                scripts.push(script);
            }
        }
        // Emit events
        if (stylesheet.length !== 0) {
            this.emit('style-injected', stylesheet, url);
        }
        return {
            active: true,
            extended: [],
            scripts,
            styles: stylesheet,
        };
    }
    /**
     * Given a `request`, return all matching network filters found in the engine.
     */
    matchAll(request) {
        const filters = [];
        if (request.isSupported) {
            Array.prototype.push.apply(filters, this.importants.matchAll(request));
            Array.prototype.push.apply(filters, this.filters.matchAll(request));
            Array.prototype.push.apply(filters, this.exceptions.matchAll(request));
            Array.prototype.push.apply(filters, this.csp.matchAll(request));
            Array.prototype.push.apply(filters, this.hideExceptions.matchAll(request));
            Array.prototype.push.apply(filters, this.redirects.matchAll(request));
        }
        return new Set(filters);
    }
    /**
     * Given a "main_frame" request, check if some content security policies
     * should be injected in the page.
     */
    getCSPDirectives(request) {
        if (!this.config.loadNetworkFilters) {
            return undefined;
        }
        if (request.isSupported !== true || request.isMainFrame() === false) {
            return undefined;
        }
        const matches = this.csp.matchAll(request);
        // No $csp filter found
        if (matches.length === 0) {
            return undefined;
        }
        // Collect all CSP directives and keep track of exceptions
        const disabledCsp = new Set();
        const enabledCsp = new Set();
        for (const filter of matches) {
            if (filter.isException()) {
                if (filter.csp === undefined) {
                    // All CSP directives are disabled for this site
                    return undefined;
                }
                disabledCsp.add(filter.csp);
            }
            else {
                enabledCsp.add(filter.csp);
            }
        }
        // Combine all CSPs (except the black-listed ones)
        const csps = Array.from(enabledCsp)
            .filter((csp) => !disabledCsp.has(csp))
            .join('; ') || undefined;
        // Emit event
        if (csps !== undefined) {
            this.emit('csp-injected', csps, request);
        }
        return csps;
    }
    /**
     * Decide if a network request (usually from WebRequest API) should be
     * blocked, redirected or allowed.
     */
    match(request) {
        const result = {
            exception: undefined,
            filter: undefined,
            match: false,
            redirect: undefined,
        };
        if (!this.config.loadNetworkFilters) {
            return result;
        }
        if (request.isSupported) {
            // Check the filters in the following order:
            // 1. $important (not subject to exceptions)
            // 2. redirection ($redirect=resource)
            // 3. normal filters
            // 4. exceptions
            result.filter = this.importants.match(request);
            let redirectNone;
            let redirectRule;
            // If `result.filter` is `undefined`, it means there was no $important
            // filter found so far. We look for a $redirect filter.  There is some
            // extra logic to handle special cases like redirect-rule and
            // redirect=none.
            //
            // * If redirect=none is found, then cancel all redirects.
            // * Else if redirect-rule is found, only redirect if request would be blocked.
            // * Else if redirect is found, redirect.
            if (result.filter === undefined) {
                const redirects = this.redirects.matchAll(request);
                if (redirects.length !== 0) {
                    for (const filter of redirects) {
                        if (filter.getRedirect() === 'none') {
                            redirectNone = filter;
                        }
                        else if (filter.isRedirectRule()) {
                            redirectRule = filter;
                        }
                        else {
                            result.filter = filter;
                        }
                    }
                }
                // If `result.filter` is still `undefined`, it means that there was no
                // redirection rule triggered for the request. We look for a normal
                // match.
                if (result.filter === undefined) {
                    result.filter = this.filters.match(request);
                    // If we found a match, and a `$redirect-rule` as found previously,
                    // then we transform the match into a redirect, following the
                    // semantics of redirect-rule.
                    if (redirectRule !== undefined && result.filter !== undefined) {
                        result.filter = redirectRule;
                    }
                }
                // If we found either a redirection rule or a normal match, then check
                // for exceptions which could apply on the request and un-block it.
                if (result.filter !== undefined) {
                    result.exception = this.exceptions.match(request);
                }
            }
            // If there was a redirect match and no exception was found, then we
            // proceed and process the redirect rule. This means two things:
            //
            // 1. Check if a redirect=none rule was found, which acts as exception.
            // 2. If no exception was found, prepare `result.redirect` response.
            if (result.filter !== undefined &&
                result.exception === undefined &&
                result.filter.isRedirect()) {
                if (redirectNone !== undefined) {
                    result.exception = redirectNone;
                }
                else {
                    result.redirect = this.resources.getResource(result.filter.getRedirect());
                }
            }
        }
        result.match = result.exception === undefined && result.filter !== undefined;
        // Emit events if we found a match
        if (result.exception !== undefined) {
            this.emit('request-whitelisted', request, result);
        }
        else if (result.redirect !== undefined) {
            this.emit('request-redirected', request, result);
        }
        else if (result.filter !== undefined) {
            this.emit('request-blocked', request, result);
        }
        else {
            this.emit('request-allowed', request, result);
        }
        return result;
    }
    blockScripts() {
        this.updateFromDiff({
            added: [block().scripts().redirectTo('javascript').toString()],
        });
        return this;
    }
    blockImages() {
        this.updateFromDiff({
            added: [block().images().redirectTo('png').toString()],
        });
        return this;
    }
    blockMedias() {
        this.updateFromDiff({
            added: [block().medias().redirectTo('mp4').toString()],
        });
        return this;
    }
    blockFrames() {
        this.updateFromDiff({
            added: [block().frames().redirectTo('html').toString()],
        });
        return this;
    }
    blockFonts() {
        this.updateFromDiff({
            added: [block().fonts().toString()],
        });
        return this;
    }
    blockStyles() {
        this.updateFromDiff({
            added: [block().styles().toString()],
        });
        return this;
    }
}
//# sourceMappingURL=engine.js.map