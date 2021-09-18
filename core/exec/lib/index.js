'use strict';

const path = require('path')
const userHome = require('userhome')
const log = require('@rookie-cli/log')
const Package = require('@rookie-cli/package');
const { spawnProcess } = require('@rookie-cli/child-process')
const CMD_MAP = {
  init: '@rookie-cli/init',
  publish: '@rookie-cli/publish'
}

async function exec() {
  // 1 name 2 options 3 cmd
  let targetPath = '', storeDir = ''
  const cmd = arguments[arguments.length - 1]
  if (process.env.CLI_TARGET_PATH) {
    targetPath = process.env.CLI_TARGET_PATH
  } else {
    const userhome = userHome()
    targetPath = path.join(userhome, process.env.CLI_HOME, 'dependencies')
    storeDir = path.join(targetPath, 'node_modules')
  }
  // get commandName
  const cmdName = cmd._name
  // get real packageName
  const name = CMD_MAP[cmdName]
  const version = 'latest'
  // initialize package module
  const pkg = new Package({
    targetPath,
    storeDir,
    name,
    version
  })
  try {
    if (await pkg.exists()) {
      if (storeDir) {
        await pkg.update()
      }
    } else {
      if (storeDir) {
        await pkg.install()
      }
    }
    const execFilePath = pkg.getEntryFile()
    const args = Array.from(arguments)
    const cmdObj = Object.create(null)
    // 删除原型链上的值， 不删除的话，在JSON.stringify时会报错
    for (let key in cmd) {
      if (key !== 'parent' && cmd.hasOwnProperty(key)) {
        cmdObj[key] = cmd[key]
      }
    }
    args[args.length - 1] = cmdObj
    const executeCode = `require('${execFilePath}').call(null, ${JSON.stringify(args)})`
    const child = spawnProcess('node', ['-e', executeCode], {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    child.on('error', e => {
      log.error(e)
      process.exitCode = 1
    })
    child.on('exit', (code, signal) => {
      log.success('command is executed successfully')
      process.exitCode = code
    })
    // require(execFilePath).apply(null, arguments)
  } catch (err) {
    log.error(err.message)
  }
}

module.exports = exec
