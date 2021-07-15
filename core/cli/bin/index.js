#! /usr/bin/env node

const importLocal = require('import-local')
const log = require('@rookie-cli/log')

if (importLocal(__filename)) {
  log.notice('cli', 'using local version cli')
} else {
  require('../lib')()
}