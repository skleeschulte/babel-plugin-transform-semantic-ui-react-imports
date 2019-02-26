var path = require('path');
var fs = require('fs');
var colors = require('colors/safe');
var dirTree = require('directory-tree');

var TAG = '[babel-plugin-transform-semantic-ui-react-imports]';

var cache = {
    jsImports: {},
    cssImports: null,
    lessImports: null
};

/**
 * Prints a tagged warning message.
 * @param msg The warning message
 */
function warn(msg) {
    console.log(TAG + ' ' + colors.bold.black.bgYellow('WARNING') + ' ' + msg);
}

/**
 * Throws an Error with a tagged error message.
 * @param msg The error message
 */
function error(msg) {
    throw new Error(TAG + ' ' + msg);
}

/**
 * Returns the path to the given package.
 * @param packageName The package name
 * @returns {*} The package path
 */
function getPackagePath(packageName) {
    try {
        return path.dirname(require.resolve(packageName + '/package.json'));
    } catch (e) {
        return null;
    }
}

/**
 * Gathers import paths of Semantic UI React components from semantic-ui-react package folder.
 * @param importType Type of the import (es, commonjs, umd or src).
 * @returns {*} An object where the keys are Semantic UI React component names and the values are the corresponding
 * import paths (relative to semantic-ui-react/dist/[import type]/ or semantic-ui-react/src/ (for importType='src').
 */
function getJsImports(importType) {
    if (cache.jsImports[importType]) {
        return cache.jsImports[importType];
    }

    var unprefixedImports = {};

    if (cache.jsImports._unprefixedImports) {
        unprefixedImports = cache.jsImports._unprefixedImports;
    } else {
        var semanticUiReactPath = getPackagePath('semantic-ui-react');
        if (!semanticUiReactPath) {
            error('Package semantic-ui-react could not be found. Install semantic-ui-react or set convertMemberImports ' +
                'to false.');
        }

        var srcDirPath = path.resolve(semanticUiReactPath, 'src');

        var searchFolders = [
            'addons',
            'behaviors',
            'collections',
            'elements',
            'modules',
            'views'
        ];

        searchFolders.forEach(function (searchFolder) {
            var searchRoot = path.resolve(srcDirPath, searchFolder);

            dirTree(searchRoot, {extensions: /\.js$/}, function (item) {
                var basename = path.basename(item.path, '.js');

                // skip files that do not start with an uppercase letter
                if (/[^A-Z]/.test(basename[0])) {
                    return;
                }

                if (unprefixedImports[basename]) {
                    error('duplicate react component name \'' + basename + '\' - probably the plugin needs an update');
                }
                unprefixedImports[basename] = item.path.substring(srcDirPath.length).replace(/\\/g, '/');
            });
        });

        cache.jsImports._unprefixedImports = unprefixedImports;
    }

    var prefix;
    if (importType === 'src') {
        prefix = '/src';
    } else {
        prefix = '/dist/' + importType;
    }

    cache.jsImports[importType] = {};
    for(var key in unprefixedImports) {
        if (unprefixedImports.hasOwnProperty(key)) {
            cache.jsImports[importType][key] = prefix + unprefixedImports[key];
        }
    }

    return cache.jsImports[importType];
}

/**
 * Gathers import paths for .css files from semantic-ui-css/components
 * @param returnMinified If true, returns import paths for minified css files.
 * @returns {*} An Object where the keys are semantic-ui-css component names and the values are the corresponding import
 * paths.
 */
function getCssImports(returnMinified) {
    var returnVersion = returnMinified ? 'minified' : 'unminified';
    if (cache.cssImports) return cache.cssImports[returnVersion];

    var semanticUiCssPath = getPackagePath('semantic-ui-css');
    if (!semanticUiCssPath) {
        error('Package semantic-ui-css could not be found. Install semantic-ui-css or set addCssImports to false.');
    }

    var componentsDirPath = path.resolve(semanticUiCssPath, 'components');

    var cssImports = {
        unminified: {},
        minified: {}
    };
    var componentFiles = fs.readdirSync(componentsDirPath);
    componentFiles.filter(function(componentFile) {
        return componentFile.match(/\.css$/i);
    }).forEach(function(componentFile) {
        var minified = componentFile.match(/\.min\.css$/i);
        var version = minified ? 'minified' : 'unminified';
        var extension = minified ? '.min.css' : '.css';
        var component = path.basename(componentFile, extension);

        if (cssImports[version][component]) {
            error('duplicate ' + version + ' css component name \'' + component + '\' - probably the plugin needs an ' +
                'update');
        }

        cssImports[version][component] = 'semantic-ui-css/components/' + componentFile;
    });

    cache.cssImports = cssImports;
    return cssImports[returnVersion];
}

