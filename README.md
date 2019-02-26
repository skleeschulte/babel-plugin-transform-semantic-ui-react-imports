# babel-plugin-transform-semantic-ui-react-imports

[![Build Status](https://travis-ci.org/skleeschulte/babel-plugin-transform-semantic-ui-react-imports.svg?branch=master)](https://travis-ci.org/skleeschulte/babel-plugin-transform-semantic-ui-react-imports)

Compatibility notice: As of version 1.4.0 this plugin is compatible with Babel 7. Compatibility with Babel 6 remains intact.

This plugin can convert module imports from `semantic-ui-react` to
default imports. Example:

    // Input:
    import { Button, Container } from 'semantic-ui-react';

    // Output:
    import Button from 'semantic-ui-react/dist/es/elements/Button/Button.js';
    import Container from 'semantic-ui-react/dist/es/elements/Container/Container.js';

In addition, the plugin can add import statements for CSS files from
`semantic-ui-css` and LESS files from `semantic-ui-less`. For the
example input above, this would produce:

    // semantic-ui-css imports:
    import 'semantic-ui-css/components/button.css';
    import 'semantic-ui-css/components/container.css';
    
    // semantic-ui-less imports:
    import 'semantic-ui-less/definitions/elements/button.less';
    import 'semantic-ui-less/definitions/elements/container.less';

The LESS imports can e.g. be useful in conjunction with Webpack and
[semantic-ui-less-module-loader](https://www.npmjs.com/package/semantic-ui-less-module-loader).

Both, the conversion of module imports and adding CSS/LESS imports, can
be enabled/disabled separately. The import type for default imports can
also be configured (e.g. `es` or `commonjs`).

## Example repository

You can find an example of how to use this plugin together with the
semantic-ui-less-module-loader in the
[tailored-semantic-ui-react-bundles-with-webpack](https://github.com/skleeschulte/tailored-semantic-ui-react-bundles-with-webpack)
repository.

## Installation

    npm install babel-plugin-transform-semantic-ui-react-imports --save-dev

Depending on how you use the plugin, you also need to install
[semantic-ui-react](https://www.npmjs.com/package/semantic-ui-react),
[semantic-ui-css](https://www.npmjs.com/package/semantic-ui-css) and/or
[semantic-ui-less](https://www.npmjs.com/package/semantic-ui-less) (see
below).

## Usage

Add the plugin to your Babel configuration (e.g. in .babelrc):

    {
        "plugins": ["transform-semantic-ui-react-imports"]
    }

### Plugin options

The plugin supports the following options (these are the default
values):

    {
        "plugins": [
            [
                "transform-semantic-ui-react-imports", {
                    "convertMemberImports": true,
                    "importType": "es",
                    "addCssImports": false,
                    "importMinifiedCssFiles": false,
                    "addLessImports": false,
                    "addDuplicateStyleImports": false
                }
            ]
        ]
    }

#### convertMemberImports (default: `true`)

If true, member imports from `semantic-ui-react` are converted to
default imports.

This requires `semantic-ui-react` to be installed.

#### importType (default: `'es'`)

This must be either the name of a folder below `semantic-ui-react/dist`
or `src`. `'es'`, `'commonjs'` or `'umd'`:

- `importType='es'` example output:  
  `import Button from 'semantic-ui-react/dist/es/elements/Button/Button.js';`
- `importType='src'` example output:  
  `import Button from 'semantic-ui-react/src/elements/Button/Button.js';`

#### addCssImports (default: `false`)

If true, imports for CSS files from `semantic-ui-css` will be added
according to what is required from `semantic-ui-react`. Also works with
`convertMemberImports=false`.

This requires `semantic-ui-css` to be installed. See *Limitations*
below.

#### importMinifiedCssFiles (default: `false`)

If true, pre-minified CSS files from `semantic-ui-css` will be added
(`semantic-ui-css/components/[COMPONENT].min.css`).

#### addLessImports (default: `false`)

If true, imports for LESS files from `semantic-ui-less` will be added
according to what is required from `semantic-ui-react`. Also works with
`convertMemberImports=false`. See *Limitations* below.

This requires `semantic-ui-less` to be installed.

#### addDuplicateStyleImports (default: `false`)

By default, each style import (css file or less file) will only be added
once. If `addDuplicateStyleImports` is true, style imports will be added
multiple times:

    // Input:
    import { Menu, MenuItem } from 'semantic-ui-react';
    
    // Output:
    import Menu from 'semantic-ui-react/dist/es/collections/Menu/Menu.js';
    import 'semantic-ui-css/components/menu.css';
    import MenuItem from 'semantic-ui-react/dist/es/collections/Menu/MenuItem.js';
    import 'semantic-ui-css/components/menu.css'; // only added if addDuplicateStyleImports is true

### Limitations

When using this plugin to automatically add styles (CSS or LESS), only
imports for files with names equal to the imported semantic-ui-react
module will be added. Additional style dependencies of a
semantic-ui-react module will not be added automatically.

Example:

    import { Dropdown } from 'semantic-ui-react';

With `addLessImports` enabled, the following import will be added:

    import 'semantic-ui-less/definitions/modules/dropdown.less';

The `Dropdown` module from semantic-ui-react also needs
`collections/menu.less` and `modules/transition.less` as well as
`globals/reset.less` and `globals/site.less` from
`semantic-ui-less/definitions/`. These "additional" dependencies have to
be added manually (also see issue #1).

If someone knows a way to obtain a list of all style dependencies of the
semantic-ui-react modules, please let me know!

### Combining with babel-plugin-lodash

[babel-plugin-lodash](https://www.npmjs.com/package/babel-plugin-lodash)
is an alternative to this plugin for cherry-picking imports from
semantic-ui-react. If you are using Webpack 2, I recommend to use
babel-plugin-transform-semantic-ui-react-imports with
`convertMemberImports: true` (default) instead of using
babel-plugin-lodash with `id: ['semantic-ui-react']`. By default,
babel-plugin-transform-semantic-ui-react-imports will generate imports
from semantic-ui-react's es distribution, whereas babel-plugin-lodash
will use the commonjs distribution. When using the es distribution,
Webpack 2 can perform dead-code elimination
([tree shaking](https://webpack.js.org/guides/tree-shaking/)) within
semantic-ui-react, which results in even smaller builds.

If you prefer to use babel-plugin-lodash to convert the imports from
semantic-ui-react and still want to use
babel-plugin-transform-semantic-ui-react-imports to add imports from
semantic-ui-css or semantic-ui-less, this is possible. Example Babel
configuration for adding CSS imports:

    {
        "plugins": [
            ["transform-semantic-ui-react-imports", {
                "convertMemberImports": false,
                "addCssImports": true
            }],
            ["lodash", { "id": ["semantic-ui-react"] }]
        ]
    }

**WARNING: You should not use both plugins to convert member imports
from semantic-ui-react.**

**E.g., do not use the following configuration**:

    {
        "plugins": [
            "transform-semantic-ui-react-imports",
            ["lodash", { "id": ["semantic-ui-react"] }]
        ]
    }

This would transpile the input

    import { Button } from 'semantic-ui-react';`

to the undesired output (on Windows):

    import _Button from 'semantic-ui-react/dist\\commonjs\\elements\\Button/Button'; // generated by babel-plugin-lodash
    import Button from 'semantic-ui-react/dist/es/elements/Button/Button.js'; // generated by babel-plugin-transform-semantic-ui-react-imports


## How it works

### Converting member imports (`convertMemberImports: true`)

The folders addons, behaviors, collections, elements, modules and views
in semantic-ui-react/src are searched for *.js files that have a name
that begins with an uppercase letter. Each file is added to a map, which
then looks like this:

    {
        Confirm: '/addons/Confirm/Confirm.js',
        Portal: '/addons/Portal/Portal.js',
        Radio: '/addons/Radio/Radio.js',
        Select: '/addons/Select/Select.js',
        ...
    }

Together with the `importType` setting, this map is used to get the
import paths for the components, like
`semantic-ui-react/dist/es/addons/Confirm/Confirm.js` for the Confirm
component.

The plugin matches each member import from semantic-ui-react against the
generated map. If an entry is found, the member import is removed and
replaced with a default import with the import path as described above.

### Adding css imports (`addCssImports: true`)

The folder semantic-ui-css/components is searched for .css files to
generate two maps, one for .css files and one for .min.css files:

    {
        unminified: {
            accordion: 'semantic-ui-css/components/accordion.css',
            ad: 'semantic-ui-css/components/ad.css',
            breadcrumb: 'semantic-ui-css/components/breadcrumb.css',
            button: 'semantic-ui-css/components/button.css',
            ...
        }
        minified: {
            accordion: 'semantic-ui-css/components/accordion.min.css',
            ad: 'semantic-ui-css/components/ad.min.css',
            breadcrumb: 'semantic-ui-css/components/breadcrumb.min.css',
            button: 'semantic-ui-css/components/button.min.css',
            ...
        }
    }

Finding the matching css import for an import from semantic-ui-react
works like this:

- If the import statement has member imports, iterate over the member
  imports. For each member import, take the imported name (e.g.
  `BreadcrumbDivider`, get the first element of the camel-cased name
  (e.g. `Breadcrumb`), convert it to lowercase (e.g. `breadcrumb`),
  and look it up in the map.
- If the import statement has only a default import, check if the path
  of the import statement matches either
  `semantic-ui-react/dist/.../.../COMPONENT_FOLDER[/...]` or
  `semantic-ui-react/src/.../COMPONENT_FOLDER[/...]`. If so, convert
  COMPONENT_FOLDER to lowercase and look it up in the map.
  
Lookups respect the `importMinifiedCssFiles` option. If there is a
match, add the css import statement. Each css import is only added once.

### Adding less imports (`addLessImports: true`)

All the `@import` statements in the semantic.less file in the
semantic-ui-less package root are parsed to generate a map which
looks like this:

    {
        reset: 'semantic-ui-less/definitions/globals/reset.less',
        site: 'semantic-ui-less/definitions/globals/site.less',
        button: 'semantic-ui-less/definitions/elements/button.less',
        container: 'semantic-ui-less/definitions/elements/container.less',
        ...
    }

The rest works like when adding css imports (except that there are no
minified versions available).

## Running the tests

    git clone https://github.com/skleeschulte/babel-plugin-transform-semantic-ui-react-imports.git
    cd babel-plugin-transform-semantic-ui-react-imports
    npm install
    npm run test
