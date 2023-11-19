'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Check if `vhost` is a valid suffix of `hostname` (top-domain)
 *
 * It means that `vhost` needs to be a suffix of `hostname` and we then need to
 * make sure that: either they are equal, or the character preceding `vhost` in
 * `hostname` is a '.' (it should not be a partial label).
 *
 * * hostname = 'not.evil.com' and vhost = 'vil.com'      => not ok
 * * hostname = 'not.evil.com' and vhost = 'evil.com'     => ok
 * * hostname = 'not.evil.com' and vhost = 'not.evil.com' => ok
 */
function shareSameDomainSuffix(hostname, vhost) {
    if (hostname.endsWith(vhost)) {
        return (hostname.length === vhost.length ||
            hostname[hostname.length - vhost.length - 1] === '.');
    }
    return false;
}
/**
 * Given a hostname and its public suffix, extract the general domain.
 */
function extractDomainWithSuffix(hostname, publicSuffix) {
    // Locate the index of the last '.' in the part of the `hostname` preceding
    // the public suffix.
    //
    // examples:
    //   1. not.evil.co.uk  => evil.co.uk
    //         ^    ^
    //         |    | start of public suffix
    //         | index of the last dot
    //
    //   2. example.co.uk   => example.co.uk
    //     ^       ^
    //     |       | start of public suffix
    //     |
    //     | (-1) no dot found before the public suffix
    const publicSuffixIndex = hostname.length - publicSuffix.length - 2;
    const lastDotBeforeSuffixIndex = hostname.lastIndexOf('.', publicSuffixIndex);
    // No '.' found, then `hostname` is the general domain (no sub-domain)
    if (lastDotBeforeSuffixIndex === -1) {
        return hostname;
    }
    // Extract the part between the last '.'
    return hostname.slice(lastDotBeforeSuffixIndex + 1);
}
/**
 * Detects the domain based on rules and upon and a host string
 */
function getDomain(suffix, hostname, options) {
    // Check if `hostname` ends with a member of `validHosts`.
    if (options.validHosts !== null) {
        const validHosts = options.validHosts;
        for (let i = 0; i < validHosts.length; i += 1) {
            const vhost = validHosts[i];
            if (shareSameDomainSuffix(hostname, vhost)) {
                return vhost;
            }
        }
    }
    // If `hostname` is a valid public suffix, then there is no domain to return.
    // Since we already know that `getPublicSuffix` returns a suffix of `hostname`
    // there is no need to perform a string comparison and we only compare the
    // size.
    if (suffix.length === hostname.length) {
        return null;
    }
    // To extract the general domain, we start by identifying the public suffix
    // (if any), then consider the domain to be the public suffix with one added
    // level of depth. (e.g.: if hostname is `not.evil.co.uk` and public suffix:
    // `co.uk`, then we take one more level: `evil`, giving the final result:
    // `evil.co.uk`).
    return extractDomainWithSuffix(hostname, suffix);
}

/**
 * Return the part of domain without suffix.
 *
 * Example: for domain 'foo.com', the result would be 'foo'.
 */
function getDomainWithoutSuffix(domain, suffix) {
    // Note: here `domain` and `suffix` cannot have the same length because in
    // this case we set `domain` to `null` instead. It is thus safe to assume
    // that `suffix` is shorter than `domain`.
    return domain.slice(0, -suffix.length - 1);
}

/**
 * @param url - URL we want to extract a hostname from.
 * @param urlIsValidHostname - hint from caller; true if `url` is already a valid hostname.
 */
function extractHostname(url, urlIsValidHostname) {
    let start = 0;
    let end = url.length;
    let hasUpper = false;
    // If url is not already a valid hostname, then try to extract hostname.
    if (urlIsValidHostname === false) {
        // Special handling of data URLs
        if (url.startsWith('data:') === true) {
            return null;
        }
        // Trim leading spaces
        while (start < url.length && url.charCodeAt(start) <= 32) {
            start += 1;
        }
        // Trim trailing spaces
        while (end > start + 1 && url.charCodeAt(end - 1) <= 32) {
            end -= 1;
        }
        // Skip scheme.
        if (url.charCodeAt(start) === 47 /* '/' */ &&
            url.charCodeAt(start + 1) === 47 /* '/' */) {
            start += 2;
        }
        else {
            const indexOfProtocol = url.indexOf(':/', start);
            if (indexOfProtocol !== -1) {
                // Implement fast-path for common protocols. We expect most protocols
                // should be one of these 4 and thus we will not need to perform the
                // more expansive validity check most of the time.
                const protocolSize = indexOfProtocol - start;
                const c0 = url.charCodeAt(start);
                const c1 = url.charCodeAt(start + 1);
                const c2 = url.charCodeAt(start + 2);
                const c3 = url.charCodeAt(start + 3);
                const c4 = url.charCodeAt(start + 4);
                if (protocolSize === 5 &&
                    c0 === 104 /* 'h' */ &&
                    c1 === 116 /* 't' */ &&
                    c2 === 116 /* 't' */ &&
                    c3 === 112 /* 'p' */ &&
                    c4 === 115 /* 's' */) ;
                else if (protocolSize === 4 &&
                    c0 === 104 /* 'h' */ &&
                    c1 === 116 /* 't' */ &&
                    c2 === 116 /* 't' */ &&
                    c3 === 112 /* 'p' */) ;
                else if (protocolSize === 3 &&
                    c0 === 119 /* 'w' */ &&
                    c1 === 115 /* 's' */ &&
                    c2 === 115 /* 's' */) ;
                else if (protocolSize === 2 &&
                    c0 === 119 /* 'w' */ &&
                    c1 === 115 /* 's' */) ;
                else {
                    // Check that scheme is valid
                    for (let i = start; i < indexOfProtocol; i += 1) {
                        const lowerCaseCode = url.charCodeAt(i) | 32;
                        if (((lowerCaseCode >= 97 && lowerCaseCode <= 122) || // [a, z]
                            (lowerCaseCode >= 48 && lowerCaseCode <= 57) || // [0, 9]
                            lowerCaseCode === 46 || // '.'
                            lowerCaseCode === 45 || // '-'
                            lowerCaseCode === 43) === false // '+'
                        ) {
                            return null;
                        }
                    }
                }
                // Skip 0, 1 or more '/' after ':/'
                start = indexOfProtocol + 2;
                while (url.charCodeAt(start) === 47 /* '/' */) {
                    start += 1;
                }
            }
        }
        // Detect first occurrence of '/', '?' or '#'. We also keep track of the
        // last occurrence of '@', ']' or ':' to speed-up subsequent parsing of
        // (respectively), identifier, ipv6 or port.
        let indexOfIdentifier = -1;
        let indexOfClosingBracket = -1;
        let indexOfPort = -1;
        for (let i = start; i < end; i += 1) {
            const code = url.charCodeAt(i);
            if (code === 35 || // '#'
                code === 47 || // '/'
                code === 63 // '?'
            ) {
                end = i;
                break;
            }
            else if (code === 64) {
                // '@'
                indexOfIdentifier = i;
            }
            else if (code === 93) {
                // ']'
                indexOfClosingBracket = i;
            }
            else if (code === 58) {
                // ':'
                indexOfPort = i;
            }
            else if (code >= 65 && code <= 90) {
                hasUpper = true;
            }
        }
        // Detect identifier: '@'
        if (indexOfIdentifier !== -1 &&
            indexOfIdentifier > start &&
            indexOfIdentifier < end) {
            start = indexOfIdentifier + 1;
        }
        // Handle ipv6 addresses
        if (url.charCodeAt(start) === 91 /* '[' */) {
            if (indexOfClosingBracket !== -1) {
                return url.slice(start + 1, indexOfClosingBracket).toLowerCase();
            }
            return null;
        }
        else if (indexOfPort !== -1 && indexOfPort > start && indexOfPort < end) {
            // Detect port: ':'
            end = indexOfPort;
        }
    }
    // Trim trailing dots
    while (end > start + 1 && url.charCodeAt(end - 1) === 46 /* '.' */) {
        end -= 1;
    }
    const hostname = start !== 0 || end !== url.length ? url.slice(start, end) : url;
    if (hasUpper) {
        return hostname.toLowerCase();
    }
    return hostname;
}

/**
 * Check if a hostname is an IP. You should be aware that this only works
 * because `hostname` is already garanteed to be a valid hostname!
 */
function isProbablyIpv4(hostname) {
    // Cannot be shorted than 1.1.1.1
    if (hostname.length < 7) {
        return false;
    }
    // Cannot be longer than: 255.255.255.255
    if (hostname.length > 15) {
        return false;
    }
    let numberOfDots = 0;
    for (let i = 0; i < hostname.length; i += 1) {
        const code = hostname.charCodeAt(i);
        if (code === 46 /* '.' */) {
            numberOfDots += 1;
        }
        else if (code < 48 /* '0' */ || code > 57 /* '9' */) {
            return false;
        }
    }
    return (numberOfDots === 3 &&
        hostname.charCodeAt(0) !== 46 /* '.' */ &&
        hostname.charCodeAt(hostname.length - 1) !== 46 /* '.' */);
}
/**
 * Similar to isProbablyIpv4.
 */
function isProbablyIpv6(hostname) {
    if (hostname.length < 3) {
        return false;
    }
    let start = hostname[0] === '[' ? 1 : 0;
    let end = hostname.length;
    if (hostname[end - 1] === ']') {
        end -= 1;
    }
    // We only consider the maximum size of a normal IPV6. Note that this will
    // fail on so-called "IPv4 mapped IPv6 addresses" but this is a corner-case
    // and a proper validation library should be used for these.
    if (end - start > 39) {
        return false;
    }
    let hasColon = false;
    for (; start < end; start += 1) {
        const code = hostname.charCodeAt(start);
        if (code === 58 /* ':' */) {
            hasColon = true;
        }
        else if (((code >= 48 && code <= 57) || // 0-9
            (code >= 97 && code <= 102) || // a-f
            (code >= 65 && code <= 90) // A-F
        ) === false) {
            return false;
        }
    }
    return hasColon;
}
/**
 * Check if `hostname` is *probably* a valid ip addr (either ipv6 or ipv4).
 * This *will not* work on any string. We need `hostname` to be a valid
 * hostname.
 */
function isIp(hostname) {
    return isProbablyIpv6(hostname) || isProbablyIpv4(hostname);
}

/**
 * Implements fast shallow verification of hostnames. This does not perform a
 * struct check on the content of labels (classes of Unicode characters, etc.)
 * but instead check that the structure is valid (number of labels, length of
 * labels, etc.).
 *
 * If you need stricter validation, consider using an external library.
 */
function isValidAscii(code) {
    return ((code >= 97 && code <= 122) || (code >= 48 && code <= 57) || code > 127);
}
/**
 * Check if a hostname string is valid. It's usually a preliminary check before
 * trying to use getDomain or anything else.
 *
 * Beware: it does not check if the TLD exists.
 */
function isValidHostname (hostname) {
    if (hostname.length > 255) {
        return false;
    }
    if (hostname.length === 0) {
        return false;
    }
    if (!isValidAscii(hostname.charCodeAt(0))) {
        return false;
    }
    // Validate hostname according to RFC
    let lastDotIndex = -1;
    let lastCharCode = -1;
    const len = hostname.length;
    for (let i = 0; i < len; i += 1) {
        const code = hostname.charCodeAt(i);
        if (code === 46 /* '.' */) {
            if (
            // Check that previous label is < 63 bytes long (64 = 63 + '.')
            i - lastDotIndex > 64 ||
                // Check that previous character was not already a '.'
                lastCharCode === 46 ||
                // Check that the previous label does not end with a '-' (dash)
                lastCharCode === 45 ||
                // Check that the previous label does not end with a '_' (underscore)
                lastCharCode === 95) {
                return false;
            }
            lastDotIndex = i;
        }
        else if (!(isValidAscii(code) || code === 45 || code === 95)) {
            // Check if there is a forbidden character in the label
            return false;
        }
        lastCharCode = code;
    }
    return (
    // Check that last label is shorter than 63 chars
    len - lastDotIndex - 1 <= 63 &&
        // Check that the last character is an allowed trailing label character.
        // Since we already checked that the char is a valid hostname character,
        // we only need to check that it's different from '-'.
        lastCharCode !== 45);
}

function setDefaultsImpl({ allowIcannDomains = true, allowPrivateDomains = false, detectIp = true, extractHostname = true, mixedInputs = true, validHosts = null, validateHostname = true, }) {
    return {
        allowIcannDomains,
        allowPrivateDomains,
        detectIp,
        extractHostname,
        mixedInputs,
        validHosts,
        validateHostname,
    };
}
const DEFAULT_OPTIONS = setDefaultsImpl({});
function setDefaults(options) {
    if (options === undefined) {
        return DEFAULT_OPTIONS;
    }
    return setDefaultsImpl(options);
}

/**
 * Returns the subdomain of a hostname string
 */
function getSubdomain(hostname, domain) {
    // If `hostname` and `domain` are the same, then there is no sub-domain
    if (domain.length === hostname.length) {
        return '';
    }
    return hostname.slice(0, -domain.length - 1);
}

/**
 * Implement a factory allowing to plug different implementations of suffix
 * lookup (e.g.: using a trie or the packed hashes datastructures). This is used
 * and exposed in `tldts.ts` and `tldts-experimental.ts` bundle entrypoints.
 */
function getEmptyResult() {
    return {
        domain: null,
        domainWithoutSuffix: null,
        hostname: null,
        isIcann: null,
        isIp: null,
        isPrivate: null,
        publicSuffix: null,
        subdomain: null,
    };
}
function resetResult(result) {
    result.domain = null;
    result.domainWithoutSuffix = null;
    result.hostname = null;
    result.isIcann = null;
    result.isIp = null;
    result.isPrivate = null;
    result.publicSuffix = null;
    result.subdomain = null;
}
function parseImpl(url, step, suffixLookup, partialOptions, result) {
    const options = setDefaults(partialOptions);
    // Very fast approximate check to make sure `url` is a string. This is needed
    // because the library will not necessarily be used in a typed setup and
    // values of arbitrary types might be given as argument.
    if (typeof url !== 'string') {
        return result;
    }
    // Extract hostname from `url` only if needed. This can be made optional
    // using `options.extractHostname`. This option will typically be used
    // whenever we are sure the inputs to `parse` are already hostnames and not
    // arbitrary URLs.
    //
    // `mixedInput` allows to specify if we expect a mix of URLs and hostnames
    // as input. If only hostnames are expected then `extractHostname` can be
    // set to `false` to speed-up parsing. If only URLs are expected then
    // `mixedInputs` can be set to `false`. The `mixedInputs` is only a hint
    // and will not change the behavior of the library.
    if (options.extractHostname === false) {
        result.hostname = url;
    }
    else if (options.mixedInputs === true) {
        result.hostname = extractHostname(url, isValidHostname(url));
    }
    else {
        result.hostname = extractHostname(url, false);
    }
    if (step === 0 /* HOSTNAME */ || result.hostname === null) {
        return result;
    }
    // Check if `hostname` is a valid ip address
    if (options.detectIp === true) {
        result.isIp = isIp(result.hostname);
        if (result.isIp === true) {
            return result;
        }
    }
    // Perform optional hostname validation. If hostname is not valid, no need to
    // go further as there will be no valid domain or sub-domain.
    if (options.validateHostname === true &&
        options.extractHostname === true &&
        isValidHostname(result.hostname) === false) {
        result.hostname = null;
        return result;
    }
    // Extract public suffix
    suffixLookup(result.hostname, options, result);
    if (step === 2 /* PUBLIC_SUFFIX */ || result.publicSuffix === null) {
        return result;
    }
    // Extract domain
    result.domain = getDomain(result.publicSuffix, result.hostname, options);
    if (step === 3 /* DOMAIN */ || result.domain === null) {
        return result;
    }
    // Extract subdomain
    result.subdomain = getSubdomain(result.hostname, result.domain);
    if (step === 4 /* SUB_DOMAIN */) {
        return result;
    }
    // Extract domain without suffix
    result.domainWithoutSuffix = getDomainWithoutSuffix(result.domain, result.publicSuffix);
    return result;
}

function fastPathLookup (hostname, options, out) {
    // Fast path for very popular suffixes; this allows to by-pass lookup
    // completely as well as any extra allocation or string manipulation.
    if (options.allowPrivateDomains === false && hostname.length > 3) {
        const last = hostname.length - 1;
        const c3 = hostname.charCodeAt(last);
        const c2 = hostname.charCodeAt(last - 1);
        const c1 = hostname.charCodeAt(last - 2);
        const c0 = hostname.charCodeAt(last - 3);
        if (c3 === 109 /* 'm' */ &&
            c2 === 111 /* 'o' */ &&
            c1 === 99 /* 'c' */ &&
            c0 === 46 /* '.' */) {
            out.isIcann = true;
            out.isPrivate = false;
            out.publicSuffix = 'com';
            return true;
        }
        else if (c3 === 103 /* 'g' */ &&
            c2 === 114 /* 'r' */ &&
            c1 === 111 /* 'o' */ &&
            c0 === 46 /* '.' */) {
            out.isIcann = true;
            out.isPrivate = false;
            out.publicSuffix = 'org';
            return true;
        }
        else if (c3 === 117 /* 'u' */ &&
            c2 === 100 /* 'd' */ &&
            c1 === 101 /* 'e' */ &&
            c0 === 46 /* '.' */) {
            out.isIcann = true;
            out.isPrivate = false;
            out.publicSuffix = 'edu';
            return true;
        }
        else if (c3 === 118 /* 'v' */ &&
            c2 === 111 /* 'o' */ &&
            c1 === 103 /* 'g' */ &&
            c0 === 46 /* '.' */) {
            out.isIcann = true;
            out.isPrivate = false;
            out.publicSuffix = 'gov';
            return true;
        }
        else if (c3 === 116 /* 't' */ &&
            c2 === 101 /* 'e' */ &&
            c1 === 110 /* 'n' */ &&
            c0 === 46 /* '.' */) {
            out.isIcann = true;
            out.isPrivate = false;
            out.publicSuffix = 'net';
            return true;
        }
        else if (c3 === 101 /* 'e' */ &&
            c2 === 100 /* 'd' */ &&
            c1 === 46 /* '.' */) {
            out.isIcann = true;
            out.isPrivate = false;
            out.publicSuffix = 'de';
            return true;
        }
    }
    return false;
}

