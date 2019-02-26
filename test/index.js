var fs = require('fs');
var path = require('path');
var babel6 = require('babel-core');
var babel7 = require('@babel/core');
var stdout = require('test-console').stdout;
var assert = require('assert');

function alignLines(string) {
    return string.split(/\n/)
        .map(function(line) { return line.trim(); })
        .filter(function(line) { return line !== ''; })
        .join('\n');
}

describe('babel-plugin-transform-semantic-ui-react-imports', function() {
    var fixtures = fs.readdirSync(path.resolve(__dirname, 'fixtures'));

    var babelVersions = [
        { name: "Babel 6", transformFileSync: babel6.transformFileSync, transformSync: babel6.transform },
        { name: "Babel 7", transformFileSync: babel7.transformFileSync, transformSync: babel7.transformSync }
        ];

    babelVersions.forEach(babel => {
        describe(babel.name, function() {
            fixtures.forEach(function(fixture) {
                var fixtureDir = path.resolve(__dirname, 'fixtures', fixture);

                if (path.basename(fixtureDir)[0] === '.' || !fs.statSync(fixtureDir).isDirectory()) return;

                var pluginOptions = require(path.resolve(fixtureDir, 'pluginOptions.json'));
                var sourceFilePath = path.resolve(fixtureDir, 'source.js');
                var expectedOutput = fs.readFileSync(path.resolve(fixtureDir, 'expected.js'), 'utf8');

                it(fixture.replace(/-/g, ' '), function() {
                    var transformed = babel.transformFileSync(sourceFilePath, {
                        babelrc: false,
                        compact: false,
                        plugins: [[path.resolve(__dirname, '../index.js'), pluginOptions]]
                    });

                    assert.equal(
                        alignLines(transformed.code),
                        alignLines(expectedOutput)
                    );
                });
            });

            it('should warn about colliding babel-plugin-lodash usage', function() {
                // test with full plugin name
                var output1 = stdout.inspectSync(function() {
                    babel.transformSync('import all from "semantic-ui-react";', {
                        plugins: [
                            path.resolve(__dirname, '../index.js'),
                            ['babel-plugin-lodash', { 'id': ['semantic-ui-react'] }]
                        ]
                    });
                });

                // test with short plugin name
                var output2 = stdout.inspectSync(function() {
                    babel.transformSync('import all from "semantic-ui-react";', {
                        plugins: [
                            path.resolve(__dirname, '../index.js'),
                            ['lodash', { 'id': ['semantic-ui-react'] }]
                        ]
                    });
                });

                var isOutputOk = function(output) {
                    return (
                        output.length > 0 &&
                        output[0].indexOf('[babel-plugin-transform-semantic-ui-react-imports]') > -1 &&
                        output[0].indexOf('WARNING') > -1 &&
                        output[0].indexOf('You are converting semantic-ui-react imports with this plugin and with ' +
                            'babel-plugin-lodash.') > -1
                    );
                };

                assert(isOutputOk(output1) && isOutputOk(output2));
            });
        });
    });
});
