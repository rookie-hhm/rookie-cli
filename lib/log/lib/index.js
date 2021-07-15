'use strict';

const log = require('npmlog')

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'; // 判断debug模式

log.addLevel('success', 2000, { fg: 'green' })
log.heading = 'rookie'
log.headingStyle = { bg: 'black', fg: 'white' }

module.exports = log;