/* tslint:disable */
// Code automatically generated using ./bin/builders/hashes.ts
var packed = new Uint32Array([5, 0, 0, 10, 5860739, 5860793, 5860978, 5861026, 5861029, 5861126, 5861352, 5861357, 5861403, 5861586, 0, 0, 0, 1, 1850179732, 0, 9, 328184559, 1866923597, 2123501943, 2282562397, 2795346450, 3130446446, 3136607046, 3453334789, 4194175729, 37, 65021741, 101876503, 819014943, 819028732, 1075688039, 1139486022, 1335010188, 1431231509, 1498275876, 1522025464, 1544104458, 1570707647, 1626814538, 1687232530, 1789539963, 1893848785, 2023201532, 2182413090, 2391299855, 2419619562, 2445171142, 2496327381, 2573179642, 2709520566, 2762771525, 2921343336, 2989808530, 3000405309, 3015527775, 3047607849, 3382460164, 3420815319, 3738715095, 3843717774, 3934774481, 4085096371, 4146774829, 4120, 100835, 372942, 373596, 399643, 403867, 589540, 737224, 1210028, 1861414, 2424682, 2658901, 2946999, 3329363, 3333156, 3822808, 6942202, 9086062, 9095117, 9267209, 9340158, 9485932, 11010102, 11406846, 16314893, 18146303, 18331450, 19211200, 20314441, 20356673, 20797457, 25057869, 26663359, 28320278, 30499151, 30585840, 36605120, 36990037, 39275208, 41892561, 42049478, 42538024, 45214788, 47656662, 50173535, 53599326, 53858455, 54537430, 61367659, 63815836, 64422985, 64643127, 64831187, 66751588, 66844930, 69226500, 73517283, 73904368, 74144257, 75706244, 78793775, 78794171, 79558910, 80324123, 84993902, 87977581, 87978853, 87978860, 93811268, 95641381, 95641777, 96671837, 99012676, 100511481, 100947456, 104528693, 108215410, 108929491, 110526112, 110662188, 112311307, 114507832, 116811054, 120488259, 122521550, 129191429, 133427701, 134012911, 141513861, 141517490, 143344167, 144349377, 144362028, 144550088, 144770230, 147205859, 147810002, 147989623, 149598895, 150736276, 150856054, 152379730, 156555774, 164189124, 164189258, 164189262, 164189691, 164189842, 164560958, 165069166, 165106627, 165107021, 165339368, 165444557, 165444558, 165444615, 165444629, 165444745, 165444749, 165445368, 165512129, 165512527, 165749053, 165749188, 165749299, 165749435, 165749535, 165779060, 167155067, 169909265, 169909275, 169909419, 169909512, 169909517, 169909531, 169909608, 169909724, 169909733, 169909734, 169909738, 169909857, 169910036, 169910195, 169910226, 169938982, 169939075, 169939172, 169939304, 169939334, 169939474, 169939481, 169939680, 169939682, 169939793, 169977029, 169977163, 170281136, 170281250, 170281253, 170281258, 170281275, 170281382, 170281390, 170281415, 170281447, 170281457, 170281473, 170281497, 170281511, 170281522, 170281525, 170281528, 170281579, 170281589, 170281687, 170281689, 170281699, 170281742, 170281776, 170281812, 170281852, 170281902, 170281972, 170311352, 170649202, 170649385, 170649596, 171188220, 172078401, 172145927, 172484120, 172484301, 172788260, 172788689, 172788693, 172788754, 172788809, 172788827, 173118530, 173118924, 173456648, 173591948, 173930212, 173930286, 174306499, 174306893, 174307245, 174307439, 174358551, 174374100, 174509317, 174577099, 174644617, 174843632, 174844030, 175181758, 175524135, 175524873, 176843304, 176948764, 178529610, 178530165, 178530256, 178530299, 178530303, 178530355, 178868363, 178868576, 178868974, 179274397, 179274476, 179379459, 179379616, 179379624, 179379849, 179379853, 179380220, 179657877, 179692651, 179714168, 179913714, 180090304, 180090702, 180283722, 180292996, 180293014, 180293036, 180293067, 180293093, 180293105, 180293124, 180293152, 180293156, 180293169, 180293179, 180293199, 180293253, 180293290, 180293294, 180293300, 180293302, 180293304, 180293317, 180293344, 180293346, 180293381, 180293447, 180293487, 180293501, 180293503, 180293522, 180293535, 180293716, 180293796, 180293819, 180293997, 180294000, 180294004, 180294009, 180428032, 180902137, 180969265, 181108861, 181240259, 181240353, 181240367, 181240371, 181240391, 181240392, 181240393, 181240398, 181240404, 181240451, 181240474, 181240479, 181240483, 181240490, 181240509, 181240515, 181240844, 181240853, 181240956, 181241149, 181241165, 181241168, 181244839, 181375748, 181548621, 181548644, 181548727, 181548873, 181549108, 181549176, 181949900, 181950639, 182056031, 182385920, 182419943, 182893167, 182893283, 182893394, 182893788, 183163149, 183163151, 183163155, 183163168, 183163169, 183163171, 183163181, 183163182, 183163183, 183163186, 183163188, 183163233, 183163248, 183163251, 183163252, 183163254, 183163270, 183163303, 183163314, 183163317, 183163334, 183163335, 183163336, 183163340, 183163345, 183163347, 183163350, 183163362, 183163363, 183163365, 183163366, 183163367, 183163371, 183163375, 183163376, 183163378, 183163380, 183163383, 183163630, 183163631, 183163644, 183163649, 183163651, 183163653, 183163655, 183163664, 183163668, 183163669, 183163678, 183163679, 183163682, 183163687, 183163713, 183163715, 183163728, 183163731, 183163735, 183163742, 183163777, 183163779, 183163780, 183163781, 183163783, 183163796, 183163797, 183163801, 183163843, 183163845, 183163847, 183163859, 183163864, 183163865, 183163874, 183163895, 183163897, 183163913, 183163922, 183163933, 183163960, 183163961, 183163963, 183163977, 183163978, 183163979, 183163981, 183163988, 183163989, 183163991, 183163992, 183163994, 183163995, 183163998, 183164008, 183164010, 183164012, 183164021, 183164025, 183164026, 183164027, 183164029, 183164041, 183164044, 183164045, 183164047, 183164050, 183164051, 183164057, 183164060, 183164061, 183164093, 184080938, 184081253, 184081673, 184081677, 184081778, 184246330, 184246511, 184486318, 184486865, 184487263, 184828195, 184828212, 184844696, 184844824, 184848486, 184848491, 184849029, 184849387, 184859173, 184869208, 184869819, 185163947, 185216284, 185289081, 185292632, 185295605, 185501943, 185502073, 185502077, 185772974, 186723357, 186723671, 186723801, 186763265, 186771866, 186840059, 186858006, 186875993, 186950941, 186953244, 186994101, 186994720, 187011432, 187022814, 187064894, 187067400, 187076090, 187078647, 187088813, 187161171, 187188812, 187203075, 187219343, 187222314, 187251332, 187328908, 187332203, 187378741, 187385256, 187386889, 187403121, 187403860, 187404132, 187409119, 187410536, 187415116, 187415841, 187417183, 187453423, 187455618, 187483569, 187506658, 187521457, 187531575, 187554851, 187557872, 187932036, 187932044, 187932595, 187932730, 187932752, 187932756, 187932794, 187932985, 187932989, 190236828, 190304994, 190305388, 190372512, 190372516, 190372621, 190372839, 190373457, 190575460, 190575594, 190879986, 191043224, 191246659, 191458643, 191459037, 191524213, 193856736, 193857103, 193857114, 193857243, 193991787, 194363750, 194498585, 194498630, 194498988, 194499056, 194499063, 194532263, 194532626, 194532630, 194532693, 194532760, 194532936, 194533115, 194802308, 194802313, 194802316, 194802351, 194802818, 194802832, 194802974, 194803141, 194803143, 194803161, 194803226, 194803230, 194836546, 194870589, 194870610, 194871004, 195040013, 195040230, 195040360, 195077902, 195078025, 195078028, 195078034, 195078035, 195078038, 195078058, 195078062, 195078071, 195078081, 195078095, 195078112, 195078119, 195078120, 195078149, 195078150, 195078156, 195078185, 195078215, 195078217, 195078250, 195078251, 195078272, 195078273, 195078277, 195078283, 195078287, 195078298, 195078299, 195078300, 195078368, 195078372, 195078375, 195078394, 195078464, 195078474, 195078493, 195078531, 195078554, 195078559, 195078687, 195078710, 195078753, 195078828, 195078837, 195078892, 195078895, 195078900, 195078906, 195078959, 195078960, 195078974, 195078995, 195078997, 195079007, 195817892, 195817910, 195818040, 196653590, 197775763, 198219289, 198248729, 198354195, 198354632, 202063369, 203326381, 203326382, 203326695, 203326709, 203326825, 203326829, 203327047, 203327192, 203360584, 203427712, 203428110, 203563443, 203563837, 203664976, 203665374, 203762913, 203901612, 204069808, 206121592, 207568995, 208227118, 216046669, 218659706, 219797064, 231775478, 232370627, 232791016, 232866163, 232870916, 237059472, 238230825, 238671321, 241611072, 245880244, 246752740, 249954601, 256262487, 256399880, 257210252, 257542887, 259810976, 259829097, 260353797, 260353928, 260353938, 260354380, 260381156, 260390354, 262186579, 266014567, 271387034, 274620304, 274691435, 279382168, 280527902, 280532777, 280535076, 280542659, 281931451, 292827804, 295209043, 296292341, 297619746, 305011770, 306510696, 313583000, 314643431, 320313766, 320318114, 321023689, 321447655, 322472432, 325454853, 326762411, 337081594, 338040061, 339830659, 340010259, 341833935, 342149828, 356194258, 358990451, 359223603, 359276554, 360204016, 360327984, 368215882, 370146306, 370150662, 373255328, 373394720, 374785091, 376173808, 376667442, 377307531, 377336144, 377652210, 379825795, 380248845, 380316586, 380849985, 381874529, 381884647, 382049883, 382486912, 382598847, 385650293, 389069795, 389909922, 393290800, 395076177, 395140257, 399168703, 402724451, 403769719, 404122044, 409655137, 410188633, 411785958, 413977571, 418962805, 419080649, 423458772, 424591341, 424705846, 424926177, 425050855, 430711818, 430784915, 431116435, 431157415, 431370962, 431390595, 431489022, 431585240, 431586828, 431608121, 432925266, 433686700, 434854475, 442888655, 442922019, 443587046, 444998055, 445176561, 449218512, 449424719, 451217894, 451870618, 459172225, 469098393, 471052880, 478642118, 480635114, 480636362, 480638119, 480638181, 480638612, 480653244, 480658155, 480658807, 480939764, 483974975, 484603510, 484645735, 488826995, 490491404, 493445761, 499075209, 511578298, 514111995, 514955151, 515474792, 515491843, 515593995, 517240281, 519409110, 520595267, 522631343, 523234636, 527144416, 533682535, 533847771, 534396735, 538362471, 540682234, 545433338, 547443445, 550462929, 551440509, 555571491, 557981738, 559064708, 560636591, 572640614, 572652435, 575127842, 575742406, 575835832, 576590271, 577168455, 582462766, 584490345, 587585418, 587768078, 588145733, 589399600, 591647101, 594353073, 596395114, 596517435, 602054693, 609523853, 612026675, 622957156, 622959354, 627471386, 630686153, 632559259, 635121653, 635859009, 637007260, 641167055, 643225485, 643488605, 643663853, 648008241, 648304671, 650538190, 656171171, 656243914, 656640963, 665693626, 667797222, 675938056, 678076451, 679253935, 684522993, 684536293, 689065707, 689172736, 689202009, 693611235, 694324728, 695649196, 700774993, 703142796, 707132367, 712377315, 712470899, 715533184, 722903474, 728415570, 729335905, 731964179, 733989474, 744440632, 748265163, 752520493, 752687122, 752687226, 752699150, 752938578, 753314817, 761228031, 762792020, 766278458, 771168358, 771342884, 772916985, 785945688, 787032422, 793080342, 794341423, 794638681, 799598398, 803443550, 803504423, 803576910, 803750530, 804046103, 804899040, 810638083, 813049915, 813882670, 813882809, 819687634, 821390609, 822184173, 822865774, 824372117, 824828566, 826639012, 826993974, 827575018, 827624512, 831815016, 834750300, 834856638, 834963202, 835666250, 838463501, 839632578, 842350150, 843454848, 844441814, 845393562, 845537310, 846032279, 847050559, 850228898, 851897573, 853098265, 855980394, 858467853, 864019409, 869651422, 878524814, 881613818, 883922292, 883926782, 885943745, 886050698, 896206971, 896253025, 897230014, 898924730, 900375831, 900562876, 907903147, 909690480, 911040096, 912288153, 912452591, 913046780, 914761571, 915088911, 915769822, 915838470, 919008564, 924477462, 924490662, 927206149, 935240483, 936096500, 939243980, 939281294, 939375524, 939697158, 939922440, 940027871, 942640890, 942743627, 943328481, 943363810, 947022624, 950098348, 954017396, 954872462, 959069811, 961909457, 961915153, 962363178, 962549619, 963013768, 967703276, 967948020, 969062315, 971904354, 971904490, 973306633, 973317901, 973587946, 973591516, 973595243, 973613934, 973618563, 974354714, 977251657, 977925344, 983357420, 983929219, 983931665, 983936021, 984542401, 985262291, 985854160, 986356352, 986883183, 987313801, 987563776, 987600844, 994961720, 1002154839, 1005485664, 1005660307, 1005931709, 1008280710, 1009678005, 1009815854, 1015938248, 1018008327, 1024510565, 1027688850, 1032624770, 1033292429, 1033879086, 1034329743, 1034357170, 1038843968, 1039500800, 1042185353, 1043537387, 1043742405, 1044060157, 1045601283, 1046273911, 1046743273, 1046756254, 1048099261, 1049404062, 1052311686, 1052441930, 1052883806, 1053590026, 1055187548, 1056740120, 1058016469, 1059921109, 1060080890, 1060081069, 1064702402, 1067370082, 1067385970, 1067405735, 1068743400, 1072264613, 1080832696, 1083646554, 1084662717, 1085312600, 1086607170, 1086818213, 1086839634, 1087030220, 1087432248, 1087540767, 1088313455, 1089639430, 1089665811, 1092266223, 1094128841, 1094382979, 1100822038, 1101368277, 1101556739, 1101657937, 1101658065, 1102136407, 1102319129, 1102691201, 1104338451, 1104888372, 1107574816, 1107604513, 1107608406, 1114346722, 1114906227, 1115517588, 1116603570, 1116886791, 1121068214, 1121069468, 1121544473, 1122391675, 1123274870, 1123277038, 1123281470, 1123286137, 1123300855, 1128066491, 1128665654, 1130410120, 1135543458, 1135544712, 1135545955, 1135553917, 1135559494, 1135563376, 1136069038, 1136903068, 1141006631, 1141018311, 1142918810, 1143019669, 1144395492, 1146787097, 1149112251, 1151589762, 1152383075, 1153265116, 1153556935, 1153560693, 1153560855, 1153576209, 1153582928, 1154249515, 1155609853, 1158010336, 1158014282, 1158019276, 1158022529, 1158025585, 1158030151, 1158040127, 1158040853, 1158043091, 1158313993, 1160141196, 1160245697, 1160246728, 1160253683, 1160271099, 1160271446, 1160272445, 1160277399, 1161223806, 1161235355, 1162489113, 1163536255, 1166908086, 1166937977, 1166949933, 1166952503, 1166953757, 1166959964, 1167534042, 1169030529, 1169037994, 1169039382, 1169046802, 1169046815, 1169048548, 1169054036, 1169994302, 1171270800, 1171270813, 1172775704, 1173601310, 1174042111, 1174752677, 1174762471, 1175725254, 1175726508, 1175727467, 1175727495, 1175735449, 1175736592, 1175738578, 1175738760, 1175746250, 1175746252, 1175749986, 1175793566, 1179261033, 1184984869, 1185692184, 1189090107, 1191206679, 1191915740, 1192411690, 1192590212, 1193567716, 1194400508, 1198881999, 1198884629, 1199843361, 1202502980, 1204258276, 1204470469, 1206364960, 1206399154, 1207407281, 1207765705, 1207825797, 1208230324, 1208429990, 1208517393, 1208911775, 1208937193, 1209536263, 1211364607, 1212671635, 1214258492, 1217924538, 1220965831, 1225976890, 1228682933, 1229000062, 1229783327, 1229847808, 1229958905, 1232816452, 1237771172, 1237773393, 1237773841, 1243202596, 1245899123, 1247245722, 1256406409, 1257366451, 1259566070, 1260762188, 1261854970, 1265324777, 1265669119, 1273073240, 1278961290, 1280280379, 1280768035, 1291368159, 1295085673, 1295542469, 1295875812, 1296518360, 1297048848, 1300060481, 1300364681, 1303525815, 1303650868, 1304687455, 1304781392, 1304918086, 1305056028, 1305920823, 1306968125, 1306972554, 1306973586, 1307621261, 1307665177, 1308558601, 1308559744, 1308574194, 1308583254, 1308584508, 1308585495, 1309808754, 1310362665, 1310785148, 1310799239, 1310800921, 1310801269, 1310803416, 1310807041, 1310808370, 1313021694, 1313023237, 1313030377, 1314270973, 1314287001, 1314293208, 1321085506, 1321731136, 1322807089, 1322881666, 1324313259, 1324313985, 1324320704, 1324322270, 1324332261, 1324636022, 1325293061, 1325300526, 1325303158, 1325308368, 1325309334, 1325309339, 1325310241, 1325310486, 1325311328, 1325311482, 1326707500, 1328209699, 1328777903, 1328778629, 1328785348, 1328786906, 1328789635, 1328794451, 1328797153, 1329362352, 1329963165, 1329987910, 1330666198, 1330807345, 1330903052, 1331009222, 1331010221, 1331013633, 1331015175, 1331019352, 1331025251, 1331026645, 1331028446, 1331143849, 1335448632, 1335892543, 1336436046, 1336436772, 1336437775, 1336438057, 1336439236, 1336443338, 1336449024, 1336456660, 1336460266, 1336462620, 1336463768, 1336469142, 1341018428, 1341081128, 1341091249, 1341179896, 1342001696, 1344411053, 1344426134, 1344436952, 1344437939, 1344444146, 1346529166, 1349466130, 1350170659, 1350170661, 1350356518, 1350356534, 1350620578, 1351056251, 1351154191, 1351382419, 1351445663, 1353796379, 1353803638, 1354094479, 1354229264, 1354447091, 1354448055, 1354464484, 1354467042, 1354475004, 1354584300, 1355466970, 1355483586, 1355607656, 1355929695, 1355947655, 1356095080, 1356150953, 1356150969, 1356150973, 1356457867, 1356471002, 1356757572, 1357692080, 1357876668, 1357880232, 1358481170, 1360043731, 1360220638, 1362168625, 1362262729, 1362271868, 1362285703, 1362326863, 1362656266, 1364891797, 1365811994, 1367555632, 1367692098, 1367811071, 1368369281, 1368820926, 1369663049, 1374458097, 1377739598, 1378565283, 1379014609, 1379224098, 1381333258, 1383613953, 1383613964, 1383629111, 1383647122, 1385857457, 1385879444, 1386127789, 1386706928, 1388074128, 1388078600, 1388084119, 1388086017, 1388094003, 1388104573, 1388109527, 1388111766, 1390304957, 1390318095, 1390319238, 1390321811, 1390327192, 1390328435, 1390329689, 1391292472, 1391295130, 1391298115, 1391299402, 1391302044, 1391307254, 1391308253, 1392560940, 1396553940, 1397006395, 1397007527, 1397007872, 1397007885, 1397015305, 1397016949, 1397022431, 1400354688, 1400355947, 1400356673, 1400360856, 1400364702, 1400366245, 1401741660, 1405743539, 1407053336, 1407067683, 1409840426, 1410939834, 1414623055, 1416259553, 1417803702, 1417953492, 1417953925, 1417969521, 1417971248, 1418042854, 1420962489, 1422407147, 1422418384, 1422432926, 1422434165, 1422435892, 1423090882, 1425971467, 1426162994, 1426865884, 1426871783, 1426872814, 1426880658, 1426881913, 1426884152, 1428612014, 1429098926, 1429105132, 1429112250, 1430623854, 1431581902, 1431587977, 1431591127, 1432718586, 1433558874, 1433568865, 1433577620, 1433578879, 1435387691, 1435862377, 1444705448, 1444706435, 1444707945, 1444708598, 1444713016, 1444718265, 1444720166, 1444723003, 1444725453, 1444731199, 1444731564, 1444731950, 1444732047, 1444732342, 1444732347, 1444738453, 1445361689, 1448052138, 1448052864, 1448054123, 1448067662, 1448078965, 1449172589, 1452091461, 1453387928, 1453752738, 1453961462, 1456174702, 1457037634, 1457145422, 1457156469, 1457178704, 1458371285, 1459376581, 1459377857, 1459377868, 1459384567, 1459385707, 1459403577, 1459405260, 1459408531, 1459757655, 1459920222, 1461678986, 1463840740, 1463842504, 1463849459, 1463849797, 1463867222, 1463868221, 1463873175, 1464819582, 1464821125, 1464829402, 1464830128, 1464831131, 1466045929, 1466068861, 1466074694, 1466091096, 1466403701, 1467047928, 1467061763, 1467063453, 1467065948, 1467070902, 1468307140, 1468314970, 1468321435, 1469284474, 1469285761, 1469294772, 1469295775, 1471526086, 1474285944, 1474796155, 1474852365, 1474856386, 1474857640, 1474858627, 1474866589, 1474867476, 1474871748, 1474880870, 1482183211, 1482187228, 1482389973, 1482978689, 1486003341, 1486005836, 1486010790, 1486021608, 1486029338, 1486036499, 1486036510, 1491300687, 1492834968, 1492905126, 1495099017, 1495387727, 1496999162, 1497335658, 1497338257, 1497341434, 1497353781, 1497360500, 1497361503, 1503214457, 1504022303, 1504024292, 1504032122, 1504033105, 1504038587, 1509379857, 1510741574, 1511059454, 1514359714, 1515292004, 1517410020, 1517415502, 1517416485, 1517424315, 1517426048, 1519466742, 1519486936, 1526518672, 1534242148, 1535379077, 1535411852, 1535416972, 1535418272, 1535419013, 1535426999, 1535427585, 1535429447, 1535437817, 1535442771, 1535445010, 1538631370, 1539876488, 1539883905, 1539891891, 1539902461, 1539907415, 1539909654, 1540853566, 1540863813, 1540865371, 1540871834, 1540872816, 1540972285, 1542830372, 1544565822, 1547523228, 1548000883, 1548203684, 1548662272, 1548668010, 1548668993, 1548676831, 1548677846, 1548686756, 1550655859, 1551291701, 1552780862, 1554083280, 1554160502, 1554849656, 1556617220, 1556618479, 1556619205, 1556627226, 1556629025, 1562365424, 1571587981, 1572843623, 1575133026, 1577978899, 1578737375, 1579027766, 1580891870, 1580902117, 1580903020, 1580910138, 1580910864, 1581061599, 1584242651, 1584252576, 1584258687, 1584260414, 1584261397, 1586571037, 1588295785, 1589138556, 1593538808, 1594150134, 1594318433, 1594644051, 1595762332, 1596345927, 1596503336, 1599871881, 1600554193, 1600562964, 1600967980, 1600968967, 1600970477, 1600988233, 1600993979, 1600994866, 1600997301, 1601541268, 1602995891, 1603061457, 1604314670, 1604316655, 1604330442, 1604341489, 1604342648, 1605183784, 1605406132, 1605908391, 1607689728, 1607689741, 1607690628, 1607701062, 1607701276, 1607705078, 1607710365, 1607715640, 1607716607, 1607716627, 1608344260, 1610313759, 1610666926, 1611239998, 1611396088, 1614382839, 1614530679, 1615167003, 1615172374, 1615640392, 1615647347, 1615658840, 1615665110, 1615666109, 1615671063, 1620094847, 1620095619, 1620095929, 1620105028, 1620113841, 1620119323, 1620795340, 1621082362, 1621083649, 1621092660, 1622329964, 1622331641, 1622337218, 1622353628, 1623408910, 1624559739, 1624569664, 1624577502, 1624577906, 1624578485, 1626556599, 1628470609, 1630022199, 1632310642, 1633163415, 1635568907, 1635591150, 1635593749, 1635643420, 1635994183, 1635994320, 1641006393, 1645672758, 1645785364, 1645803376, 1645808858, 1645809841, 1646891621, 1646892908, 1646907799, 1646910247, 1646917618, 1646918617, 1648007716, 1648013984, 1648016015, 1648021910, 1648025704, 1648032728, 1648033715, 1648039922, 1648043240, 1649119056, 1649454738, 1649581121, 1652486802, 1652497372, 1652504566, 1652932064, 1652936599, 1653583645, 1653598182, 1653599929, 1653606136, 1653607123, 1654697756, 1654712103, 1654713134, 1654716280, 1654721234, 1654722233, 1656168200, 1659162648, 1659176739, 1659180924, 1659185878, 1659186877, 1659695250, 1660874915, 1664393911, 1666206978, 1666510724, 1668155429, 1669474757, 1673661122, 1673662353, 1673671436, 1673686839, 1673856704, 1674136053, 1674769898, 1674770881, 1674776363, 1674793871, 1675780006, 1675959713, 1676641114, 1677004461, 1677008482, 1677010668, 1677010688, 1677011655, 1677022217, 1677030942, 1677037554, 1679234542, 1679234666, 1679235736, 1679237897, 1679237918, 1679241007, 1679252114, 1679258763, 1679261552, 1679266928, 1681499983, 1681500998, 1681504918, 1681510964, 1681520272, 1681526010, 1681526993, 1682221833, 1682359277, 1685960411, 1685962398, 1685964612, 1685965520, 1685965569, 1685965582, 1685965890, 1685967499, 1685968865, 1685974082, 1685987547, 1685988215, 1685988552, 1685991645, 1686112357, 1686592668, 1686670946, 1687209740, 1690419670, 1690419852, 1690423356, 1690429255, 1690430286, 1690438386, 1690439385, 1690439477, 1691674376, 1691689779, 1691700349, 1691705303, 1691707542, 1691739899, 1692242488, 1693300811, 1693663054, 1693900733, 1693904467, 1693911703, 1693913871, 1693915014, 1693915019, 1693922968, 1693923252, 1693924211, 1693925465, 1696514991, 1697110779, 1697112784, 1697112842, 1697116346, 1697119048, 1697126337, 1697127463, 1697127903, 1697134366, 1697135348, 1699859798, 1704832941, 1705550489, 1705948764, 1706596362, 1707661217, 1709380801, 1709397036, 1709401602, 1709403991, 1709403994, 1709604401, 1709715630, 1709719753, 1710245453, 1710553669, 1710842194, 1711349139, 1711911296, 1712708709, 1712862856, 1712864099, 1712865353, 1712874413, 1712889750, 1715042583, 1716067791, 1716074254, 1716075236, 1716090026, 1716093784, 1716101073, 1716987897, 1717046504, 1717344945, 1717458342, 1717665490, 1717667127, 1717964139, 1718229371, 1718354825, 1718357162, 1719193555, 1719336939, 1719736367, 1719951972, 1719952370, 1720424110, 1720435157, 1720448732, 1720448944, 1720449947, 1720450929, 1721036165, 1721144676, 1721180497, 1721273073, 1721300021, 1721429734, 1721781082, 1721785367, 1722611952, 1723770733, 1723771620, 1723777366, 1723795122, 1723796376, 1723797619, 1723869014, 1724144999, 1724360630, 1724888746, 1724891334, 1724900049, 1724902970, 1724913368, 1724913588, 1724914591, 1724915573, 1724965913, 1725078045, 1725233009, 1725264035, 1725510046, 1726097551, 1726312938, 1727054697, 1727192868, 1727424862, 1727705145, 1727733987, 1727744610, 1728055993, 1728286570, 1728572893, 1728575555, 1728593248, 1728609049, 1728736741, 1730434650, 1730700309, 1731354114, 1731355346, 1732002104, 1732531131, 1733044570, 1733128185, 1733173527, 1735014430, 1735473130, 1736646879, 1737465416, 1740085948, 1740104597, 1740108386, 1741479646, 1741618915, 1741621154, 1741622153, 1741631292, 1741636935, 1741709977, 1742216984, 1743089654, 1744959211, 1744968590, 1744969829, 1744971556, 1744977659, 1744987840, 1745343269, 1745488513, 1746392299, 1747200908, 1747202151, 1747210105, 1747211248, 1747212978, 1747215938, 1747219291, 1747533677, 1747671543, 1747762259, 1748301224, 1748301648, 1748302211, 1748318651, 1748321229, 1748327140, 1748327340, 1748328118, 1748329946, 1749416322, 1749419816, 1749422630, 1749422974, 1749423815, 1749423848, 1749423862, 1749423980, 1749432545, 1749435316, 1749435457, 1749435956, 1749437829, 1749437986, 1749440303, 1749441388, 1749442296, 1749442361, 1749443256, 1749443576, 1749444398, 1749445477, 1749445739, 1749750164, 1749955965, 1752768365, 1753028168, 1753430927, 1753880966, 1753882221, 1753900232, 1753906931, 1756680747, 1759105063, 1762715404, 1763952265, 1763967858, 1763978172, 1763979159, 1765274516, 1768132013, 1774870841, 1775193783, 1775278057, 1776446407, 1778765218, 1779479261, 1779706923, 1779707649, 1779709525, 1779713177, 1779714057, 1779714368, 1779715934, 1779715971, 1779725925, 1779730307, 1779731494, 1780768183, 1781938242, 1781939241, 1781944195, 1781948380, 1781954023, 1781961852, 1783657515, 1784508980, 1785147288, 1785152492, 1785564290, 1786402886, 1786403885, 1786408839, 1786413016, 1786418915, 1786422601, 1792463843, 1793085197, 1793091404, 1793103209, 1793109842, 1794311882, 1796513490, 1798682988, 1799934413, 1800873944, 1804734874, 1804986274, 1805201900, 1805201909, 1805381533, 1805390218, 1805394927, 1805396070, 1805397817, 1805404024, 1805410294, 1808346875, 1809278593, 1809909084, 1810126394, 1810162729, 1811189710, 1812804641, 1813167465, 1818860644, 1824377544, 1826567786, 1826567942, 1826568769, 1826574251, 1826586852, 1826591759, 1826593533, 1826594804, 1826595685, 1826597041, 1826838298, 1827843009, 1830073720, 1832102940, 1834682984, 1835526804, 1835527882, 1835530317, 1835531888, 1835536950, 1835540435, 1835541852, 1835548479, 1835548755, 1835552425, 1835554706, 1835556216, 1836242836, 1836706536, 1838062951, 1838891575, 1839007628, 1839021100, 1839022775, 1839033593, 1839038547, 1839040786, 1839994953, 1840001842, 1840013399, 1840019350, 1840019827, 1840020860, 1843076481, 1845608978, 1846070315, 1848013570, 1849443027, 1850456697, 1854921046, 1859450748, 1859510931, 1859511204, 1860240647, 1860312281, 1860334137, 1861101595, 1863024310, 1863816745, 1866230741, 1866891339, 1866893066, 1866896736, 1866908847, 1866910185, 1866914026, 1867191437, 1867299303, 1867861768, 1867865679, 1867867083, 1867872142, 1867873124, 1867876289, 1867885376, 1867885466, 1867887914, 1867892691, 1867897750, 1867898961, 1867899162, 1867908767, 1873521117, 1875950626, 1876926780, 1878219696, 1883713830, 1883718737, 1883722494, 1883726489, 1883992567, 1884025074, 1887655375, 1889208808, 1889317056, 1890185274, 1890880911, 1891315242, 1893080109, 1893129355, 1894534152, 1894535395, 1894543357, 1894548934, 1895822736, 1896748195, 1896864381, 1896883495, 1896884690, 1896893413, 1897086584, 1897144569, 1897150382, 1897161336, 1898308423, 1899713189, 1899886170, 1903920486, 1903920882, 1905987148, 1906518923, 1906815088, 1907908343, 1907910446, 1907911172, 1907924055, 1907926218, 1907937265, 1910568778, 1912588116, 1912664290, 1912773142, 1919704439, 1919708663, 1923048311, 1925589573, 1928014104, 1929265412, 1931786446, 1933270769, 1933847987, 1934282690, 1935832225, 1937137824, 1940180687, 1941545223, 1944881831, 1944883085, 1944889292, 1944901097, 1944907730, 1944915291, 1947690884, 1949378607, 1949381140, 1949385828, 1949388221, 1949404634, 1953208595, 1957126749, 1965906276, 1965980590, 1966393263, 1966441984, 1976999040, 1977095148, 1977627523, 1979043911, 1979158532, 1982830318, 1982831301, 1982836783, 1982854539, 1982856313, 1982857328, 1982862253, 1982863214, 1983477916, 1983945412, 1983946415, 1983946627, 1983953134, 1983957025, 1983968650, 1983971249, 1983972408, 1983977373, 1985096774, 1985106740, 1985116048, 1985122769, 1987638584, 1989155232, 1991785536, 1991792841, 1991799730, 1991811287, 1991817238, 1991817715, 1991818748, 1992326594, 1994019132, 1994026062, 1994028952, 1994613365, 1998305912, 2000627256, 2002587178, 2002703477, 2004080420, 2007546240, 2007547499, 2007556254, 2007557797, 2009780252, 2013938002, 2016158046, 2016458632, 2016459875, 2016461129, 2016470189, 2016476340, 2016482461, 2016485526, 2018939223, 2019785049, 2023148389, 2023153871, 2023155598, 2023156002, 2023157760, 2023171627, 2023174160, 2023812622, 2029256230, 2029286951, 2029296544, 2037064184, 2042215210, 2042272668, 2042423451, 2043073993, 2044012869, 2046744295, 2047386704, 2047490213, 2047625030, 2047828609, 2051192703, 2052284669, 2056364987, 2056365175, 2056459861, 2057257910, 2058376024, 2058382302, 2058436464, 2058440319, 2058445367, 2058447874, 2058448694, 2058452545, 2058552215, 2058569521, 2058573621, 2058924197, 2058929805, 2058958371, 2058984507, 2058988863, 2059003240, 2059051015, 2059075746, 2059422408, 2059824807, 2061714098, 2062014471, 2062647492, 2063260135, 2063415690, 2063627333, 2063814283, 2064238717, 2064313581, 2064484772, 2064499575, 2064635107, 2064635452, 2064635773, 2064639428, 2064639883, 2064648773, 2064654772, 2064655646, 2065476844, 2065542420, 2065542544, 2065543022, 2065727011, 2066567940, 2066734284, 2066828553, 2066833534, 2067036957, 2067202738, 2067233317, 2068031208, 2068725531, 2068831008, 2068854498, 2068854512, 2068858196, 2068859575, 2068860177, 2068862627, 2068863232, 2068869021, 2068950273, 2068994789, 2068994807, 2069062998, 2069102686, 2069161595, 2069263945, 2069338842, 2069365704, 2069468800, 2069558220, 2069561350, 2069566268, 2069591394, 2069593072, 2069595618, 2069600040, 2069600946, 2069600957, 2069604100, 2069765192, 2069904166, 2069904305, 2071035931, 2071149679, 2071643658, 2073163309, 2073289171, 2073308845, 2073310709, 2073312474, 2073322881, 2073335784, 2073440452, 2073448514, 2073457247, 2073500084, 2073509625, 2073523923, 2073533208, 2073640292, 2073794194, 2073803151, 2073803461, 2073808229, 2073811616, 2073811996, 2073815760, 2073826308, 2073826688, 2073827152, 2073830759, 2073831593, 2073831601, 2074299520, 2075044848, 2075423284, 2075693433, 2078935992, 2078936931, 2078937889, 2078937913, 2078938163, 2078938295, 2078944407, 2078944555, 2078944613, 2078944933, 2081181239, 2081852454, 2082063743, 2082285629, 2082430948, 2084946688, 2086083080, 2087431076, 2087431077, 2087431079, 2087431080, 2087431081, 2087431082, 2087431085, 2087431086, 2087431087, 2087431088, 2087431089, 2087431090, 2087431091, 2087431092, 2087431093, 2087431094, 2087431096, 2087431097, 2087431098, 2087431099, 2087431100, 2087431102, 2087431103, 2087617590, 2087617591, 2087617592, 2087617593, 2087617594, 2087617595, 2087617596, 2087617597, 2087617598, 2087617599, 2087617632, 2087617633, 2087617634, 2087617635, 2087617636, 2087617637, 2087617638, 2087617639, 2087617640, 2087617641, 2087617642, 2087617643, 2087617644, 2087617645, 2087617647, 2087617652, 2087617654, 2087617655, 2087617656, 2087617657, 2087617658, 2087617659, 2087617660, 2087617661, 2087617662, 2087617663, 2087629931, 2087822490, 2088302297, 2088726760, 2088953542, 2088996444, 2090213881, 2090218574, 2090297888, 2090298020, 2091225604, 2092577468, 2092702023, 2092715579, 2092766986, 2092957042, 2093991393, 2093995617, 2093995632, 2094612635, 2094991848, 2095143559, 2097113374, 2098599777, 2098599792, 2099138174, 2102249573, 2102285158, 2102285168, 2102285285, 2102285374, 2102286572, 2102291553, 2102297313, 2102301463, 2102304381, 2102311282, 2102312281, 2102313468, 2102315379, 2102317235, 2102322718, 2103529616, 2105684477, 2105873178, 2106751208, 2106757636, 2106766355, 2106769656, 2106775467, 2106775926, 2106776925, 2106781879, 2112542671, 2118750891, 2119037299, 2119037310, 2119041270, 2119043865, 2119381911, 2119891962, 2120136928, 2120142410, 2120143393, 2120151231, 2120152708, 2121629990, 2121793676, 2122433548, 2123414271, 2123472843, 2123472936, 2123472941, 2123472990, 2123479292, 2123481132, 2123481326, 2123481391, 2123481939, 2123481960, 2123482409, 2123482928, 2123482935, 2123485221, 2123485512, 2123485548, 2123486092, 2123487587, 2123487602, 2123487868, 2123488061, 2123488218, 2123489049, 2123491458, 2123491494, 2123491502, 2123491940, 2123491950, 2123491964, 2123492067, 2123492380, 2123492410, 2123492613, 2123492943, 2123493403, 2123494323, 2123494721, 2123494806, 2123495205, 2123495222, 2123495263, 2123495538, 2123495599, 2123495615, 2123495829, 2123496707, 2123496945, 2123497027, 2123497539, 2123498152, 2123498482, 2123498621, 2123498738, 2123499337, 2123499387, 2123499393, 2123499675, 2123499817, 2123499823, 2123500085, 2123500670, 2123501043, 2123501651, 2123501946, 2123502012, 2123502614, 2123502618, 2123502909, 2123502931, 2123502972, 2123503489, 2123503580, 2123503633, 2123503639, 2123503645, 2123503683, 2123503690, 2123503871, 2123503914, 2123503925, 2123506021, 2123508761, 2123508887, 2123508888, 2123509104, 2123509367, 2123510210, 2126830924, 2126831627, 2126831911, 2126834731, 2126838118, 2126839865, 2126841008, 2126851442, 2126854146, 2127933481, 2127939688, 2127940675, 2127945958, 2127950989, 2127966582, 2130163562, 2130164545, 2130170027, 2130187535, 2130190580, 2131286378, 2132327224, 2132331087, 2132359596, 2133546426, 2134655216, 2135730753, 2135744303, 2135751022, 2135766376, 2135766538, 2136033383, 2136198665, 2140379406, 2140382005, 2140404240, 2140405499, 2140406225, 2140969091, 2141369520, 2141378580, 2141384318, 2142607534, 2142608862, 2142616598, 2142619146, 2143588731, 2143590729, 2143592861, 2143597618, 2143609175, 2143615126, 2143616636, 2144844042, 2144846897, 2144858266, 2144868884, 2144870143, 2144870869, 2150993049, 2157945278, 2158338411, 2160318468, 2160324206, 2160325189, 2160333019, 2160343200, 2161056790, 2161569257, 2161578129, 2161578140, 2161592231, 2161595735, 2163561912, 2165898261, 2166038855, 2166996811, 2167003274, 2167004256, 2167015877, 2167018798, 2167213797, 2167993101, 2169327252, 2170481633, 2170487115, 2170488842, 2170504623, 2170507412, 2174946277, 2174951759, 2174953486, 2174953890, 2174969515, 2174972048, 2176528068, 2179101309, 2180545870, 2187180906, 2187858563, 2191744103, 2191744212, 2191821366, 2191883015, 2192566334, 2193960351, 2195897610, 2195898849, 2195906687, 2195916612, 2195922100, 2196631346, 2202024183, 2205406696, 2211506222, 2216825796, 2219145843, 2221394610, 2225058301, 2225061335, 2225064134, 2225071439, 2225073075, 2225080536, 2225426653, 2225696488, 2226037368, 2226044042, 2226051203, 2226052893, 2226055388, 2226060342, 2226419862, 2229788675, 2230793522, 2230840997, 2231615745, 2231617728, 2231623210, 2231628742, 2231632031, 2231633170, 2231633764, 2231638049, 2231729235, 2231751291, 2231760201, 2231761216, 2231769054, 2231770037, 2231775519, 2233884981, 2235100587, 2235101313, 2235108032, 2235109598, 2235116887, 2235119589, 2236869449, 2238302643, 2241796550, 2241797549, 2241802503, 2241806680, 2241812579, 2242828527, 2244900591, 2246244298, 2246245281, 2246250763, 2246260079, 2246271316, 2246446647, 2247223374, 2247249937, 2247251096, 2248592412, 2250708942, 2250715407, 2250719552, 2250724971, 2250725805, 2250733692, 2250735952, 2258878642, 2263047660, 2264886749, 2266447633, 2267607000, 2282544968, 2285662351, 2290599544, 2292158595, 2293175691, 2293351636, 2296071446, 2299255515, 2301040846, 2306079466, 2307034140, 2307580553, 2313241363, 2313504811, 2318220358, 2318563401, 2320224028, 2325476095, 2335714240, 2337176745, 2339504386, 2344847762, 2345345412, 2345556981, 2346482211, 2346482871, 2351498341, 2352240646, 2352738840, 2358991500, 2361087993, 2361277274, 2364634824, 2369603272, 2370443161, 2371011349, 2373457221, 2375393789, 2376425283, 2379512524, 2379580075, 2389041013, 2390286898, 2390518325, 2390736011, 2391410598, 2392516839, 2392521063, 2393811335, 2400874900, 2400879124, 2402335630, 2403175918, 2404974948, 2405102721, 2405117283, 2405120727, 2414810349, 2415093005, 2415923742, 2415925541, 2415935547, 2415976346, 2418152088, 2422623072, 2422625395, 2422631927, 2422634373, 2422636295, 2422636392, 2425962056, 2425963043, 2425969250, 2425969487, 2425971892, 2425985030, 2428197348, 2428202830, 2428203813, 2428211643, 2428212914, 2428213376, 2428240545, 2430223084, 2433759338, 2433759634, 2433760321, 2433765803, 2433783311, 2433785126, 2433786356, 2433788522, 2435993901, 2436000108, 2436001095, 2436011657, 2436026994, 2439339076, 2439340079, 2439340291, 2439346798, 2439350689, 2439362314, 2439364913, 2439366072, 2439371037, 2439876345, 2440431898, 2440444045, 2440449369, 2444112661, 2447928023, 2448686625, 2452264162, 2454797153, 2458316286, 2459819944, 2460346836, 2462285242, 2462802458, 2463186757, 2466741694, 2466758807, 2467213089, 2467545358, 2467601561, 2467655846, 2467686484, 2467740953, 2473985870, 2474042431, 2474150919, 2474285829, 2474577412, 2474661520, 2475343068, 2475470210, 2475772433, 2475892298, 2476213365, 2476552306, 2478583646, 2479517659, 2487711817, 2489453909, 2489531547, 2492815759, 2498555779, 2501597440, 2507278661, 2510852110, 2512156190, 2514524650, 2519935040, 2540805343, 2543008264, 2547140668, 2548210359, 2553182506, 2558063998, 2558416820, 2560726248, 2564751176, 2566787042, 2569608194, 2572602371, 2577853220, 2579477027, 2579803386, 2583084289, 2586020617, 2600402029, 2604613571, 2614694552, 2616608417, 2619680030, 2623678483, 2624091113, 2626979216, 2627765050, 2629831661, 2630340943, 2630577386, 2633112569, 2635762328, 2636801013, 2637047575, 2637160117, 2637393619, 2637589507, 2639283063, 2642320383, 2644891950, 2655636765, 2657728452, 2658381845, 2660357137, 2661288721, 2661501246, 2663538084, 2668276183, 2673250796, 2673526891, 2673678071, 2676265918, 2683622002, 2685054344, 2686768508, 2689921282, 2690533659, 2691751732, 2691869931, 2692015714, 2693065457, 2693628719, 2694158948, 2699054734, 2699567323, 2701589506, 2708247797, 2710218932, 2712973569, 2713114330, 2714658156, 2715859111, 2716538256, 2717691085, 2718235570, 2719851426, 2722275573, 2728431851, 2731033959, 2734448641, 2735037840, 2745064373, 2747735009, 2748168364, 2748310006, 2753354596, 2753586905, 2761147374, 2762813598, 2767767034, 2768482489, 2769808878, 2771202832, 2775691349, 2777232090, 2781109506, 2784107887, 2784647309, 2789347571, 2792452218, 2793624174, 2794767436, 2795183554, 2795185357, 2795205893, 2798224110, 2803597621, 2804113804, 2807804736, 2809486328, 2813025413, 2815428841, 2815585428, 2816618421, 2819662823, 2820408757, 2821986169, 2822221150, 2822315880, 2824682484, 2828575765, 2828866516, 2829935276, 2834927579, 2834988813, 2836892761, 2839658405, 2844621372, 2855163005, 2857193006, 2860702321, 2861907234, 2866492514, 2870435535, 2874906565, 2880233005, 2885526550, 2886304164, 2887625380, 2889073982, 2893961579, 2894962731, 2896115089, 2896360091, 2896815948, 2898520762, 2898642745, 2907467650, 2908250170, 2908376536, 2911135641, 2915014315, 2918403731, 2919235927, 2920587887, 2921981389, 2922468503, 2922493886, 2923084706, 2929584080, 2931398379, 2931402541, 2934752311, 2934893225, 2937779198, 2939718255, 2941551192, 2943207335, 2944624083, 2944643800, 2947465711, 2947810750, 2947839623, 2948393504, 2948690168, 2948867989, 2949433359, 2951266128, 2953613654, 2954570766, 2955048302, 2956489777, 2960184498, 2960188722, 2960612931, 2962892549, 2963032843, 2966548328, 2968983188, 2976545290, 2976620947, 2978924197, 2982913903, 2986096991, 2987284613, 2988637881, 2993692642, 2996709992, 2999106536, 2999693174, 3000568496, 3002891536, 3005531064, 3005732955, 3006549345, 3007175865, 3007286028, 3008753857, 3010444860, 3010880247, 3017258218, 3019938621, 3020499579, 3022866914, 3023311759, 3024482653, 3024795687, 3024807531, 3027071777, 3029820267, 3032088673, 3032839979, 3033043261, 3033965900, 3036878933, 3037343835, 3038234864, 3044024978, 3051293097, 3052701732, 3054970205, 3055037923, 3056484673, 3060407188, 3061523114, 3071254387, 3071254500, 3071254881, 3073058130, 3074871971, 3074935051, 3075008146, 3075048985, 3075285442, 3075422693, 3075548305, 3075766008, 3075860343, 3075962648, 3076097045, 3077391764, 3079190285, 3085252246, 3091066645, 3091553195, 3096769792, 3103424085, 3107541791, 3107727924, 3107749241, 3107778469, 3107783354, 3107787446, 3107790299, 3107948057, 3107956419, 3107974264, 3107984588, 3107991466, 3108296169, 3111583245, 3113459538, 3115513630, 3116256345, 3116975703, 3117043431, 3123411243, 3123445549, 3123737595, 3127243644, 3131616468, 3134139083, 3134716611, 3141196244, 3141709512, 3148676509, 3154082174, 3155375542, 3160028447, 3163162577, 3163167462, 3163515572, 3163650864, 3172095015, 3178395499, 3179968189, 3183658699, 3187099641, 3187299343, 3189362935, 3189614929, 3189845278, 3191231848, 3191324353, 3194623954, 3196795314, 3196799538, 3197664642, 3200115829, 3202732235, 3206363778, 3207294280, 3218691622, 3224832477, 3226582088, 3231960701, 3231960825, 3238444781, 3240506687, 3241127686, 3241536496, 3245505639, 3246685420, 3255250502, 3255493270, 3258010725, 3259268259, 3259708744, 3269885479, 3272088211, 3285490421, 3287497511, 3294281816, 3300709686, 3302430666, 3307080284, 3310372188, 3310580422, 3313110325, 3313272952, 3317570505, 3321771963, 3323504524, 3331033092, 3331794938, 3336602563, 3340803503, 3344036147, 3344936763, 3351242611, 3354164541, 3356161036, 3356994116, 3357443896, 3358280978, 3360549707, 3360712009, 3361435146, 3362509089, 3362630778, 3366920760, 3368501591, 3372160500, 3373297021, 3374596217, 3375285141, 3376798040, 3377755895, 3379029866, 3380241983, 3380595728, 3381834713, 3382169680, 3385946526, 3386125251, 3387539161, 3388057612, 3393544563, 3399698423, 3404840083, 3405857857, 3407191084, 3408814815, 3408819560, 3409018494, 3409457570, 3410577155, 3411051814, 3411102162, 3412047440, 3412913800, 3413983999, 3416442515, 3416515385, 3416581522, 3416635233, 3418887913, 3424150275, 3425734594, 3426036948, 3426656604, 3429124000, 3430316367, 3430320824, 3430870942, 3431771155, 3432731814, 3435576236, 3435582845, 3435750771, 3435755340, 3435827335, 3435838083, 3435867222, 3435992037, 3436024307, 3436059437, 3436063816, 3436069982, 3436074280, 3436077508, 3436091273, 3436159613, 3436165190, 3436170719, 3436195088, 3436196199, 3436197592, 3436249372, 3436269078, 3436269081, 3436293672, 3436294647, 3436301787, 3436342898, 3436364333, 3436370464, 3436392181, 3436429036, 3436429043, 3436459789, 3436497793, 3436643348, 3437361412, 3440930072, 3441289467, 3445003174, 3448289841, 3448536520, 3448614961, 3452859864, 3455445539, 3455973701, 3456106851, 3456282588, 3457601666, 3463597433, 3465489744, 3467469261, 3471221309, 3473077716, 3481649290, 3487446962, 3488022631, 3488033206, 3488034362, 3488035079, 3488035561, 3488035719, 3488035993, 3488036079, 3488037593, 3488039692, 3488040337, 3488045626, 3488047642, 3488051093, 3488051126, 3488053833, 3488816292, 3489196379, 3495434909, 3495798979, 3503723552, 3503962589, 3503975251, 3504086267, 3504111353, 3504116046, 3504274912, 3505764984, 3506277065, 3508805241, 3509081590, 3513566261, 3514339133, 3515728076, 3515960057, 3516630755, 3523519258, 3523935664, 3526432473, 3530287752, 3530461503, 3530748624, 3530798581, 3531066474, 3531601080, 3532265658, 3532567787, 3533680386, 3536219166, 3538145547, 3540002868, 3540019679, 3541120058, 3543598258, 3544077455, 3551826674, 3554146688, 3557238629, 3557288966, 3558510813, 3560409651, 3560721423, 3560755308, 3560772904, 3560776799, 3560843986, 3563273081, 3564677062, 3564681286, 3567399383, 3567824494, 3572225704, 3572896829, 3582031081, 3584271853, 3584286131, 3585048866, 3585049834, 3585528102, 3593775985, 3602300234, 3602787435, 3607509617, 3608111536, 3611661676, 3611790203, 3614121054, 3615995480, 3621964687, 3621965124, 3621966081, 3621966083, 3621968414, 3621969916, 3621970585, 3621975893, 3622095083, 3622538650, 3627671724, 3631197772, 3635135986, 3636965307, 3639447013, 3642331354, 3659188474, 3659876530, 3665337607, 3667545339, 3668394990, 3668555001, 3668632957, 3671699945, 3674122558, 3676733804, 3686247745, 3690182854, 3691035506, 3691048605, 3691317036, 3693068020, 3694814128, 3697923226, 3699114476, 3702342894, 3706900355, 3707026630, 3708334595, 3708762397, 3709045244, 3712703179, 3712728440, 3712733478, 3716618496, 3716733543, 3717443225, 3718845099, 3720827503, 3723950536, 3728968422, 3729352785, 3729562677, 3730027878, 3734185373, 3735541918, 3737224996, 3738382782, 3738387349, 3738389800, 3738389990, 3738390006, 3738390241, 3738390427, 3738394220, 3738394620, 3738394722, 3738394744, 3738394859, 3738396519, 3738397033, 3738399064, 3738400460, 3738887202, 3738887334, 3739466542, 3742755730, 3743223168, 3743289449, 3743358776, 3744330913, 3745299015, 3748385635, 3749221030, 3756564018, 3766265917, 3766587032, 3767014136, 3767872686, 3768672199, 3771941409, 3772113601, 3772128853, 3772772804, 3774466709, 3776028623, 3776032376, 3776447581, 3776673980, 3777321837, 3777702607, 3777706691, 3777840696, 3778052019, 3778877784, 3781867794, 3788596678, 3788641118, 3789096147, 3790949066, 3792555306, 3792675197, 3794434962, 3795445637, 3797340812, 3799396589, 3802359444, 3802425981, 3802900168, 3803509878, 3803533553, 3803824710, 3805465891, 3813366359, 3817195077, 3825134626, 3831783888, 3837846657, 3837850203, 3842564401, 3842605521, 3845461162, 3845489549, 3848928610, 3854658802, 3856336918, 3857323999, 3859684851, 3862352064, 3863136572, 3867966833, 3871085378, 3871829833, 3872291932, 3872427595, 3873740388, 3874034025, 3875048726, 3875150667, 3875975886, 3876231871, 3877484520, 3878080222, 3881750832, 3882302039, 3886373040, 3888702999, 3890651277, 3890862632, 3896043913, 3896689307, 3899279503, 3900747045, 3906847659, 3911916015, 3927826024, 3932062404, 3932228732, 3935292304, 3943337509, 3944324480, 3944448839, 3947301018, 3949488650, 3950159753, 3952494101, 3953197696, 3960241116, 3960376152, 3961917741, 3963099658, 3963421060, 3963723254, 3967007952, 3967259205, 3967845242, 3969124422, 3970612783, 3970678261, 3973713485, 3975040093, 3975243357, 3975693785, 3987058095, 3990704705, 3992681822, 3995478227, 3995612289, 3998971354, 3998991175, 3999298006, 4000670401, 4000993351, 4001099777, 4001277861, 4001735503, 4002465742, 4003357293, 4005356768, 4007925342, 4010478264, 4011050686, 4011066530, 4011075332, 4011273939, 4011552428, 4011788459, 4012217148, 4012217259, 4012952625, 4024186918, 4027830515, 4028975169, 4029110469, 4029583348, 4030423947, 4031498693, 4031499367, 4031499504, 4031509172, 4031928713, 4032208645, 4032479130, 4033316487, 4034881946, 4036743247, 4038287798, 4038545865, 4040900190, 4042024153, 4055745484, 4059205746, 4059950647, 4060130555, 4061045790, 4064482362, 4064482494, 4064686007, 4068398139, 4074270800, 4074270919, 4074308286, 4075674315, 4075712516, 4075885548, 4078878227, 4080178633, 4081049105, 4089654486, 4090206590, 4090679933, 4091412422, 4095259202, 4095274203, 4097043581, 4097047544, 4097047888, 4097050487, 4097053538, 4097079538, 4097094723, 4097094855, 4097218811, 4097289420, 4097298261, 4097355529, 4097358800, 4097358806, 4097359478, 4097365147, 4097365569, 4097368351, 4097368475, 4097373732, 4097381131, 4097390898, 4097493023, 4097494448, 4097500420, 4097504860, 4097508952, 4097518447, 4097523657, 4097528230, 4097528249, 4097565588, 4097595928, 4097769515, 4097769660, 4097770040, 4097900631, 4097993352, 4097993363, 4098078311, 4098093255, 4098096816, 4098101881, 4098102013, 4098120408, 4099257624, 4099391059, 4100119818, 4100353643, 4101141701, 4101990706, 4102099355, 4102141580, 4102295291, 4103385373, 4104416776, 4104979523, 4105354399, 4108421678, 4108481771, 4113654278, 4120143040, 4120573143, 4120685305, 4120832270, 4121323786, 4122797449, 4123137490, 4123141719, 4123166778, 4123237466, 4124517918, 4124852870, 4126190390, 4126265264, 4126330058, 4126584791, 4128561486, 4130538182, 4130665595, 4135804702, 4138805004, 4138959002, 4142649353, 4143010615, 4143011353, 4149276818, 4149741566, 4155964946, 4160851306, 4165043845, 4165602674, 4166101816, 4168506065, 4168666626, 4168671212, 4169534192, 4169538416, 4174620042, 4177885870, 4178182706, 4179726175, 4180321577, 4180398911, 4180437564, 4180584501, 4180592595, 4180655876, 4182610142, 4190427894, 4190436241, 4190438903, 4190464587, 4190536489, 4191350062, 4197904504, 4204887304, 4208748285, 4213114634, 4213114766, 4213115878, 4213133169, 4213139443, 4214412462, 4216213600, 4226637963, 4229539334, 4230260404, 4236039784, 4239211903, 4244301284, 4244359264, 4244636840, 4244650461, 4244697370, 4246504751, 4248927363, 4249781266, 4250093591, 4252726263, 4253347765, 4255547342, 4262305702, 4269915810, 4271230391, 4273205904, 4280822506, 4281987205, 4281991429, 4287811748, 4288642117, 4290818353, 4290862694, 4290938088, 4291163255, 4291519114, 4292375442, 4292614575, 1319, 113029, 2431109, 6154799, 9085905, 10454523, 11833936, 15005411, 20989895, 29369909, 32348563, 32392946, 34831997, 35241656, 35407085, 41719852, 42040525, 49751269, 54657448, 54829135, 61297674, 64616140, 64792746, 65243007, 69912355, 75564691, 84754216, 85474843, 95227810, 97671606, 97869711, 98556036, 111529024, 112714201, 113832573, 118457586, 119013459, 129204800, 129504899, 132934253, 133576354, 141325108, 142928709, 144351849, 147399388, 148485881, 153516070, 159755595, 162751717, 164324227, 164324569, 164324664, 164324791, 165338893, 166383271, 169909381, 170281316, 170281555, 170281599, 170281951, 172221532, 172281217, 172281369, 172281601, 172281701, 172281789, 172615247, 173287589, 173592416, 173930363, 174306514, 176844018, 177079695, 177080427, 177147671, 177148014, 177148020, 177546706, 179139641, 179379875, 179569944, 180056941, 180259371, 181198501, 181240422, 181950714, 183096195, 183096537, 183468910, 183469260, 183603589, 183603872, 186043176, 187501046, 190912115, 191031927, 191069908, 191103669, 193357074, 193420201, 194024818, 195040318, 195040605, 195615400, 195817845, 196491587, 197098180, 197098196, 197098242, 197098387, 197098716, 197098773, 197098834, 198219090, 203969128, 204000291, 204003102, 205844479, 211702237, 213315812, 216404638, 223633303, 225036633, 231228447, 233832515, 236122625, 244953360, 253603556, 268305044, 279497384, 282260013, 286117940, 288337735, 294222691, 294944592, 297796540, 301175958, 309814229, 316711416, 319659866, 321667918, 329290740, 333539694, 336073493, 341979606, 344556873, 345150446, 361618841, 363650316, 365386885, 379803748, 382346929, 392534911, 393050977, 398079720, 401473592, 408076405, 409551689, 412923104, 413523569, 417762611, 418389794, 418643706, 430774757, 431420666, 431463230, 433960232, 439016491, 446595824, 448347366, 453082265, 459993498, 461991320, 467355959, 468677861, 471325996, 478194174, 481007914, 483933287, 493239087, 495294245, 500922416, 502571724, 503870109, 505520155, 505540840, 505547348, 507674743, 507704542, 508155006, 508732896, 524499536, 533082472, 536606854, 536706420, 544035780, 548068662, 554237589, 554422931, 557980541, 558904957, 566123574, 574052622, 575078226, 579214441, 582810837, 583362052, 583453417, 594063106, 598128236, 601948346, 602413319, 603986209, 605582466, 609198625, 610045978, 620396524, 626039263, 626988485, 630452394, 635400744, 640415961, 643558590, 645257576, 652659119, 665354414, 666296511, 667333922, 668403785, 674175725, 675770800, 680972003, 682364285, 689215333, 693241087, 704136516, 706383966, 708808466, 710978465, 713788357, 727209749, 729977159, 734622016, 735035205, 737152212, 737166334, 737644692, 737837074, 739516787, 739566545, 739985822, 741816033, 742252614, 742260586, 745092996, 747930588, 750508933, 752522257, 754000708, 758478444, 762067870, 762641736, 764248075, 764320946, 764825188, 766296725, 766355544, 766774330, 767540529, 772363084, 774299734, 777688891, 792844833, 796739176, 800087019, 810061706, 810813298, 811092091, 817847511, 819009519, 819788857, 819897581, 826260124, 833658992, 834470340, 847675799, 861294299, 862950715, 867732810, 870151875, 874296659, 875944810, 876149555, 884498580, 887482102, 894264732, 896104248, 896979123, 897240751, 902139830, 911653942, 912249299, 933746041, 939098524, 939114841, 948752149, 955130439, 955354780, 955942299, 956480228, 958121442, 972273212, 976381303, 978919739, 981829565, 984418838, 997412732, 1001458257, 1001637783, 1001651627, 1005191377, 1008948875, 1016348317, 1027786481, 1027856392, 1032266307, 1033049924, 1035709107, 1038486906, 1041294385, 1043437244, 1049779946, 1051535617, 1053737172, 1056645919, 1056720884, 1063952736, 1064732809, 1065290596, 1079732589, 1080478458, 1081536009, 1086069586, 1088535269, 1094421058, 1095718313, 1096687866, 1100372480, 1101043104, 1102004406, 1104733017, 1110237878, 1112959177, 1113096701, 1114972095, 1117545303, 1118952562, 1121043812, 1125668821, 1130216203, 1132104794, 1132534664, 1132579070, 1132598106, 1135683888, 1135892328, 1136018325, 1138287902, 1139265327, 1139293087, 1145147923, 1146523166, 1149204820, 1151262913, 1152056864, 1153549635, 1154536715, 1154542665, 1155367440, 1155994599, 1160246725, 1161218045, 1162479261, 1164711369, 1164964007, 1166033123, 1166944153, 1166948327, 1167024992, 1169046340, 1174582808, 1174756828, 1183829925, 1186977866, 1189560180, 1191923730, 1192723278, 1199133859, 1199554249, 1199600208, 1204911535, 1210779948, 1220586092, 1221782335, 1221920801, 1236932222, 1243532105, 1257626414, 1259689738, 1260836076, 1261324364, 1266641105, 1268763191, 1271531819, 1273274467, 1276658942, 1282928227, 1283757717, 1290537388, 1296235125, 1301946320, 1305140481, 1310799836, 1310807544, 1310899277, 1316125796, 1324285266, 1324310094, 1324331646, 1324337571, 1324579984, 1325750278, 1326569216, 1328786903, 1333842476, 1344411040, 1349684561, 1351415139, 1351880550, 1354386923, 1354921809, 1356250756, 1357629674, 1362165018, 1363404812, 1364008114, 1364487272, 1365133140, 1366987615, 1372241226, 1372705460, 1372794328, 1375834117, 1377641421, 1378253217, 1385859280, 1391291390, 1391293134, 1391299074, 1391300548, 1393577155, 1394469288, 1394469303, 1394469473, 1394469866, 1394470005, 1394470066, 1396870772, 1399867662, 1401343574, 1407053333, 1410090536, 1413067533, 1426871786, 1429104232, 1430902259, 1433568876, 1433581041, 1435770227, 1436788950, 1441473969, 1444705872, 1444722875, 1444727957, 1445594238, 1448082324, 1455246557, 1457145411, 1458555099, 1459794391, 1460930084, 1465058743, 1465976327, 1465976425, 1465976436, 1465976463, 1465976550, 1465976555, 1465976625, 1465976632, 1465976696, 1465976747, 1465976870, 1465976979, 1465976985, 1465976986, 1465976991, 1465977196, 1465977261, 1465977271, 1465977274, 1465977323, 1474444421, 1478716185, 1481566528, 1482522967, 1494181387, 1504535254, 1509029106, 1510450262, 1515598870, 1519441587, 1525831150, 1526085253, 1527459723, 1529619411, 1532042759, 1533712942, 1535412311, 1537663939, 1540864030, 1541073018, 1541496652, 1542773859, 1548676818, 1549199388, 1549209224, 1549210203, 1552284203, 1553692884, 1555806428, 1561102750, 1570561776, 1582406800, 1582529544, 1585380899, 1587251606, 1592687509, 1601662530, 1602151715, 1602222565, 1602416912, 1604312683, 1604313702, 1604341906, 1605465730, 1605466324, 1605478605, 1610069144, 1610724928, 1613430619, 1616623247, 1616826805, 1622337231, 1622345684, 1624120544, 1624575040, 1634840328, 1635306209, 1639041637, 1643544413, 1643893360, 1645239134, 1645714411, 1646892897, 1647763648, 1648026812, 1648459154, 1652472178, 1652482428, 1654623339, 1659538076, 1660752253, 1661285202, 1662950537, 1676328914, 1681382184, 1682444281, 1683407715, 1684605451, 1686572406, 1686834359, 1687225102, 1687228988, 1687238599, 1687241697, 1693905970, 1693924649, 1694678234, 1696017211, 1698247372, 1700874190, 1708553688, 1709403276, 1712893263, 1713051167, 1713095897, 1715999558, 1716074224, 1716087943, 1716947524, 1720424693, 1721557559, 1722492001, 1723770720, 1723859941, 1732377833, 1740500925, 1740503023, 1747210100, 1747349646, 1747349737, 1747349747, 1747350242, 1747350353, 1747350383, 1747350483, 1747350570, 1752792553, 1757625214, 1758838683, 1759487629, 1759488516, 1759498393, 1759499821, 1759502442, 1759502966, 1759512274, 1759512283, 1759513528, 1759514495, 1759514515, 1759516437, 1759524172, 1759589336, 1760335250, 1762973847, 1762975960, 1762992044, 1763004314, 1763977119, 1772061961, 1772164204, 1782043531, 1789421301, 1789632072, 1791830919, 1791856284, 1792792037, 1793905730, 1801396125, 1804673412, 1807671676, 1813955111, 1814430790, 1817436421, 1822787251, 1823557150, 1826594809, 1828043124, 1830686062, 1839007617, 1839995410, 1839996532, 1839996844, 1841030555, 1842560365, 1844448916, 1844480213, 1846724376, 1860761623, 1861064328, 1863000850, 1869152073, 1873769763, 1873773882, 1874142716, 1875798230, 1880233189, 1881382733, 1885862630, 1890372289, 1890379225, 1891031342, 1891205640, 1891938925, 1894539933, 1896919160, 1896919227, 1896919294, 1899147627, 1900573373, 1901379444, 1902628941, 1905060165, 1928994000, 1936188797, 1939298330, 1941474619, 1944071536, 1946130305, 1946324244, 1947055740, 1949193282, 1951127334, 1956200886, 1960661844, 1964294607, 1971670426, 1975660003, 1979063800, 1982857341, 1986972074, 1987328192, 1987660949, 1991785763, 1991793298, 1992080509, 2001507875, 2004488903, 2015900220, 2018783243, 2021213332, 2034927376, 2035815698, 2037403782, 2039595722, 2040354520, 2040943501, 2041028464, 2044842550, 2050838609, 2051827668, 2052901511, 2053206810, 2053240934, 2053337172, 2053478875, 2053493456, 2056180496, 2061275137, 2066721635, 2067699997, 2073532671, 2075934693, 2077460241, 2077463931, 2082279457, 2082350395, 2082490504, 2083899515, 2087506861, 2087556005, 2087568425, 2087595516, 2092046651, 2097381010, 2097529923, 2100199727, 2103470828, 2105481502, 2107063121, 2111314048, 2113664954, 2117068897, 2120150756, 2122563214, 2122618177, 2124668692, 2133549370, 2134191641, 2134715695, 2138049165, 2138494997, 2141358278, 2144770101, 2151644274, 2163712208, 2163898589, 2170508442, 2178944930, 2179027416, 2184528600, 2187374596, 2190645414, 2190660247, 2190897184, 2192558778, 2195413098, 2195424198, 2195905956, 2203121973, 2208876632, 2209276004, 2211529485, 2216861598, 2224936471, 2225064139, 2229389306, 2229428098, 2229583383, 2233205867, 2235535537, 2241998064, 2245744882, 2246095470, 2246270479, 2246624423, 2247249610, 2249578444, 2251500542, 2257131811, 2259407586, 2266149426, 2278366865, 2281444864, 2284221844, 2290521795, 2298483014, 2298859942, 2303709693, 2305684069, 2306183534, 2310688315, 2315634657, 2323978889, 2331542577, 2334488740, 2335980755, 2335991772, 2343955873, 2343987387, 2344051572, 2344081298, 2353017729, 2357782940, 2372460029, 2372478071, 2376327406, 2384339112, 2399346319, 2399822664, 2403261116, 2407789481, 2409182571, 2412074962, 2417084170, 2417652035, 2419411749, 2419417423, 2422632357, 2423117096, 2424431334, 2428211424, 2436015021, 2436026537, 2436027007, 2441679501, 2444838503, 2451024601, 2454448917, 2456215407, 2459247176, 2467234433, 2469945372, 2473920266, 2486666796, 2503042985, 2512844015, 2518777282, 2525588137, 2528358668, 2528706848, 2531896313, 2536602755, 2556085817, 2558131228, 2564231467, 2565836498, 2572746788, 2585286228, 2597156358, 2600208325, 2600311538, 2609976564, 2614031703, 2619619987, 2622997773, 2630676340, 2635726130, 2636739119, 2637611531, 2637745410, 2637827916, 2639832942, 2646831691, 2656916375, 2658971428, 2667387895, 2669967601, 2675377616, 2680331975, 2694622232, 2704604996, 2708256980, 2721005193, 2723132333, 2723449219, 2726239859, 2727613517, 2729386864, 2732129495, 2742067873, 2743561936, 2745053658, 2755346949, 2762308724, 2762732310, 2773342582, 2773916239, 2777215669, 2780442125, 2780969136, 2784038323, 2786612080, 2787145966, 2787151566, 2791623281, 2792656912, 2793820597, 2793843165, 2797512177, 2798111293, 2798512509, 2799526810, 2799947922, 2802973072, 2804403738, 2805637755, 2812187177, 2812916202, 2820491263, 2824160615, 2829422945, 2831048350, 2832237259, 2834623189, 2839650695, 2840525902, 2842490055, 2846385194, 2846982791, 2849860412, 2850213786, 2852028874, 2852573181, 2854701866, 2857974075, 2860823467, 2864766480, 2865932173, 2873369054, 2878248977, 2880150758, 2900972274, 2907164383, 2909422460, 2914081458, 2914744694, 2914938714, 2917041430, 2918571873, 2930384385, 2931708704, 2933052029, 2934738758, 2939956665, 2943539162, 2944562948, 2945364171, 2953041500, 2953600606, 2958695479, 2959025464, 2963193938, 2963907974, 2964323647, 2964344548, 2969439522, 2969802598, 2972958854, 2976622717, 2978201778, 2982085395, 2985605450, 2999691650, 3008190733, 3008855969, 3023766416, 3029366772, 3036119914, 3036992672, 3039024727, 3043904968, 3050467218, 3051886594, 3053067553, 3056188564, 3057812794, 3066185554, 3068762275, 3087114209, 3087935921, 3088190003, 3089015336, 3091255985, 3095401268, 3096813247, 3098725318, 3105671535, 3118932015, 3119183299, 3121944857, 3124496054, 3124902451, 3126706525, 3130262956, 3146277579, 3150523560, 3154412692, 3159557566, 3164499075, 3164706839, 3173559921, 3174529089, 3176196996, 3176871024, 3180784320, 3181226348, 3184223807, 3186278865, 3187205025, 3189849017, 3192015124, 3201052817, 3206103617, 3229338204, 3232995840, 3236363663, 3236684869, 3241501460, 3243217472, 3254464708, 3257959952, 3290502878, 3293286977, 3293297241, 3296072534, 3296419295, 3299472058, 3299767442, 3301223392, 3301309499, 3301391192, 3304599725, 3313552392, 3321637504, 3331885553, 3332277580, 3333914252, 3337182013, 3337858974, 3341471161, 3347209717, 3350345047, 3350816321, 3355691995, 3356927752, 3366205910, 3366755503, 3367073048, 3367944003, 3375346812, 3376868662, 3381262072, 3382258705, 3389287501, 3392485763, 3403782237, 3406109171, 3406111906, 3407122639, 3411575670, 3420722608, 3426523263, 3431675506, 3431798787, 3433958809, 3443103158, 3445734210, 3450482982, 3453219838, 3455171543, 3456723487, 3458629656, 3459326184, 3460757148, 3460835389, 3468111852, 3470303671, 3471910127, 3472815309, 3473608107, 3474158466, 3478804050, 3480605972, 3481097537, 3485240025, 3491815953, 3494777461, 3500328283, 3506796962, 3514565086, 3518469610, 3524188747, 3529349528, 3542452078, 3546487756, 3550989552, 3551573749, 3553442167, 3554781799, 3558264087, 3560824248, 3563344816, 3566074326, 3568626956, 3574536814, 3576593305, 3584104748, 3586564634, 3590106416, 3590119076, 3594126223, 3610130320, 3618863110, 3629119210, 3629792790, 3635013147, 3635459541, 3636074310, 3638424639, 3642130958, 3642225062, 3647798063, 3651981527, 3656108419, 3657615451, 3659534155, 3659667263, 3660545348, 3660867367, 3671487562, 3678946749, 3686613485, 3686646984, 3691543485, 3691543777, 3695175653, 3698130051, 3700803863, 3704722354, 3718851041, 3722297297, 3724304421, 3726779638, 3727535579, 3735382080, 3740438523, 3740440657, 3745910284, 3748112414, 3748157778, 3751765724, 3751843037, 3758548269, 3760229117, 3767579376, 3767636566, 3774416951, 3774620406, 3775107448, 3777554302, 3789001045, 3789217359, 3797275201, 3797334865, 3797547975, 3797752814, 3798120765, 3799727891, 3800284920, 3803890887, 3807736858, 3811590943, 3813081457, 3816238011, 3818244185, 3820433217, 3824973847, 3830752599, 3831131041, 3839962587, 3842157165, 3853184002, 3854490492, 3856121458, 3860607422, 3861431943, 3867504094, 3869648625, 3871255217, 3879613384, 3902486573, 3909678524, 3911290870, 3919568627, 3924938673, 3932881151, 3932899585, 3934007962, 3942901813, 3950379841, 3960912026, 3973890763, 3976040035, 3979964906, 3979965156, 3991078309, 3992022849, 3992259208, 4010941807, 4013412307, 4025854722, 4027434305, 4027536004, 4033312623, 4033315572, 4036094574, 4037300319, 4043405137, 4048222256, 4051811237, 4052267313, 4054558966, 4064836207, 4066383490, 4070580503, 4073707968, 4100786237, 4104807039, 4115427659, 4117626035, 4127381498, 4128299636, 4132795027, 4133480683, 4136878052, 4138537192, 4138587115, 4138850346, 4138930624, 4148483014, 4149140792, 4149355057, 4149483441, 4149626272, 4149641566, 4149676591, 4149809179, 4152090640, 4152153727, 4159166567, 4161006924, 4161031359, 4168702437, 4168921085, 4175490343, 4179607399, 4182917435, 4196816243, 4201710836, 4204344500, 4212065046, 4216249688, 4218603456, 4220181346, 4230252988, 4230808631, 4235216564, 4245730359, 4250048329, 4261049438, 4266150865, 4270257086, 4285995571, 4287809158, 4287924367, 4293141634, 4293320049, 7, 171252454, 314658260, 1911007288, 2310391087, 2705648135, 3085052283, 4199583372, 0, 0, 23, 366428436, 366991379, 487687151, 649399193, 900018457, 911616432, 914855142, 1068454171, 1213136917, 1357549542, 1437166305, 1491010671, 1491010869, 2098925819, 2412701058, 2447973967, 2572472237, 2572499572, 2572504631, 2734871983, 3229893628, 3628727675, 4020469118, 1978, 3609572, 4707302, 4731941, 7066741, 12732264, 12733869, 12874473, 12898727, 15239865, 15443925, 15464989, 17770158, 18806137, 22641470, 34805542, 37254453, 38352510, 47103897, 47124528, 47160482, 47264668, 47270558, 47521880, 47670735, 47682584, 48206184, 54052064, 55399270, 55790429, 57861540, 64629239, 65951659, 73540622, 74816563, 79005572, 79010572, 79432449, 79977826, 80960607, 90941114, 91781471, 93732497, 101061895, 101792620, 105281118, 114635485, 121111459, 126395821, 127613999, 134819976, 135124399, 135156325, 135512978, 139443164, 140195744, 146403274, 147165318, 147311351, 147680945, 154712981, 156193153, 157683252, 162021680, 165184869, 165682351, 167795310, 169177047, 169285407, 170248114, 175536255, 176298648, 181584625, 186190871, 188366635, 190461039, 190805290, 190817793, 191644192, 193330267, 200367649, 204872798, 208246903, 213994908, 222038678, 222914983, 226753977, 227658815, 230657663, 231976681, 232418677, 234224516, 235125560, 235385397, 235630461, 235880887, 236100347, 237106084, 237695302, 243768879, 244905302, 245221564, 245221621, 245248688, 246957980, 247379872, 247404538, 247547714, 249186148, 249832804, 250298968, 252007821, 252166643, 254498243, 256250975, 256734086, 257675257, 258276240, 260078806, 269653037, 270614174, 270803459, 279865482, 290747254, 296104342, 296106331, 296214241, 297365588, 297388265, 297388314, 297395043, 297872731, 297875338, 305678573, 310113063, 317059542, 318726251, 320983337, 321380700, 329390871, 340233049, 343985311, 368331859, 368339983, 374202536, 374729119, 377042975, 377218502, 377330983, 379160277, 387137528, 390536878, 397426025, 410462833, 410898354, 411028646, 415359567, 418289923, 418809394, 420699727, 422768411, 423087664, 434374676, 434499530, 439966930, 443910462, 444881445, 446735168, 470802373, 473022090, 475752042, 480190019, 481797890, 482141996, 493334140, 493996949, 494002753, 494111972, 496668263, 505642028, 513006918, 520166698, 522732652, 524323805, 524791178, 525296785, 532366388, 537994409, 538156652, 539123093, 539125333, 540384923, 545724556, 546598380, 552815312, 564847266, 572585472, 572589595, 572660745, 572917514, 572938118, 581295982, 583116728, 584477771, 585356786, 585510953, 586974440, 588341431, 590260151, 593171510, 600861600, 602587622, 608185550, 608501000, 611172806, 617227910, 620862123, 625412750, 626878575, 627192073, 628675473, 636454657, 644892435, 645708934, 646772532, 650376939, 653264074, 653865504, 654835286, 655274400, 657684596, 657843927, 665654464, 665772443, 667917050, 667982163, 668803663, 678409190, 685972429, 687873546, 699223116, 722349553, 723381066, 723506578, 725289629, 728910939, 728916446, 729301272, 730375222, 731520837, 731524865, 731524893, 733458327, 734942836, 742063133, 744425628, 745118723, 750501894, 753379261, 753585532, 755936840, 755999442, 757164322, 757742871, 758908039, 758927262, 766978617, 767310694, 767319597, 768502512, 775086059, 775783015, 776818569, 777129529, 782249017, 782470551, 782586541, 783225086, 783819749, 787058931, 793173186, 793643539, 793791572, 794069868, 797737785, 801549019, 805476735, 809560577, 810471911, 810660018, 813069363, 813965189, 814609400, 819689086, 822265343, 827811881, 828807618, 840895172, 842670706, 845178939, 849626506, 857304293, 867054787, 875581912, 878480613, 878489001, 888652626, 892902192, 904040802, 904780949, 904781069, 904781208, 904781211, 904781269, 904781270, 904781407, 904781445, 904781469, 904781569, 904781597, 904781741, 904781750, 904781798, 907680375, 909542970, 913350787, 915552624, 943105427, 944616168, 945567936, 946059164, 946112067, 950116031, 950459761, 950797941, 950991772, 952407653, 954708706, 954904735, 956279390, 959296218, 959317553, 960000436, 960088334, 964474682, 965248297, 965252181, 968600148, 969495568, 969714387, 969714391, 969714751, 975014436, 976847064, 977515724, 978655375, 985441466, 985451059, 988676432, 989199112, 995754553, 995754557, 998100773, 998582596, 1001682227, 1002897238, 1005026102, 1007267340, 1018029509, 1019292109, 1021170671, 1021615491, 1027478448, 1027904949, 1028176876, 1028524011, 1033544761, 1037073656, 1039464298, 1041396131, 1043364491, 1051084878, 1053049944, 1055328538, 1055480209, 1058862972, 1066609925, 1068948457, 1071874351, 1072134738, 1082834847, 1084511341, 1087693738, 1089012798, 1089634494, 1093384439, 1093825560, 1094815391, 1098082937, 1102471353, 1113642022, 1113846049, 1121249692, 1127953536, 1132317159, 1132485954, 1132585385, 1132689597, 1132723356, 1132858392, 1133501028, 1133636064, 1134046361, 1134351151, 1134824033, 1135467502, 1135737574, 1135775689, 1136782059, 1136883336, 1137085890, 1137173922, 1138138823, 1138714596, 1139072942, 1139153897, 1139221159, 1139981182, 1140405028, 1140510661, 1141246959, 1141280718, 1141381995, 1141584549, 1141719585, 1141874653, 1142159541, 1142193300, 1142260818, 1142366610, 1144440814, 1144457023, 1144667374, 1144802410, 1144975561, 1145579956, 1145625081, 1147135141, 1147314976, 1148184718, 1148522564, 1149131059, 1150514349, 1150729533, 1151393172, 1151494449, 1153073825, 1154465661, 1155177503, 1156094385, 1156940664, 1158572559, 1160038984, 1160487168, 1161167906, 1161578459, 1161965872, 1162013821, 1163255421, 1163472226, 1163645377, 1163777146, 1163979700, 1164916562, 1165010690, 1165068597, 1165937726, 1165940993, 1166410608, 1167096330, 1167193469, 1167260731, 1167598577, 1169823858, 1170720439, 1171147706, 1171150005, 1180230175, 1180849387, 1188216287, 1188228500, 1188701654, 1190334387, 1190352716, 1190641324, 1202600586, 1206718941, 1209302133, 1214814043, 1216095517, 1220486075, 1223892937, 1224444732, 1225577971, 1229986049, 1243738793, 1247471306, 1252266596, 1252792940, 1253960230, 1254127330, 1255848785, 1255859538, 1257563663, 1257583343, 1258195056, 1258213434, 1262993336, 1263908042, 1265512654, 1267283463, 1278475387, 1281229947, 1281889125, 1284797630, 1288585218, 1290240457, 1290513099, 1293031053, 1295516865, 1297095740, 1297597617, 1298827289, 1298832842, 1299380998, 1300818337, 1304310342, 1304455504, 1310534169, 1316956180, 1336232039, 1337809090, 1340075459, 1343684265, 1347737800, 1348149256, 1354685816, 1355025196, 1357282216, 1357301365, 1363667295, 1364395531, 1364732891, 1373278040, 1373514813, 1373685873, 1375205051, 1375419602, 1376146087, 1380234474, 1380513046, 1381723825, 1382632688, 1382645602, 1382709874, 1386126578, 1388184353, 1389190819, 1389902309, 1389912616, 1390104485, 1390958270, 1391687090, 1391699393, 1393151104, 1395748391, 1395924208, 1397018707, 1397022500, 1397827261, 1398423514, 1400330808, 1401462671, 1410284129, 1411428439, 1412479074, 1412717811, 1412831927, 1420822802, 1423109435, 1423890423, 1424552007, 1425040900, 1428131728, 1431817030, 1431897749, 1433480127, 1433483767, 1434457973, 1451286836, 1451565010, 1452211848, 1452224159, 1455851258, 1458060161, 1458176029, 1458620255, 1463365872, 1466302404, 1472319400, 1475303091, 1484355552, 1486115226, 1486401243, 1489893113, 1490054949, 1492145100, 1494001659, 1494630697, 1494690535, 1494695213, 1494714660, 1494714786, 1494714930, 1494889015, 1494990523, 1494992680, 1494997876, 1495466906, 1500014997, 1502962162, 1504548128, 1505655813, 1508029184, 1508045454, 1509815249, 1518807662, 1524160328, 1529373691, 1536802563, 1538089784, 1539586715, 1544812783, 1547140470, 1552392687, 1552405115, 1552405169, 1553111822, 1553462237, 1554120313, 1554158027, 1555241094, 1555436471, 1555595989, 1556675361, 1557492455, 1557696008, 1558835738, 1558865070, 1559582938, 1559928005, 1561078602, 1565016185, 1565113430, 1565407826, 1568314306, 1568314316, 1568317266, 1568696751, 1568699472, 1568940804, 1569248185, 1570879860, 1573625992, 1573800670, 1576869802, 1581247153, 1581398717, 1581675892, 1581718434, 1583510121, 1583803496, 1588886160, 1595292826, 1602148307, 1605015374, 1609481646, 1612153257, 1618209596, 1618218864, 1618873873, 1619384363, 1624861042, 1630153983, 1638526919, 1639454708, 1640524262, 1641042489, 1641812886, 1647303548, 1648240296, 1650468220, 1650500409, 1651513056, 1658862087, 1658979753, 1661301475, 1667470132, 1667473335, 1667728240, 1667806132, 1677105623, 1680875001, 1680882207, 1681660610, 1685495090, 1685495093, 1685495270, 1685495398, 1688394353, 1688567575, 1688665455, 1688778883, 1690751126, 1691125863, 1693300755, 1694472929, 1703388735, 1709297356, 1709313729, 1712511978, 1715661089, 1717927392, 1718114956, 1721373840, 1722360575, 1724823399, 1726408681, 1726606395, 1726645504, 1732927910, 1736066754, 1736347741, 1740486766, 1742215384, 1745377406, 1758824175, 1758930481, 1758975612, 1759122505, 1759143730, 1759227293, 1759313682, 1759313685, 1759412017, 1759432510, 1759498975, 1759505228, 1759507354, 1759515800, 1759642661, 1759864276, 1759893786, 1760159824, 1763810143, 1766750547, 1769211545, 1769618102, 1772590156, 1775156822, 1780760274, 1783870720, 1784406502, 1786353732, 1793007575, 1811810046, 1815656403, 1816569647, 1816866992, 1822574126, 1822868024, 1822868031, 1823268852, 1823275309, 1823288115, 1823390804, 1823768300, 1833535991, 1842420860, 1844031908, 1844296341, 1844524436, 1844853963, 1845272265, 1845433501, 1850725233, 1851761689, 1851765614, 1852766386, 1853687691, 1854177922, 1861204803, 1863593250, 1872674263, 1872992134, 1873841021, 1877281407, 1877305076, 1881597618, 1884316146, 1886743174, 1887188539, 1892879921, 1905997196, 1912353097, 1916296381, 1919640688, 1919643810, 1924325687, 1935798204, 1935801369, 1935813711, 1935815187, 1935818499, 1941710024, 1944260378, 1945210145, 1951157591, 1955955663, 1957378415, 1957388660, 1957444069, 1958153525, 1958153878, 1962799016, 1964448624, 1967235715, 1967514117, 1968334692, 1970709900, 1974828022, 1977445003, 1980811473, 1981302481, 1984866213, 1986874949, 1987285901, 1987558613, 1988913069, 1998855379, 2023930736, 2026542768, 2029442974, 2029502301, 2031253491, 2041190670, 2044176332, 2044519717, 2044521677, 2044845895, 2044862336, 2050748464, 2055299797, 2059226128, 2060744697, 2060874008, 2061631935, 2062602594, 2062613436, 2062713055, 2062721365, 2062782118, 2064194523, 2064289093, 2064667157, 2064835977, 2065546931, 2065580690, 2065783508, 2066019598, 2067177842, 2067640249, 2068518016, 2068619301, 2069026672, 2069773511, 2070805664, 2073324624, 2075547993, 2076314666, 2076760108, 2076927096, 2078661044, 2080078919, 2080126248, 2080270176, 2080768362, 2080948565, 2081049148, 2081811414, 2082081519, 2083365940, 2084275182, 2089789238, 2090043919, 2090165361, 2090287045, 2092471497, 2092773191, 2093281591, 2093290649, 2093484170, 2095261287, 2096596043, 2096775591, 2100685312, 2102866955, 2108433077, 2109903284, 2110249550, 2112026046, 2112754908, 2114424326, 2115251185, 2116737470, 2118764990, 2119510407, 2120903194, 2121183749, 2121530494, 2121539444, 2122085862, 2123968241, 2123974461, 2124038667, 2126585211, 2127702833, 2127711196, 2129393172, 2140172366, 2141043403, 2144163444, 2144352359, 2146552134, 2146559400, 2146579609, 2146771534, 2146787712, 2147192784, 2149214372, 2150227387, 2151276842, 2152677197, 2158829447, 2159124528, 2159550475, 2161337980, 2161361535, 2163722410, 2163917836, 2165826914, 2169168320, 2170868227, 2173022808, 2174751247, 2179048400, 2184998274, 2196541409, 2200622033, 2203412941, 2206322353, 2208794483, 2219653172, 2219657520, 2225010953, 2226828879, 2238722895, 2238722920, 2238723506, 2245936247, 2248375230, 2249276550, 2249625301, 2254065144, 2254179087, 2254183431, 2254275149, 2254449430, 2254449877, 2255178054, 2264880989, 2270863210, 2290294367, 2304704334, 2304866355, 2305219189, 2310350875, 2310486036, 2312897274, 2314773060, 2315564905, 2319231065, 2319463533, 2325240383, 2327016339, 2330482855, 2337919027, 2340169455, 2359883328, 2361871491, 2366081778, 2369823335, 2369831600, 2371523459, 2372759050, 2374977123, 2376431395, 2378889732, 2382890223, 2383755454, 2386589953, 2387052696, 2389856295, 2391789782, 2398718314, 2399324290, 2400888860, 2401211408, 2404756392, 2406557074, 2407241140, 2409418646, 2411497922, 2411691127, 2413846222, 2413908037, 2414944572, 2415208709, 2417936111, 2419639306, 2423159152, 2423360684, 2425978408, 2428076111, 2437572023, 2440527060, 2444775143, 2449407487, 2457428534, 2469735934, 2475146676, 2475744613, 2476033552, 2476112212, 2476147614, 2477393954, 2478803388, 2479415778, 2482075359, 2485317413, 2485370363, 2488499588, 2488699734, 2491415998, 2492607180, 2493496209, 2497515972, 2499072481, 2499532790, 2504383993, 2504870149, 2505121421, 2505147736, 2513647314, 2513693640, 2513701512, 2513706827, 2521253655, 2521398855, 2526527953, 2526528078, 2527291586, 2527292245, 2527666001, 2528098475, 2536669081, 2536933437, 2537106090, 2538335365, 2541170503, 2541170604, 2541177518, 2545965593, 2546249066, 2546819122, 2548278991, 2548782015, 2549421379, 2557808039, 2557863700, 2558865115, 2568950385, 2569073380, 2569341502, 2569405925, 2570837952, 2575053435, 2575619554, 2575627585, 2579451785, 2581687876, 2582936524, 2586547509, 2590439971, 2600983050, 2602643559, 2605946857, 2608238576, 2608504686, 2611889973, 2612202111, 2619739935, 2621175072, 2627204334, 2627570013, 2627677159, 2631480810, 2631901285, 2635187702, 2637430468, 2638897207, 2639751704, 2642390316, 2644459471, 2644532855, 2644906311, 2645171587, 2647433605, 2647443463, 2649904288, 2651288351, 2652440186, 2655263134, 2660229222, 2660362019, 2662714632, 2671981072, 2673085999, 2676359415, 2678218950, 2680015310, 2683201101, 2683726243, 2687071289, 2687546085, 2689958531, 2690565794, 2691049537, 2696922944, 2702278755, 2705586928, 2707450736, 2708750293, 2710694053, 2710777678, 2717039465, 2719746264, 2719953243, 2722365346, 2724396360, 2730361077, 2732178535, 2732249147, 2732255792, 2732453216, 2732465831, 2733162785, 2733179003, 2740913336, 2743326046, 2745816408, 2746770100, 2768031559, 2768594053, 2769743066, 2770453396, 2777301260, 2777413063, 2779047561, 2779131760, 2781151044, 2788878449, 2791114477, 2792266216, 2795123222, 2795130739, 2795148393, 2803000277, 2803220098, 2820015673, 2824852881, 2825063248, 2825297984, 2826183623, 2826618777, 2828159974, 2830840737, 2840364717, 2844137461, 2844192015, 2844331414, 2844474265, 2845536368, 2847702680, 2847708560, 2849875839, 2854691117, 2857021867, 2857111846, 2857167445, 2857291628, 2857718467, 2857718874, 2859609075, 2860369035, 2860944275, 2861234828, 2861431296, 2861773187, 2862323803, 2862729831, 2862789186, 2862818280, 2865000297, 2865536587, 2872917161, 2879220442, 2885591219, 2886256228, 2886266660, 2886337850, 2886340600, 2886347487, 2886358758, 2886559394, 2888553420, 2893735969, 2893987517, 2894277589, 2895201770, 2895970159, 2903889952, 2904798808, 2907566289, 2911967032, 2913775681, 2917443420, 2921648360, 2921994283, 2925162127, 2925540459, 2931480722, 2936112276, 2938485423, 2939997155, 2941295122, 2942568797, 2944555176, 2950549599, 2952067971, 2952072562, 2955690120, 2961421753, 2962144430, 2962519996, 2962841785, 2964270344, 2964373735, 2965548040, 2966852375, 2970298080, 2974400461, 2975755381, 2981996158, 2987922608, 2991195167, 2991625994, 2993771546, 2995901561, 3000958971, 3001281849, 3001388716, 3004478994, 3004479027, 3004479111, 3004479159, 3004479171, 3004479184, 3004479190, 3004479239, 3004479240, 3004479258, 3004479289, 3004479305, 3004479323, 3004479334, 3004479373, 3004479389, 3004479390, 3004479401, 3004479425, 3004479785, 3004479787, 3004479818, 3004479829, 3004479837, 3004479976, 3004479994, 3004480114, 3005847375, 3006723884, 3006726944, 3006727797, 3006731179, 3006737252, 3006744684, 3006811183, 3012299493, 3014399025, 3019017018, 3019072181, 3019996757, 3020108825, 3020133371, 3020188532, 3023885513, 3024558034, 3024589567, 3024626538, 3033483503, 3034109278, 3035739007, 3035887950, 3044634578, 3044797796, 3044821749, 3045244983, 3045788419, 3045876876, 3046124074, 3046256428, 3050244615, 3050333064, 3050334784, 3056297406, 3062281966, 3063798750, 3063849681, 3073445035, 3073797863, 3073848296, 3086119708, 3087786680, 3089398889, 3089451715, 3089454054, 3089461994, 3089735415, 3094552970, 3097888413, 3098875466, 3099276787, 3104375123, 3104503715, 3105798493, 3107144912, 3107146953, 3110631110, 3110681545, 3111601102, 3111601746, 3111606786, 3114815727, 3119543502, 3119594433, 3120807553, 3120857998, 3122897068, 3125786613, 3128821880, 3133975234, 3135838657, 3136281421, 3145164732, 3147940006, 3154068140, 3154152867, 3157412719, 3157501664, 3159380027, 3160589879, 3161016478, 3161897203, 3164181610, 3174437714, 3180245112, 3180300610, 3182786585, 3183126568, 3183293814, 3183325319, 3184294753, 3188347051, 3191217062, 3196370198, 3197567695, 3198643172, 3198783739, 3198824989, 3198841920, 3198930383, 3199640352, 3200095506, 3203439089, 3203573947, 3203579445, 3208441350, 3209729826, 3210506925, 3210514725, 3210570457, 3214383466, 3214394316, 3214653823, 3215790970, 3217760577, 3218901480, 3218928718, 3218996674, 3218997101, 3219339071, 3219427268, 3220535722, 3220543483, 3221757640, 3223098753, 3224727829, 3232284385, 3232339054, 3234508143, 3234559072, 3235473148, 3237969392, 3243142044, 3247991594, 3253953941, 3269910681, 3270985722, 3273573836, 3273628995, 3275986591, 3277061645, 3277112578, 3277868236, 3277980164, 3278129999, 3278154322, 3280832255, 3280992609, 3283017533, 3286262047, 3290414111, 3301409832, 3301494567, 3302526185, 3302610918, 3305712858, 3305866028, 3305950755, 3309540327, 3309590022, 3309595898, 3309596203, 3309660560, 3309660597, 3309937069, 3312550946, 3312639405, 3317007142, 3317095593, 3324397363, 3331028046, 3331525682, 3331580349, 3331802213, 3332642035, 3332696700, 3333929978, 3334870005, 3334920442, 3335058344, 3335315569, 3343940221, 3345496201, 3350023967, 3353092349, 3358586999, 3365687143, 3366763202, 3368167300, 3371155980, 3372842751, 3373802982, 3374003367, 3374007861, 3374013921, 3374033257, 3374071862, 3374072315, 3374075119, 3374222601, 3374506623, 3377952754, 3382868701, 3384928690, 3388197033, 3390931348, 3391051206, 3391063809, 3391068622, 3391334282, 3391402631, 3391423133, 3391432603, 3392425741, 3394879910, 3395277647, 3399311251, 3402270417, 3404440519, 3414226886, 3414277321, 3415566709, 3417045783, 3417060092, 3418683074, 3418733517, 3424453774, 3431921225, 3437307073, 3437430868, 3437705452, 3444401619, 3445590826, 3447374472, 3456431399, 3458638240, 3461359920, 3463272868, 3468986640, 3469121667, 3471246134, 3474393156, 3474446194, 3476056250, 3478543821, 3486841411, 3486906847, 3489097968, 3491201265, 3495569706, 3496705474, 3497897502, 3497994843, 3498252682, 3502149957, 3504414102, 3504826781, 3506839508, 3506948350, 3508950458, 3509210745, 3509498189, 3511959565, 3512025010, 3512493029, 3514111400, 3517669498, 3518790968, 3521920341, 3523035738, 3523862571, 3524226140, 3530307622, 3530358057, 3536335853, 3536792162, 3538712404, 3541452460, 3541507619, 3542648636, 3544416242, 3550676375, 3551025439, 3553383951, 3556498831, 3561501051, 3561585780, 3565016796, 3565023071, 3565174365, 3565227623, 3565288856, 3566089568, 3572109810, 3575114019, 3577841990, 3586425916, 3589694483, 3591020567, 3592221649, 3594125448, 3595182758, 3596128381, 3602035250, 3602533630, 3602552275, 3604829927, 3607233834, 3607322789, 3607604079, 3608554389, 3610981370, 3617629034, 3619761411, 3623812162, 3629877419, 3636237811, 3636292476, 3639577654, 3639632313, 3645953597, 3647523178, 3649784978, 3653883892, 3660676457, 3664234276, 3674197367, 3675513627, 3681233287, 3684650455, 3688377898, 3689406359, 3692544695, 3693437133, 3694959415, 3703294733, 3704443907, 3704956777, 3706490306, 3709178884, 3709268355, 3709272958, 3717182590, 3718660896, 3719413702, 3721853564, 3731122282, 3734934472, 3736397122, 3736397691, 3738359136, 3744502996, 3744505315, 3744515994, 3744516038, 3745225898, 3745403285, 3749377655, 3751498613, 3752631559, 3753565240, 3756319792, 3758308501, 3758308691, 3761682835, 3762386667, 3762488637, 3763193356, 3763904751, 3764062969, 3764739038, 3769398133, 3770065529, 3774076759, 3779092995, 3780318738, 3781089827, 3783201212, 3785420602, 3786786081, 3788364543, 3791375542, 3791430201, 3791912060, 3792007260, 3792147146, 3793208754, 3794029235, 3805317549, 3808957225, 3809652473, 3811984999, 3812594538, 3819295903, 3819351056, 3821104144, 3821104746, 3829518367, 3832811824, 3833121835, 3833171090, 3833706374, 3838812042, 3843969806, 3844552031, 3850681433, 3851222744, 3851541567, 3851602009, 3851679807, 3853676291, 3855415829, 3856249405, 3859110665, 3859972063, 3862928629, 3865386916, 3865396334, 3873108359, 3873163016, 3876524049, 3883472548, 3885986978, 3888196487, 3895773227, 3898366596, 3900605466, 3900796753, 3906034907, 3907036333, 3914330405, 3916906002, 3922403377, 3925982068, 3933039724, 3936549300, 3939824482, 3940957272, 3941201834, 3941535714, 3943160335, 3943296300, 3950173236, 3955179593, 3959867562, 3960938237, 3961299015, 3961303520, 3961836502, 3962329360, 3963273426, 3966271140, 3969493837, 3970184201, 3971378905, 3972349404, 3972404563, 3974206923, 3977375686, 3977639927, 3981851856, 3984175284, 3984369770, 3984383153, 3984388901, 3984577838, 3986753035, 3987449768, 3988320676, 3989122328, 3989124781, 3989300792, 3991957101, 3991978776, 3992246021, 3993156440, 3995285601, 4002046206, 4002059123, 4002298131, 4007368305, 4009075902, 4012314248, 4014272956, 4018800601, 4021398623, 4022152923, 4023242992, 4034787018, 4034837957, 4040007159, 4040507273, 4040558214, 4042630615, 4042667369, 4044815570, 4044899805, 4046325025, 4051504220, 4051593171, 4059166898, 4059387372, 4060969098, 4060986772, 4062588735, 4063625944, 4063736412, 4064813411, 4074640059, 4077930265, 4080197122, 4081731399, 4081736449, 4081740860, 4081761692, 4082508192, 4082648933, 4085037592, 4085499470, 4085741867, 4086206754, 4087477773, 4087974431, 4087975312, 4087977986, 4087982672, 4087983230, 4087984585, 4087984590, 4087988411, 4087993231, 4087993234, 4087993291, 4087993428, 4089941093, 4090379779, 4094838531, 4095533224, 4098180267, 4104794847, 4104808845, 4105491350, 4105500480, 4109580593, 4111598640, 4115797781, 4116207257, 4116258198, 4116322118, 4116406345, 4116912946, 4122262153, 4126221625, 4127308650, 4128209898, 4128210099, 4128224738, 4128228031, 4128452341, 4131804567, 4131859224, 4137741343, 4141029933, 4142953920, 4145022541, 4149201544, 4150566897, 4151710650, 4152474623, 4155185738, 4156445644, 4157556469, 4157644922, 4159136925, 4159401066, 4159780211, 4159864444, 4164601660, 4166043368, 4168091484, 4169450331, 4170161097, 4170579962, 4170925049, 4171014006, 4171016671, 4171029715, 4172482250, 4175353143, 4176008925, 4178981053, 4184703759, 4186748423, 4188894668, 4189635776, 4190045706, 4190142208, 4195146068, 4196943735, 4199824850, 4203521301, 4206809827, 4206944958, 4207535653, 4208164707, 4211585807, 4215346074, 4215356593, 4218114605, 4218115138, 4218132009, 4219656584, 4219999876, 4220379359, 4221957810, 4222018626, 4225873997, 4227433758, 4228171984, 4228217908, 4228360888, 4228368741, 4228368760, 4231583294, 4231662792, 4232149414, 4232629512, 4234942237, 4235762280, 4240864861, 4241320459, 4241740950, 4242647335, 4243702915, 4245105172, 4246629902, 4248741847, 4252833472, 4252840599, 4254781707, 4254799704, 4255058051, 4260594638, 4261873154, 4261894730, 4262104449, 4262374147, 4262375371, 4262499171, 4264253465, 4265048576, 4267292711, 4271528787, 4272039260, 4272350188, 4272417877, 4276136562, 4288066094, 296, 76317054, 90122581, 107533418, 134757519, 142022835, 149084067, 244603010, 255553804, 263431316, 265459661, 284810646, 289494951, 371032970, 373243562, 374621869, 387545720, 391377589, 415171548, 415171976, 418990556, 418990602, 425807660, 435420269, 461226423, 483976516, 501379566, 531625563, 553327069, 590191545, 595217502, 649854972, 714686602, 717942499, 720960146, 720974524, 720974736, 720975995, 725617684, 744932012, 793535325, 806495002, 817571047, 857348365, 862847657, 871542102, 877175745, 893771636, 931438088, 937200556, 1015486168, 1026348750, 1029964103, 1106088318, 1155764825, 1219433535, 1220725895, 1220852957, 1222628504, 1230410191, 1282239389, 1290343418, 1326192098, 1338160975, 1361325259, 1374669131, 1374800320, 1389489864, 1401511709, 1421711922, 1430126662, 1467196671, 1467386990, 1493005045, 1506058569, 1507763651, 1515782688, 1515784934, 1515785058, 1523142552, 1526329423, 1553174585, 1591300266, 1636446087, 1641166031, 1642384128, 1679485164, 1681545174, 1704277516, 1705908110, 1714538458, 1768636249, 1818263278, 1821800212, 1833750850, 1834601376, 1866278547, 1867401367, 1936236019, 1978039580, 1997464432, 2017904725, 2055461758, 2058918178, 2080694907, 2086814061, 2123843096, 2170766397, 2174442073, 2177527468, 2233637259, 2274844928, 2274845447, 2274845649, 2293400491, 2299670458, 2300280964, 2300527715, 2305877279, 2307152224, 2316307169, 2335588857, 2337430377, 2359562546, 2360555826, 2375767790, 2419834458, 2423179189, 2439178127, 2517521888, 2585317679, 2631335866, 2737177336, 2757711981, 2779759639, 2796817467, 2805154149, 2805154597, 2816464305, 2817592022, 2872823135, 2873905939, 2876785673, 2876785759, 2913059937, 2924726497, 2938670220, 2939089089, 3005172573, 3050185270, 3050185436, 3056015384, 3056015484, 3071839865, 3079506072, 3079929644, 3116612793, 3164097381, 3176996220, 3180729164, 3234391576, 3234432745, 3278041418, 3278041816, 3319967633, 3334769994, 3375261606, 3410106074, 3456106742, 3461071037, 3461179556, 3473412940, 3489079842, 3517650814, 3571189672, 3593285841, 3612407497, 3666061454, 3666061458, 3666061568, 3666061577, 3666061585, 3666061591, 3666061602, 3666061610, 3666061613, 3666061619, 3666061666, 3666061672, 3666061702, 3666061706, 3666061732, 3666061760, 3666061781, 3666061825, 3666061864, 3666061891, 3666061895, 3666061896, 3666061902, 3666061903, 3666061913, 3666062029, 3666062293, 3666062299, 3666062326, 3666062331, 3666062345, 3666062357, 3666062361, 3666062379, 3666062386, 3666062390, 3666062391, 3666062394, 3666062408, 3666062418, 3666062422, 3666062427, 3666062453, 3666062517, 3666062569, 3666062581, 3666062582, 3666062586, 3666062587, 3666099519, 3676644409, 3676644411, 3676644421, 3676644429, 3676644442, 3676644586, 3676644600, 3676644610, 3676644643, 3676644706, 3676644759, 3676644775, 3676644800, 3676644806, 3676644819, 3676644874, 3676644887, 3676644888, 3676644905, 3676644939, 3676644953, 3676644982, 3676645005, 3676645006, 3676645021, 3676645049, 3676645073, 3684315096, 3691777760, 3697941178, 3708654452, 3710369155, 3722872360, 3749170769, 3772863442, 3793240332, 3798969166, 3800169971, 3820675046, 3829710462, 3829710568, 3832603821, 3845152461, 3847111189, 3861225221, 3871154340, 3872238039, 3916589493, 3949265042, 3967179311, 4020468984, 4088042711, 4088042763, 4088043471, 4098608917, 4098609219, 4098704176, 4098704230, 4098775844, 4098776178, 4098815877, 4098816211, 4114558119, 4127380674, 4155818428, 4160021452, 4224941776, 4259920717, 4263023754, 4268562148, 0, 0, 0, 2, 343511425, 4233599295, 4, 989615076, 1348282182, 2372695675, 2793429742, 45, 134752460, 310748895, 373240553, 387546555, 528158848, 599034260, 599035482, 771634050, 771637032, 1264600767, 1542981532, 1557499238, 1644040136, 1645084619, 1709094170, 1836295865, 1964668429, 1986372014, 2086817070, 2280755093, 2368015199, 2707054618, 2757714990, 2842899363, 2889802328, 2938675535, 2942499160, 3012594373, 3250117513, 3303582289, 3303582897, 3303582994, 3303614961, 3577832733, 3577832874, 3719669200, 3789613664, 3804622433, 3847110230, 3927045026, 3974478460, 3994206764, 3994206767, 4103392506, 4197651626, 0, 0, 0, 0, 0, 20, 181602757, 495318858, 804592434, 820388681, 838060561, 871806992, 1860444894, 1942164974, 2253530761, 2307427283, 2356867634, 2454582508, 2478294033, 2645305307, 3336190368, 3415553447, 3505446608, 3710380917, 3928753122, 4196008531]);

