const mylog = {};

mylog.info = function (arg0) {
    const chalk = require('chalk');
    console.log(chalk.bold.green('[INFO] ') + arg0);
    mylog.count('info');
};
mylog.warn = function (arg0) {
    const chalk = require('chalk');
    console.log(chalk.bold.yellow('[WARN] ') + arg0);
    mylog.count('warn');
};
mylog.fail = function (arg0) {
    const chalk = require('chalk');
    console.log(chalk.bold.red('[FAIL] ') + arg0);
    mylog.count('fail');
};

mylog.counterObj = {
    info: 0,
    warn: 0,
    fail: 0,
};

mylog.count = function (type) {
    mylog.counterObj[type] = mylog.counterObj[type] + 1;
};

mylog.printCounts = function (types) {
    console.log(`${mylog.counterObj.warn} warnings and ${mylog.counterObj.fail} failures.`);
};

module.exports = mylog;
