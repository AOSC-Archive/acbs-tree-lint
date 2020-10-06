#!/bin/node

console.log(`============ Welcome to ACBS-TREE-LINT ============`);
const fs = require('fs');
const mylog = require('./libs/mylog.js');
const exec = require('child_process').execSync;

// ----------------------------------------
// Parameters
const LINTER = process.argv[2];

// ----------------------------------------
// Linters
const Linters = {
    spec: require('./libs/spec.js')
};

// ----------------------------------------
// Main
if (!LINTER) {
    mylog.fail('No linter specified.');
}
if (Object.keys(Linters).indexOf(LINTER) !== -1) {
    // Linter exists
    mylog.info(`Running linter "${LINTER}".`);

    const dirsl1 = fs.readdirSync('./').filter(x => x.match(/^\w+-\w+$/));
    const dirsl2 = dirsl1.map(function (dir) {
        return fs.readdirSync(`./${dir}`).map(x => `./${dir}/${x}`).join('\n');
    }).join('\n').split('\n').filter(function (dirl2) {
        let skips = [
            './extra-utils/cpuburn'
        ];
        if (skips.indexOf(dirl2) === -1) {
            return true;
        };
    });

    Linters[LINTER]({
        dirsl2: dirsl2
    });
} else {
    mylog.fail(`Linter ${LINTER} does not exist.`);
    mylog.fail(`Please select among [ ${Object.keys(Linters).join(', ')} ].`);
};
