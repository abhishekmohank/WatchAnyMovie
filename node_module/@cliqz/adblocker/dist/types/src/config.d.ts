/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { StaticDataView } from './data-view';
export default class Config {
    static deserialize(buffer: StaticDataView): Config;
    readonly debug: boolean;
    readonly enableCompression: boolean;
    readonly enableHtmlFiltering: boolean;
    readonly enableMutationObserver: boolean;
    readonly enableOptimizations: boolean;
    readonly guessRequestTypeFromUrl: boolean;
    readonly integrityCheck: boolean;
    readonly loadCosmeticFilters: boolean;
    readonly loadGenericCosmeticsFilters: boolean;
    readonly loadNetworkFilters: boolean;
    constructor({ debug, enableCompression, enableHtmlFiltering, enableMutationObserver, enableOptimizations, guessRequestTypeFromUrl, integrityCheck, loadCosmeticFilters, loadGenericCosmeticsFilters, loadNetworkFilters, }?: Partial<Config>);
    getSerializedSize(): number;
    serialize(buffer: StaticDataView): void;
}
//# sourceMappingURL=config.d.ts.map