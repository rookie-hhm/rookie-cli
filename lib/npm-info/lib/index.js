'use strict';
// https://registry.npmjs.org normal npm origin
// https://registry.npm.taobao.org taobao origin
const axios = require('axios')
const ulrJoin = require('url-join')

function getNpmInfo (packageName) {
  if (!packageName) {
    return null
  }
  const defaultUrl = 'https://registry.npmjs.org'
  const packageUrl = ulrJoin(defaultUrl, packageName)
  return axios.get(packageUrl).then(res => {
    return res.data
  }).catch(err => {
    Promise.reject(err)
  })
}

async function getNpmLatestVersion (packageName) {
  const npmInfo = await getNpmInfo(packageName)
  const tags = npmInfo && npmInfo['dist-tags']
  return tags ? tags.latest : null
}

function getDefaultRegistry () {
  return process.env.CLI_REGISTRY ? process.env.CLI_REGISTRY : 'https://registry.npmjs.org'
}

module.exports = {
  getNpmInfo,
  getNpmLatestVersion,
  getDefaultRegistry
}