/**
 * Find `elt` in `arr` between indices `start` (included) and `end` (excluded)
 * using a binary search algorithm.
 */
function binSearch(arr, elt, start, end) {
    if (start >= end) {
        return false;
    }
    let low = start;
    let high = end - 1;
    while (low <= high) {
        const mid = (low + high) >>> 1;
        const midVal = arr[mid];
        if (midVal < elt) {
            low = mid + 1;
        }
        else if (midVal > elt) {
            high = mid - 1;
        }
        else {
            return true;
        }
    }
    return false;
}
// Packed hash algorithm makes use of a rolling hash to lookup suffixes. To
// avoid having to allocate an array to store them at every invocation, we
// create one global one that can be reused.
const BUFFER = new Uint32Array(20);
/**
 * Iterate on hashes of labels from `hostname` backward (from last label to
 * first label), stopping after `maximumNumberOfLabels` have been extracted and
 * calling `cb` on each of them.
 *
 * The `maximumNumberOfLabels` argument is typically used to specify the number
 * of labels seen in the longest public suffix. We do not need to check further
 * in very long hostnames.
 */
function hashHostnameLabelsBackward(hostname, maximumNumberOfLabels) {
    let hash = 5381;
    let index = 0;
    // Compute hash backward, label per label
    for (let i = hostname.length - 1; i >= 0; i -= 1) {
        const code = hostname.charCodeAt(i);
        // Process label
        if (code === 46 /* '.' */) {
            BUFFER[index << 1] = hash >>> 0;
            BUFFER[(index << 1) + 1] = i + 1;
            index += 1;
            if (index === maximumNumberOfLabels) {
                return index;
            }
        }
        // Update hash
        hash = (hash * 33) ^ code;
    }
    // Let's not forget about last label
    BUFFER[index << 1] = hash >>> 0;
    BUFFER[(index << 1) + 1] = 0;
    index += 1;
    return index;
}
/**
 * Perform a public suffix lookup for `hostname` using the packed hashes
 * data-structure. The `options` allows to specify if ICANN/PRIVATE sections
 * should be considered. By default, both are.
 *
 */
