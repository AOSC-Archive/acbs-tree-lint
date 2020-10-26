const lint_spec = function (args) {
    const fs = require('fs');
    const http = require('http');
    const chalk = require('chalk');
    const mylog = require('./mylog.js');
    const config = {};
    config.AttrOrder = ['VER', 'LOCAL_VER', 'REV', 'SUB', 'REL', 'TAG', 'DUMMYSRC', 'SRCS', 'SRCTBL', 'GITSRC', 'GITBRCH', 'GITCO', 'SUBDIR', 'CHKSUM', 'CHKSUMS'];
    config.AttrDeprecated = ['_VER', '_DATE', 'GITBRCH'];
    config.AttrConflictGroups = [['DUMMYSRC', 'SRCS', 'SRCTBL', 'GITSRC']];
    config.AttrDependency = {
        'GITCO': ['GITSRC'],
        'CHKSUM': ['SRCTBL'],
        'CHKSUMS': ['SRCS'],
    };
    config.AttrSpec = {
        'VER': {
            mandatory: true,
        },
        'LOCAL_VER': {
            mandatory: false,
        },
        'REV': {
            mandatory: false,
        },
        'SUB': {
            mandatory: false,
        },
        'DUMMYSRC': {
            mandatory: false,
            match: /^1$/,
            conflictGroup: 0,
        },
        'SRCS': {
            mandatory: false,
            match: /^\".+\"$/,
            conflictGroup: 0,
        },
        'SRCTBL': {
            mandatory: false,
            conflictGroup: 0,
        },
        'GITSRC': {
            mandatory: false,
            conflictGroup: 0,
        },
        'GITCO': {
            mandatory: false,
            conflictGroup: 0,
        },
        'CHKSUM': {
            mandatory: false,
            match: /^\"(sha256\:\:[0-9a-f]{64}|SKIP)\"$/,
        },
        'CHKSUMS': {
            mandatory: false,
        },
    };
    let totalFiles = args.dirsl2.length;
    let processedFiles = 0;
    args.dirsl2.forEach(function (dirl2, i) {
        const padright = function (str, len, pad) {
            return str.length === len ? str : str + new Array(Math.max(3, len - str.length)).fill(pad).join('');
        };
        let path = `${dirl2}/spec`;
        let pkgidBasic = dirl2.slice(2);
        let pkgid = padright(chalk.bold(pkgidBasic), 40 + 8, ' ');

        setTimeout(function () {
            // START INDENT
            fs.readFile(path, function (err, stdin, stderr) {
                if (err) {
                    throw err;
                    process.exit(1);
                }
                const rawContent = stdin.toString().trim().replace(/\n+/g, '\n').split('\n');
                const parsedContent = rawContent
                    .map(function (line, line_i) {
                        // Skip comment
                        if (line[0] === '#') {
                            return {
                                exception: 'LineIsComment',
                            };
                        }
                        // Allow multi-line
                        if (line[0] === ' ' || line[0] === '\t') {
                            if (rawContent[line_i - 1].slice(0).split('').reverse()[0] === '\\') {
                                return {
                                    exception: 'Continuation of multi-line statement',
                                };
                            } else {
                                mylog.fail(`Invalid line (${path}) (${line_i}):\n>Starting with space but last line does not end with backslash.\n> ${line}`);
                            }
                        }
                        let attr = line.match(/^\w+/g)[0];
                        let val = line.replace(attr + '=', '');
                        return {
                            attr: attr,
                            val: val,
                        };
                    })
                    .filter(x => !x.exception);
                let foundAttrs = parsedContent.map(x => x.attr);
                // Check order
                let seenAttrs = [];
                // Literal Dependency
                let knownDependencyProblems = [];
                // Start checking now
                parsedContent.forEach(function (line) {
                    // Deprecated attr
                    if (config.AttrDeprecated.includes(line.attr)) {
                        mylog.warn(`${pkgid} Prop ${line.attr} is deprecated.`);
                    }
                    // Rare attr
                    if (config.AttrOrder.indexOf(line.attr) === -1) {
                        // mylog.warn(`${pkgid} Prop ${line.attr} is rare.`);
                    }
                    // SRCTBL 404/403/500
                    if (line.attr === 'SRCTBL') {
                        let shouldskipsrc404check = false;
                        const parseValStringRecursively = function (inputStr) {
                            return inputStr.replace(/\$\w+/g, function () {
                                    let varname = arguments[0].slice(1);
                                    let val = parsedContent.filter(x => x.attr === varname)[0].val.replace(/\"/g, '');
                                    //mylog.info(`${pkgid} Var ${varname} = ${val}`);
                                    return val;
                                }).replace(/\$\{\w+\}/g, function () {
                                    let varname = arguments[0].replace(/[^\w]/g, '');
                                    let val = parsedContent.filter(x => x.attr === varname)[0].val.replace(/\"/g, '');
                                    return val;
                                }).replace(/\$\{(\w+)\:(\d+)\:(\d+)\}/g, function () {
                                    let varname = arguments[1];
                                    let start = arguments[2];
                                    let end = arguments[3];
                                    let val = parsedContent
                                        .filter(x => x.attr === varname)[0]
                                        .val.replace(/\"/g, '')
                                        .slice(start, end);
                                    return val;
                                }).replace(/\$\{(\w+)\/(.+?)\/(.+?)\}/g, function () {
                                    let varname = arguments[1];
                                    let start = arguments[2].replace(/\\/g, '');
                                    let end = arguments[3];
                                    let val = parsedContent
                                        .filter(x => x.attr === varname)[0]
                                        .val.replace(/\"/g, '')
                                        .replace(start, end);
                                    return val;
                                }).replace(/\$\{.+\}/g, function () {
                                    if (arguments[0].match(/\$\{\}/)) {

                                    }
                                    if (arguments[0] === '${VER//./}') {
                                        let val = parsedContent
                                            .filter(x => x.attr === 'VER')[0]
                                            .val.replace(/\"/g, '')
                                            .replace('.', '');
                                        return val;
                                    }
                                    if (arguments[0] === '${VER%.*}') {
                                        let val = parsedContent
                                            .filter(x => x.attr === 'VER')[0]
                                            .val.replace(/\"/g, '')
                                            .split('.').slice(0,2).join('.');
                                        return val;
                                    }
                                    if (arguments[0] === '${VER:0:-2}') {
                                        let val = parsedContent
                                            .filter(x => x.attr === 'VER')[0]
                                            .val.replace(/\"/g, '');
                                        val = val.slice(val.length-2);
                                        return val;
                                    }
                                    if (arguments[0] === '${VER/\\./}') {
                                        let val = parsedContent
                                            .filter(x => x.attr === 'VER')[0]
                                            .val.replace(/\"/g, '')
                                            .replace(/\./g, '');
                                        return val;
                                    }
                                    mylog.warn(`${pkgid} Unhandled shell string manipulation: ${arguments[0]}`);
                                    shouldskipsrc404check = true;
                                    return arguments[0];
                                });
                        };
                        let statusCode = 0;
                        let currentUrl = line.val.replace(/\"/g, '');
                        for (var ii = 0; ii < 10; ii++) {
                            currentUrl = parseValStringRecursively(currentUrl);
                        }
                        let reCurlCount = 8;
                        let curlProtocols = {
                            http: require('http'),
                            https: require('https'),
                        };
                        const makeRequest = function (url) {
                            shouldskipsrc404check = true;
                            if (shouldskipsrc404check) {
                                return 0;
                            };
                            let protocol = url
                                .toLowerCase()
                                .replace(/\:\/\/.+$/, '')
                                .replace(/[^\w]/g, '');
                            if (!['http', 'https'].includes(protocol)) {
                                mylog.info(`${pkgid} SRCTBL existence verification over ${protocol} is not implemented.`);
                                return 0;
                            }
                            //mylog.info(`${pkgid} Tarbal URL = ${url}`);
                            let req = curlProtocols[protocol].request(url, function (res) {
                                statusCode = res.statusCode;
                                if ([301, 302, 303].includes(statusCode) && res.headers.location && reCurlCount > 0) {
                                    currentUrl = res.headers.location;
                                    reCurlCount += -1;
                                    makeRequest(currentUrl);
                                } else if ([304, 200].includes(statusCode)) {
                                    // OK
                                } else if ([403, 404, 500].includes(statusCode)) {
                                    mylog.fail(`${pkgid} SRCTBL "${currentUrl}" cannot be retrieved (${statusCode}).`);
                                } else {
                                    mylog.warn(`${pkgid} SRCTBL "${currentUrl}" status is weird (${statusCode}).`);
                                }
                            });
                            req.on('error', function (err) {
                                console.log(err);
                            });
                            req.end();
                        };
                        makeRequest(currentUrl);
                    }
                    // Conflict
                    if (
                        config.AttrConflictGroups.map(x => x.join(','))
                            .join(',')
                            .split(',')
                            .includes(line.attr)
                    ) {
                        // console.log(`${pkgid} ${line.attr} is seen.`);
                        let whichConflictGroup = null;
                        config.AttrConflictGroups.forEach(function (group, groupId) {
                            if (group.includes(line.attr)) {
                                whichConflictGroup = groupId;
                            }
                        });
                        config.AttrConflictGroups[whichConflictGroup]
                            .filter(x => x !== line.attr)
                            .forEach(function (conflictCandidate) {
                                if (foundAttrs.includes(conflictCandidate)) {
                                    mylog.fail(`${pkgid} ${line.attr} conflicts with ${conflictCandidate}.`);
                                }
                            });
                    }
                    seenAttrs.push(line.attr);
                    // Literal Dependency
                    if (config.AttrDependency[line.attr]) {
                        config.AttrDependency[line.attr].forEach(function (dependency) {
                            if (foundAttrs.indexOf(dependency) === -1) {
                                // Dependency is not presented before
                                if (line.val === '"SKIP"') {
                                    // mylog.info(`${pkgid} ${line.attr}=${line.val}`)
                                    return 0;
                                }
                                knownDependencyProblems.push({
                                    from: line.attr,
                                    to: dependency,
                                    solved: false,
                                });
                            }
                        });
                    }
                    // Reference Dependency: Define a variable before citing it
                    let citedVarsRaw = line.val.match(/\$\{?\w+/gi);
                    if (citedVarsRaw !== null) {
                        let citedVars = citedVarsRaw.map(x => x.replace(/[^\w]/gi, ''));
                        citedVars.forEach(function (citedVar) {
                            if (seenAttrs.indexOf(citedVar) === -1) {
                                mylog.fail(`${pkgid} ${line.attr} citing undefined ${citedVar}.`);
                            }
                            knownDependencyProblems.forEach(function (item) {
                                if (item.from === citedVar) {
                                    item.solved = true;
                                    item.citedVar = line.attr;
                                }
                            });
                        });
                    }
                });

                // Report literal denpendency problems
                knownDependencyProblems.map(function (item) {
                    if (item.solved) {
                        mylog.info(`${pkgid} ${item.from} has unmet dependency but is used later by ${item.citedVar}.`);
                    } else {
                        mylog.fail(`${pkgid} ${item.from} depends on ${item.to}.`);
                    }
                });

                // End
                processedFiles += 1;
                if (processedFiles === totalFiles) {
                    mylog.printCounts();
                }
            });
            // END INDENT
        }, 5 * i);
    });
};

module.exports = lint_spec;
