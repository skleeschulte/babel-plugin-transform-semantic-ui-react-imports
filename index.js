var path = require('path');
var fs = require('fs');
var colors = require('colors/safe');
var dirTree = require('directory-tree');

var TAG = '[babel-plugin-transform-semantic-ui-react-imports]';

var cache = {
    jsImports: {},
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
 * @param foundLodashPluginWithIdSemanticReactUi True if babel-plugin-lodash is mangling semantic-ui-react
 * @param convertMemberImports convertMemberImports setting
 * @param addLessImports addLessImports setting
 */
function checkBabelPluginLodash(foundLodashPluginWithIdSemanticReactUi, convertMemberImports, addLessImports) {
    if (convertMemberImports) {
        if (foundLodashPluginWithIdSemanticReactUi) {
            var msg = 'You are converting semantic-ui-react imports with this plugin and with ' +
                'babel-plugin-lodash. Either remove semantic-ui-react from babel-plugin-lodash\'s id list, ' +
                'or set convertMemberImports to false for this plugin.';

            if (!addLessImports) {
                msg += ' If you choose to set convertMemberImports to false, you can as well remove this ' +
                    'plugin completely, as you are not using the addLessImports option (the plugin would not ' +
                    'have any effect).';
            }

            warn(msg);
        }
    }
}

module.exports = function(babel) {
    var types = babel.types;

    var foundLodashPluginWithIdSemanticReactUi;
    var babelPluginLodashChecked;

    var addedLessImports = {};

    return {
        pre: function(state) {
            const lodashPlugins = state.opts.plugins.filter(function(plugin) {
                return plugin[0].key === 'lodash' || plugin[0].key === 'babel-plugin-lodash';
            });

            foundLodashPluginWithIdSemanticReactUi = false;
            lodashPlugins.forEach(function(lodashPlugin) {
                if (lodashPlugin[1] && lodashPlugin[1].id) {
                    var ids = [].concat(lodashPlugin[1].id);
                    console.log(ids);
                    ids.forEach(function(id) {
                        if (id === 'semantic-ui-react') {
                            foundLodashPluginWithIdSemanticReactUi = true;
                        }
                    });
                }
            });

            babelPluginLodashChecked = false;
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
                    var addLessImports = state.opts.addLessImports || false;

                    if (!babelPluginLodashChecked) {
                        checkBabelPluginLodash(foundLodashPluginWithIdSemanticReactUi, convertMemberImports,
                            addLessImports);
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

                    if (addLessImports) {
                        var componentFolderRegex = /[/\\](src|dist[/\\][^/\\]+)[/\\][^/\\]+[/\\]([^/\\]+)([/\\]|$)/;
                        var componentFolderMatch = componentFolderRegex.exec(importPath);
                        var componentFolder = componentFolderMatch && componentFolderMatch[2];

                        var lessImports = getLessImports();

                        var addLessImport = function(component) {
                            component = component.toLowerCase();

                            if (addedLessImports[component]) return;
                            addedLessImports[component] = true;

                            var lessImportPath = lessImports[component];

                            if (lessImportPath) {
                                addImports.push(types.importDeclaration(
                                    [],
                                    types.stringLiteral(lessImportPath)
                                ));
                            }
                        };

                        if (componentFolder) {
                            addLessImport(componentFolder);
                        } else {
                            memberImports.forEach(function(memberImport) {
                                addLessImport(memberImport.imported.name);
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