function suffixLookup(hostname, options, out) {
    if (fastPathLookup(hostname, options, out) === true) {
        return;
    }
    const { allowIcannDomains, allowPrivateDomains } = options;
    // Keep track of longest match
    let matchIndex = -1;
    let matchKind = 0 /* NO_MATCH */;
    let matchLabels = 0; // Keep track of number of labels currently matched
    // Index in the packed array data-structure
    let index = 1;
    const numberOfHashes = hashHostnameLabelsBackward(hostname, packed[0] /* maximumNumberOfLabels */);
    for (let label = 0; label < numberOfHashes; label += 1) {
        const hash = BUFFER[label << 1];
        const labelStart = BUFFER[(label << 1) + 1];
        // For each label, matching proceeds in the following way:
        //
        //  1. check exceptions
        //  2. check wildcards
        //  3. check normal rules
        //
        // For each of these, we also perform the lookup in two parts, once for
        // the ICANN section and one for the PRIVATE section. Both of which are
        // optional and can be enabled/disabled using the `options` argument.
        //
        // We start with exceptions because if an exception is found, we do not
        // need to continue matching wildcards or normal rules; the exception will
        // always have priority.
        //
        // Similarly, if we find a wildcard match, we do not need to check the
        // rules for the same label as the wildcard match is always longer (one
        // more label is matched).
        //
        // **WARNING**: the structure of this code follows exactly the structure
        // of the packed data structure as create in ./bin/builders/hashes.js
        let match = 0 /* NO_MATCH */;
        // ========================================================================
        // Lookup exceptions
        // ========================================================================
        // ICANN
        if (allowIcannDomains === true) {
            match = binSearch(packed, hash, index + 1, index + packed[index] + 1)
                ? 1 /* ICANN_MATCH */ | 4 /* EXCEPTION_MATCH */
                : 0 /* NO_MATCH */;
        }
        index += packed[index] + 1;
        // PRIVATE
        if (allowPrivateDomains === true && match === 0 /* NO_MATCH */) {
            match = binSearch(packed, hash, index + 1, index + packed[index] + 1)
                ? 2 /* PRIVATE_MATCH */ | 4 /* EXCEPTION_MATCH */
                : 0 /* NO_MATCH */;
        }
        index += packed[index] + 1;
        // ========================================================================
        // Lookup wildcards
        // ========================================================================
        // ICANN
        if (allowIcannDomains === true &&
            match === 0 /* NO_MATCH */ &&
            (matchKind & 4 /* EXCEPTION_MATCH */) === 0) {
            match = binSearch(packed, hash, index + 1, index + packed[index] + 1)
                ? 16 /* WILDCARD_MATCH */ | 1 /* ICANN_MATCH */
                : 0 /* NO_MATCH */;
        }
        index += packed[index] + 1;
        // PRIVATE
        if (allowPrivateDomains === true &&
            match === 0 /* NO_MATCH */ &&
            (matchKind & 4 /* EXCEPTION_MATCH */) === 0) {
            match = binSearch(packed, hash, index + 1, index + packed[index] + 1)
                ? 16 /* WILDCARD_MATCH */ | 2 /* PRIVATE_MATCH */
                : 0 /* NO_MATCH */;
        }
        index += packed[index] + 1;
        // ========================================================================
        // Lookup rules
        // ========================================================================
        // ICANN
        if (allowIcannDomains === true &&
            match === 0 /* NO_MATCH */ &&
            (matchKind & 4 /* EXCEPTION_MATCH */) === 0 &&
            matchLabels <= label) {
            match = binSearch(packed, hash, index + 1, index + packed[index] + 1)
                ? 8 /* NORMAL_MATCH */ | 1 /* ICANN_MATCH */
                : 0 /* NO_MATCH */;
        }
        index += packed[index] + 1;
        // PRIVATE
        if (allowPrivateDomains === true &&
            match === 0 /* NO_MATCH */ &&
            (matchKind & 4 /* EXCEPTION_MATCH */) === 0 &&
            matchLabels <= label) {
            match = binSearch(packed, hash, index + 1, index + packed[index] + 1)
                ? 8 /* NORMAL_MATCH */ | 2 /* PRIVATE_MATCH */
                : 0 /* NO_MATCH */;
        }
        index += packed[index] + 1;
        // If we found a match, the longest match that is being tracked for this
        // hostname. We need to remember which kind of match it was (exception,
        // wildcard, normal rule), the index where the suffix starts in `hostname`
        // as well as the number of labels contained in this suffix (this is
        // important to make sure that we always keep the longest match if there
        // are both a wildcard and a normal rule matching).
        if (match !== 0 /* NO_MATCH */) {
            matchKind = match;
            matchLabels = label + ((match & 16 /* WILDCARD_MATCH */) !== 0 ? 2 : 1);
            matchIndex = labelStart;
        }
    }
    out.isIcann = (matchKind & 1 /* ICANN_MATCH */) !== 0;
    out.isPrivate = (matchKind & 2 /* PRIVATE_MATCH */) !== 0;
    // No match found
    if (matchIndex === -1) {
        out.publicSuffix = numberOfHashes === 1 ? hostname : hostname.slice(BUFFER[1]);
        return;
    }
    // If match is an exception, this means that we need to count less label.
    // For example, exception rule !foo.com would yield suffix 'com', so we need
    // to locate the next dot and slice from there.
    if ((matchKind & 4 /* EXCEPTION_MATCH */) !== 0) {
        out.publicSuffix = hostname.slice(BUFFER[((matchLabels - 2) << 1) + 1]);
        return;
    }
    // If match is a wildcard, we need to match one more label. If wildcard rule
    // was *.com, we would have stored only 'com' in the packed structure and we
    // need to take one extra label on the left.
    if ((matchKind & 16 /* WILDCARD_MATCH */) !== 0) {
        out.publicSuffix =
            matchLabels >= numberOfHashes
                ? hostname
                : hostname.slice(BUFFER[((matchLabels - 1) << 1) + 1]);
        return;
    }
    // if ((matchKind & Result.NORMAL_MATCH) !== 0)
    // For normal match, we just slice the hostname at the beginning of suffix.
    out.publicSuffix = hostname.slice(matchIndex);
}

