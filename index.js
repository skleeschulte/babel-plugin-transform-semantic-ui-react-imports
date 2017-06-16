var path = require('path');
var fs = require('fs');
var dirTree = require('directory-tree');

var cache = {
    jsImports: null,
    lessImports: null
};

/**
 * Throws an Error with a tagged error message.
 * @param msg The error message
 */
function error(msg) {
    throw new Error('[babel-plugin-transform-semantic-ui-react-imports]' + msg);
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
 * @returns {*} An object where the keys are Semantic UI React component names and the values are the corresponding
 * import paths (relative to semantic-ui-react/dist/[import type]/).
 */
function getJsImports() {
    if (cache.jsImports) return cache.jsImports;

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

    var jsImports = {};

    searchFolders.forEach(function(searchFolder) {
        var searchRoot = path.resolve(srcDirPath, searchFolder);

        dirTree(searchRoot, { extensions: /\.js$/ }, function(item) {
            var basename = path.basename(item.path, '.js');

            // skip files that do not start with an uppercase letter
            if (/[^A-Z]/.test(basename[0])) {
                return;
            }

            if (jsImports[basename]) {
                error('duplicate react component name \'' + basename + '\' - probably the plugin needs an update');
            }
            jsImports[basename] = item.path.substring(srcDirPath.length + 1).replace(/\\/g, '/');
        });
    });

    cache.jsImports = jsImports;
    return jsImports;
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

module.exports = function(babel) {
    var types = babel.types;

    var addedLessImports = {};

    return {
        visitor: {
            ImportDeclaration: function(path, state) {
                var sourceRegex = /^(.*!)?semantic-ui-react(\/dist\/[^/]+\/[^/]+\/([^/]+)(\/[^/]*)?)?$/;
                var match = sourceRegex.exec(path.node.source.value);
                var importPrefix = match && match[1] || '';
                var componentFolder = match && match[3];

                // If there is a match, the current import is some kind of semantic-ui-react import.
                if (match) {
                    var convertMemberImports = (state.opts.convertMemberImports !== undefined)
                        ? state.opts.convertMemberImports
                        : true;
                    var importType = state.opts.importType || 'es';
                    var addLessImports = state.opts.addLessImports || false;

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
                            var importPath = jsImports[memberImport.imported.name];

                            if (importPath) {
                                importPath = 'semantic-ui-react/dist/' + importType + '/' + importPath;
                                replaceImports.push(types.importDeclaration(
                                    [types.importDefaultSpecifier(types.identifier(memberImport.local.name))],
                                    types.stringLiteral(importPrefix + importPath)
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
                        var lessImports = getLessImports();

                        var addLessImport = function(component) {
                            component = component.toLowerCase();

                            if (addedLessImports[component]) return;
                            addedLessImports[component] = true;

                            var importPath = lessImports[component];

                            if (importPath) {
                                addImports.push(types.importDeclaration(
                                    [],
                                    types.stringLiteral(importPath)
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
