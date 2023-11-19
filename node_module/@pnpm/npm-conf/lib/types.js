// Generated with `lib/make.js`
'use strict';
const path = require('path');
const Stream = require('stream').Stream;
const url = require('url');

const Umask = () => {};
const getLocalAddresses = () => [];
const semver = () => {};

exports.types = {
	access: [null, 'restricted', 'public'],
	'allow-same-version': Boolean,
	'always-auth': Boolean,
	also: [null, 'dev', 'development'],
	audit: Boolean,
	'auth-type': ['legacy', 'sso', 'saml', 'oauth'],
	'bin-links': Boolean,
	browser: [null, String],
	ca: [null, String, Array],
	cafile: path,
	cache: path,
	'cache-lock-stale': Number,
	'cache-lock-retries': Number,
	'cache-lock-wait': Number,
	'cache-max': Number,
	'cache-min': Number,
	cert: [null, String],
	cidr: [null, String, Array],
	color: ['always', Boolean],
	depth: Number,
	description: Boolean,
	dev: Boolean,
	'dry-run': Boolean,
	editor: String,
	'engine-strict': Boolean,
	force: Boolean,
	'fetch-retries': Number,
	'fetch-retry-factor': Number,
	'fetch-retry-mintimeout': Number,
	'fetch-retry-maxtimeout': Number,
	git: String,
	'git-tag-version': Boolean,
	'commit-hooks': Boolean,
	global: Boolean,
	globalconfig: path,
	'global-style': Boolean,
	group: [Number, String],
	'https-proxy': [null, url],
	'user-agent': String,
	'ham-it-up': Boolean,
	'heading': String,
	'if-present': Boolean,
	'ignore-prepublish': Boolean,
	'ignore-scripts': Boolean,
	'init-module': path,
	'init-author-name': String,
	'init-author-email': String,
	'init-author-url': ['', url],
	'init-license': String,
	'init-version': semver,
	json: Boolean,
	key: [null, String],
	'legacy-bundling': Boolean,
	link: Boolean,
	// local-address must be listed as an IP for a local network interface
	// must be IPv4 due to node bug
	'local-address': getLocalAddresses(),
	loglevel: ['silent', 'error', 'warn', 'notice', 'http', 'timing', 'info', 'verbose', 'silly'],
	logstream: Stream,
	'logs-max': Number,
	long: Boolean,
	maxsockets: Number,
	message: String,
	'metrics-registry': [null, String],
	'node-options': [null, String],
	'node-version': [null, semver],
	'no-proxy': [null, String, Array],
	offline: Boolean,
	'onload-script': [null, String],
	only: [null, 'dev', 'development', 'prod', 'production'],
	optional: Boolean,
	'package-lock': Boolean,
	otp: [null, String],
	'package-lock-only': Boolean,
	parseable: Boolean,
	'prefer-offline': Boolean,
	'prefer-online': Boolean,
	prefix: path,
	production: Boolean,
	progress: Boolean,
	proxy: [null, false, url],
	provenance: Boolean,
	// allow proxy to be disabled explicitly
	'read-only': Boolean,
	'rebuild-bundle': Boolean,
	registry: [null, url],
	rollback: Boolean,
	save: Boolean,
	'save-bundle': Boolean,
	'save-dev': Boolean,
	'save-exact': Boolean,
	'save-optional': Boolean,
	'save-prefix': String,
	'save-prod': Boolean,
	scope: String,
	'script-shell': [null, String],
	'scripts-prepend-node-path': [false, true, 'auto', 'warn-only'],
	searchopts: String,
	searchexclude: [null, String],
	searchlimit: Number,
	searchstaleness: Number,
	'send-metrics': Boolean,
	shell: String,
	shrinkwrap: Boolean,
	'sign-git-tag': Boolean,
	'sso-poll-frequency': Number,
	'sso-type': [null, 'oauth', 'saml'],
	'strict-ssl': Boolean,
	tag: String,
	timing: Boolean,
	tmp: path,
	unicode: Boolean,
	'unsafe-perm': Boolean,
	usage: Boolean,
	user: [Number, String],
	userconfig: path,
	umask: Umask,
	version: Boolean,
	'tag-version-prefix': String,
	versions: Boolean,
	viewer: String,
	_exit: Boolean
};
