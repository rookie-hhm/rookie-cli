'use strict';

const { spawn } = require('child_process')
const execa = require('execa')

function spawnProcess (cmd, args, options) {
  // const win32 = process.platform === 'win32'
  // const command = win32 ? 'cmd' : cmd
  // const newArgs = win32 ? ['/c'].concat(cmd, args) : args
  // return spawn(command, newArgs, options)
  return execa(cmd, args, options)
}

async function spawnProcessAsync (cmd, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(cmd, args, options)
    child.on("error", (error) => {
      reject(error)
    })
    child.on('exit', code => {
      resolve(code)
    })
  })
}


module.exports = {
  spawnProcess,
  spawnProcessAsync
}