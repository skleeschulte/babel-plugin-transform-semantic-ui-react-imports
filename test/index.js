var fs = require('fs');
var path = require('path');
var babel = require('babel-core');
var assert = require('assert');

function alignLines(string) {
    return string.split(/\n/)
        .map(function(line) { return line.trim(); })
        .filter(function(line) { return line !== ''; })
        .join('\n');
}

describe('babel-plugin-transform-semantic-ui-react-imports', function() {
    var fixtures = fs.readdirSync(path.resolve(__dirname, 'fixtures'));

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
});