/**
 * Extracts import paths for .less files from semantic-ui-less/semantic.less file.
 * @returns {{}} An object where the keys are semantic-ui-less component names and the values are the corresponding
 * import paths.
 */
function getLessImports() {
    if (cache.lessImports) return cache.lessImports;

    var semanticUiLessPath = getPackagePath('semantic-ui-less');
    if (!semanticUiLessPath) {
        error('Package semantic-ui-less could not be found. Install semantic-ui-less or set addLessImports to false.');
    }

    var lessImportsFilePath = path.resolve(semanticUiLessPath, 'semantic.less');
    var lessImportsFile = fs.readFileSync(lessImportsFilePath, 'utf8');

    var importRegex = /@import\s+"([^"]+)"/g;
    var lessImports = {};
    var match;
    while(match = importRegex.exec(lessImportsFile)) {
        var importPath = match[1];
        var component = importPath.substring(importPath.lastIndexOf('/') + 1);
        if (lessImports[component]) {
            error('duplicate less component name \'' + component + '\' - probably the plugin needs an update');
        }
        lessImports[component] = 'semantic-ui-less/' + importPath + '.less';
    }

    cache.lessImports = lessImports;
    return lessImports;
}

/**
 * Checks and warns if babel-plugin-lodash and this plugin are used in a way so that they might likely screw things up.
 * @param foundLodashPluginWithIdSemanticUiReact True if babel-plugin-lodash is mangling semantic-ui-react
 * @param convertMemberImports convertMemberImports setting
 */
function checkBabelPluginLodash(foundLodashPluginWithIdSemanticUiReact, convertMemberImports) {
    if (foundLodashPluginWithIdSemanticUiReact && convertMemberImports) {
        var msg = 'You are converting semantic-ui-react imports with this plugin and with babel-plugin-lodash. ' +
            'You should either remove semantic-ui-react from babel-plugin-lodash\'s id list or set ' +
            'convertMemberImports to false for this plugin. (Also see README file of this plugin.)';

        warn(msg);
    }
}

/**
 * Checks if a babel configuration object matches a lodash plugin with semantic-ui-react in its id option.
 * @param plugin A plugin config obtained from babel's state
 */
function isLodashPluginWithSemanticUiReact(plugin) {
    if (Array.isArray(plugin)) {
        // Babel 6 plugin is a tuple as an array [id, options]
        return (
            ["lodash", "babel-plugin-lodash"].includes(plugin[0].key) &&
            [].concat(plugin[1].id).includes("semantic-ui-react")
        );
    } else if (plugin != null && typeof plugin === "object") {
      // Babel 7 plugin is an object { key, options, ... }
        return (
            /[/\\]node_modules([/\\].*)?[/\\]babel-plugin-lodash([/\\].*)?$/.test(plugin.key) &&
            plugin.options &&
            plugin.options.id &&
            [].concat(plugin.options.id).includes("semantic-ui-react")
        );
    } else {
        return false;
    }
}