// For all methods but 'parse', it does not make sense to allocate an object
// every single time to only return the value of a specific attribute. To avoid
// this un-necessary allocation, we use a global object which is re-used.
const RESULT = getEmptyResult();
function parse(url, options = {}) {
    return parseImpl(url, 5 /* ALL */, suffixLookup, options, getEmptyResult());
}
function getHostname(url, options = {}) {
    resetResult(RESULT);
    return parseImpl(url, 0 /* HOSTNAME */, suffixLookup, options, RESULT).hostname;
}
function getPublicSuffix(url, options = {}) {
    resetResult(RESULT);
    return parseImpl(url, 2 /* PUBLIC_SUFFIX */, suffixLookup, options, RESULT).publicSuffix;
}
function getDomain$1(url, options = {}) {
    resetResult(RESULT);
    return parseImpl(url, 3 /* DOMAIN */, suffixLookup, options, RESULT).domain;
}
function getSubdomain$1(url, options = {}) {
    resetResult(RESULT);
    return parseImpl(url, 4 /* SUB_DOMAIN */, suffixLookup, options, RESULT).subdomain;
}
function getDomainWithoutSuffix$1(url, options = {}) {
    resetResult(RESULT);
    return parseImpl(url, 5 /* ALL */, suffixLookup, options, RESULT).domainWithoutSuffix;
}

exports.getDomain = getDomain$1;
exports.getDomainWithoutSuffix = getDomainWithoutSuffix$1;
exports.getHostname = getHostname;
exports.getPublicSuffix = getPublicSuffix;
exports.getSubdomain = getSubdomain$1;
exports.parse = parse;
//# sourceMappingURL=index.js.map
