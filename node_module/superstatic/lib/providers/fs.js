"use strict";
/**
 * Copyright (c) 2022 Google LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("node:crypto");
const promises_1 = require("node:fs/promises");
const fs = require("node:fs");
const pathjoin = require("join-path"); // eslint-disable-line @typescript-eslint/no-var-requires
async function multiStat(paths) {
    // const pathname = paths.shift();
    let err;
    for (const pathname of paths) {
        try {
            const stat = await (0, promises_1.stat)(pathname);
            return { pathname, ...stat };
        }
        catch (e) {
            err = e;
        }
    }
    throw err;
}
module.exports = function provider(options) {
    const etagCache = {};
    const cwd = options.cwd || process.cwd();
    let publicPaths = options.public || ["."];
    if (!Array.isArray(publicPaths)) {
        publicPaths = [publicPaths];
    }
    async function fetchEtag(pathname, stat) {
        return new Promise((resolve, reject) => {
            const cached = etagCache[pathname];
            if (cached && cached.timestamp === stat.mtime) {
                return resolve(cached.value);
            }
            // the file you want to get the hash
            const fd = fs.createReadStream(pathname);
            const hash = crypto.createHash("md5");
            hash.setEncoding("hex");
            fd.on("error", reject);
            fd.on("end", () => {
                hash.end();
                const etag = hash.read();
                etagCache[pathname] = {
                    timestamp: stat.mtime,
                    value: etag,
                };
                resolve(etag);
            });
            // read all file and pipe it (write it) to the hash object
            return fd.pipe(hash);
        });
    }
    return async function (req, pathname) {
        pathname = decodeURI(pathname);
        // jumping to parent directories is not allowed
        if (pathname.includes("../") ||
            pathname.includes("..\\") ||
            pathname.toLowerCase().includes("..%5c") ||
            pathname.match(/\0/g) ||
            // A path that didn't start with a slash is not valid.
            !pathname.startsWith("/")) {
            return Promise.resolve(null);
        }
        const fullPathnames = publicPaths.map((p) => 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        pathjoin(cwd, p, pathname));
        try {
            const stat = await multiStat(fullPathnames);
            return {
                modified: stat.mtime.getTime(),
                size: stat.size,
                etag: await fetchEtag(stat.pathname, stat),
                stream: fs.createReadStream(stat.pathname),
            };
        }
        catch (err) {
            if (["ENOENT", "ENOTDIR", "EISDIR", "EINVAL"].includes(err.code)) {
                return null;
            }
            return Promise.reject(err);
        }
    };
};
