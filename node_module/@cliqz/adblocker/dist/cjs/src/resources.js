"use strict";
/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const small_1 = require("@remusao/small");
const data_view_1 = require("./data-view");
// Polyfill for `btoa`
function btoaPolyfill(buffer) {
    if (typeof btoa !== 'undefined') {
        return btoa(buffer);
    }
    else if (typeof Buffer !== 'undefined') {
        return Buffer.from(buffer).toString('base64');
    }
    return buffer;
}
// TODO - support # alias
// TODO - support empty resource body
/**
 * Abstraction on top of resources.txt used for redirections as well as script
 * injections. It contains logic to parse, serialize and get resources by name
 * for use in the engine.
 */
class Resources {
    constructor({ checksum = '', js = new Map(), resources = new Map() } = {}) {
        this.checksum = checksum;
        this.js = js;
        this.resources = resources;
    }
    static deserialize(buffer) {
        const checksum = buffer.getASCII();
        // Deserialize `resources`
        const resources = new Map();
        const numberOfResources = buffer.getUint16();
        for (let i = 0; i < numberOfResources; i += 1) {
            resources.set(buffer.getASCII(), {
                contentType: buffer.getASCII(),
                body: buffer.getASCII(),
            });
        }
        // Deserialize `js`
        const js = new Map();
        resources.forEach(({ contentType, body }, name) => {
            if (contentType === 'application/javascript') {
                js.set(name, body);
            }
        });
        return new Resources({
            checksum,
            js,
            resources,
        });
    }
    static parse(data, { checksum }) {
        const typeToResource = new Map();
        const trimComments = (str) => str.replace(/^\s*#.*$/gm, '');
        const chunks = data.split('\n\n');
        for (const chunk of chunks) {
            const resource = trimComments(chunk).trim();
            if (resource.length !== 0) {
                const firstNewLine = resource.indexOf('\n');
                const split = resource.slice(0, firstNewLine).split(/\s+/);
                const name = split[0];
                const type = split[1];
                const body = resource.slice(firstNewLine + 1);
                if (name === undefined || type === undefined || body === undefined) {
                    continue;
                }
                let resources = typeToResource.get(type);
                if (resources === undefined) {
                    resources = new Map();
                    typeToResource.set(type, resources);
                }
                resources.set(name, body);
            }
        }
        // The resource containing javascirpts to be injected
        const js = typeToResource.get('application/javascript') || new Map();
        for (const [key, value] of js.entries()) {
            if (key.endsWith('.js')) {
                js.set(key.slice(0, -3), value);
            }
        }
        // Create a mapping from resource name to { contentType, data }
        // used for request redirection.
        const resourcesByName = new Map();
        typeToResource.forEach((resources, contentType) => {
            resources.forEach((resource, name) => {
                resourcesByName.set(name, {
                    contentType,
                    body: resource,
                });
            });
        });
        return new Resources({
            checksum,
            js,
            resources: resourcesByName,
        });
    }
    getResource(name) {
        const { body, contentType } = this.resources.get(name) || small_1.getResourceForMime(name);
        let dataUrl;
        if (contentType.indexOf(';') !== -1) {
            dataUrl = `data:${contentType},${body}`;
        }
        else {
            dataUrl = `data:${contentType};base64,${btoaPolyfill(body)}`;
        }
        return { body, contentType, dataUrl };
    }
    getSerializedSize() {
        let estimatedSize = data_view_1.sizeOfASCII(this.checksum) + 2 * data_view_1.sizeOfByte(); // resources.size
        this.resources.forEach(({ contentType, body }, name) => {
            estimatedSize += data_view_1.sizeOfASCII(name) + data_view_1.sizeOfASCII(contentType) + data_view_1.sizeOfASCII(body);
        });
        return estimatedSize;
    }
    serialize(buffer) {
        // Serialize `checksum`
        buffer.pushASCII(this.checksum);
        // Serialize `resources`
        buffer.pushUint16(this.resources.size);
        this.resources.forEach(({ contentType, body }, name) => {
            buffer.pushASCII(name);
            buffer.pushASCII(contentType);
            buffer.pushASCII(body);
        });
    }
}
exports.default = Resources;
//# sourceMappingURL=resources.js.map