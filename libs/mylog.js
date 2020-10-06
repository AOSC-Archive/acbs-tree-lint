const mylog = {};

mylog.info = function (arg0) {
    const chalk = require('chalk');
    console.log(chalk.green('[INFO] ') + arg0);
};
mylog.warn = function (arg0) {
    const chalk = require('chalk');
    console.log(chalk.yellow('[WARN] ') + arg0);
};
mylog.fail = function (arg0) {
    const chalk = require('chalk');
    console.error(chalk.red('[FAIL] ') + arg0);
};

module.exports = mylog;
