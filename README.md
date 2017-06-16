# babel-plugin-transform-semantic-ui-react-imports

[![Build Status](https://travis-ci.org/skleeschulte/babel-plugin-transform-semantic-ui-react-imports.svg?branch=master)](https://travis-ci.org/skleeschulte/babel-plugin-transform-semantic-ui-react-imports)

This plugin can convert module imports from `semantic-ui-react` to default imports. Example:

    // Input:
    import { Button, Container } from 'semantic-ui-react';

    // Output:
    import Button from 'semantic-ui-react/dist/es/elements/Button/Button.js';
    import Container from 'semantic-ui-react/dist/es/elements/Container/Container.js';

In addition, the plugin can add import statements for LESS files from `semantic-ui-less`. For the example input above, this would produce:

    import 'semantic-ui-less/definitions/elements/button.less';
    import 'semantic-ui-less/definitions/elements/container.less';

The LESS imports can e.g. be useful in conjunction with Webpack and [semantic-ui-less-module-loader](https://www.npmjs.com/package/semantic-ui-less-module-loader).

Both, the conversion of module imports and adding LESS imports, can be enabled/disabled separately. The import type for default imports can also be configured (e.g. `es` or `commonjs`).

## Installation

    npm install babel-plugin-transform-semantic-ui-react-imports --save-dev

Depending on how you use the plugin, you also need to install [semantic-ui-react](https://www.npmjs.com/package/semantic-ui-react) and/or [semantic-ui-less](https://www.npmjs.com/package/semantic-ui-less) (see below).

## Usage

Add the plugin to your Babel configuration (e.g. in .babelrc):

    {
        "plugins": ["transform-semantic-ui-react-imports"]
    }

### Plugin options

The plugin supports the following options (these are the default values):

    {
        "plugins": [
            [
                "transform-semantic-ui-react-imports", {
                    "convertMemberImports": true,
                    "importType": "es",
                    "addLessImports": false
                }
            ]
        ]
    }

#### convertMemberImports (default: `true`)

If true, member imports from `semantic-ui-react` are converted to default imports.

This requires `semantic-ui-react` to be installed.

#### importType (default: `'es'`)

This is the name of the folder below `semantic-ui-react/dist` that is used for the default imports. `'es'`, `'commonjs'` or `'umd'`.

#### addLessImports (default: `false`)

If true, imports for LESS files from `semantic-ui-less` will be added according to what is required from `semantic-ui-react`. Also works with `convertMemberImports=false`.

This requires `semantic-ui-less` to be installed.

## Running the tests

    git clone https://github.com/skleeschulte/babel-plugin-transform-semantic-ui-react-imports.git
    cd babel-plugin-transform-semantic-ui-react-imports
    npm install
    npm run test