/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import Config from './config';
import CosmeticFilter from './filters/cosmetic';
import NetworkFilter from './filters/network';
import { fastStartsWith, fastStartsWithFrom } from './utils';
/**
 * Given a single line (string), checks if this would likely be a cosmetic
 * filter, a network filter or something that is not supported. This check is
 * performed before calling a more specific parser to create an instance of
 * `NetworkFilter` or `CosmeticFilter`.
 */
export function detectFilterType(line) {
    // Ignore empty line
    if (line.length === 0 || line.length === 1) {
        return 0 /* NOT_SUPPORTED */;
    }
    // Ignore comments
    const firstCharCode = line.charCodeAt(0);
    const secondCharCode = line.charCodeAt(1);
    if (firstCharCode === 33 /* '!' */ ||
        (firstCharCode === 35 /* '#' */ && secondCharCode <= 32) ||
        (firstCharCode === 91 /* '[' */ && fastStartsWith(line, '[Adblock'))) {
        return 0 /* NOT_SUPPORTED */;
    }
    // Fast heuristics to detect network filters
    const lastCharCode = line.charCodeAt(line.length - 1);
    if (firstCharCode === 36 /* '$' */ ||
        firstCharCode === 38 /* '&' */ ||
        firstCharCode === 42 /* '*' */ ||
        firstCharCode === 45 /* '-' */ ||
        firstCharCode === 46 /* '.' */ ||
        firstCharCode === 47 /* '/' */ ||
        firstCharCode === 58 /* ':' */ ||
        firstCharCode === 61 /* '=' */ ||
        firstCharCode === 63 /* '?' */ ||
        firstCharCode === 64 /* '@' */ ||
        firstCharCode === 95 /* '_' */ ||
        firstCharCode === 124 /* '|' */ ||
        lastCharCode === 124 /* '|' */) {
        return 1 /* NETWORK */;
    }
    // Ignore Adguard cosmetics
    // `$$` = HTML filtering rules
    const dollarIndex = line.indexOf('$');
    if (dollarIndex !== -1 && dollarIndex !== line.length - 1) {
        const afterDollarIndex = dollarIndex + 1;
        const afterDollarCharCode = line.charCodeAt(afterDollarIndex);
        // Ignore Adguard HTML rewrite rules
        if (afterDollarCharCode === 36 /* '$' */ ||
            (afterDollarCharCode === 64 /* '@' */ &&
                fastStartsWithFrom(line, /* $@$ */ '@$', afterDollarIndex))) {
            return 0 /* NOT_SUPPORTED */;
        }
    }
    // Check if filter is cosmetics
    const sharpIndex = line.indexOf('#');
    if (sharpIndex !== -1 && sharpIndex !== line.length - 1) {
        const afterSharpIndex = sharpIndex + 1;
        const afterSharpCharCode = line.charCodeAt(afterSharpIndex);
        if (afterSharpCharCode === 35 /* '#'*/ ||
            (afterSharpCharCode === 64 /* '@' */ &&
                fastStartsWithFrom(line, /* #@# */ '@#', afterSharpIndex))) {
            // Parse supported cosmetic filter
            // `##` `#@#`
            return 2 /* COSMETIC */;
        }
        else if ((afterSharpCharCode === 64 /* '@'*/ &&
            (fastStartsWithFrom(line, /* #@$# */ '@$#', afterSharpIndex) ||
                fastStartsWithFrom(line, /* #@%# */ '@%#', afterSharpIndex))) ||
            (afterSharpCharCode === 37 /* '%' */ &&
                fastStartsWithFrom(line, /* #%# */ '%#', afterSharpIndex)) ||
            (afterSharpCharCode === 36 /* '$' */ &&
                fastStartsWithFrom(line, /* #$# */ '$#', afterSharpIndex)) ||
            (afterSharpCharCode === 63 /* '?' */ &&
                fastStartsWithFrom(line, /* #?# */ '?#', afterSharpIndex))) {
            // Ignore Adguard cosmetics
            // `#$#` `#@$#`
            // `#%#` `#@%#`
            // `#?#`
            return 0 /* NOT_SUPPORTED */;
        }
    }
    // Everything else is a network filter
    return 1 /* NETWORK */;
}
export function parseFilter(filter) {
    const filterType = detectFilterType(filter);
    if (filterType === 1 /* NETWORK */) {
        return NetworkFilter.parse(filter, true);
    }
    else if (filterType === 2 /* COSMETIC */) {
        return CosmeticFilter.parse(filter, true);
    }
    return null;
}
export function f(strings) {
    return parseFilter(strings[0]);
}
export function parseFilters(list, config = new Config()) {
    config = new Config(config);
    const networkFilters = [];
    const cosmeticFilters = [];
    const lines = list.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
        let line = lines[i];
        // Check if `line` should be left-trimmed
        if (line.length !== 0 && line.charCodeAt(0) <= 32) {
            line = line.trim();
        }
        // Handle continuations
        if (line.length > 2) {
            while (i < lines.length - 1 &&
                line.charCodeAt(line.length - 1) === 92 &&
                line.charCodeAt(line.length - 2) === 32) {
                line = line.slice(0, -2);
                const nextLine = lines[i + 1];
                if (nextLine.length > 4 &&
                    nextLine.charCodeAt(0) === 32 &&
                    nextLine.charCodeAt(1) === 32 &&
                    nextLine.charCodeAt(2) === 32 &&
                    nextLine.charCodeAt(3) === 32 &&
                    nextLine.charCodeAt(4) !== 32) {
                    line += nextLine.slice(4);
                    i += 1;
                }
                else {
                    break;
                }
            }
        }
        // Check if `line` should be right-trimmed
        if (line.length !== 0 && line.charCodeAt(line.length - 1) <= 32) {
            line = line.trim();
        }
        // Detect if filter is supported, network or cosmetic
        const filterType = detectFilterType(line);
        if (filterType === 1 /* NETWORK */ && config.loadNetworkFilters === true) {
            const filter = NetworkFilter.parse(line, config.debug);
            if (filter !== null) {
                networkFilters.push(filter);
            }
        }
        else if (filterType === 2 /* COSMETIC */ && config.loadCosmeticFilters === true) {
            const filter = CosmeticFilter.parse(line, config.debug);
            if (filter !== null) {
                if (config.loadGenericCosmeticsFilters === true || filter.isGenericHide() === false) {
                    cosmeticFilters.push(filter);
                }
            }
        }
    }
    return { networkFilters, cosmeticFilters };
}
function getFilters(list, config) {
    const { networkFilters, cosmeticFilters } = parseFilters(list, config);
    const filters = [];
    return filters.concat(networkFilters).concat(cosmeticFilters);
}
/**
 * Helper used to return a set of lines as strings where each line is
 * guaranteed to be a valid filter (i.e.: comments, empty lines and
 * un-supported filters are dropped).
 */
