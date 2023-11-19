'use strict';var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}();var _path = require('path');var _path2 = _interopRequireDefault(_path);
var _fs = require('fs');var _fs2 = _interopRequireDefault(_fs);
var _pkgUp = require('eslint-module-utils/pkgUp');var _pkgUp2 = _interopRequireDefault(_pkgUp);
var _minimatch = require('minimatch');var _minimatch2 = _interopRequireDefault(_minimatch);
var _resolve = require('eslint-module-utils/resolve');var _resolve2 = _interopRequireDefault(_resolve);
var _moduleVisitor = require('eslint-module-utils/moduleVisitor');var _moduleVisitor2 = _interopRequireDefault(_moduleVisitor);
var _importType = require('../core/importType');var _importType2 = _interopRequireDefault(_importType);
var _packagePath = require('../core/packagePath');
var _docsUrl = require('../docsUrl');var _docsUrl2 = _interopRequireDefault(_docsUrl);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}

var depFieldCache = new Map();

function hasKeys() {var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return Object.keys(obj).length > 0;
}

function arrayOrKeys(arrayOrObject) {
  return Array.isArray(arrayOrObject) ? arrayOrObject : Object.keys(arrayOrObject);
}

function readJSON(jsonPath, throwException) {
  try {
    return JSON.parse(_fs2['default'].readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    if (throwException) {
      throw err;
    }
  }
}

function extractDepFields(pkg) {
  return {
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {},
    optionalDependencies: pkg.optionalDependencies || {},
    peerDependencies: pkg.peerDependencies || {},
    // BundledDeps should be in the form of an array, but object notation is also supported by
    // `npm`, so we convert it to an array if it is an object
    bundledDependencies: arrayOrKeys(pkg.bundleDependencies || pkg.bundledDependencies || []) };

}

function getPackageDepFields(packageJsonPath, throwAtRead) {
  if (!depFieldCache.has(packageJsonPath)) {
    var depFields = extractDepFields(readJSON(packageJsonPath, throwAtRead));
    depFieldCache.set(packageJsonPath, depFields);
  }

  return depFieldCache.get(packageJsonPath);
}

function getDependencies(context, packageDir) {
  var paths = [];
  try {
    var packageContent = {
      dependencies: {},
      devDependencies: {},
      optionalDependencies: {},
      peerDependencies: {},
      bundledDependencies: [] };


    if (packageDir && packageDir.length > 0) {
      if (!Array.isArray(packageDir)) {
        paths = [_path2['default'].resolve(packageDir)];
      } else {
        paths = packageDir.map(function (dir) {return _path2['default'].resolve(dir);});
      }
    }

    if (paths.length > 0) {
      // use rule config to find package.json
      paths.forEach(function (dir) {
        var packageJsonPath = _path2['default'].join(dir, 'package.json');
        var _packageContent = getPackageDepFields(packageJsonPath, true);
        Object.keys(packageContent).forEach(function (depsKey) {
          Object.assign(packageContent[depsKey], _packageContent[depsKey]);
        });
      });
    } else {
      var packageJsonPath = (0, _pkgUp2['default'])({
        cwd: context.getPhysicalFilename ? context.getPhysicalFilename() : context.getFilename(),
        normalize: false });


      // use closest package.json
      Object.assign(
      packageContent,
      getPackageDepFields(packageJsonPath, false));

    }

    if (![
    packageContent.dependencies,
    packageContent.devDependencies,
    packageContent.optionalDependencies,
    packageContent.peerDependencies,
    packageContent.bundledDependencies].
    some(hasKeys)) {
      return null;
    }

    return packageContent;
  } catch (e) {
    if (paths.length > 0 && e.code === 'ENOENT') {
      context.report({
        message: 'The package.json file could not be found.',
        loc: { line: 0, column: 0 } });

    }
    if (e.name === 'JSONError' || e instanceof SyntaxError) {
      context.report({
        message: 'The package.json file could not be parsed: ' + String(e.message),
        loc: { line: 0, column: 0 } });

    }

    return null;
  }
}

function missingErrorMessage(packageName) {
  return '\'' + String(packageName) + '\' should be listed in the project\'s dependencies. Run \'npm i -S ' + String(packageName) + '\' to add it';
}

function devDepErrorMessage(packageName) {
  return '\'' + String(packageName) + '\' should be listed in the project\'s dependencies, not devDependencies.';
}

function optDepErrorMessage(packageName) {
  return '\'' + String(packageName) + '\' should be listed in the project\'s dependencies, not optionalDependencies.';
}

function getModuleOriginalName(name) {var _name$split =
  name.split('/'),_name$split2 = _slicedToArray(_name$split, 2),first = _name$split2[0],second = _name$split2[1];
  return first.startsWith('@') ? String(first) + '/' + String(second) : first;
}

function getModuleRealName(resolved) {
  return (0, _packagePath.getFilePackageName)(resolved);
}

function checkDependencyDeclaration(deps, packageName, declarationStatus) {
  var newDeclarationStatus = declarationStatus || {
    isInDeps: false,
    isInDevDeps: false,
    isInOptDeps: false,
    isInPeerDeps: false,
    isInBundledDeps: false };


  // in case of sub package.json inside a module
  // check the dependencies on all hierarchy
  var packageHierarchy = [];
  var packageNameParts = packageName ? packageName.split('/') : [];
  packageNameParts.forEach(function (namePart, index) {
    if (!namePart.startsWith('@')) {
      var ancestor = packageNameParts.slice(0, index + 1).join('/');
      packageHierarchy.push(ancestor);
    }
  });

  return packageHierarchy.reduce(function (result, ancestorName) {return {
      isInDeps: result.isInDeps || deps.dependencies[ancestorName] !== undefined,
      isInDevDeps: result.isInDevDeps || deps.devDependencies[ancestorName] !== undefined,
      isInOptDeps: result.isInOptDeps || deps.optionalDependencies[ancestorName] !== undefined,
      isInPeerDeps: result.isInPeerDeps || deps.peerDependencies[ancestorName] !== undefined,
      isInBundledDeps:
      result.isInBundledDeps || deps.bundledDependencies.indexOf(ancestorName) !== -1 };},
  newDeclarationStatus);
}

function reportIfMissing(context, deps, depsOptions, node, name) {
  // Do not report when importing types unless option is enabled
  if (
  !depsOptions.verifyTypeImports && (

  node.importKind === 'type' ||
  node.importKind === 'typeof' ||
  Array.isArray(node.specifiers) && node.specifiers.length && node.specifiers.every(function (specifier) {return specifier.importKind === 'type' || specifier.importKind === 'typeof';})))

  {
    return;
  }

  var typeOfImport = (0, _importType2['default'])(name, context);

  if (
  typeOfImport !== 'external' && (
  typeOfImport !== 'internal' || !depsOptions.verifyInternalDeps))
  {
    return;
  }

  var resolved = (0, _resolve2['default'])(name, context);
  if (!resolved) {return;}

  var importPackageName = getModuleOriginalName(name);
  var declarationStatus = checkDependencyDeclaration(deps, importPackageName);

  if (
  declarationStatus.isInDeps ||
  depsOptions.allowDevDeps && declarationStatus.isInDevDeps ||
  depsOptions.allowPeerDeps && declarationStatus.isInPeerDeps ||
  depsOptions.allowOptDeps && declarationStatus.isInOptDeps ||
  depsOptions.allowBundledDeps && declarationStatus.isInBundledDeps)
  {
    return;
  }

  // test the real name from the resolved package.json
  // if not aliased imports (alias/react for example), importPackageName can be misinterpreted
  var realPackageName = getModuleRealName(resolved);
  if (realPackageName && realPackageName !== importPackageName) {
    declarationStatus = checkDependencyDeclaration(deps, realPackageName, declarationStatus);

    if (
    declarationStatus.isInDeps ||
    depsOptions.allowDevDeps && declarationStatus.isInDevDeps ||
    depsOptions.allowPeerDeps && declarationStatus.isInPeerDeps ||
    depsOptions.allowOptDeps && declarationStatus.isInOptDeps ||
    depsOptions.allowBundledDeps && declarationStatus.isInBundledDeps)
    {
      return;
    }
  }

  if (declarationStatus.isInDevDeps && !depsOptions.allowDevDeps) {
    context.report(node, devDepErrorMessage(realPackageName || importPackageName));
    return;
  }

  if (declarationStatus.isInOptDeps && !depsOptions.allowOptDeps) {
    context.report(node, optDepErrorMessage(realPackageName || importPackageName));
    return;
  }

  context.report(node, missingErrorMessage(realPackageName || importPackageName));
}

function testConfig(config, filename) {
  // Simplest configuration first, either a boolean or nothing.
  if (typeof config === 'boolean' || typeof config === 'undefined') {
    return config;
  }
  // Array of globs.
  return config.some(function (c) {return (0, _minimatch2['default'])(filename, c) ||
    (0, _minimatch2['default'])(filename, _path2['default'].join(process.cwd(), c));});

}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      category: 'Helpful warnings',
      description: 'Forbid the use of extraneous packages.',
      url: (0, _docsUrl2['default'])('no-extraneous-dependencies') },


    schema: [
    {
      type: 'object',
      properties: {
        devDependencies: { type: ['boolean', 'array'] },
        optionalDependencies: { type: ['boolean', 'array'] },
        peerDependencies: { type: ['boolean', 'array'] },
        bundledDependencies: { type: ['boolean', 'array'] },
        packageDir: { type: ['string', 'array'] },
        includeInternal: { type: ['boolean'] },
        includeTypes: { type: ['boolean'] } },

      additionalProperties: false }] },




  create: function () {function create(context) {
      var options = context.options[0] || {};
      var filename = context.getPhysicalFilename ? context.getPhysicalFilename() : context.getFilename();
      var deps = getDependencies(context, options.packageDir) || extractDepFields({});

      var depsOptions = {
        allowDevDeps: testConfig(options.devDependencies, filename) !== false,
        allowOptDeps: testConfig(options.optionalDependencies, filename) !== false,
        allowPeerDeps: testConfig(options.peerDependencies, filename) !== false,
        allowBundledDeps: testConfig(options.bundledDependencies, filename) !== false,
        verifyInternalDeps: !!options.includeInternal,
        verifyTypeImports: !!options.includeTypes };


      return (0, _moduleVisitor2['default'])(function (source, node) {
        reportIfMissing(context, deps, depsOptions, node, source.value);
      }, { commonjs: true });
    }return create;}(),

  'Program:exit': function () {function ProgramExit() {
      depFieldCache.clear();
    }return ProgramExit;}() };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9uby1leHRyYW5lb3VzLWRlcGVuZGVuY2llcy5qcyJdLCJuYW1lcyI6WyJkZXBGaWVsZENhY2hlIiwiTWFwIiwiaGFzS2V5cyIsIm9iaiIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJhcnJheU9yS2V5cyIsImFycmF5T3JPYmplY3QiLCJBcnJheSIsImlzQXJyYXkiLCJyZWFkSlNPTiIsImpzb25QYXRoIiwidGhyb3dFeGNlcHRpb24iLCJKU09OIiwicGFyc2UiLCJmcyIsInJlYWRGaWxlU3luYyIsImVyciIsImV4dHJhY3REZXBGaWVsZHMiLCJwa2ciLCJkZXBlbmRlbmNpZXMiLCJkZXZEZXBlbmRlbmNpZXMiLCJvcHRpb25hbERlcGVuZGVuY2llcyIsInBlZXJEZXBlbmRlbmNpZXMiLCJidW5kbGVkRGVwZW5kZW5jaWVzIiwiYnVuZGxlRGVwZW5kZW5jaWVzIiwiZ2V0UGFja2FnZURlcEZpZWxkcyIsInBhY2thZ2VKc29uUGF0aCIsInRocm93QXRSZWFkIiwiaGFzIiwiZGVwRmllbGRzIiwic2V0IiwiZ2V0IiwiZ2V0RGVwZW5kZW5jaWVzIiwiY29udGV4dCIsInBhY2thZ2VEaXIiLCJwYXRocyIsInBhY2thZ2VDb250ZW50IiwicGF0aCIsInJlc29sdmUiLCJtYXAiLCJkaXIiLCJmb3JFYWNoIiwiam9pbiIsIl9wYWNrYWdlQ29udGVudCIsImRlcHNLZXkiLCJhc3NpZ24iLCJjd2QiLCJnZXRQaHlzaWNhbEZpbGVuYW1lIiwiZ2V0RmlsZW5hbWUiLCJub3JtYWxpemUiLCJzb21lIiwiZSIsImNvZGUiLCJyZXBvcnQiLCJtZXNzYWdlIiwibG9jIiwibGluZSIsImNvbHVtbiIsIm5hbWUiLCJTeW50YXhFcnJvciIsIm1pc3NpbmdFcnJvck1lc3NhZ2UiLCJwYWNrYWdlTmFtZSIsImRldkRlcEVycm9yTWVzc2FnZSIsIm9wdERlcEVycm9yTWVzc2FnZSIsImdldE1vZHVsZU9yaWdpbmFsTmFtZSIsInNwbGl0IiwiZmlyc3QiLCJzZWNvbmQiLCJzdGFydHNXaXRoIiwiZ2V0TW9kdWxlUmVhbE5hbWUiLCJyZXNvbHZlZCIsImNoZWNrRGVwZW5kZW5jeURlY2xhcmF0aW9uIiwiZGVwcyIsImRlY2xhcmF0aW9uU3RhdHVzIiwibmV3RGVjbGFyYXRpb25TdGF0dXMiLCJpc0luRGVwcyIsImlzSW5EZXZEZXBzIiwiaXNJbk9wdERlcHMiLCJpc0luUGVlckRlcHMiLCJpc0luQnVuZGxlZERlcHMiLCJwYWNrYWdlSGllcmFyY2h5IiwicGFja2FnZU5hbWVQYXJ0cyIsIm5hbWVQYXJ0IiwiaW5kZXgiLCJhbmNlc3RvciIsInNsaWNlIiwicHVzaCIsInJlZHVjZSIsInJlc3VsdCIsImFuY2VzdG9yTmFtZSIsInVuZGVmaW5lZCIsImluZGV4T2YiLCJyZXBvcnRJZk1pc3NpbmciLCJkZXBzT3B0aW9ucyIsIm5vZGUiLCJ2ZXJpZnlUeXBlSW1wb3J0cyIsImltcG9ydEtpbmQiLCJzcGVjaWZpZXJzIiwiZXZlcnkiLCJzcGVjaWZpZXIiLCJ0eXBlT2ZJbXBvcnQiLCJ2ZXJpZnlJbnRlcm5hbERlcHMiLCJpbXBvcnRQYWNrYWdlTmFtZSIsImFsbG93RGV2RGVwcyIsImFsbG93UGVlckRlcHMiLCJhbGxvd09wdERlcHMiLCJhbGxvd0J1bmRsZWREZXBzIiwicmVhbFBhY2thZ2VOYW1lIiwidGVzdENvbmZpZyIsImNvbmZpZyIsImZpbGVuYW1lIiwiYyIsInByb2Nlc3MiLCJtb2R1bGUiLCJleHBvcnRzIiwibWV0YSIsInR5cGUiLCJkb2NzIiwiY2F0ZWdvcnkiLCJkZXNjcmlwdGlvbiIsInVybCIsInNjaGVtYSIsInByb3BlcnRpZXMiLCJpbmNsdWRlSW50ZXJuYWwiLCJpbmNsdWRlVHlwZXMiLCJhZGRpdGlvbmFsUHJvcGVydGllcyIsImNyZWF0ZSIsIm9wdGlvbnMiLCJzb3VyY2UiLCJ2YWx1ZSIsImNvbW1vbmpzIiwiY2xlYXIiXSwibWFwcGluZ3MiOiJxb0JBQUEsNEI7QUFDQSx3QjtBQUNBLGtEO0FBQ0Esc0M7QUFDQSxzRDtBQUNBLGtFO0FBQ0EsZ0Q7QUFDQTtBQUNBLHFDOztBQUVBLElBQU1BLGdCQUFnQixJQUFJQyxHQUFKLEVBQXRCOztBQUVBLFNBQVNDLE9BQVQsR0FBMkIsS0FBVkMsR0FBVSx1RUFBSixFQUFJO0FBQ3pCLFNBQU9DLE9BQU9DLElBQVAsQ0FBWUYsR0FBWixFQUFpQkcsTUFBakIsR0FBMEIsQ0FBakM7QUFDRDs7QUFFRCxTQUFTQyxXQUFULENBQXFCQyxhQUFyQixFQUFvQztBQUNsQyxTQUFPQyxNQUFNQyxPQUFOLENBQWNGLGFBQWQsSUFBK0JBLGFBQS9CLEdBQStDSixPQUFPQyxJQUFQLENBQVlHLGFBQVosQ0FBdEQ7QUFDRDs7QUFFRCxTQUFTRyxRQUFULENBQWtCQyxRQUFsQixFQUE0QkMsY0FBNUIsRUFBNEM7QUFDMUMsTUFBSTtBQUNGLFdBQU9DLEtBQUtDLEtBQUwsQ0FBV0MsZ0JBQUdDLFlBQUgsQ0FBZ0JMLFFBQWhCLEVBQTBCLE1BQTFCLENBQVgsQ0FBUDtBQUNELEdBRkQsQ0FFRSxPQUFPTSxHQUFQLEVBQVk7QUFDWixRQUFJTCxjQUFKLEVBQW9CO0FBQ2xCLFlBQU1LLEdBQU47QUFDRDtBQUNGO0FBQ0Y7O0FBRUQsU0FBU0MsZ0JBQVQsQ0FBMEJDLEdBQTFCLEVBQStCO0FBQzdCLFNBQU87QUFDTEMsa0JBQWNELElBQUlDLFlBQUosSUFBb0IsRUFEN0I7QUFFTEMscUJBQWlCRixJQUFJRSxlQUFKLElBQXVCLEVBRm5DO0FBR0xDLDBCQUFzQkgsSUFBSUcsb0JBQUosSUFBNEIsRUFIN0M7QUFJTEMsc0JBQWtCSixJQUFJSSxnQkFBSixJQUF3QixFQUpyQztBQUtMO0FBQ0E7QUFDQUMseUJBQXFCbEIsWUFBWWEsSUFBSU0sa0JBQUosSUFBMEJOLElBQUlLLG1CQUE5QixJQUFxRCxFQUFqRSxDQVBoQixFQUFQOztBQVNEOztBQUVELFNBQVNFLG1CQUFULENBQTZCQyxlQUE3QixFQUE4Q0MsV0FBOUMsRUFBMkQ7QUFDekQsTUFBSSxDQUFDN0IsY0FBYzhCLEdBQWQsQ0FBa0JGLGVBQWxCLENBQUwsRUFBeUM7QUFDdkMsUUFBTUcsWUFBWVosaUJBQWlCUixTQUFTaUIsZUFBVCxFQUEwQkMsV0FBMUIsQ0FBakIsQ0FBbEI7QUFDQTdCLGtCQUFjZ0MsR0FBZCxDQUFrQkosZUFBbEIsRUFBbUNHLFNBQW5DO0FBQ0Q7O0FBRUQsU0FBTy9CLGNBQWNpQyxHQUFkLENBQWtCTCxlQUFsQixDQUFQO0FBQ0Q7O0FBRUQsU0FBU00sZUFBVCxDQUF5QkMsT0FBekIsRUFBa0NDLFVBQWxDLEVBQThDO0FBQzVDLE1BQUlDLFFBQVEsRUFBWjtBQUNBLE1BQUk7QUFDRixRQUFNQyxpQkFBaUI7QUFDckJqQixvQkFBYyxFQURPO0FBRXJCQyx1QkFBaUIsRUFGSTtBQUdyQkMsNEJBQXNCLEVBSEQ7QUFJckJDLHdCQUFrQixFQUpHO0FBS3JCQywyQkFBcUIsRUFMQSxFQUF2Qjs7O0FBUUEsUUFBSVcsY0FBY0EsV0FBVzlCLE1BQVgsR0FBb0IsQ0FBdEMsRUFBeUM7QUFDdkMsVUFBSSxDQUFDRyxNQUFNQyxPQUFOLENBQWMwQixVQUFkLENBQUwsRUFBZ0M7QUFDOUJDLGdCQUFRLENBQUNFLGtCQUFLQyxPQUFMLENBQWFKLFVBQWIsQ0FBRCxDQUFSO0FBQ0QsT0FGRCxNQUVPO0FBQ0xDLGdCQUFRRCxXQUFXSyxHQUFYLENBQWUsVUFBQ0MsR0FBRCxVQUFTSCxrQkFBS0MsT0FBTCxDQUFhRSxHQUFiLENBQVQsRUFBZixDQUFSO0FBQ0Q7QUFDRjs7QUFFRCxRQUFJTCxNQUFNL0IsTUFBTixHQUFlLENBQW5CLEVBQXNCO0FBQ3BCO0FBQ0ErQixZQUFNTSxPQUFOLENBQWMsVUFBQ0QsR0FBRCxFQUFTO0FBQ3JCLFlBQU1kLGtCQUFrQlcsa0JBQUtLLElBQUwsQ0FBVUYsR0FBVixFQUFlLGNBQWYsQ0FBeEI7QUFDQSxZQUFNRyxrQkFBa0JsQixvQkFBb0JDLGVBQXBCLEVBQXFDLElBQXJDLENBQXhCO0FBQ0F4QixlQUFPQyxJQUFQLENBQVlpQyxjQUFaLEVBQTRCSyxPQUE1QixDQUFvQyxVQUFDRyxPQUFELEVBQWE7QUFDL0MxQyxpQkFBTzJDLE1BQVAsQ0FBY1QsZUFBZVEsT0FBZixDQUFkLEVBQXVDRCxnQkFBZ0JDLE9BQWhCLENBQXZDO0FBQ0QsU0FGRDtBQUdELE9BTkQ7QUFPRCxLQVRELE1BU087QUFDTCxVQUFNbEIsa0JBQWtCLHdCQUFNO0FBQzVCb0IsYUFBS2IsUUFBUWMsbUJBQVIsR0FBOEJkLFFBQVFjLG1CQUFSLEVBQTlCLEdBQThEZCxRQUFRZSxXQUFSLEVBRHZDO0FBRTVCQyxtQkFBVyxLQUZpQixFQUFOLENBQXhCOzs7QUFLQTtBQUNBL0MsYUFBTzJDLE1BQVA7QUFDRVQsb0JBREY7QUFFRVgsMEJBQW9CQyxlQUFwQixFQUFxQyxLQUFyQyxDQUZGOztBQUlEOztBQUVELFFBQUksQ0FBQztBQUNIVSxtQkFBZWpCLFlBRFo7QUFFSGlCLG1CQUFlaEIsZUFGWjtBQUdIZ0IsbUJBQWVmLG9CQUhaO0FBSUhlLG1CQUFlZCxnQkFKWjtBQUtIYyxtQkFBZWIsbUJBTFo7QUFNSDJCLFFBTkcsQ0FNRWxELE9BTkYsQ0FBTCxFQU1pQjtBQUNmLGFBQU8sSUFBUDtBQUNEOztBQUVELFdBQU9vQyxjQUFQO0FBQ0QsR0FsREQsQ0FrREUsT0FBT2UsQ0FBUCxFQUFVO0FBQ1YsUUFBSWhCLE1BQU0vQixNQUFOLEdBQWUsQ0FBZixJQUFvQitDLEVBQUVDLElBQUYsS0FBVyxRQUFuQyxFQUE2QztBQUMzQ25CLGNBQVFvQixNQUFSLENBQWU7QUFDYkMsaUJBQVMsMkNBREk7QUFFYkMsYUFBSyxFQUFFQyxNQUFNLENBQVIsRUFBV0MsUUFBUSxDQUFuQixFQUZRLEVBQWY7O0FBSUQ7QUFDRCxRQUFJTixFQUFFTyxJQUFGLEtBQVcsV0FBWCxJQUEwQlAsYUFBYVEsV0FBM0MsRUFBd0Q7QUFDdEQxQixjQUFRb0IsTUFBUixDQUFlO0FBQ2JDLHdFQUF1REgsRUFBRUcsT0FBekQsQ0FEYTtBQUViQyxhQUFLLEVBQUVDLE1BQU0sQ0FBUixFQUFXQyxRQUFRLENBQW5CLEVBRlEsRUFBZjs7QUFJRDs7QUFFRCxXQUFPLElBQVA7QUFDRDtBQUNGOztBQUVELFNBQVNHLG1CQUFULENBQTZCQyxXQUE3QixFQUEwQztBQUN4Qyx1QkFBV0EsV0FBWCxtRkFBeUZBLFdBQXpGO0FBQ0Q7O0FBRUQsU0FBU0Msa0JBQVQsQ0FBNEJELFdBQTVCLEVBQXlDO0FBQ3ZDLHVCQUFXQSxXQUFYO0FBQ0Q7O0FBRUQsU0FBU0Usa0JBQVQsQ0FBNEJGLFdBQTVCLEVBQXlDO0FBQ3ZDLHVCQUFXQSxXQUFYO0FBQ0Q7O0FBRUQsU0FBU0cscUJBQVQsQ0FBK0JOLElBQS9CLEVBQXFDO0FBQ1hBLE9BQUtPLEtBQUwsQ0FBVyxHQUFYLENBRFcsK0NBQzVCQyxLQUQ0QixtQkFDckJDLE1BRHFCO0FBRW5DLFNBQU9ELE1BQU1FLFVBQU4sQ0FBaUIsR0FBakIsV0FBMkJGLEtBQTNCLGlCQUFvQ0MsTUFBcEMsSUFBK0NELEtBQXREO0FBQ0Q7O0FBRUQsU0FBU0csaUJBQVQsQ0FBMkJDLFFBQTNCLEVBQXFDO0FBQ25DLFNBQU8scUNBQW1CQSxRQUFuQixDQUFQO0FBQ0Q7O0FBRUQsU0FBU0MsMEJBQVQsQ0FBb0NDLElBQXBDLEVBQTBDWCxXQUExQyxFQUF1RFksaUJBQXZELEVBQTBFO0FBQ3hFLE1BQU1DLHVCQUF1QkQscUJBQXFCO0FBQ2hERSxjQUFVLEtBRHNDO0FBRWhEQyxpQkFBYSxLQUZtQztBQUdoREMsaUJBQWEsS0FIbUM7QUFJaERDLGtCQUFjLEtBSmtDO0FBS2hEQyxxQkFBaUIsS0FMK0IsRUFBbEQ7OztBQVFBO0FBQ0E7QUFDQSxNQUFNQyxtQkFBbUIsRUFBekI7QUFDQSxNQUFNQyxtQkFBbUJwQixjQUFjQSxZQUFZSSxLQUFaLENBQWtCLEdBQWxCLENBQWQsR0FBdUMsRUFBaEU7QUFDQWdCLG1CQUFpQnhDLE9BQWpCLENBQXlCLFVBQUN5QyxRQUFELEVBQVdDLEtBQVgsRUFBcUI7QUFDNUMsUUFBSSxDQUFDRCxTQUFTZCxVQUFULENBQW9CLEdBQXBCLENBQUwsRUFBK0I7QUFDN0IsVUFBTWdCLFdBQVdILGlCQUFpQkksS0FBakIsQ0FBdUIsQ0FBdkIsRUFBMEJGLFFBQVEsQ0FBbEMsRUFBcUN6QyxJQUFyQyxDQUEwQyxHQUExQyxDQUFqQjtBQUNBc0MsdUJBQWlCTSxJQUFqQixDQUFzQkYsUUFBdEI7QUFDRDtBQUNGLEdBTEQ7O0FBT0EsU0FBT0osaUJBQWlCTyxNQUFqQixDQUF3QixVQUFDQyxNQUFELEVBQVNDLFlBQVQsVUFBMkI7QUFDeERkLGdCQUFVYSxPQUFPYixRQUFQLElBQW1CSCxLQUFLckQsWUFBTCxDQUFrQnNFLFlBQWxCLE1BQW9DQyxTQURUO0FBRXhEZCxtQkFBYVksT0FBT1osV0FBUCxJQUFzQkosS0FBS3BELGVBQUwsQ0FBcUJxRSxZQUFyQixNQUF1Q0MsU0FGbEI7QUFHeERiLG1CQUFhVyxPQUFPWCxXQUFQLElBQXNCTCxLQUFLbkQsb0JBQUwsQ0FBMEJvRSxZQUExQixNQUE0Q0MsU0FIdkI7QUFJeERaLG9CQUFjVSxPQUFPVixZQUFQLElBQXVCTixLQUFLbEQsZ0JBQUwsQ0FBc0JtRSxZQUF0QixNQUF3Q0MsU0FKckI7QUFLeERYO0FBQ0lTLGFBQU9ULGVBQVAsSUFBMEJQLEtBQUtqRCxtQkFBTCxDQUF5Qm9FLE9BQXpCLENBQWlDRixZQUFqQyxNQUFtRCxDQUFDLENBTjFCLEVBQTNCLEVBQXhCO0FBT0hmLHNCQVBHLENBQVA7QUFRRDs7QUFFRCxTQUFTa0IsZUFBVCxDQUF5QjNELE9BQXpCLEVBQWtDdUMsSUFBbEMsRUFBd0NxQixXQUF4QyxFQUFxREMsSUFBckQsRUFBMkRwQyxJQUEzRCxFQUFpRTtBQUMvRDtBQUNBO0FBQ0UsR0FBQ21DLFlBQVlFLGlCQUFiOztBQUVFRCxPQUFLRSxVQUFMLEtBQW9CLE1BQXBCO0FBQ0dGLE9BQUtFLFVBQUwsS0FBb0IsUUFEdkI7QUFFR3pGLFFBQU1DLE9BQU4sQ0FBY3NGLEtBQUtHLFVBQW5CLEtBQWtDSCxLQUFLRyxVQUFMLENBQWdCN0YsTUFBbEQsSUFBNEQwRixLQUFLRyxVQUFMLENBQWdCQyxLQUFoQixDQUFzQixVQUFDQyxTQUFELFVBQWVBLFVBQVVILFVBQVYsS0FBeUIsTUFBekIsSUFBbUNHLFVBQVVILFVBQVYsS0FBeUIsUUFBM0UsRUFBdEIsQ0FKakUsQ0FERjs7QUFPRTtBQUNBO0FBQ0Q7O0FBRUQsTUFBTUksZUFBZSw2QkFBVzFDLElBQVgsRUFBaUJ6QixPQUFqQixDQUFyQjs7QUFFQTtBQUNFbUUsbUJBQWlCLFVBQWpCO0FBQ0lBLG1CQUFpQixVQUFqQixJQUErQixDQUFDUCxZQUFZUSxrQkFEaEQsQ0FERjtBQUdFO0FBQ0E7QUFDRDs7QUFFRCxNQUFNL0IsV0FBVywwQkFBUVosSUFBUixFQUFjekIsT0FBZCxDQUFqQjtBQUNBLE1BQUksQ0FBQ3FDLFFBQUwsRUFBZSxDQUFFLE9BQVM7O0FBRTFCLE1BQU1nQyxvQkFBb0J0QyxzQkFBc0JOLElBQXRCLENBQTFCO0FBQ0EsTUFBSWUsb0JBQW9CRiwyQkFBMkJDLElBQTNCLEVBQWlDOEIsaUJBQWpDLENBQXhCOztBQUVBO0FBQ0U3QixvQkFBa0JFLFFBQWxCO0FBQ0drQixjQUFZVSxZQUFaLElBQTRCOUIsa0JBQWtCRyxXQURqRDtBQUVHaUIsY0FBWVcsYUFBWixJQUE2Qi9CLGtCQUFrQkssWUFGbEQ7QUFHR2UsY0FBWVksWUFBWixJQUE0QmhDLGtCQUFrQkksV0FIakQ7QUFJR2dCLGNBQVlhLGdCQUFaLElBQWdDakMsa0JBQWtCTSxlQUx2RDtBQU1FO0FBQ0E7QUFDRDs7QUFFRDtBQUNBO0FBQ0EsTUFBTTRCLGtCQUFrQnRDLGtCQUFrQkMsUUFBbEIsQ0FBeEI7QUFDQSxNQUFJcUMsbUJBQW1CQSxvQkFBb0JMLGlCQUEzQyxFQUE4RDtBQUM1RDdCLHdCQUFvQkYsMkJBQTJCQyxJQUEzQixFQUFpQ21DLGVBQWpDLEVBQWtEbEMsaUJBQWxELENBQXBCOztBQUVBO0FBQ0VBLHNCQUFrQkUsUUFBbEI7QUFDR2tCLGdCQUFZVSxZQUFaLElBQTRCOUIsa0JBQWtCRyxXQURqRDtBQUVHaUIsZ0JBQVlXLGFBQVosSUFBNkIvQixrQkFBa0JLLFlBRmxEO0FBR0dlLGdCQUFZWSxZQUFaLElBQTRCaEMsa0JBQWtCSSxXQUhqRDtBQUlHZ0IsZ0JBQVlhLGdCQUFaLElBQWdDakMsa0JBQWtCTSxlQUx2RDtBQU1FO0FBQ0E7QUFDRDtBQUNGOztBQUVELE1BQUlOLGtCQUFrQkcsV0FBbEIsSUFBaUMsQ0FBQ2lCLFlBQVlVLFlBQWxELEVBQWdFO0FBQzlEdEUsWUFBUW9CLE1BQVIsQ0FBZXlDLElBQWYsRUFBcUJoQyxtQkFBbUI2QyxtQkFBbUJMLGlCQUF0QyxDQUFyQjtBQUNBO0FBQ0Q7O0FBRUQsTUFBSTdCLGtCQUFrQkksV0FBbEIsSUFBaUMsQ0FBQ2dCLFlBQVlZLFlBQWxELEVBQWdFO0FBQzlEeEUsWUFBUW9CLE1BQVIsQ0FBZXlDLElBQWYsRUFBcUIvQixtQkFBbUI0QyxtQkFBbUJMLGlCQUF0QyxDQUFyQjtBQUNBO0FBQ0Q7O0FBRURyRSxVQUFRb0IsTUFBUixDQUFleUMsSUFBZixFQUFxQmxDLG9CQUFvQitDLG1CQUFtQkwsaUJBQXZDLENBQXJCO0FBQ0Q7O0FBRUQsU0FBU00sVUFBVCxDQUFvQkMsTUFBcEIsRUFBNEJDLFFBQTVCLEVBQXNDO0FBQ3BDO0FBQ0EsTUFBSSxPQUFPRCxNQUFQLEtBQWtCLFNBQWxCLElBQStCLE9BQU9BLE1BQVAsS0FBa0IsV0FBckQsRUFBa0U7QUFDaEUsV0FBT0EsTUFBUDtBQUNEO0FBQ0Q7QUFDQSxTQUFPQSxPQUFPM0QsSUFBUCxDQUFZLFVBQUM2RCxDQUFELFVBQU8sNEJBQVVELFFBQVYsRUFBb0JDLENBQXBCO0FBQ3JCLGdDQUFVRCxRQUFWLEVBQW9CekUsa0JBQUtLLElBQUwsQ0FBVXNFLFFBQVFsRSxHQUFSLEVBQVYsRUFBeUJpRSxDQUF6QixDQUFwQixDQURjLEVBQVosQ0FBUDs7QUFHRDs7QUFFREUsT0FBT0MsT0FBUCxHQUFpQjtBQUNmQyxRQUFNO0FBQ0pDLFVBQU0sU0FERjtBQUVKQyxVQUFNO0FBQ0pDLGdCQUFVLGtCQUROO0FBRUpDLG1CQUFhLHdDQUZUO0FBR0pDLFdBQUssMEJBQVEsNEJBQVIsQ0FIRCxFQUZGOzs7QUFRSkMsWUFBUTtBQUNOO0FBQ0VMLFlBQU0sUUFEUjtBQUVFTSxrQkFBWTtBQUNWdEcseUJBQWlCLEVBQUVnRyxNQUFNLENBQUMsU0FBRCxFQUFZLE9BQVosQ0FBUixFQURQO0FBRVYvRiw4QkFBc0IsRUFBRStGLE1BQU0sQ0FBQyxTQUFELEVBQVksT0FBWixDQUFSLEVBRlo7QUFHVjlGLDBCQUFrQixFQUFFOEYsTUFBTSxDQUFDLFNBQUQsRUFBWSxPQUFaLENBQVIsRUFIUjtBQUlWN0YsNkJBQXFCLEVBQUU2RixNQUFNLENBQUMsU0FBRCxFQUFZLE9BQVosQ0FBUixFQUpYO0FBS1ZsRixvQkFBWSxFQUFFa0YsTUFBTSxDQUFDLFFBQUQsRUFBVyxPQUFYLENBQVIsRUFMRjtBQU1WTyx5QkFBaUIsRUFBRVAsTUFBTSxDQUFDLFNBQUQsQ0FBUixFQU5QO0FBT1ZRLHNCQUFjLEVBQUVSLE1BQU0sQ0FBQyxTQUFELENBQVIsRUFQSixFQUZkOztBQVdFUyw0QkFBc0IsS0FYeEIsRUFETSxDQVJKLEVBRFM7Ozs7O0FBMEJmQyxRQTFCZSwrQkEwQlI3RixPQTFCUSxFQTBCQztBQUNkLFVBQU04RixVQUFVOUYsUUFBUThGLE9BQVIsQ0FBZ0IsQ0FBaEIsS0FBc0IsRUFBdEM7QUFDQSxVQUFNakIsV0FBVzdFLFFBQVFjLG1CQUFSLEdBQThCZCxRQUFRYyxtQkFBUixFQUE5QixHQUE4RGQsUUFBUWUsV0FBUixFQUEvRTtBQUNBLFVBQU13QixPQUFPeEMsZ0JBQWdCQyxPQUFoQixFQUF5QjhGLFFBQVE3RixVQUFqQyxLQUFnRGpCLGlCQUFpQixFQUFqQixDQUE3RDs7QUFFQSxVQUFNNEUsY0FBYztBQUNsQlUsc0JBQWNLLFdBQVdtQixRQUFRM0csZUFBbkIsRUFBb0MwRixRQUFwQyxNQUFrRCxLQUQ5QztBQUVsQkwsc0JBQWNHLFdBQVdtQixRQUFRMUcsb0JBQW5CLEVBQXlDeUYsUUFBekMsTUFBdUQsS0FGbkQ7QUFHbEJOLHVCQUFlSSxXQUFXbUIsUUFBUXpHLGdCQUFuQixFQUFxQ3dGLFFBQXJDLE1BQW1ELEtBSGhEO0FBSWxCSiwwQkFBa0JFLFdBQVdtQixRQUFReEcsbUJBQW5CLEVBQXdDdUYsUUFBeEMsTUFBc0QsS0FKdEQ7QUFLbEJULDRCQUFvQixDQUFDLENBQUMwQixRQUFRSixlQUxaO0FBTWxCNUIsMkJBQW1CLENBQUMsQ0FBQ2dDLFFBQVFILFlBTlgsRUFBcEI7OztBQVNBLGFBQU8sZ0NBQWMsVUFBQ0ksTUFBRCxFQUFTbEMsSUFBVCxFQUFrQjtBQUNyQ0Ysd0JBQWdCM0QsT0FBaEIsRUFBeUJ1QyxJQUF6QixFQUErQnFCLFdBQS9CLEVBQTRDQyxJQUE1QyxFQUFrRGtDLE9BQU9DLEtBQXpEO0FBQ0QsT0FGTSxFQUVKLEVBQUVDLFVBQVUsSUFBWixFQUZJLENBQVA7QUFHRCxLQTNDYzs7QUE2Q2YsZ0JBN0NlLHNDQTZDRTtBQUNmcEksb0JBQWNxSSxLQUFkO0FBQ0QsS0EvQ2Msd0JBQWpCIiwiZmlsZSI6Im5vLWV4dHJhbmVvdXMtZGVwZW5kZW5jaWVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBrZ1VwIGZyb20gJ2VzbGludC1tb2R1bGUtdXRpbHMvcGtnVXAnO1xuaW1wb3J0IG1pbmltYXRjaCBmcm9tICdtaW5pbWF0Y2gnO1xuaW1wb3J0IHJlc29sdmUgZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy9yZXNvbHZlJztcbmltcG9ydCBtb2R1bGVWaXNpdG9yIGZyb20gJ2VzbGludC1tb2R1bGUtdXRpbHMvbW9kdWxlVmlzaXRvcic7XG5pbXBvcnQgaW1wb3J0VHlwZSBmcm9tICcuLi9jb3JlL2ltcG9ydFR5cGUnO1xuaW1wb3J0IHsgZ2V0RmlsZVBhY2thZ2VOYW1lIH0gZnJvbSAnLi4vY29yZS9wYWNrYWdlUGF0aCc7XG5pbXBvcnQgZG9jc1VybCBmcm9tICcuLi9kb2NzVXJsJztcblxuY29uc3QgZGVwRmllbGRDYWNoZSA9IG5ldyBNYXAoKTtcblxuZnVuY3Rpb24gaGFzS2V5cyhvYmogPSB7fSkge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPiAwO1xufVxuXG5mdW5jdGlvbiBhcnJheU9yS2V5cyhhcnJheU9yT2JqZWN0KSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFycmF5T3JPYmplY3QpID8gYXJyYXlPck9iamVjdCA6IE9iamVjdC5rZXlzKGFycmF5T3JPYmplY3QpO1xufVxuXG5mdW5jdGlvbiByZWFkSlNPTihqc29uUGF0aCwgdGhyb3dFeGNlcHRpb24pIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoanNvblBhdGgsICd1dGY4JykpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAodGhyb3dFeGNlcHRpb24pIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZXh0cmFjdERlcEZpZWxkcyhwa2cpIHtcbiAgcmV0dXJuIHtcbiAgICBkZXBlbmRlbmNpZXM6IHBrZy5kZXBlbmRlbmNpZXMgfHwge30sXG4gICAgZGV2RGVwZW5kZW5jaWVzOiBwa2cuZGV2RGVwZW5kZW5jaWVzIHx8IHt9LFxuICAgIG9wdGlvbmFsRGVwZW5kZW5jaWVzOiBwa2cub3B0aW9uYWxEZXBlbmRlbmNpZXMgfHwge30sXG4gICAgcGVlckRlcGVuZGVuY2llczogcGtnLnBlZXJEZXBlbmRlbmNpZXMgfHwge30sXG4gICAgLy8gQnVuZGxlZERlcHMgc2hvdWxkIGJlIGluIHRoZSBmb3JtIG9mIGFuIGFycmF5LCBidXQgb2JqZWN0IG5vdGF0aW9uIGlzIGFsc28gc3VwcG9ydGVkIGJ5XG4gICAgLy8gYG5wbWAsIHNvIHdlIGNvbnZlcnQgaXQgdG8gYW4gYXJyYXkgaWYgaXQgaXMgYW4gb2JqZWN0XG4gICAgYnVuZGxlZERlcGVuZGVuY2llczogYXJyYXlPcktleXMocGtnLmJ1bmRsZURlcGVuZGVuY2llcyB8fCBwa2cuYnVuZGxlZERlcGVuZGVuY2llcyB8fCBbXSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFBhY2thZ2VEZXBGaWVsZHMocGFja2FnZUpzb25QYXRoLCB0aHJvd0F0UmVhZCkge1xuICBpZiAoIWRlcEZpZWxkQ2FjaGUuaGFzKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICBjb25zdCBkZXBGaWVsZHMgPSBleHRyYWN0RGVwRmllbGRzKHJlYWRKU09OKHBhY2thZ2VKc29uUGF0aCwgdGhyb3dBdFJlYWQpKTtcbiAgICBkZXBGaWVsZENhY2hlLnNldChwYWNrYWdlSnNvblBhdGgsIGRlcEZpZWxkcyk7XG4gIH1cblxuICByZXR1cm4gZGVwRmllbGRDYWNoZS5nZXQocGFja2FnZUpzb25QYXRoKTtcbn1cblxuZnVuY3Rpb24gZ2V0RGVwZW5kZW5jaWVzKGNvbnRleHQsIHBhY2thZ2VEaXIpIHtcbiAgbGV0IHBhdGhzID0gW107XG4gIHRyeSB7XG4gICAgY29uc3QgcGFja2FnZUNvbnRlbnQgPSB7XG4gICAgICBkZXBlbmRlbmNpZXM6IHt9LFxuICAgICAgZGV2RGVwZW5kZW5jaWVzOiB7fSxcbiAgICAgIG9wdGlvbmFsRGVwZW5kZW5jaWVzOiB7fSxcbiAgICAgIHBlZXJEZXBlbmRlbmNpZXM6IHt9LFxuICAgICAgYnVuZGxlZERlcGVuZGVuY2llczogW10sXG4gICAgfTtcblxuICAgIGlmIChwYWNrYWdlRGlyICYmIHBhY2thZ2VEaXIubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHBhY2thZ2VEaXIpKSB7XG4gICAgICAgIHBhdGhzID0gW3BhdGgucmVzb2x2ZShwYWNrYWdlRGlyKV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXRocyA9IHBhY2thZ2VEaXIubWFwKChkaXIpID0+IHBhdGgucmVzb2x2ZShkaXIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gdXNlIHJ1bGUgY29uZmlnIHRvIGZpbmQgcGFja2FnZS5qc29uXG4gICAgICBwYXRocy5mb3JFYWNoKChkaXIpID0+IHtcbiAgICAgICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICBjb25zdCBfcGFja2FnZUNvbnRlbnQgPSBnZXRQYWNrYWdlRGVwRmllbGRzKHBhY2thZ2VKc29uUGF0aCwgdHJ1ZSk7XG4gICAgICAgIE9iamVjdC5rZXlzKHBhY2thZ2VDb250ZW50KS5mb3JFYWNoKChkZXBzS2V5KSA9PiB7XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihwYWNrYWdlQ29udGVudFtkZXBzS2V5XSwgX3BhY2thZ2VDb250ZW50W2RlcHNLZXldKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcGtnVXAoe1xuICAgICAgICBjd2Q6IGNvbnRleHQuZ2V0UGh5c2ljYWxGaWxlbmFtZSA/IGNvbnRleHQuZ2V0UGh5c2ljYWxGaWxlbmFtZSgpIDogY29udGV4dC5nZXRGaWxlbmFtZSgpLFxuICAgICAgICBub3JtYWxpemU6IGZhbHNlLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIHVzZSBjbG9zZXN0IHBhY2thZ2UuanNvblxuICAgICAgT2JqZWN0LmFzc2lnbihcbiAgICAgICAgcGFja2FnZUNvbnRlbnQsXG4gICAgICAgIGdldFBhY2thZ2VEZXBGaWVsZHMocGFja2FnZUpzb25QYXRoLCBmYWxzZSksXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghW1xuICAgICAgcGFja2FnZUNvbnRlbnQuZGVwZW5kZW5jaWVzLFxuICAgICAgcGFja2FnZUNvbnRlbnQuZGV2RGVwZW5kZW5jaWVzLFxuICAgICAgcGFja2FnZUNvbnRlbnQub3B0aW9uYWxEZXBlbmRlbmNpZXMsXG4gICAgICBwYWNrYWdlQ29udGVudC5wZWVyRGVwZW5kZW5jaWVzLFxuICAgICAgcGFja2FnZUNvbnRlbnQuYnVuZGxlZERlcGVuZGVuY2llcyxcbiAgICBdLnNvbWUoaGFzS2V5cykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBwYWNrYWdlQ29udGVudDtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChwYXRocy5sZW5ndGggPiAwICYmIGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgICAgbWVzc2FnZTogJ1RoZSBwYWNrYWdlLmpzb24gZmlsZSBjb3VsZCBub3QgYmUgZm91bmQuJyxcbiAgICAgICAgbG9jOiB7IGxpbmU6IDAsIGNvbHVtbjogMCB9LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChlLm5hbWUgPT09ICdKU09ORXJyb3InIHx8IGUgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikge1xuICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICBtZXNzYWdlOiBgVGhlIHBhY2thZ2UuanNvbiBmaWxlIGNvdWxkIG5vdCBiZSBwYXJzZWQ6ICR7ZS5tZXNzYWdlfWAsXG4gICAgICAgIGxvYzogeyBsaW5lOiAwLCBjb2x1bW46IDAgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1pc3NpbmdFcnJvck1lc3NhZ2UocGFja2FnZU5hbWUpIHtcbiAgcmV0dXJuIGAnJHtwYWNrYWdlTmFtZX0nIHNob3VsZCBiZSBsaXN0ZWQgaW4gdGhlIHByb2plY3QncyBkZXBlbmRlbmNpZXMuIFJ1biAnbnBtIGkgLVMgJHtwYWNrYWdlTmFtZX0nIHRvIGFkZCBpdGA7XG59XG5cbmZ1bmN0aW9uIGRldkRlcEVycm9yTWVzc2FnZShwYWNrYWdlTmFtZSkge1xuICByZXR1cm4gYCcke3BhY2thZ2VOYW1lfScgc2hvdWxkIGJlIGxpc3RlZCBpbiB0aGUgcHJvamVjdCdzIGRlcGVuZGVuY2llcywgbm90IGRldkRlcGVuZGVuY2llcy5gO1xufVxuXG5mdW5jdGlvbiBvcHREZXBFcnJvck1lc3NhZ2UocGFja2FnZU5hbWUpIHtcbiAgcmV0dXJuIGAnJHtwYWNrYWdlTmFtZX0nIHNob3VsZCBiZSBsaXN0ZWQgaW4gdGhlIHByb2plY3QncyBkZXBlbmRlbmNpZXMsIG5vdCBvcHRpb25hbERlcGVuZGVuY2llcy5gO1xufVxuXG5mdW5jdGlvbiBnZXRNb2R1bGVPcmlnaW5hbE5hbWUobmFtZSkge1xuICBjb25zdCBbZmlyc3QsIHNlY29uZF0gPSBuYW1lLnNwbGl0KCcvJyk7XG4gIHJldHVybiBmaXJzdC5zdGFydHNXaXRoKCdAJykgPyBgJHtmaXJzdH0vJHtzZWNvbmR9YCA6IGZpcnN0O1xufVxuXG5mdW5jdGlvbiBnZXRNb2R1bGVSZWFsTmFtZShyZXNvbHZlZCkge1xuICByZXR1cm4gZ2V0RmlsZVBhY2thZ2VOYW1lKHJlc29sdmVkKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tEZXBlbmRlbmN5RGVjbGFyYXRpb24oZGVwcywgcGFja2FnZU5hbWUsIGRlY2xhcmF0aW9uU3RhdHVzKSB7XG4gIGNvbnN0IG5ld0RlY2xhcmF0aW9uU3RhdHVzID0gZGVjbGFyYXRpb25TdGF0dXMgfHwge1xuICAgIGlzSW5EZXBzOiBmYWxzZSxcbiAgICBpc0luRGV2RGVwczogZmFsc2UsXG4gICAgaXNJbk9wdERlcHM6IGZhbHNlLFxuICAgIGlzSW5QZWVyRGVwczogZmFsc2UsXG4gICAgaXNJbkJ1bmRsZWREZXBzOiBmYWxzZSxcbiAgfTtcblxuICAvLyBpbiBjYXNlIG9mIHN1YiBwYWNrYWdlLmpzb24gaW5zaWRlIGEgbW9kdWxlXG4gIC8vIGNoZWNrIHRoZSBkZXBlbmRlbmNpZXMgb24gYWxsIGhpZXJhcmNoeVxuICBjb25zdCBwYWNrYWdlSGllcmFyY2h5ID0gW107XG4gIGNvbnN0IHBhY2thZ2VOYW1lUGFydHMgPSBwYWNrYWdlTmFtZSA/IHBhY2thZ2VOYW1lLnNwbGl0KCcvJykgOiBbXTtcbiAgcGFja2FnZU5hbWVQYXJ0cy5mb3JFYWNoKChuYW1lUGFydCwgaW5kZXgpID0+IHtcbiAgICBpZiAoIW5hbWVQYXJ0LnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgY29uc3QgYW5jZXN0b3IgPSBwYWNrYWdlTmFtZVBhcnRzLnNsaWNlKDAsIGluZGV4ICsgMSkuam9pbignLycpO1xuICAgICAgcGFja2FnZUhpZXJhcmNoeS5wdXNoKGFuY2VzdG9yKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBwYWNrYWdlSGllcmFyY2h5LnJlZHVjZSgocmVzdWx0LCBhbmNlc3Rvck5hbWUpID0+ICh7XG4gICAgaXNJbkRlcHM6IHJlc3VsdC5pc0luRGVwcyB8fCBkZXBzLmRlcGVuZGVuY2llc1thbmNlc3Rvck5hbWVdICE9PSB1bmRlZmluZWQsXG4gICAgaXNJbkRldkRlcHM6IHJlc3VsdC5pc0luRGV2RGVwcyB8fCBkZXBzLmRldkRlcGVuZGVuY2llc1thbmNlc3Rvck5hbWVdICE9PSB1bmRlZmluZWQsXG4gICAgaXNJbk9wdERlcHM6IHJlc3VsdC5pc0luT3B0RGVwcyB8fCBkZXBzLm9wdGlvbmFsRGVwZW5kZW5jaWVzW2FuY2VzdG9yTmFtZV0gIT09IHVuZGVmaW5lZCxcbiAgICBpc0luUGVlckRlcHM6IHJlc3VsdC5pc0luUGVlckRlcHMgfHwgZGVwcy5wZWVyRGVwZW5kZW5jaWVzW2FuY2VzdG9yTmFtZV0gIT09IHVuZGVmaW5lZCxcbiAgICBpc0luQnVuZGxlZERlcHM6XG4gICAgICAgIHJlc3VsdC5pc0luQnVuZGxlZERlcHMgfHwgZGVwcy5idW5kbGVkRGVwZW5kZW5jaWVzLmluZGV4T2YoYW5jZXN0b3JOYW1lKSAhPT0gLTEsXG4gIH0pLCBuZXdEZWNsYXJhdGlvblN0YXR1cyk7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydElmTWlzc2luZyhjb250ZXh0LCBkZXBzLCBkZXBzT3B0aW9ucywgbm9kZSwgbmFtZSkge1xuICAvLyBEbyBub3QgcmVwb3J0IHdoZW4gaW1wb3J0aW5nIHR5cGVzIHVubGVzcyBvcHRpb24gaXMgZW5hYmxlZFxuICBpZiAoXG4gICAgIWRlcHNPcHRpb25zLnZlcmlmeVR5cGVJbXBvcnRzXG4gICAgJiYgKFxuICAgICAgbm9kZS5pbXBvcnRLaW5kID09PSAndHlwZSdcbiAgICAgIHx8IG5vZGUuaW1wb3J0S2luZCA9PT0gJ3R5cGVvZidcbiAgICAgIHx8IEFycmF5LmlzQXJyYXkobm9kZS5zcGVjaWZpZXJzKSAmJiBub2RlLnNwZWNpZmllcnMubGVuZ3RoICYmIG5vZGUuc3BlY2lmaWVycy5ldmVyeSgoc3BlY2lmaWVyKSA9PiBzcGVjaWZpZXIuaW1wb3J0S2luZCA9PT0gJ3R5cGUnIHx8IHNwZWNpZmllci5pbXBvcnRLaW5kID09PSAndHlwZW9mJylcbiAgICApXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHR5cGVPZkltcG9ydCA9IGltcG9ydFR5cGUobmFtZSwgY29udGV4dCk7XG5cbiAgaWYgKFxuICAgIHR5cGVPZkltcG9ydCAhPT0gJ2V4dGVybmFsJ1xuICAgICYmICh0eXBlT2ZJbXBvcnQgIT09ICdpbnRlcm5hbCcgfHwgIWRlcHNPcHRpb25zLnZlcmlmeUludGVybmFsRGVwcylcbiAgKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlKG5hbWUsIGNvbnRleHQpO1xuICBpZiAoIXJlc29sdmVkKSB7IHJldHVybjsgfVxuXG4gIGNvbnN0IGltcG9ydFBhY2thZ2VOYW1lID0gZ2V0TW9kdWxlT3JpZ2luYWxOYW1lKG5hbWUpO1xuICBsZXQgZGVjbGFyYXRpb25TdGF0dXMgPSBjaGVja0RlcGVuZGVuY3lEZWNsYXJhdGlvbihkZXBzLCBpbXBvcnRQYWNrYWdlTmFtZSk7XG5cbiAgaWYgKFxuICAgIGRlY2xhcmF0aW9uU3RhdHVzLmlzSW5EZXBzXG4gICAgfHwgZGVwc09wdGlvbnMuYWxsb3dEZXZEZXBzICYmIGRlY2xhcmF0aW9uU3RhdHVzLmlzSW5EZXZEZXBzXG4gICAgfHwgZGVwc09wdGlvbnMuYWxsb3dQZWVyRGVwcyAmJiBkZWNsYXJhdGlvblN0YXR1cy5pc0luUGVlckRlcHNcbiAgICB8fCBkZXBzT3B0aW9ucy5hbGxvd09wdERlcHMgJiYgZGVjbGFyYXRpb25TdGF0dXMuaXNJbk9wdERlcHNcbiAgICB8fCBkZXBzT3B0aW9ucy5hbGxvd0J1bmRsZWREZXBzICYmIGRlY2xhcmF0aW9uU3RhdHVzLmlzSW5CdW5kbGVkRGVwc1xuICApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyB0ZXN0IHRoZSByZWFsIG5hbWUgZnJvbSB0aGUgcmVzb2x2ZWQgcGFja2FnZS5qc29uXG4gIC8vIGlmIG5vdCBhbGlhc2VkIGltcG9ydHMgKGFsaWFzL3JlYWN0IGZvciBleGFtcGxlKSwgaW1wb3J0UGFja2FnZU5hbWUgY2FuIGJlIG1pc2ludGVycHJldGVkXG4gIGNvbnN0IHJlYWxQYWNrYWdlTmFtZSA9IGdldE1vZHVsZVJlYWxOYW1lKHJlc29sdmVkKTtcbiAgaWYgKHJlYWxQYWNrYWdlTmFtZSAmJiByZWFsUGFja2FnZU5hbWUgIT09IGltcG9ydFBhY2thZ2VOYW1lKSB7XG4gICAgZGVjbGFyYXRpb25TdGF0dXMgPSBjaGVja0RlcGVuZGVuY3lEZWNsYXJhdGlvbihkZXBzLCByZWFsUGFja2FnZU5hbWUsIGRlY2xhcmF0aW9uU3RhdHVzKTtcblxuICAgIGlmIChcbiAgICAgIGRlY2xhcmF0aW9uU3RhdHVzLmlzSW5EZXBzXG4gICAgICB8fCBkZXBzT3B0aW9ucy5hbGxvd0RldkRlcHMgJiYgZGVjbGFyYXRpb25TdGF0dXMuaXNJbkRldkRlcHNcbiAgICAgIHx8IGRlcHNPcHRpb25zLmFsbG93UGVlckRlcHMgJiYgZGVjbGFyYXRpb25TdGF0dXMuaXNJblBlZXJEZXBzXG4gICAgICB8fCBkZXBzT3B0aW9ucy5hbGxvd09wdERlcHMgJiYgZGVjbGFyYXRpb25TdGF0dXMuaXNJbk9wdERlcHNcbiAgICAgIHx8IGRlcHNPcHRpb25zLmFsbG93QnVuZGxlZERlcHMgJiYgZGVjbGFyYXRpb25TdGF0dXMuaXNJbkJ1bmRsZWREZXBzXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgaWYgKGRlY2xhcmF0aW9uU3RhdHVzLmlzSW5EZXZEZXBzICYmICFkZXBzT3B0aW9ucy5hbGxvd0RldkRlcHMpIHtcbiAgICBjb250ZXh0LnJlcG9ydChub2RlLCBkZXZEZXBFcnJvck1lc3NhZ2UocmVhbFBhY2thZ2VOYW1lIHx8IGltcG9ydFBhY2thZ2VOYW1lKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKGRlY2xhcmF0aW9uU3RhdHVzLmlzSW5PcHREZXBzICYmICFkZXBzT3B0aW9ucy5hbGxvd09wdERlcHMpIHtcbiAgICBjb250ZXh0LnJlcG9ydChub2RlLCBvcHREZXBFcnJvck1lc3NhZ2UocmVhbFBhY2thZ2VOYW1lIHx8IGltcG9ydFBhY2thZ2VOYW1lKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29udGV4dC5yZXBvcnQobm9kZSwgbWlzc2luZ0Vycm9yTWVzc2FnZShyZWFsUGFja2FnZU5hbWUgfHwgaW1wb3J0UGFja2FnZU5hbWUpKTtcbn1cblxuZnVuY3Rpb24gdGVzdENvbmZpZyhjb25maWcsIGZpbGVuYW1lKSB7XG4gIC8vIFNpbXBsZXN0IGNvbmZpZ3VyYXRpb24gZmlyc3QsIGVpdGhlciBhIGJvb2xlYW4gb3Igbm90aGluZy5cbiAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdib29sZWFuJyB8fCB0eXBlb2YgY29uZmlnID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbiAgLy8gQXJyYXkgb2YgZ2xvYnMuXG4gIHJldHVybiBjb25maWcuc29tZSgoYykgPT4gbWluaW1hdGNoKGZpbGVuYW1lLCBjKVxuICAgIHx8IG1pbmltYXRjaChmaWxlbmFtZSwgcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIGMpKSxcbiAgKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1ldGE6IHtcbiAgICB0eXBlOiAncHJvYmxlbScsXG4gICAgZG9jczoge1xuICAgICAgY2F0ZWdvcnk6ICdIZWxwZnVsIHdhcm5pbmdzJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRm9yYmlkIHRoZSB1c2Ugb2YgZXh0cmFuZW91cyBwYWNrYWdlcy4nLFxuICAgICAgdXJsOiBkb2NzVXJsKCduby1leHRyYW5lb3VzLWRlcGVuZGVuY2llcycpLFxuICAgIH0sXG5cbiAgICBzY2hlbWE6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICBkZXZEZXBlbmRlbmNpZXM6IHsgdHlwZTogWydib29sZWFuJywgJ2FycmF5J10gfSxcbiAgICAgICAgICBvcHRpb25hbERlcGVuZGVuY2llczogeyB0eXBlOiBbJ2Jvb2xlYW4nLCAnYXJyYXknXSB9LFxuICAgICAgICAgIHBlZXJEZXBlbmRlbmNpZXM6IHsgdHlwZTogWydib29sZWFuJywgJ2FycmF5J10gfSxcbiAgICAgICAgICBidW5kbGVkRGVwZW5kZW5jaWVzOiB7IHR5cGU6IFsnYm9vbGVhbicsICdhcnJheSddIH0sXG4gICAgICAgICAgcGFja2FnZURpcjogeyB0eXBlOiBbJ3N0cmluZycsICdhcnJheSddIH0sXG4gICAgICAgICAgaW5jbHVkZUludGVybmFsOiB7IHR5cGU6IFsnYm9vbGVhbiddIH0sXG4gICAgICAgICAgaW5jbHVkZVR5cGVzOiB7IHR5cGU6IFsnYm9vbGVhbiddIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcblxuICBjcmVhdGUoY29udGV4dCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSBjb250ZXh0Lm9wdGlvbnNbMF0gfHwge307XG4gICAgY29uc3QgZmlsZW5hbWUgPSBjb250ZXh0LmdldFBoeXNpY2FsRmlsZW5hbWUgPyBjb250ZXh0LmdldFBoeXNpY2FsRmlsZW5hbWUoKSA6IGNvbnRleHQuZ2V0RmlsZW5hbWUoKTtcbiAgICBjb25zdCBkZXBzID0gZ2V0RGVwZW5kZW5jaWVzKGNvbnRleHQsIG9wdGlvbnMucGFja2FnZURpcikgfHwgZXh0cmFjdERlcEZpZWxkcyh7fSk7XG5cbiAgICBjb25zdCBkZXBzT3B0aW9ucyA9IHtcbiAgICAgIGFsbG93RGV2RGVwczogdGVzdENvbmZpZyhvcHRpb25zLmRldkRlcGVuZGVuY2llcywgZmlsZW5hbWUpICE9PSBmYWxzZSxcbiAgICAgIGFsbG93T3B0RGVwczogdGVzdENvbmZpZyhvcHRpb25zLm9wdGlvbmFsRGVwZW5kZW5jaWVzLCBmaWxlbmFtZSkgIT09IGZhbHNlLFxuICAgICAgYWxsb3dQZWVyRGVwczogdGVzdENvbmZpZyhvcHRpb25zLnBlZXJEZXBlbmRlbmNpZXMsIGZpbGVuYW1lKSAhPT0gZmFsc2UsXG4gICAgICBhbGxvd0J1bmRsZWREZXBzOiB0ZXN0Q29uZmlnKG9wdGlvbnMuYnVuZGxlZERlcGVuZGVuY2llcywgZmlsZW5hbWUpICE9PSBmYWxzZSxcbiAgICAgIHZlcmlmeUludGVybmFsRGVwczogISFvcHRpb25zLmluY2x1ZGVJbnRlcm5hbCxcbiAgICAgIHZlcmlmeVR5cGVJbXBvcnRzOiAhIW9wdGlvbnMuaW5jbHVkZVR5cGVzLFxuICAgIH07XG5cbiAgICByZXR1cm4gbW9kdWxlVmlzaXRvcigoc291cmNlLCBub2RlKSA9PiB7XG4gICAgICByZXBvcnRJZk1pc3NpbmcoY29udGV4dCwgZGVwcywgZGVwc09wdGlvbnMsIG5vZGUsIHNvdXJjZS52YWx1ZSk7XG4gICAgfSwgeyBjb21tb25qczogdHJ1ZSB9KTtcbiAgfSxcblxuICAnUHJvZ3JhbTpleGl0JygpIHtcbiAgICBkZXBGaWVsZENhY2hlLmNsZWFyKCk7XG4gIH0sXG59O1xuIl19