module.exports = function(babel) {
    var types = babel.types;

    var addedCssImports;
    var addedLessImports;

    var multipleStyleImportsChecked;

    var foundLodashPluginWithIdSemanticUiReact;
    var babelPluginLodashChecked;

    return {
        pre: function(state) {
            addedCssImports = {};
            addedLessImports = {};

            multipleStyleImportsChecked = false;

            babelPluginLodashChecked = false;
            foundLodashPluginWithIdSemanticUiReact = state.opts.plugins.some(isLodashPluginWithSemanticUiReact);
        },

        visitor: {
            ImportDeclaration: function(path, state) {
                var packageRegex = /^((.*!)?semantic-ui-react)([/\\].*)?$/;
                var match = packageRegex.exec(path.node.source.value);
                var importBase = match && match[1];
                var importPath = match && match[3] || '';

                // If there is a match, the current import is some kind of semantic-ui-react import.
                if (match) {
                    var convertMemberImports = (state.opts.convertMemberImports !== undefined)
                        ? state.opts.convertMemberImports
                        : true;
                    var importType = state.opts.importType || 'es';
                    var addCssImports = state.opts.addCssImports || false;
                    var importMinifiedCssFiles = state.opts.importMinifiedCssFiles || false;
                    var addLessImports = state.opts.addLessImports || false;
                    var addDuplicateStyleImports = state.opts.addDuplicateStyleImports || false;

                    if (!multipleStyleImportsChecked) {
                        if (addCssImports && addLessImports) {
                            warn('The options addCssImports and addLessImports are both enabled. This will add css ' +
                                'imports from semantic-ui-css AND less imports from semantic-ui-less.');
                        }
                        multipleStyleImportsChecked = true;
                    }

                    if (!babelPluginLodashChecked) {
                        checkBabelPluginLodash(foundLodashPluginWithIdSemanticUiReact, convertMemberImports);
                        babelPluginLodashChecked = true;
                    }

                    var defaultImport = path.node.specifiers.filter(function(specifier) {
                        return specifier.type !== 'ImportSpecifier';
                    })[0];
                    var memberImports = path.node.specifiers.filter(function(specifier) {
                        return specifier.type === 'ImportSpecifier';
                    });

                    var replaceImports = [];
                    var addImports = [];

                    if (convertMemberImports && memberImports.length > 0) {
                        var jsImports = getJsImports(importType);

                        var unmodifiedImports = [];

                        if (defaultImport) {
                            unmodifiedImports.push(defaultImport);
                        }

                        // For each member import of a known component, add a separate import statement
                        memberImports.forEach(function(memberImport) {
                            var componentImportPath = jsImports[memberImport.imported.name];

                            if (componentImportPath) {
                                replaceImports.push(types.importDeclaration(
                                    [types.importDefaultSpecifier(types.identifier(memberImport.local.name))],
                                    types.stringLiteral(importBase + componentImportPath)
                                ));
                            } else {
                                unmodifiedImports.push(memberImport);
                            }
                        });

                        if (replaceImports.length > 0 && unmodifiedImports.length > 0) {
                            replaceImports.unshift(types.importDeclaration(
                                unmodifiedImports,
                                types.stringLiteral(path.node.source.value)
                            ));
                        }
                    }

                    // Skip adding style imports if replaceImports.length is > 0. replaceImports.length means that
                    // member imports from semantic-ui-react are replaced with default imports. The plugin will hit the
                    // default imports (as they are inserted after the current node) and can then add the style imports.
                    // Otherwise the style imports would be added twice for the same import statement from
                    // semantic-react-ui if addDuplicateStyleImports is true.
                    if ((addLessImports || addCssImports) && replaceImports.length === 0) {
                        var componentFolderRegex = /[/\\](src|dist[/\\][^/\\]+)[/\\][^/\\]+[/\\]([^/\\]+)([/\\]|$)/;
                        var componentFolderMatch = componentFolderRegex.exec(importPath);
                        var componentFolder = componentFolderMatch && componentFolderMatch[2];

                        var addStyleImports = function(component) {
                            component = component.toLowerCase();

                            if (addCssImports && (addDuplicateStyleImports || !addedCssImports[component])) {
                                addedCssImports[component] = true;

                                var cssImports = getCssImports(importMinifiedCssFiles);
                                var cssImportPath = cssImports[component];

                                if (cssImportPath) {
                                    addImports.push(types.importDeclaration(
                                        [],
                                        types.stringLiteral(cssImportPath)
                                    ));
                                }
                            }

                            if (addLessImports && (addDuplicateStyleImports || !addedLessImports[component])) {
                                addedLessImports[component] = true;

                                var lessImports = getLessImports();
                                var lessImportPath = lessImports[component];

                                if (lessImportPath) {
                                    addImports.push(types.importDeclaration(
                                        [],
                                        types.stringLiteral(lessImportPath)
                                    ));
                                }
                            }
                        };

                        if (componentFolder) {
                            addStyleImports(componentFolder);
                        } else {
                            memberImports.forEach(function(memberImport) {
                                var component = memberImport.imported.name.match(/[A-Z][a-z]+/)[0];
                                addStyleImports(component);
                            });
                        }
                    }

                    addImports = replaceImports.concat(addImports);
                    if (addImports.length > 0) {
                        path.insertAfter(addImports);
                    }
                    if (replaceImports.length > 0) {
                        path.remove();
                    }
                }
            }
        },

        post: function(state) {
            addedLessImports = {};
        }
    };
};
