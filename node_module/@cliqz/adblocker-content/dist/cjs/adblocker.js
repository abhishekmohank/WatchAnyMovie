"use strict";
/*!
 * Copyright (c) 2017-2019 Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectScript = exports.injectCSSRule = exports.autoRemoveScript = exports.DOMMonitor = exports.extractFeaturesFromDOM = exports.getDOMElementsFromMutations = void 0;
function getDOMElementsFromMutations(mutations) {
    // Accumulate all nodes which were updated in `nodes`
    const nodes = [];
    for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
            nodes.push(mutation.target);
        }
        else if (mutation.type === 'childList') {
            for (const addedNode of mutation.addedNodes) {
                nodes.push(addedNode);
                const addedDOMElement = addedNode;
                if (addedDOMElement.querySelectorAll !== undefined) {
                    nodes.push(...addedDOMElement.querySelectorAll('[id],[class],[href]'));
                }
            }
        }
    }
    return nodes;
}
exports.getDOMElementsFromMutations = getDOMElementsFromMutations;
/**
 * WARNING: this function should be self-contained and not rely on any global
 * symbol. That constraint needs to be fulfilled because this function can
 * potentially be injected in content-script (e.g.: see PuppeteerBlocker for
 * more details).
 */
function extractFeaturesFromDOM(elements) {
    const ignoredTags = new Set(['br', 'head', 'link', 'meta', 'script', 'style']);
    const classes = new Set();
    const hrefs = new Set();
    const ids = new Set();
    for (const element of elements) {
        if (element.nodeType !== 1 /* Node.ELEMENT_NODE */) {
            continue;
        }
        if (element.localName !== undefined && ignoredTags.has(element.localName)) {
            continue;
        }
        // Update ids
        const id = element.id;
        if (id) {
            ids.add(id);
        }
        // Update classes
        const classList = element.classList;
        if (classList) {
            for (const cls of classList) {
                classes.add(cls);
            }
        }
        // Update href
        const href = element.href;
        if (typeof href === 'string') {
            hrefs.add(href);
        }
    }
    return {
        classes: Array.from(classes),
        hrefs: Array.from(hrefs),
        ids: Array.from(ids),
    };
}
exports.extractFeaturesFromDOM = extractFeaturesFromDOM;
class DOMMonitor {
    constructor(cb) {
        this.cb = cb;
        this.knownIds = new Set();
        this.knownHrefs = new Set();
        this.knownClasses = new Set();
        this.observer = null;
    }
    queryAll(window) {
        this.handleNewNodes(Array.from(window.document.querySelectorAll('[id],[class],[href]')));
    }
    start(window) {
        if (this.observer === null && window.MutationObserver !== undefined) {
            this.observer = new window.MutationObserver((mutations) => {
                this.handleNewNodes(getDOMElementsFromMutations(mutations));
            });
            this.observer.observe(window.document.documentElement, {
                attributeFilter: ['class', 'id', 'href'],
                attributes: true,
                childList: true,
                subtree: true,
            });
        }
    }
    stop() {
        if (this.observer !== null) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
    handleNewFeatures({ hrefs, ids, classes, }) {
        const newIds = [];
        const newClasses = [];
        const newHrefs = [];
        // Update ids
        for (const id of ids) {
            if (this.knownIds.has(id) === false) {
                newIds.push(id);
                this.knownIds.add(id);
            }
        }
        for (const cls of classes) {
            if (this.knownClasses.has(cls) === false) {
                newClasses.push(cls);
                this.knownClasses.add(cls);
            }
        }
        for (const href of hrefs) {
            if (this.knownHrefs.has(href) === false) {
                newHrefs.push(href);
                this.knownHrefs.add(href);
            }
        }
        if (newIds.length !== 0 || newClasses.length !== 0 || newHrefs.length !== 0) {
            this.cb({
                classes: newClasses,
                hrefs: newHrefs,
                ids: newIds,
            });
            return true;
        }
        return false;
    }
    handleNewNodes(nodes) {
        return this.handleNewFeatures(extractFeaturesFromDOM(nodes));
    }
}
exports.DOMMonitor = DOMMonitor;
/**
 * Wrap a self-executing script into a block of custom logic to remove the
 * script tag once execution is terminated. This can be useful to not leave
 * traces in the DOM after injections.
 */
function autoRemoveScript(script) {
    // Minified using 'terser'
    return `try{${script}}catch(c){}!function(){var c=document.currentScript,e=c&&c.parentNode;e&&e.removeChild(c)}();`;
    // Original:
    //
    //    try {
    //      ${script}
    //    } catch (ex) { }
    //
    //    (function() {
    //      var currentScript = document.currentScript;
    //      var parent = currentScript && currentScript.parentNode;
    //
    //      if (parent) {
    //        parent.removeChild(currentScript);
    //      }
    //    })();
}
exports.autoRemoveScript = autoRemoveScript;
function injectCSSRule(rule, doc) {
    const parent = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement;
    if (parent !== null) {
        const css = doc.createElement('style');
        css.type = 'text/css';
        css.id = 'cliqz-adblokcer-css-rules';
        css.appendChild(doc.createTextNode(rule));
        parent.appendChild(css);
    }
}
exports.injectCSSRule = injectCSSRule;
function injectScript(s, doc) {
    const script = doc.createElement('script');
    script.type = 'text/javascript';
    script.id = 'cliqz-adblocker-script';
    script.async = false;
    script.appendChild(doc.createTextNode(autoRemoveScript(s)));
    // Insert node
    const parent = doc.head || doc.documentElement;
    if (parent !== null) {
        parent.appendChild(script);
    }
}
exports.injectScript = injectScript;
//# sourceMappingURL=adblocker.js.map