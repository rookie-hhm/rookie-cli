// 'use strict';

const fse = require('fs-extra')
const inquirer = require('inquirer')
const semver = require("semver")
const simpleGit = require('simple-git')
const log = require('@rookie-cli/log')
const CloudBuild = require('@rookie-cli/cloudbuild')
const { readFile, writeFile, parseFile, replaceFieldFile } = require('@rookie-cli/shared-utils')
const userhome = require('userhome')
const terminalLink = require('terminal-link')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const request = require('@rookie-cli/request')
const Github = require('./git-server/Github')
const Gitee = require('./git-server/Gitee');

const GIT_CATCH_DIR = '.git-info' // git config file
const GIT_TYPE_LIST = [
  { name: 'GITHUB', value: 'GITHUB' },
  { name: 'GITEE', value: 'GITEE' }
]

const USER_OWNER = 'USER' // 个人仓库
const ORG_OWNER = 'ORG' // 组织仓库

const NEWLINES_MATCH = /\r\n|\n|\r/
const RELEASE_MATCH = /.*refs\/tags\/release\/(.*)$/
const DEV_MATCH = /.*refs\/heads\/dev\/(.*)$/
const DEV_BRANCH_PREFIX = 'dev' // 开发分支的前缀
const RELEASE_BRANCH_PREFIX = 'release' // 发布分支的前缀

