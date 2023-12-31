/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import Config from '../config';
import { EventEmitter } from '../events';
import { Fetch } from '../fetch';
import { HTMLSelector } from '../html-filtering';
import CosmeticFilter from '../filters/cosmetic';
import NetworkFilter from '../filters/network';
import { IListDiff, IRawDiff } from '../lists';
import Request from '../request';
import Resources from '../resources';
import CosmeticFilterBucket from './bucket/cosmetic';
import NetworkFilterBucket from './bucket/network';
export declare const ENGINE_VERSION = 313;
export interface BlockingResponse {
    match: boolean;
    redirect: undefined | {
        body: string;
        contentType: string;
        dataUrl: string;
    };
    exception: NetworkFilter | undefined;
    filter: NetworkFilter | undefined;
}
export interface Caching {
    path: string;
    read: (path: string) => Promise<Uint8Array>;
    write: (path: string, buffer: Uint8Array) => Promise<void>;
}
export default class FilterEngine extends EventEmitter<'csp-injected' | 'html-filtered' | 'request-allowed' | 'request-blocked' | 'request-redirected' | 'request-whitelisted' | 'script-injected' | 'style-injected'> {
    private static fromCached;
    static empty<T extends FilterEngine>(this: new (...args: any[]) => T, config?: Partial<Config>): T;
    /**
     * Create an instance of `FiltersEngine` (or subclass like `ElectronBlocker`,
     * etc.), from the list of subscriptions provided as argument (e.g.:
     * EasyList).
     *
     * Lists are fetched using the instance of `fetch` provided as a first
     * argument. Optionally resources.txt and config can be provided.
     */
    static fromLists<T extends typeof FilterEngine>(this: T, fetch: Fetch, urls: string[], config?: Partial<Config>, caching?: Caching): Promise<InstanceType<T>>;
    /**
     * Initialize blocker of *ads only*.
     *
     * Attempt to initialize a blocking engine using a pre-built version served
     * from Cliqz's CDN. If this fails (e.g.: if no pre-built engine is available
     * for this version of the library), then falls-back to using `fromLists(...)`
     * method with the same subscriptions.
     */
    static fromPrebuiltAdsOnly<T extends typeof FilterEngine>(this: T, fetchImpl?: Fetch, caching?: Caching): Promise<InstanceType<T>>;
    /**
     * Same as `fromPrebuiltAdsOnly(...)` but also contains rules to block
     * tracking (i.e.: using extra lists such as EasyPrivacy and more).
     */
    static fromPrebuiltAdsAndTracking<T extends typeof FilterEngine>(this: T, fetchImpl?: Fetch, caching?: Caching): Promise<InstanceType<T>>;
    /**
     * Same as `fromPrebuiltAdsAndTracking(...)` but also contains annoyances
     * rules to block things like cookie notices.
     */
    static fromPrebuiltFull<T extends typeof FilterEngine>(this: T, fetchImpl?: Fetch, caching?: Caching): Promise<InstanceType<T>>;
    static parse<T extends FilterEngine>(this: new (...args: any[]) => T, filters: string, options?: Partial<Config>): T;
    static deserialize<T extends FilterEngine>(this: new (...args: any[]) => T, serialized: Uint8Array): T;
    lists: Map<string, string>;
    csp: NetworkFilterBucket;
    hideExceptions: NetworkFilterBucket;
    exceptions: NetworkFilterBucket;
    importants: NetworkFilterBucket;
    redirects: NetworkFilterBucket;
    filters: NetworkFilterBucket;
    cosmetics: CosmeticFilterBucket;
    resources: Resources;
    readonly config: Config;
    constructor({ cosmeticFilters, networkFilters, config, lists, }?: {
        cosmeticFilters?: CosmeticFilter[];
        networkFilters?: NetworkFilter[];
        lists?: Map<string, string>;
        config?: Partial<Config>;
    });
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
    getSerializedSize(): number;
    /**
     * Creates a binary representation of the full engine. It can be stored
     * on-disk for faster loading of the adblocker. The `deserialize` static
     * method of Engine can be used to restore the engine.
     */
    serialize(array?: Uint8Array): Uint8Array;
    /**
     * Update engine with new filters or resources.
     */
    loadedLists(): string[];
    hasList(name: string, checksum: string): boolean;
    /**
     * Update engine with `resources.txt` content.
     */
    updateResources(data: string, checksum: string): boolean;
    getFilters(): {
        networkFilters: NetworkFilter[];
        cosmeticFilters: CosmeticFilter[];
    };
    /**
     * Update engine with new filters as well as optionally removed filters.
     */
    update({ newNetworkFilters, newCosmeticFilters, removedCosmeticFilters, removedNetworkFilters, }: Partial<IListDiff>): boolean;
    updateFromDiff({ added, removed }: Partial<IRawDiff>): boolean;
    /**
     * Return a list of HTML filtering rules.
     */
    getHtmlFilters({ url, hostname, domain, }: {
        url: string;
        hostname: string;
        domain: string | null | undefined;
    }): HTMLSelector[];
    /**
     * Given `hostname` and `domain` of a page (or frame), return the list of
     * styles and scripts to inject in the page.
     */
    getCosmeticsFilters({ url, hostname, domain, classes, hrefs, ids, getBaseRules, getInjectionRules, getRulesFromDOM, getRulesFromHostname, }: {
        url: string;
        hostname: string;
        domain: string | null | undefined;
        classes?: string[];
        hrefs?: string[];
        ids?: string[];
        getBaseRules?: boolean;
        getInjectionRules?: boolean;
        getRulesFromDOM?: boolean;
        getRulesFromHostname?: boolean;
    }): {
        active: boolean;
        scripts: string[];
        styles: string;
        extended: string[];
    };
    /**
     * Given a `request`, return all matching network filters found in the engine.
     */
    matchAll(request: Request): Set<NetworkFilter>;
    /**
     * Given a "main_frame" request, check if some content security policies
     * should be injected in the page.
     */
    getCSPDirectives(request: Request): string | undefined;
    /**
     * Decide if a network request (usually from WebRequest API) should be
     * blocked, redirected or allowed.
     */
    match(request: Request): BlockingResponse;
    blockScripts(): this;
    blockImages(): this;
    blockMedias(): this;
    blockFrames(): this;
    blockFonts(): this;
    blockStyles(): this;
}
//# sourceMappingURL=engine.d.ts.map