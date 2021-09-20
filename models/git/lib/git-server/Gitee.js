const GitServer = require("./GitServer");
const request = require('./GitRequest')
class Gitte extends GitServer {
  constructor (token) {
    super('Gitte', token)
    this.request = request({ baseURL: 'https://gitee.com/api/v5/' })
  }
  getRemoteUrl (username, repoName) {
    // https://gitee.com/rookie-cli-org/test-one
    return `git@gitee.com:${username}/${repoName}.git`
  }
  setToken (token) {
    this.token = token
    console.log(token, 'gitee token')
  }
  getUserInfo () {
    return this.request.get('/user', {
      params: {
        'access_token': this.token
      }
    })
    // errorMessage('', 'getUserInfo')
  }
  getOrgInfo (username, params = {}) {
    return this.request.get(`/users/${username}/orgs`, {
      params: {
        ...params,
        'access_token': this.token,
        page: 1,
        'per_page': 100
      }
    })
    // errorMessage('', 'getOrgInfo')
  }
  getRepository (username, repoName) {
    return this.request.get(`/repos/${username}/${repoName}`)
  }
  createUserRepository (repoName) {
    return this.request.post(`/user/repos`, {
      access_token: this.token,
      name: repoName
    })
  }
  createOrgRepository (username, repoName) {
    return this.request.post(`/orgs/${username}/repos`, {
      access_token: this.token,
      name: repoName
    })
  }
  getTokenUrl () {
    return 'https://gitee.com/personal_access_tokens'
  }
  getOpenApiUrl () {
    return 'https://gitee.com/api/v5/swagger#/getV5ReposOwnerRepoStargazers?ex=no'
  }
}

module.exports = Gitte