class Git {
  constructor (info, cmdInfo) {
    const { name, version, scripts, dir } = info
    this.git = simpleGit({ baseDir: process.cwd() })
    this.name = name
    this.dir = dir
    this.version = version
    this.scripts = scripts
    this.cmdInfo = cmdInfo // { options, cmdObj }
    this.gitServer = null // 远程仓库实例类
    this.gitConfig = null // git缓存配置
    this.gitCacheFile = null // git缓存配置文件路径
    this.gitCacheFileContent = null // git缓存配置文件内容
    this.cliHomePath = path.resolve(userhome(), process.env.CLI_HOME)
    this.remoteRepoUrl = null // 远程仓库地址
    this.branch = null // 本地开发分支
    this.buildCommand = 'npm run build' // 云构建命令
  }
  async init () {
    try {
      await this.prepare()
      await this.gitInit()
      await this.toCommit()
      await this.publish()
    } catch (err) {
      if (process.env.LOG_LEVEL === 'verbose') {
        log.verbose(err)
      } else {
        if (err && err.message) {
          log.error(err.message)
        }
      }
    }
  }
  async prepare () {
    await this.createCacheFile()
    await this.selectGitServer()
    await this.createGitServer()
    await this.checkToken()
    await this.checkUserAndOrg()
    await this.createRepository()
  }
  createCacheFile () {
    const gitCacheFile = path.resolve(this.cliHomePath, GIT_CATCH_DIR)
    if (!fs.existsSync(gitCacheFile)) {
      fse.ensureFileSync(gitCacheFile)
    }
    if (!fse.pathExistsSync(gitCacheFile)) {
      throw new Error(`Get file ${gitCacheFile} failed`)
    }
    this.gitCacheFile = gitCacheFile
    // 获取文件的内容
    this.gitCacheFileContent = readFile(this.gitCacheFile)
    // 解析到git config参数
    if (this.gitCacheFileContent !== null) {
      this.gitConfig = parseFile(this.gitCacheFileContent)
    }
  }
  async selectGitServer () {
    const { GIT_PLATFORM } = this.gitConfig
    const { updatePlatform } = this.cmdInfo.options
    if (!GIT_PLATFORM || updatePlatform) { // code platform
      const { platform } = await (inquirer.prompt([
        {
          type: 'list',
          name: 'platform',
          message: 'select a code hosting platform',
          choices: GIT_TYPE_LIST
        }
      ]))
      if (GIT_PLATFORM) {
        const newContent = replaceFieldFile(this.gitCacheFileContent, 'GIT_PLATFORM', platform)
        this._writeGitConfig(newContent, true)
      } else {
        this._writeGitConfig(`GIT_PLATFORM=${platform}\n`)
      }
      // 重新写入并读取
      this.gitConfig.GIT_PLATFORM = platform
    } else {
      log.success(GIT_PLATFORM, '读取成功')
    }
  }
  createGitServer () {
    const { GIT_PLATFORM } = this.gitConfig
    if (!['GITEE', 'GITHUB'].includes(GIT_PLATFORM) || !GIT_PLATFORM) {
      throw new Error(`please check your platform, only ${chalk.bold.blue(GITEE)} and ${chalk.bold.blue(GITHUB)} are supported`)
    }
    this.gitServer = GIT_PLATFORM === 'GITHUB' ? new Github() : new Gitee()
  }
  async checkToken () {
    const { GIT_TOKEN } = this.gitConfig
    const { updateToken } = this.cmdInfo.options
    if (!GIT_TOKEN || updateToken) {
      const link = this.gitServer.getTokenUrl()
      log.notice(`Please set Token before publish, click ${(terminalLink('document', chalk.blue.bold(link)))}`)
      const { token } = await inquirer.prompt({
        type: 'password',
        name: 'token',
        message: 'git token',
        require: true
      })
      if (GIT_TOKEN) {
        const newContent = replaceFieldFile(this.gitCacheFileContent, 'GIT_TOKEN', token)
        this._writeGitConfig(newContent, true)
      } else {
        this._writeGitConfig(`GIT_TOKEN=${token}\n`)
      }
      this.gitConfig.GIT_TOKEN = token
      this.gitServer.setToken(token)
    } else {
      this.gitServer.setToken(GIT_TOKEN)
    }
  }
  async checkUserAndOrg () { // 确认当前所建立的仓库的类型
    const { updateOwner } = this.cmdInfo.options
    const { GIT_OWNER, GIT_USER_NAME } = this.gitConfig
    if (!GIT_OWNER || !GIT_USER_NAME || updateOwner) { // 仓库的类型及登录用户
      const userInfo = await this.gitServer.getUserInfo()
      const orgInfo = await this.gitServer.getOrgInfo(userInfo.login)
      const ownerList = (orgInfo && orgInfo.length) ? [USER_OWNER, ORG_OWNER] : [USER_OWNER]
      const { owner } = await (inquirer.prompt({
        type: 'list',
        name: 'owner',
        message: 'select the type of repo',
        choices: ownerList.map(item => ({ name: item.toLocaleLowerCase(), value: item }))
      }))
      if (owner === USER_OWNER) { // 选中了个人
        if (GIT_OWNER) {
          const newContent = replaceFieldFile(this.gitCacheFileContent, 'GIT_OWNER', owner)
          this._writeGitConfig(newContent, true)
        } else {
          this._writeGitConfig(`GIT_OWNER=${owner}\n`)
        }
        if (GIT_USER_NAME) {
          const newContent = replaceFieldFile(this.gitCacheFileContent, 'GIT_USER_NAME', userInfo.login)
          this._writeGitConfig(newContent, true)
        } else {
          this._writeGitConfig(`GIT_USER_NAME=${userInfo.login}\n`)
        }
        this.gitConfig.GIT_OWNER = owner
        this.gitConfig.GIT_USER_NAME = userInfo.login
        this.gitCacheFileContent = readFile(this.gitCacheFile)
      } else {
        const userList = orgInfo.map(item => {
          const result = {}
          result['name'] = item.login
          result['value'] = item.login
          return result
        })
        const { username } = await (inquirer.prompt({
          type: 'list',
          name: 'username',
          message: 'please select a user',
          choices: userList
        }))
        if (GIT_USER_NAME) {
          const newContent = replaceFieldFile(this.gitCacheFileContent, 'GIT_USER_NAME', username)
          this._writeGitConfig(newContent, true)
        } else {
          this._writeGitConfig(`GIT_USER_NAME=${username}\n`)
        }
        this.gitConfig.GIT_OWNER = ORG_OWNER
        this.gitConfig.GIT_USER_NAME = username
      }
    }
  }
  async createRepository () {
    // 后续改进， 先判断git remote -v 是否有值， 如果有通过search Api进行查询，判断是否存在此仓库，如果存在则直接返回，而不需要创建新仓库
    // 如果不存在仓库则进行创建
    let repo = await this.gitServer.getRepository(this.gitConfig.GIT_USER_NAME, this.name)
    if (!repo) {
      if (this.gitConfig.GIT_OWNER === 'USER') {
        repo = await this.gitServer.createUserRepository(this.name)
      } else {
        repo = await this.gitServer.createOrgRepository(this.gitConfig.GIT_USER_NAME, this.name)
      }
      if (!repo) {
        throw new Error('cer')
      }
      log.success('create repo successfully')
    } else {
      log.success('get repo info successfully')
    }
    repo = this.gitServer.getRemoteUrl(this.gitConfig.GIT_USER_NAME, this.name)
    this.remoteRepoUrl = repo
  }
  _writeGitConfig (data, isAll = false) {
    const content = isAll ? data : `${this.gitCacheFileContent || ''}${data}`
    writeFile(this.gitCacheFile, content)
    // 重新更新文件内容
    this.gitCacheFileContent = readFile(this.gitCacheFile)
  }
  async gitInit () {
    // check .gitignore
    await this.checkGitIgnore()
    // initialize git project
    await this.InitializeGit()
    // automate commit
    await this.initCommit()
  }
  checkGitIgnore () {
    const ingoreFile = path.resolve(process.cwd(), '.gitignore')
    if (!fs.existsSync(ingoreFile)) {
      fse.ensureFileSync(ingoreFile)
      writeFile(ingoreFile, `node_modules
      .vscode
      .env.*`)
    }
  }
  async InitializeGit () {
    const { GIT_USER_NAME } = this.gitConfig
    const gitDirPath = path.resolve(process.cwd(), '.git')
    if (!fs.existsSync(gitDirPath)) { // 不能存在.git目录进行初始化
      await this.git.init(process.cwd())  
    }
    const remoteList = await this.git.getRemotes()
    // const result = await this.git.remote(['-v'])
    // if (!result) {
    //   await this.git.addRemote('origin', this.gitServer.getRemoteUrl(GIT_USER_NAME, this.name))
    // }
    // console.log(result, 'result', typeof result, !!result)
    if (!remoteList.map(item => item.name).includes('origin')) {
      await this.git.addRemote('origin', this.gitServer.getRemoteUrl(GIT_USER_NAME, this.name))
    }
  }
  async initCommit () {
    // check workspace is clean
    await this.checkWorkSpace()
    // checkout master branch
    if (await this.checkMasterExists()) {
      await this.pullRemote('master')
    } else {
      await this.git.push('origin', 'master')
      log.success('push origin master')
    }
  }
  async checkConflict () {
    const { conflicted } = await this.git.status()
    if (conflicted && conflicted.length) {
      throw new Error('Please resolve the conflict')
    }
  }
  async checkCommitted() {
    const statusResult = await this.git.status()
    const { not_added, created, deleted, modified, renamed } = statusResult
    if (
      not_added && not_added.length ||
      created && created.length || 
      deleted && deleted.length ||
      modified && modified.length ||
      renamed && renamed.length
    ) {
      await this.git.add(not_added)
      await this.git.add(created)
      await this.git.add(deleted)
      await this.git.add(modified)
      await this.git.add(renamed)
      const { message } = await inquirer.prompt({
        type: 'text',
        name: 'message',
        message: 'commit message',
        validate: function (input) {
          // Declare function as asynchronous, and save the done callback
          const done = this.async();
          // Do async stuff
          setTimeout(function() {
            if (!input.trim()) {
              done('You need to provide a message');
              return;
            }
            done(null, true);
          }, 0)
        }
      })
      await this.git.commit(message)
    }
  }
  async checkWorkSpace () {
    await this.checkConflict()
    await this.checkCommitted()
  }
  async checkMasterExists () {
    const str = await (this.git.listRemote(['--refs']))
    return str ? str.indexOf('refs/heads/master') !== -1 : false
  }
  async pullRemote (branch, options = {}) {
    await this.git.pull('origin', branch, {
      '--allow-unrelated-histories': null,
      ...options
    })
  }
  async pushRemote (branch, options = {}) {
    await this.git.push('origin', branch, options)
  }
  async toCommit () {
    // 获取远程release分支的列表
    const remotelist = await this.getRemoteList('release')
    let latestVersion = null
    if (remotelist && remotelist.length) {
      latestVersion = remotelist[0]
    }
    // 生成本地开发分支
    this.branch = await this.generateBranch(latestVersion)
    log.verbose(this.branch)
    // 切换到开发分支
    this.checkoutBranch(this.branch)
    // 检查提交
    await this.checkCommitted()
    // 合并远程开发分支
    await this.pullOriginBranch(this.branch)
    // 推送开发分支
    this.pushRemote(this.branch)
    log.info(`push origin ${this.branch} successfully`)
  }
  async getRemoteList (type) { // 获取远程分支类别列表
    const lsRemoteRes = await this.git.listRemote(['--refs'])
    const result = []
    const matchType= type === 'release' ? RELEASE_MATCH : DEV_MATCH
    lsRemoteRes.split(NEWLINES_MATCH).forEach(line => {
      const matchRes = line.match(matchType)
      if (matchRes !== null) {
        const value = matchRes[1]
        result.push(value)
      }
    })
    return result.sort((a, b) => {
      if (semver.gte(a, b)) {
        if (a === b) {
          return 0
        }
        return -1
      }
      return 1
    })
  }
  async generateBranch (latestVersion) {
    let branch = ''
    const currentVersion = this.version // 项目版本号
    if (!latestVersion || latestVersion <= currentVersion) {
      branch = `${DEV_BRANCH_PREFIX}/${currentVersion}`
    } else {
      if (latestVersion > currentVersion) { // 当前版本小于远程最新版本，更新版本号
        const versionList = ['patch', 'minor', 'major'].map(versionType => {
          const result = {}
          result.name = `${versionType} -> ${semver.inc(currentVersion, versionType)}`
          result.value = versionType
          return result
        })
        const { newVersion } = await inquirer.prompt({
          type: 'list',
          name: 'newVersion',
          message: 'select the version number',
          choices: versionList
        })
        const version = semver.inc(currentVersion, newVersion)
        this.version = version
        branch = `${DEV_BRANCH_PREFIX}/${version}`
        // write to package.json
        const pkgPath = `${this.dir}/package.json`
        const json = fse.readJSONSync(pkgPath)
        console.log(json, 'json')
        if (json && json.version) {
          json.version = version 
          fse.writeJSONSync(pkgPath, json, { spaces: 2, encoding: 'utf-8' })
          log.success('update version in package.json successfully')
        }
      }
    }
    console.log(branch, 'branch')
    return branch
  }
  async checkoutBranch (branch) {
    // check local branch is exists
    const localBranchs = await this.git.branchLocal()
    if (localBranchs.all.includes(branch)) {
      log.info(`checkout local branch ${chalk.bold.red(branch)}`)
      await this.git.checkout(branch)
    } else {
      await this.git.checkoutLocalBranch(branch)
    }
  }
  async pullOriginBranch (branch) {
    // merge master
    log.info('pull origin master...')
    await this.pullRemote('master')
    log.info('pull origin master successfully')
    await this.checkConflict()
    const remoteList = await this.getRemoteList('dev')
    if (remoteList.includes(this.version)) {
      log.info(`pull origin ${branch}...`)
      await this.pullRemote('master')
      log.info(`pull origin ${branch} successfully`)
      await this.checkConflict()
    }
  }
  async publish () {
    await this.checkBuildCmd()
    await this.prePublish()
    const cloudBuild = new CloudBuild(this, {
      buildCommand: this.buildCommand
    })
    await cloudBuild.connect()
    await cloudBuild.build()
    await this.postPublish()
  }
  async checkBuildCmd () {
    // just npm/ cnpm run scripts
    const { buildCommand = 'npm run build' } = this.cmdInfo.options
    const cmdArr = buildCommand.split(' ')
    const mainCmd = cmdArr[0]
    if (mainCmd !== 'npm' && mainCmd !== 'cnpm') {
      throw new Error('buildcommand must begin with npm/cnpm')
    }
    this.buildCommand = buildCommand
  }
  async prePublish () { // 检测远端项目是否已经存在
    const projectName = `${this.name}@${this.version}/`
    const list = await request.get('/oss', {
      params: {
        prefix: projectName
      }
    })
    if (list && list.length) {
      const { isContinue } = await inquirer.prompt({
        type: 'confirm',
        name: 'isContinue',
        message: `${this.name}@${this.version} project already exists, whether to publish`,
        default: false
      })
      if (!isContinue) {
        throw new Error('Manually terminate publish flow')
      }
    }
  }
  async postPublish () {
    // add tag
    await this.addTag()
    // checkout to master
    log.info('checkout to master')
    await this.checkoutBranch('master')
    // merge dev branch to master
    log.info(`merge ${this.branch} to master...`)
    await this.mergeBranch(this.branch, 'master')
    log.info(`merge ${this.branch} to master successfully`)
    // delete local dev branch
    log.info(`delete local ${this.branch}...`)
    await this.git.deleteLocalBranch(this.branch)
    log.info(`delete local ${this.branch} successfully`)
    // delete remote dev branch
    log.info(`delete remote ${this.branch}...`)
    await this.git.push('origin', this.branch, ['--delete'])
    log.info(`delete remote ${this.branch} successfully`)
    // push master to remote origin
    await this.pushRemote('master')
    log.info(`push master to origin successfully`)
  }
  async addTag () {
    // 删除已有tag，并重新新建tag 推送远端
    const remoteTagVersionList = await this.getRemoteList('release')
    const targetTag = `${RELEASE_BRANCH_PREFIX}/${this.version}`
    if (remoteTagVersionList && remoteTagVersionList.length && remoteTagVersionList.includes(this.version)) { // 判断远程tag是否存在当前版本的tag
      await this.pushRemote(`:refs/tags/${targetTag}`) // 推送空分支 删除远程tag
    }
    const localTagList = await this.git.tags()
    if (localTagList.all && localTagList.all.length && localTagList.all.includes(targetTag)) {
      await this.git.tag(['-d', targetTag])
    }
    await this.git.addTag(targetTag)
    await this.pushRemote(targetTag)
    log.info('add tag to remote successfully')
  }
  async mergeBranch (origin, destination) {
    await this.git.mergeFromTo(origin, destination)
  }
}

module.exports = Git