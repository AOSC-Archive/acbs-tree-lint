const lint_spec = function (args) {
    const fs = require('fs');
    const mylog = require('./mylog.js');
    const config = {};
    config.AttrOrder = [
        'VER', 'LOCAL_VER', 'REV', 'SUB', 'REL', 'TAG',
        'DUMMYSRC', 'SRCS', 'SRCTBL', 'GITSRC', 'GITBRCH', 'GITCO',
        'SUBDIR',
        'CHKSUM', 'CHKSUMS'
    ];
    config.AttrDeprecated = [
        '_VER', '_DATE', 'GITBRCH'
    ];
    config.AttrConflictGroups = [
        [ 'DUMMYSRC', 'SRCS', 'SRCTBL', 'GITSRC' ]
    ];
    config.AttrDependency = {
        'GITCO': [ 'GITSRC' ],
        'CHKSUM': [ 'SRCTBL' ],
        'CHKSUMS': [ 'SRCS' ],
    };
    config.AttrSpec = {
        'VER': {
            mandatory: true
        },
        'LOCAL_VER': {
            mandatory: false
        },
        'REV': {
            mandatory: false
        },
        'SUB': {
            mandatory: false
        },
        'DUMMYSRC': {
            mandatory: false,
            match: /^1$/,
            conflictGroup: 0
        },
        'SRCS': {
            mandatory: false,
            match: /^\".+\"$/,
            conflictGroup: 0
        },
        'SRCTBL': {
            mandatory: false,
            conflictGroup: 0
        },
        'GITSRC': {
            mandatory: false,
            conflictGroup: 0
        },
        'GITCO': {
            mandatory: false,
            conflictGroup: 0
        },
        'CHKSUM': {
            mandatory: false,
            match: /^\"(sha256\:\:[0-9a-f]{64}|SKIP)\"$/
        },
        'CHKSUMS': {
            mandatory: false
        }
    };
    let totalFiles = args.dirsl2.length;
    let processedFiles = 0;
    args.dirsl2.forEach(function (dirl2, i) {
        let path = `${dirl2}/spec`;
        let pkgid = dirl2.slice(2);
        fs.readFile(path, function (err, stdin, stderr) {
            if (err) {
                throw err;
                process.exit(1);
            };
            const rawContent = stdin.toString().trim().replace(/\n+/g, '\n').split('\n');
            const parsedContent = rawContent.map(function (line, line_i) {
                // Skip comment
                if (line[0] === '#') {
                    return {
                        exception: 'LineIsComment'
                    };
                };
                // Allow multi-line
                if (line[0] === ' ' || line[0] === '\t') {
                    if (rawContent[line_i-1].slice(0).split('').reverse()[0] === '\\') {
                        return {
                            exception: 'Continuation of multi-line statement'
                        };
                    } else {
                        mylog.fail(`Invalid line (${path}) (${line_i}):\n>Starting with space but last line does not end with backslash.\n> ${line}`);
                    };
                };
                let attr = line.match(/^\w+/g)[0];
                let val = line.replace(attr + '=', '');
                return {
                    attr: attr,
                    val: val
                };
            }).filter(x => !x.exception);
            let foundAttrs = parsedContent.map(x => x.attr);
            // Check order
            let seenAttrs = [];
            // Literal Dependency
            let knownDependencyProblems = [];
            parsedContent.forEach(function (line) {
                // Deprecated attr
                if (config.AttrDeprecated.includes(line.attr)) {
                    mylog.warn(`${pkgid}:  Prop ${line.attr} is deprecated.`);
                };
                // Rare attr
                if (config.AttrOrder.indexOf(line.attr) === -1) {
                    // mylog.warn(`${pkgid}:  Prop ${line.attr} is rare.`);
                };
                // Conflict
                if (config.AttrConflictGroups.map(x => x.join(',')).join(',').split(',').includes(line.attr)) {
                    // console.log(`${pkgid}:  ${line.attr} is seen.`);
                    let whichConflictGroup = null;
                    config.AttrConflictGroups.forEach(function (group, groupId) {
                        if (group.includes(line.attr)) {
                            whichConflictGroup = groupId;
                        };
                    });
                    config.AttrConflictGroups[whichConflictGroup].filter(x => x !== line.attr).forEach(function (conflictCandidate) {
                        if (foundAttrs.includes(conflictCandidate)) {
                            mylog.fail(`${pkgid}:  ${line.attr} conflicts with ${conflictCandidate}.`);
                        };
                    })
                };
                // Attr order
                if (config.AttrOrder.indexOf(line.attr) !== -1) {
                    // Order spec exists
                    let attrMustBeAfter = config.AttrOrder.slice(0, config.AttrOrder.indexOf(line.attr));
                    let attrMustBeBefore = config.AttrOrder.slice(config.AttrOrder.indexOf(line.attr) + 1);
                        attrMustBeBefore.forEach(function (attrEntry) {
                        if (seenAttrs.indexOf(attrEntry) !== -1) {
                            // Any of the seen attrs appears in `attrMustBeBefore`
                            // mylog.info(`${pkgid}:  Better place ${line.attr} before ${attrEntry}.`);
                        };
                    });
                };
                seenAttrs.push(line.attr);
                // Literal Dependency
                if (config.AttrDependency[line.attr]) {
                    config.AttrDependency[line.attr].forEach(function (dependency) {
                        if (foundAttrs.indexOf(dependency) === -1) {
                            // Dependency is not presented before
                            knownDependencyProblems.push({
                                from: line.attr,
                                to: dependency,
                                solved: false
                            });
                        };
                    });
                };
                // Reference Dependency: Define a variable before citing it
                let citedVarsRaw = line.val.match(/\$\{?\w+/ig);
                if (citedVarsRaw !== null) {
                    let citedVars = citedVarsRaw.map(x => x.replace(/[^\w]/gi, ''));
                    citedVars.forEach(function (citedVar) {
                        if (seenAttrs.indexOf(citedVar) === -1) {
                            mylog.fail(`${pkgid}:  ${line.attr} citing undefined ${citedVar}.`);
                        };
                        knownDependencyProblems.forEach(function (item) {
                            if (item.from === citedVar) {
                                item.solved = true;
                                item.citedVar = line.attr;
                            };
                        });
                    });
                };
            });

            // Report literal denpendency problems
            knownDependencyProblems.map(function (item) {
                if (item.solved) {
                    mylog.info(`${pkgid}:  ${item.from} has unmet dependency but is used later by ${item.citedVar}.`)
                } else {
                    mylog.fail(`${pkgid}:  ${item.from} depends on ${item.to}.`)
                };
            });

            // End
            processedFiles += 1;
            if (processedFiles === totalFiles) {
                mylog.printCounts();
            };
        });
    });
};

module.exports = lint_spec;
