'use strict';
const path = require('path')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists').sync
const fse = require("fs-extra")
const npminstall = require("npminstall")
const { isPlainObject } = require('@rookie-cli/shared-utils')
const { getDefaultRegistry, getNpmLatestVersion } = require('@rookie-cli/npm-info')
class Package {
  constructor (options) {
    if (!isPlainObject(options)) {
      throw new Error('options must be a object!')
    }
    const { targetPath, storeDir, name, version } = options
    this.targetPath = targetPath
    this.storeDir = storeDir
    this.name = name
    this.version = version
    this.cacheDirPrefix = this.name.replace('/', '_')
  }
  getCacheFilePath () {
    return this.getSpecifiedCachePath(this.version)
  }
  getEntryFile () {
    function _getEntryFilePath (targetPath) {
      const dir = pkgDir(path.resolve(targetPath))
      if (dir) {
        const pkg = require(path.resolve(dir, 'package.json'))
        if (pkg && pkg.main) {
          return path.resolve(dir, pkg.main)
        }
      }
      return null
    }
    const targetPath = this.storeDir ? this.getSpecifiedCachePath(this.version) : this.targetPath
    return _getEntryFilePath(targetPath)
  }
  getSpecifiedCachePath (version) {
    return path.resolve(this.storeDir, `_${this.cacheDirPrefix}@${version}@${this.name}`)
  }
  async transform () {
    if (this.storeDir) {
      // Make sure the cache directory exists
      if (!pathExists(this.storeDir)) {
        fse.ensureDirSync(this.storeDir)
      }
    }
    if (this.version === 'latest') {
      this.version = await getNpmLatestVersion(this.name)
    }
  }
  async exists () {
    // storeDir 存在 判断缓存路径
    if (this.storeDir) {
      // cache file
      await this.transform()
      const cacheDirPath = this.getSpecifiedCachePath(this.version)
      return pathExists(cacheDirPath)
    } else {
      // debug file in local environment
      return pathExists(this.targetPath)
    }
  }
  async install () {
    await this.transform()
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{
        name: this.name,
        version: this.version
      }]
    })
  }
  async update () {
    // get lastest version
    const latestVersion = await getNpmLatestVersion(this.name)
    // check whether the cache directory exists
    const result = this.getSpecifiedCachePath(latestVersion)
    const isExists = pathExists(this.getSpecifiedCachePath(latestVersion))
    return new Promise(async (resolve) => {
      if (!isExists) {
        // update package
        await npminstall({
          root: this.targetPath,
          storeDir: this.storeDir,
          registry: getDefaultRegistry(),
          pkgs: [{
            name: this.name,
            version: latestVersion
          }]
        })
        // update version
        this.version = latestVersion
      } else {
        // update version
        this.version = latestVersion
      }
      resolve()
    })
  }
}

module.exports = Package