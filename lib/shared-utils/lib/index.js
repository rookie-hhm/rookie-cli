'use strict';

const ora = require('ora')
const fs = require('fs')
const _toString = Object.prototype.toString

const NEWLINE = '\n'
const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/
const RE_NEWLINES = /\\n/g
const NEWLINES_MATCH = /\r\n|\n|\r/

function isPlainObject (value) {
  return _toString.call(value) === '[object Object]'
}

function spinnerStart (options) {
  return ora(options).start()
}

// reference https://github.com/motdotla/dotenv/blob/master/lib/main.js
function getKeyValue (keyValueArr, debug = false) {
  if (keyValueArr != null) {
    const key = keyValueArr[1]
    // default undefined or missing values to empty string
    let val = (keyValueArr[2] || '')
    const end = val.length - 1
    const isDoubleQuoted = val[0] === '"' && val[end] === '"'
    const isSingleQuoted = val[0] === "'" && val[end] === "'"
    // if single or double quoted, remove quotes
    if (isSingleQuoted || isDoubleQuoted) {
      val = val.substring(1, end)

      // if double quoted, expand newlines
      if (isDoubleQuoted) {
        val = val.replace(RE_NEWLINES, NEWLINE)
      }
    } else {
      // remove surrounding whitespace
      val = val.trim()
    }
    return { key, val }
  } else if (debug) {
    log.error(`did not match key and value when parsing line ${idx + 1}: ${line}`)
  }
  return null
}
// Parses src into an Object
function parseFile (src /*: string | Buffer */, options) {
  const debug = Boolean(options && options.debug)
  const obj = {}
  // convert Buffers before splitting into lines and processing
  src.toString().split(NEWLINES_MATCH).forEach(function (line, idx) {
    // matching "KEY' and 'VAL' in 'KEY=VAL'
    const keyValueArr = line.match(RE_INI_KEY_VAL)
    // matched?
    const result = getKeyValue(keyValueArr, debug)
    if (result) {
      const { key, val } = result
      obj[key] = val
    }
  })
  return obj
}

function replaceFieldFile (src, matchKey, newVal) {
  let arr = src.toString().split(NEWLINES_MATCH)
  for (let i = 0; i < arr.length; i++) {
    let line = arr[i]
    const keyValueArr = line.match(RE_INI_KEY_VAL)
    // matched?
    const result = getKeyValue(keyValueArr)
    if (result) {
      const { key } = result
      if (key === matchKey) {
        const reg = new RegExp(`${key}=(.*)`)
        line = line.replace(reg, (match, n1) => {
          const length = `${key}=`.length
          const result = match.slice(0, length) + newVal
          return result
        })
        arr[i] = line
        return arr.join('\r\n')
      }
    }
  }
  return arr.join('\r\n')
}

function readFile (src, options = { }) {
  if (fs.existsSync(src)) {
    const buffer = fs.readFileSync(src)
    if (buffer) {
      if (options.format === 'json') {
        return buffer.toJSON()
      } else {
        return buffer.toString()
      }
    } else {
      return null
    }
  }
  return null
}

function writeFile (src, data, options = {}) {
  if (fs.existsSync(src)) {
    fs.writeFileSync(src, data, options)
    return true
  }
  return null
}

module.exports = {
  isPlainObject,
  spinnerStart,
  parseFile,
  replaceFieldFile,
  readFile,
  writeFile
}
