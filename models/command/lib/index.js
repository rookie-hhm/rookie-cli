'use strict';

const { ValidationError } = require('@rookie-cli/validate-on-error')
const log = require('@rookie-cli/log')
class Command {
  constructor (argv) {
    if (!Array.isArray(argv)) {
      throw new Error('argv must be a Array type')
    }
    // reference to lerna
    this._argv = argv
    const runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain = chain.then(() => this.runPrepare())
      chain = chain.then(() => this.runCommand())

      chain.catch(err => {
        log.error('')
        reject(err)
      })
    })
  }
  runPrepare () {
    const [commandName, options, cmdObj] = this._argv
    this.commandName = commandName
    this.options = options
    this.cmdObj = cmdObj
  }
  runCommand() {
    return Promise.resolve()
      .then(() => this.initialize())
      .then(() => this.execute())
  }

  initialize() {
    throw new ValidationError(this.commandName, "initialize() needs to be implemented.");
  }

  execute() {
    throw new ValidationError(this.commandName, "execute() needs to be implemented.");
  }
}

module.exports = Command;