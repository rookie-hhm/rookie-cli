const { ValidationError } = require('@rookie-cli/validate-on-error')

function errorMessage (prefix, method) {
  return ValidationError(prefix || 'Git Server', method + ' needs to be implemented.')
}

class GitServer {
  constructor (platform, token) {
    this.platform = platform
    this.token = token
    this.request = null // 请求实例
    console.log(platform, token)
  }
  setToken () {
    errorMessage('', 'setToken')
  }
  getUserInfo () {
    errorMessage('', 'getUserInfo')
  }
  getOrgInfo () {
    errorMessage('', 'getOrgInfo')
  }
  getRepository () {
    errorMessage('', 'getRepository')
  }
  createUserRepository () {
    errorMessage('', 'createUserRepository')
  }
  createOrgRepository () {
    errorMessage('', 'createOrgRepository')
  }
  getTokenUrl () {
    errorMessage('', 'getTokenUrl')
  }
  getOpenApiUrl () {
    errorMessage('', 'getOpenApiUrl')
  }
}

module.exports = GitServer