export function getLinesWithFilters(list, config = new Config()) {
    // Set config to `debug` so that we keep track of raw lines for each filter
    return new Set(getFilters(list, new Config(Object.assign({}, config, { debug: true }))).map(({ rawLine }) => rawLine));
}
/**
 * Given two versions of the same subscription (e.g.: EasyList) as a string,
 * generate a raw diff (i.e.: a list of filters added and filters removed, in
 * their raw string form).
 */
export function generateDiff(prevRevision, newRevision, config = new Config()) {
    // Set config to `debug` so that we keep track of raw lines for each filter
    const debugConfig = new Config(Object.assign({}, config, { debug: true }));
    const prevRevisionFilters = getFilters(prevRevision, debugConfig);
    const prevRevisionIds = new Set(prevRevisionFilters.map((filter) => filter.getId()));
    const newRevisionFilters = getFilters(newRevision, debugConfig);
    const newRevisionIds = new Set(newRevisionFilters.map((filter) => filter.getId()));
    // Check which filters were added, based on ID
    const added = new Set();
    for (const filter of newRevisionFilters) {
        if (!prevRevisionIds.has(filter.getId())) {
            added.add(filter.rawLine);
        }
    }
    // Check which filters were removed, based on ID
    const removed = new Set();
    for (const filter of prevRevisionFilters) {
        if (!newRevisionIds.has(filter.getId())) {
            removed.add(filter.rawLine);
        }
    }
    return { added: Array.from(added), removed: Array.from(removed) };
}
/**
 * Merge several raw diffs into one, taking care of accumulating added and
 * removed filters, even if several diffs add/remove the same ones.
 */
export function mergeDiffs(diffs) {
    const addedCumul = new Set();
    const removedCumul = new Set();
    for (const { added, removed } of diffs) {
        if (added !== undefined) {
            for (const str of added) {
                if (removedCumul.has(str)) {
                    removedCumul.delete(str);
                }
                addedCumul.add(str);
            }
        }
        if (removed !== undefined) {
            for (const str of removed) {
                if (addedCumul.has(str)) {
                    addedCumul.delete(str);
                }
                removedCumul.add(str);
            }
        }
    }
    return {
        added: Array.from(addedCumul),
        removed: Array.from(removedCumul),
    };
}
//# sourceMappingURL=lists.js.map