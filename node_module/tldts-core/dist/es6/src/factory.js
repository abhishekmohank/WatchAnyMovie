/**
 * Implement a factory allowing to plug different implementations of suffix
 * lookup (e.g.: using a trie or the packed hashes datastructures). This is used
 * and exposed in `tldts.ts` and `tldts-experimental.ts` bundle entrypoints.
 */
import getDomain from './domain';
import getDomainWithoutSuffix from './domain-without-suffix';
import extractHostname from './extract-hostname';
import isIp from './is-ip';
import isValidHostname from './is-valid';
import { setDefaults } from './options';
import getSubdomain from './subdomain';
export function getEmptyResult() {
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
export function resetResult(result) {
    result.domain = null;
    result.domainWithoutSuffix = null;
    result.hostname = null;
    result.isIcann = null;
    result.isIp = null;
    result.isPrivate = null;
    result.publicSuffix = null;
    result.subdomain = null;
}
export function parseImpl(url, step, suffixLookup, partialOptions, result) {
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
//# sourceMappingURL=factory.js.map