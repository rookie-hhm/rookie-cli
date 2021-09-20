'use strict';

const log = require('@rookie-cli/log')
const Command = require('@rookie-cli/command')
const Git = require('@rookie-cli/git')
const fse = require('fs-extra')
const path = require("path")
const chalk = require("chalk")
class PublishCommand extends Command {
  initialize () {
    this.gitCommandInfo = { options: this.options, cmdObj: this.cmdObj }
  }
  async execute () {
    try {
      // check project
      await this.prepare()
      // git flow
      await this.initGit()
    } catch (err) {
      if (process.env.LOG_LEVEL === 'verbose') {
        log.verbose(err)
      }
      log.error(err.message)
    }
  }
  prepare () {
    // checkNpmProject
    const pkgPath = path.resolve(process.cwd(), 'package.json')
    const isPkgExists = fse.pathExistsSync(pkgPath)
    if (!isPkgExists) {
      throw new Error('Project missing package.json')
    }
    // check required arguments
    const { name, version, scripts } = fse.readJSONSync(pkgPath)
    console.log(name, version, scripts)
    if (!name || !version || !scripts || !scripts.build) {
      throw new Error(`Missing ${chalk.bold.red('name or version or scripts(include build command) field')} in package.json`)
    }
    this.gitInfo = { name, version, scripts, dir: process.cwd() }
  }
  initGit () {
    const gitInstance = new Git(this.gitInfo, this.gitCommandInfo)
    gitInstance.init()
  }
}


function publish (argv) {
  return new PublishCommand(argv)
}

module.exports = publish