'use strict';

const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const inquirer = require('inquirer')
const semver = require('semver')
const chalk = require('chalk')
const userHome = require('userhome')
const ejs = require('ejs')
const glob = require('glob')
const validateNpmName = require('validate-npm-package-name')
const { spawnProcessAsync } = require('@rookie-cli/child-process')
const Command = require('@rookie-cli/command')
const Package = require('@rookie-cli/package')
const { spinnerStart } = require('@rookie-cli/shared-utils')
const { getTemplateInfo } = require('./template')
const log = require('@rookie-cli/log');
const { rejects } = require('assert');

class InitCommand extends Command {
  async initialize () {
    try {
      const result = await this.prepare()
      if (result) {
        await this.downloadTemplate()
        await this.initializeTemplate()
      }
    } catch (err) {
      if (process.env.LOG_LEVEL === 'verbose') {
        log.verbose(err)
      }
      log.error(err.message)
    }
    
  }
  execute () {
  }
  async prepare () {
    const ifContinue = await this.checkEmptyDir()
    // continue to execute
    if (!ifContinue) {
      return false
    }
    if (ifContinue) {
      this.templateInfo = await this.getTemplateInfo()
    }
    return this.templateInfo
  }
  async checkEmptyDir () {
    const cwdPath = process.cwd() || path.resolve('.')
    const { force } = this.options
    if (force) {
      fse.emptyDirSync(cwdPath)
    } else {
      const fileList = fs.readdirSync(cwdPath)
      const isEmpty = !(fileList && fileList.length)
      if (!isEmpty) {
        const { ifContinue } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'ifContinue',
            message: 'The current directory is not empty, clean up ?'
          }
        ])
        if (!ifContinue) return false
        // confirm twice
        const { ifConfirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'ifConfirm',
            message: 'continue to clear current directory and initialize project'
          }
        ])
        if (ifConfirm) {
          fse.emptyDirSync(cwdPath)
        } else {
          return false
        }
      }
    }
    return true
  }
  async getTemplateInfo () { // select project or component base info
    // project or component
    //  select type
    const { initializationType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'initializationType',
        message: 'choose initializationType',
        choices: [
          { name: 'project', value: 'project' },
          { name: 'component', value: 'component' }
        ]
      }
    ])
    // get remoteTemplateInfo
    if (initializationType === 'project') {
      this.remoteTemplateInfo = await getTemplateInfo('project')
    } else {
      this.remoteTemplateInfo = await getTemplateInfo('component')
    }
    // check remoteTemplateInfo
    if (!this.remoteTemplateInfo || !this.remoteTemplateInfo.length) {
      throw new Error('No Template Information!')
    }
    const name = initializationType === 'project' ? 'projectName' : 'componentName'
    const version = initializationType === 'project' ? 'project version' : 'component version'
    const description = initializationType === 'project' ? 'project description' : 'component description'
    // custom baseInfo
    const { selectedTemplateInfo } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTemplateInfo',
        message: 'template list',
        choices: this.createRemoteTemplateList()
      }
    ])
    // generate baseInfo
    const baseInfo = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: name,
        validate: function (v) {
          let done = this.async()
          const isValid = !validateNpmName(v).errors
          setTimeout(() => {
            if (!isValid) {
              done(chalk.red.bold('You need to input valid npm pakcage name'));
              return;
            }
            done(null, true)
          }, 0)
        }
      },
      {
        type: 'input',
        name: 'version',
        message: version,
        validate: function (v) {
          // Declare function as asynchronous, and save the done callback
          var done = this.async();
      
          // Do async stuff
          setTimeout(function() {
            if (!semver.valid(v)) {
              // Pass the return value in the done callback
              done(chalk.red.bold('You need to input valid version'));
              return;
            }
            // Pass the return value in the done callback
            done(null, true);
          }, 0);
        }
      },
      {
        type: 'input',
        name: 'description',
        message: description,
        default: 'This is a description'
      }
    ])
    // generate package object
    return {
      npmInfo: selectedTemplateInfo,
      baseInfo
    }
  }
  createRemoteTemplateList () {
    return this.remoteTemplateInfo.map(item => {
      return {
        name: item.description,
        value: item
      }
    })
  }
  async downloadTemplate () {
    // project
    const { npmInfo } = this.templateInfo
    const { npmName, version } = npmInfo
    const pkgTargetPath = path.join(userHome(), process.env.CLI_HOME, 'template')
    const pkgStoreDir = path.join(pkgTargetPath, 'node_modules')
    const templatePkg = new Package({
      targetPath: pkgTargetPath,
      storeDir: pkgStoreDir,
      name: npmName,
      version
    })
    if (!await templatePkg.exists()) {
      const spinner = spinnerStart('downloading template...')
      try {
        await templatePkg.install()
        log.success(chalk.white.bgGreen('download template successfully'))
        this.templatePkg = templatePkg
      } catch (error) {
        throw new Error(error)
      } finally {
        spinner.stop(true)
      }
    } else {
      const spinner = spinnerStart('updating template...')
      try {
        await templatePkg.update()
        log.success(chalk.white.bgGreen('update template successfully'))
        this.templatePkg = templatePkg
      } catch (err) {
        throw new Error(err)
      } finally {
        spinner.stop(true)
      }
    }
  }
  async initializeTemplate () {
    const destination = process.cwd()
    // copy template to target directory
    const srcPath = path.resolve(this.templatePkg.getCacheFilePath(), 'template')
    log.verbose(srcPath, destination)
    fse.copySync(srcPath, destination)
    // // ejs dynamic render template
    await this.renderTemplate()
    // execute config command
    const { npmInfo } = this.templateInfo
    const { startCmd, installCmd } = npmInfo
    await this.execCommand(installCmd)
    await this.execCommand(startCmd)
  }
  async renderTemplate () {
    const destination = process.cwd()
    const { npmInfo, baseInfo } = this.templateInfo
    const localPath = process.cwd()
    log.verbose(npmInfo.ignore, 'ignore')
    const fileList = glob.sync('**', {
      cwd: destination,
      nodir: true,
      ignore: npmInfo.ignore || ['public/**']
    })
    log.verbose(fileList, localPath)
    return new Promise((resolve, reject) => {
      Promise.all(fileList.map(file => {
        const filePath = path.join(destination, file)
        return new Promise((fileResolve, fileReject) => {
          ejs.renderFile(filePath, baseInfo, {}, (err, result) => {
            if (err) {
              fileReject(err)
            } else {
              // 写入文件
              fs.writeFileSync(filePath, result)
              fileResolve()
            }
          })
        })
      })).then(() => {
        resolve()
      }).catch(err => reject(err))
    })
  }
  async execCommand (command) {
    return new Promise(async (resolve, reject) => {
      if (!command) {
        reject(new Error(`unkonw ${command} command`))
      }
      const cmdArr = command.split(' ')
      const mainCmd = cmdArr[0]
      const retCmd = cmdArr.slice(1)
      try {
        await spawnProcessAsync(mainCmd, retCmd, {
          stdio: 'inherit',
          cwd: process.cwd()
        })
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  }
}

function init (argv) {
  return new InitCommand(argv)
}

module.exports = init