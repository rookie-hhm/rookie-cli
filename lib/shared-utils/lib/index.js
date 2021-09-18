'use strict';

const ora = require('ora')
const _toString = Object.prototype.toString

function isPlainObject (value) {
  return _toString.call(value) === '[object Object]'
}

function spinnerStart (options) {
  return ora(options).start()
}

module.exports = {
  isPlainObject,
  spinnerStart
}