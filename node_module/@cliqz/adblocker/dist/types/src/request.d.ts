/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/// <reference types="chrome" />
/// <reference types="firefox-webext-browser" />
export declare type ElectronRequestType = 'image' | 'mainFrame' | 'object' | 'other' | 'script' | 'stylesheet' | 'subFrame' | 'xhr';
export declare type PuppeteerRequestType = 'document' | 'eventsource' | 'fetch' | 'font' | 'image' | 'manifest' | 'media' | 'other' | 'script' | 'stylesheet' | 'texttrack' | 'websocket' | 'xhr';
export declare type PlaywrightRequestType = 'document' | 'eventsource' | 'fetch' | 'font' | 'image' | 'manifest' | 'media' | 'other' | 'script' | 'stylesheet' | 'texttrack' | 'websocket' | 'xhr';
export declare type WebRequestTypeChrome = chrome.webRequest.ResourceType;
export declare type WebRequestTypeFirefox = browser.webRequest.ResourceType;
export declare type WebRequestType = WebRequestTypeChrome | WebRequestTypeFirefox;
export declare type RequestType = WebRequestType | ElectronRequestType | PuppeteerRequestType | PlaywrightRequestType;
export declare const NORMALIZED_TYPE_TOKEN: {
    [s in RequestType]: number;
};
export declare function hashHostnameBackward(hostname: string): number;
export declare function getHashesFromLabelsBackward(hostname: string, end: number, startOfDomain: number): Uint32Array;
/**
 * Given a hostname and its domain, return the hostname without the public
 * suffix. We know that the domain, with one less label on the left, will be a
 * the public suffix; and from there we know which trailing portion of
 * `hostname` we should remove.
 */
export declare function getHostnameWithoutPublicSuffix(hostname: string, domain: string): string | null;
export declare function getEntityHashesFromLabelsBackward(hostname: string, domain: string): Uint32Array;
export declare function getHostnameHashesFromLabelsBackward(hostname: string, domain: string): Uint32Array;
export interface RequestInitialization {
    requestId: string;
    tabId: number;
    url: string;
    hostname: string;
    domain: string;
    sourceUrl: string;
    sourceHostname: string;
    sourceDomain: string;
    type: RequestType;
    _originalRequestDetails: any | undefined;
}
export default class Request {
    /**
     * Create an instance of `Request` from raw request details.
     */
    static fromRawDetails({ requestId, tabId, url, hostname, domain, sourceUrl, sourceHostname, sourceDomain, type, _originalRequestDetails, }: Partial<RequestInitialization>): Request;
    readonly _originalRequestDetails: any | undefined;
    type: RequestType;
    readonly isHttp: boolean;
    readonly isHttps: boolean;
    readonly isSupported: boolean;
    readonly isFirstParty: boolean;
    readonly isThirdParty: boolean;
    readonly id: string;
    readonly tabId: number;
    readonly url: string;
    readonly hostname: string;
    readonly domain: string;
    readonly sourceHostnameHashes: Uint32Array;
    readonly sourceEntityHashes: Uint32Array;
    private tokens;
    private hostnameHashes;
    private entityHashes;
    constructor({ requestId, tabId, type, domain, hostname, url, sourceDomain, sourceHostname, _originalRequestDetails, }: RequestInitialization);
    getHostnameHashes(): Uint32Array;
    getEntityHashes(): Uint32Array;
    getTokens(): Uint32Array;
    isMainFrame(): boolean;
    isSubFrame(): boolean;
    /**
     * Calling this method will attempt to guess the type of a request based on
     * information found in `url` only. This can be useful to try and fine-tune
     * the type of a Request when it is not otherwise available or if it was
     * inferred as 'other'.
     */
    guessTypeOfRequest(): RequestType;
}
/**
 * Kept for backward compatibility. The recommended way is to call
 * `Request.fromRawDetails` directly.
 */
export declare function makeRequest(details: Partial<RequestInitialization>): Request;
//# sourceMappingURL=request.d.ts.map