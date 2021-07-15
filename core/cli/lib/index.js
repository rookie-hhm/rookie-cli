'use strict';
const path = require('path')
const fse = require('fs-extra')
const semver = require('semver')
const chalk = require('chalk')
const dotenv = require('dotenv')
const userhome = require('userhome')
const leven = require('leven')
const pathExists = require('path-exists').sync
const { Command } = require('commander');
const log = require('@rookie-cli/log')
const exec = require('@rookie-cli/exec')
const { getNpmLatestVersion } = require('@rookie-cli/npm-info')
const pkg = require('../package.json')
const { clearConsole } = require('./helper')
const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME } = require('./config');

let USER_HOME
module.exports = core;

async function core() {
    // TODO
  log.verbose('core 11111')
  try {
    await prepare()
    registerCommand()
  } catch (e) {
    if (process.env.LOG_LEVEL = 'verbose') {
      log.verbose(e)
    } else {
      log.error(e.message)
    }
  }
}

async function prepare() {
  getCliVersion()
  checkNodeVersion()
  checkRoot()
  checkUserHome()
  getDotenv()
  await checkUpdate()
}

function getCliVersion() {
  const { version } = pkg
	chalk.bold.blue(`Vue CLI v${version}`)
}

function checkNodeVersion () {
  const localVersion = process.version
  if (semver.lt(localVersion, LOWEST_NODE_VERSION)) {
    throw new Error(chalk.red(`The current node version is ${localVersion}, at least node version ${LOWEST_NODE_VERSION} is required \n Please update your node version`))
  }
}

function checkRoot () {
  require('root-check')()
}

function checkUserHome () {
  USER_HOME = userhome()
  if (!USER_HOME || !pathExists(USER_HOME)) {
    throw new Error(chalk.red(`user home directory is not exists`))
  }
}

function getDotenv () {
  const envPath = path.resolve(USER_HOME, '.env')
  log.verbose(USER_HOME, 'USERHOME', envPath)
  if (pathExists(envPath)) {
    dotenv.config({
      path: envPath
    })
    log.verbose(process.env.CLI_HOME)
  }
  // set DEFAULT CLI_HOME 
  if (!process.env.CLI_HOME) {
    process.env.CLI_HOME = DEFAULT_CLI_HOME
    log.verbose(process.env.CLI_HOME, 'clihone')
  }
}

async function checkUpdate () {
  const { version, name } = pkg
  const lastestVersion = await getNpmLatestVersion(name)
  log.verbose(version, lastestVersion, 'version')
  if (semver.lt(version, lastestVersion)) {
    clearConsole(version, lastestVersion)
  }
}

function registerCommand () {
  const program = new Command();
  const { version, bin } = pkg
  const name = Object.keys(bin)[0]
  program
    .name(name)
    .version(version)
    .usage('<command> [options]')
    .option('-d, --debug', 'change to debug mode', false)
    .option('-p --targetPath <targetPath>', 'local file path to test command', '')
    .option('-r --registry <registryUrl>', 'specifies the download location for the npm', 'https://registry.npmjs.org')
  
  // register install command
  program
    .command('init [projectName]')
    .alias('i')
    .description('initialize project')
    .option('-f --force', 'whether to force initialization')
    // .action((name, options, cmd) => {
    //   log.verbose(name, options, cmd._name)
    // })
    .action(exec)
  
  // you must define listeners before parse args
  program.on('option:debug', (d) => {
    process.env.LOG_LEVEL = 'verbose'
    log.level = process.env.LOG_LEVEL
    console.log(d, 'd')
    log.verbose('loglevel')
  })

  program.on('option:targetPath', () => {
    process.env.CLI_TARGET_PATH = program.opts().targetPath
  })

  program.on('option:registry', () => {
    process.env.CLI_REGISTRY = program.opts().registry
  })
  
  // listen unknown command
  program.on('command:*', ([cmd]) => {
    program.outputHelp()
    log.verbose(' ')
    log.error(chalk.red(`Unknown command ${chalk.yellow(cmd)}.`))
    const availableCommands = program.commands.map(cmd => cmd.name());
    mySuggestBestMatch(operands[0], availableCommands);
    process.exitCode = 1;
  })

  program.parse(process.argv);
}

function mySuggestBestMatch (unknownCommand ,availableCommands) {
  let suggestion
  availableCommands.forEach(cmd => {
    const isBestMatch = leven(cmd, unknownCommand) < leven(suggestion || '', unknownCommand)
    if (leven(cmd, unknownCommand) < 3 && isBestMatch) {
      suggestion = cmd
    }
  })
  if (suggestion) {
    log.error(chalk.red(`Did you mean ${chalk.yellow(suggestion)}?`))
  }
}
