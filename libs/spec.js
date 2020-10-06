const lint_spec = function (args) {
    const fs = require('fs');
    const mylog = require('./mylog.js');
    const config = {};
    config.AttrOrder = [
        '_VER', '_DATE', 'VER', 'LOCAL_VER', 'REV', 'SUB', 'REL', 'TAG', 'DUMMYSRC', 'SRCS', 'SRCTBL', 'GITSRC', 'GITBRCH', 'GITCO', 'CHKSUM', 'CHKSUMS', 'SUBDIR'
    ];
    config.AttrSpec = {
        '_VER': {
            mandatory: false,
            deprecated: true
        },
        '_DATE': {
            mandatory: false,
            deprecated: true
        },
        'VER': {
            mandatory: true,
            match: /^\".+\"$/
        },
        'LOCAL_VER': {
            mandatory: false,
            match: /^\".+\"$/
        },
        'REV': {
            mandatory: false,
            match: /^\d+$/
        },
        'SUB': {
            mandatory: false,
            match: /^\w+$/
        },
        'DUMMYSRC': {
            mandatory: false,
            match: /^1$/,
            conflict: [ 'GITSRC' ],
            among: [ 'SRCTBL', 'GITSRC' ]
        },
        'SRCS': {
            mandatory: false,
            match: /^\".+\"$/,
            conflict: [ 'DUMMYSRC', 'SRCTBL', 'GITSRC' ],
            among: [ 'DUMMYSRC', 'SRCTBL', 'GITSRC' ]
        },
        'SRCTBL': {
            mandatory: false,
            match: /^\".+\"$/,
            conflict: [ 'GITSRC', 'SRCS' ],
            among: [ 'DUMMYSRC', 'GITSRC', 'SRCS' ]
        },
        'GITSRC': {
            mandatory: false,
            match: /^\".+\"$/,
            conflict: [ 'SRCTBL' ],
            among: [ 'DUMMYSRC', 'SRCTBL', 'SRCS' ]
        },
        'GITBRCH': {
            mandatory: false,
            deprecated: true
        },
        'GITCO': {
            mandatory: false,
            match: /^\".+\"$/,
            conflict: [ 'SRCTBL', 'SRCS', 'DUMMYSRC' ],
            depend: [ 'GITSRC' ]
        },
        'CHKSUM': {
            mandatory: true,
            match: /^\"(sha256\:\:[0-9a-f]{64}|SKIP)\"$/
        }
    };
    args.dirsl2.forEach(function (dirl2, i) {
        let path = `${dirl2}/spec`;
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
                    }
                };
                // Allow multi-line
                if (line[0] === ' ' || line[0] === '\t') {
                    if (rawContent[line_i-1].slice(0).split('').reverse()[0] === '\\') {
                        return {
                            exception: 'Continuation of multi-line statement'
                        };
                    } else {
                        mylog.fail(`Invalid line (${path}) (${line_i}):\n> ${line}`);
                    }
                };
                let attr = line.match(/^\w+/g)[0];
                let val = line.replace(attr + '=', '');
                return {
                    attr: attr,
                    val: val
                };
            }).filter(x => !x.exception);
            // Check order
            parsedContent.forEach(function (line) {
                // Deprecated attr
                if (config.AttrSpec[line.attr] && config.AttrSpec[line.attr].deprecated) {
                    mylog.warn(`Prop ${line.attr} is deprecated (${path}).`);
                };
                // Rare attr
                if (config.AttrOrder.indexOf(line.attr) === -1) {
                    mylog.warn(`Prop ${line.attr} is rare (${path}).`);
                };
            })
        });
    });
};

module.exports = lint_spec;
