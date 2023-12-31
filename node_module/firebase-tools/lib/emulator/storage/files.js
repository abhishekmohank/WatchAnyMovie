"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageLayer = exports.StoredFile = void 0;
const fs_1 = require("fs");
const metadata_1 = require("./metadata");
const errors_1 = require("./errors");
const path = require("path");
const fse = require("fs-extra");
const logger_1 = require("../../logger");
const adminSdkConfig_1 = require("../adminSdkConfig");
const types_1 = require("./rules/types");
const upload_1 = require("./upload");
const track_1 = require("../../track");
const types_2 = require("../types");
class StoredFile {
    get metadata() {
        return this._metadata;
    }
    set metadata(value) {
        this._metadata = value;
    }
    constructor(metadata) {
        this.metadata = metadata;
    }
}
exports.StoredFile = StoredFile;
const TRAILING_SLASHES_PATTERN = /\/+$/;
class StorageLayer {
    constructor(_projectId, _files, _buckets, _rulesValidator, _adminCredsValidator, _persistence, _cloudFunctions) {
        this._projectId = _projectId;
        this._files = _files;
        this._buckets = _buckets;
        this._rulesValidator = _rulesValidator;
        this._adminCredsValidator = _adminCredsValidator;
        this._persistence = _persistence;
        this._cloudFunctions = _cloudFunctions;
    }
    createBucket(id) {
        if (!this._buckets.has(id)) {
            this._buckets.set(id, new metadata_1.CloudStorageBucketMetadata(id));
        }
    }
    async listBuckets() {
        if (this._buckets.size === 0) {
            let adminSdkConfig = await (0, adminSdkConfig_1.getProjectAdminSdkConfigOrCached)(this._projectId);
            if (!adminSdkConfig) {
                adminSdkConfig = (0, adminSdkConfig_1.constructDefaultAdminSdkConfig)(this._projectId);
            }
            this.createBucket(adminSdkConfig.storageBucket);
        }
        return [...this._buckets.values()];
    }
    async getObject(request) {
        var _a;
        const metadata = this.getMetadata(request.bucketId, request.decodedObjectId);
        const hasValidDownloadToken = ((metadata === null || metadata === void 0 ? void 0 : metadata.downloadTokens) || []).includes((_a = request.downloadToken) !== null && _a !== void 0 ? _a : "");
        let authorized = hasValidDownloadToken;
        if (!authorized) {
            authorized = await this._rulesValidator.validate(["b", request.bucketId, "o", request.decodedObjectId].join("/"), request.bucketId, types_1.RulesetOperationMethod.GET, { before: metadata === null || metadata === void 0 ? void 0 : metadata.asRulesResource() }, this._projectId, request.authorization);
        }
        if (!authorized) {
            throw new errors_1.ForbiddenError("Failed auth");
        }
        if (!metadata) {
            throw new errors_1.NotFoundError("File not found");
        }
        return { metadata: metadata, data: this.getBytes(request.bucketId, request.decodedObjectId) };
    }
    getMetadata(bucket, object) {
        const key = this.path(bucket, object);
        const val = this._files.get(key);
        if (val) {
            return val.metadata;
        }
        return;
    }
    getBytes(bucket, object, size, offset) {
        const key = this.path(bucket, object);
        const val = this._files.get(key);
        if (val) {
            const len = size ? size : Number(val.metadata.size);
            return this._persistence.readBytes(this.path(bucket, object), len, offset);
        }
        return undefined;
    }
    async deleteObject(request) {
        const storedMetadata = this.getMetadata(request.bucketId, request.decodedObjectId);
        const authorized = await this._rulesValidator.validate(["b", request.bucketId, "o", request.decodedObjectId].join("/"), request.bucketId, types_1.RulesetOperationMethod.DELETE, { before: storedMetadata === null || storedMetadata === void 0 ? void 0 : storedMetadata.asRulesResource() }, this._projectId, request.authorization);
        if (!authorized) {
            throw new errors_1.ForbiddenError();
        }
        if (!storedMetadata) {
            throw new errors_1.NotFoundError();
        }
        this.deleteFile(request.bucketId, request.decodedObjectId);
    }
    deleteFile(bucketId, objectId) {
        const isFolder = objectId.toLowerCase().endsWith("%2f");
        if (isFolder) {
            objectId = objectId.slice(0, -3);
        }
        let filePath = this.path(bucketId, objectId);
        if (isFolder) {
            filePath += "%2F";
        }
        const file = this._files.get(filePath);
        if (file === undefined) {
            return false;
        }
        else {
            this._files.delete(filePath);
            this._persistence.deleteFile(filePath);
            this._cloudFunctions.dispatch("delete", new metadata_1.CloudStorageObjectMetadata(file.metadata));
            return true;
        }
    }
    async updateObjectMetadata(request) {
        const storedMetadata = this.getMetadata(request.bucketId, request.decodedObjectId);
        const authorized = await this._rulesValidator.validate(["b", request.bucketId, "o", request.decodedObjectId].join("/"), request.bucketId, types_1.RulesetOperationMethod.UPDATE, {
            before: storedMetadata === null || storedMetadata === void 0 ? void 0 : storedMetadata.asRulesResource(),
            after: storedMetadata === null || storedMetadata === void 0 ? void 0 : storedMetadata.asRulesResource(request.metadata),
        }, this._projectId, request.authorization);
        if (!authorized) {
            throw new errors_1.ForbiddenError();
        }
        if (!storedMetadata) {
            throw new errors_1.NotFoundError();
        }
        storedMetadata.update(request.metadata);
        return storedMetadata;
    }
    async uploadObject(upload) {
        if (upload.status !== upload_1.UploadStatus.FINISHED) {
            throw new Error(`Unexpected upload status encountered: ${upload.status}.`);
        }
        const storedMetadata = this.getMetadata(upload.bucketId, upload.objectId);
        const filePath = this.path(upload.bucketId, upload.objectId);
        function getIncomingMetadata(field) {
            if (!upload.metadata) {
                return undefined;
            }
            const value = upload.metadata[field];
            return value === null ? undefined : value;
        }
        const metadata = new metadata_1.StoredFileMetadata({
            name: upload.objectId,
            bucket: upload.bucketId,
            contentType: getIncomingMetadata("contentType"),
            contentDisposition: getIncomingMetadata("contentDisposition"),
            contentEncoding: getIncomingMetadata("contentEncoding"),
            contentLanguage: getIncomingMetadata("contentLanguage"),
            cacheControl: getIncomingMetadata("cacheControl"),
            customMetadata: getIncomingMetadata("metadata"),
        }, this._cloudFunctions, this._persistence.readBytes(upload.path, upload.size));
        const authorized = await this._rulesValidator.validate(["b", upload.bucketId, "o", upload.objectId].join("/"), upload.bucketId, types_1.RulesetOperationMethod.CREATE, {
            before: storedMetadata === null || storedMetadata === void 0 ? void 0 : storedMetadata.asRulesResource(),
            after: metadata.asRulesResource(),
        }, this._projectId, upload.authorization);
        if (!authorized) {
            this._persistence.deleteFile(upload.path);
            throw new errors_1.ForbiddenError();
        }
        this._persistence.deleteFile(filePath, true);
        this._persistence.renameFile(upload.path, filePath);
        this._files.set(filePath, new StoredFile(metadata));
        this._cloudFunctions.dispatch("finalize", new metadata_1.CloudStorageObjectMetadata(metadata));
        return metadata;
    }
    copyObject({ sourceBucket, sourceObject, destinationBucket, destinationObject, incomingMetadata, authorization, }) {
        if (!this._adminCredsValidator.validate(authorization)) {
            throw new errors_1.ForbiddenError();
        }
        const sourceMetadata = this.getMetadata(sourceBucket, sourceObject);
        if (!sourceMetadata) {
            throw new errors_1.NotFoundError();
        }
        const sourceBytes = this.getBytes(sourceBucket, sourceObject);
        const destinationFilePath = this.path(destinationBucket, destinationObject);
        this._persistence.deleteFile(destinationFilePath, true);
        this._persistence.appendBytes(destinationFilePath, sourceBytes);
        const newMetadata = Object.assign(Object.assign(Object.assign({}, sourceMetadata), { metadata: sourceMetadata.customMetadata }), incomingMetadata);
        if (sourceMetadata.downloadTokens.length &&
            !((incomingMetadata === null || incomingMetadata === void 0 ? void 0 : incomingMetadata.metadata) && Object.keys(incomingMetadata === null || incomingMetadata === void 0 ? void 0 : incomingMetadata.metadata).length)) {
            if (!newMetadata.metadata)
                newMetadata.metadata = {};
            newMetadata.metadata.firebaseStorageDownloadTokens = sourceMetadata.downloadTokens.join(",");
        }
        if (newMetadata.metadata) {
            for (const [k, v] of Object.entries(newMetadata.metadata)) {
                if (v === null)
                    newMetadata.metadata[k] = "";
            }
        }
        function getMetadata(field) {
            const value = newMetadata[field];
            return value === null ? undefined : value;
        }
        const copiedFileMetadata = new metadata_1.StoredFileMetadata({
            name: destinationObject,
            bucket: destinationBucket,
            contentType: getMetadata("contentType"),
            contentDisposition: getMetadata("contentDisposition"),
            contentEncoding: getMetadata("contentEncoding"),
            contentLanguage: getMetadata("contentLanguage"),
            cacheControl: getMetadata("cacheControl"),
            customMetadata: getMetadata("metadata"),
        }, this._cloudFunctions, sourceBytes);
        const file = new StoredFile(copiedFileMetadata);
        this._files.set(destinationFilePath, file);
        this._cloudFunctions.dispatch("finalize", new metadata_1.CloudStorageObjectMetadata(file.metadata));
        return file.metadata;
    }
    async listObjects(request) {
        var _a;
        const { bucketId, prefix, delimiter, pageToken, authorization } = request;
        const authorized = await this._rulesValidator.validate(["b", bucketId, "o", prefix.replace(TRAILING_SLASHES_PATTERN, "")].join("/"), bucketId, types_1.RulesetOperationMethod.LIST, {}, this._projectId, authorization, delimiter);
        if (!authorized) {
            throw new errors_1.ForbiddenError();
        }
        let items = [];
        const prefixes = new Set();
        for (const [, file] of this._files) {
            if (file.metadata.bucket !== bucketId) {
                continue;
            }
            const name = file.metadata.name;
            if (!name.startsWith(prefix)) {
                continue;
            }
            let includeMetadata = true;
            if (delimiter) {
                const delimiterIdx = name.indexOf(delimiter);
                const delimiterAfterPrefixIdx = name.indexOf(delimiter, prefix.length);
                includeMetadata = delimiterIdx === -1 || delimiterAfterPrefixIdx === -1;
                if (delimiterAfterPrefixIdx !== -1) {
                    prefixes.add(name.slice(0, delimiterAfterPrefixIdx + delimiter.length));
                }
            }
            if (includeMetadata) {
                items.push(file.metadata);
            }
        }
        items.sort((a, b) => {
            if (a.name === b.name) {
                return 0;
            }
            else if (a.name < b.name) {
                return -1;
            }
            else {
                return 1;
            }
        });
        if (pageToken) {
            const idx = items.findIndex((v) => v.name === pageToken);
            if (idx !== -1) {
                items = items.slice(idx);
            }
        }
        const maxResults = (_a = request.maxResults) !== null && _a !== void 0 ? _a : 1000;
        let nextPageToken = undefined;
        if (items.length > maxResults) {
            nextPageToken = items[maxResults].name;
            items = items.slice(0, maxResults);
        }
        return {
            nextPageToken,
            prefixes: prefixes.size > 0 ? [...prefixes].sort() : undefined,
            items: items.length > 0 ? items : undefined,
        };
    }
    createDownloadToken(request) {
        if (!this._adminCredsValidator.validate(request.authorization)) {
            throw new errors_1.ForbiddenError();
        }
        const metadata = this.getMetadata(request.bucketId, request.decodedObjectId);
        if (!metadata) {
            throw new errors_1.NotFoundError();
        }
        metadata.addDownloadToken();
        return metadata;
    }
    deleteDownloadToken(request) {
        if (!this._adminCredsValidator.validate(request.authorization)) {
            throw new errors_1.ForbiddenError();
        }
        const metadata = this.getMetadata(request.bucketId, request.decodedObjectId);
        if (!metadata) {
            throw new errors_1.NotFoundError();
        }
        metadata.deleteDownloadToken(request.token);
        return metadata;
    }
    path(bucket, object) {
        return path.join(bucket, object);
    }
    get dirPath() {
        return this._persistence.dirPath;
    }
    async export(storageExportPath, options) {
        var _a, e_1, _b, _c;
        const bucketsList = {
            buckets: [],
        };
        for (const b of await this.listBuckets()) {
            bucketsList.buckets.push({ id: b.id });
        }
        void (0, track_1.trackEmulator)("emulator_export", {
            initiated_by: options.initiatedBy,
            emulator_name: types_2.Emulators.STORAGE,
            count: bucketsList.buckets.length,
        });
        const bucketsFilePath = path.join(storageExportPath, "buckets.json");
        await fse.writeFile(bucketsFilePath, JSON.stringify(bucketsList, undefined, 2));
        const blobsDirPath = path.join(storageExportPath, "blobs");
        await fse.ensureDir(blobsDirPath);
        const metadataDirPath = path.join(storageExportPath, "metadata");
        await fse.ensureDir(metadataDirPath);
        try {
            for (var _d = true, _e = __asyncValues(this._files.entries()), _f; _f = await _e.next(), _a = _f.done, !_a;) {
                _c = _f.value;
                _d = false;
                try {
                    const [, file] = _c;
                    const diskFileName = this._persistence.getDiskFileName(this.path(file.metadata.bucket, file.metadata.name));
                    await fse.copy(path.join(this.dirPath, diskFileName), path.join(blobsDirPath, diskFileName));
                    const metadataExportPath = path.join(metadataDirPath, encodeURIComponent(diskFileName)) + ".json";
                    await fse.writeFile(metadataExportPath, metadata_1.StoredFileMetadata.toJSON(file.metadata));
                }
                finally {
                    _d = true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    import(storageExportPath, options) {
        const bucketsFile = path.join(storageExportPath, "buckets.json");
        const bucketsList = JSON.parse((0, fs_1.readFileSync)(bucketsFile, "utf-8"));
        void (0, track_1.trackEmulator)("emulator_import", {
            initiated_by: options.initiatedBy,
            emulator_name: types_2.Emulators.STORAGE,
            count: bucketsList.buckets.length,
        });
        for (const b of bucketsList.buckets) {
            const bucketMetadata = new metadata_1.CloudStorageBucketMetadata(b.id);
            this._buckets.set(b.id, bucketMetadata);
        }
        const metadataDir = path.join(storageExportPath, "metadata");
        const blobsDir = path.join(storageExportPath, "blobs");
        if (!(0, fs_1.existsSync)(metadataDir) || !(0, fs_1.existsSync)(blobsDir)) {
            logger_1.logger.warn(`Could not find metadata directory at "${metadataDir}" and/or blobs directory at "${blobsDir}".`);
            return;
        }
        const metadataList = this.walkDirSync(metadataDir);
        const dotJson = ".json";
        for (const f of metadataList) {
            if (path.extname(f) !== dotJson) {
                logger_1.logger.debug(`Skipping unexpected storage metadata file: ${f}`);
                continue;
            }
            const metadata = metadata_1.StoredFileMetadata.fromJSON((0, fs_1.readFileSync)(f, "utf-8"), this._cloudFunctions);
            const metadataRelPath = path.relative(metadataDir, f);
            const blobPath = metadataRelPath.substring(0, metadataRelPath.length - dotJson.length);
            const blobAbsPath = path.join(blobsDir, blobPath);
            if (!(0, fs_1.existsSync)(blobAbsPath)) {
                logger_1.logger.warn(`Could not find file "${blobPath}" in storage export.`);
                continue;
            }
            let fileName = metadata.name;
            const objectNameSep = getPathSep(fileName);
            if (fileName !== path.sep) {
                fileName = fileName.split(objectNameSep).join(path.sep);
            }
            const filepath = this.path(metadata.bucket, fileName);
            this._persistence.copyFromExternalPath(blobAbsPath, filepath);
            this._files.set(filepath, new StoredFile(metadata));
        }
    }
    *walkDirSync(dir) {
        const files = (0, fs_1.readdirSync)(dir);
        for (const file of files) {
            const p = path.join(dir, file);
            if ((0, fs_1.statSync)(p).isDirectory()) {
                yield* this.walkDirSync(p);
            }
            else {
                yield p;
            }
        }
    }
}
exports.StorageLayer = StorageLayer;
function getPathSep(decodedPath) {
    const firstSepIndex = decodedPath.search(/[\/|\\\\]/g);
    return decodedPath[firstSepIndex];
}
