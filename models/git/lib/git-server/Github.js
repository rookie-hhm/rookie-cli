const GitServer = require("./GitServer");
const request = require('./GitRequest')

class Github extends GitServer {
  constructor (token) {
    super('Github', token)
    this.request = request({ baseURL: 'https://api.github.com/' })
    this.request.interceptors.request.use(config => {
      config.headers['Authorization'] = `token ${this.token}`
      return config
    })
  }
  getRemoteUrl (username, repoName) {
    // https://github.com/rookie-cli-org/test-one
    return `git@github.com:${username}/${repoName}.git`
  }
  getHttpRemoteUlr (username, repoName) {
    return `https://github.com/${username}/${repoName}`
  }
  setToken (token) {
    this.token = token
    console.log(this.token, 'github')
  }
  getUserInfo () {
    return this.request('/user')
  }
  getOrgInfo () {
    return this.request('/user/orgs', {
      params: {
        page: 1,
        'pre_page': 100
      }
    })
  }
  getRepository (username, repoName) {
    return this.request.get(`/repos/${username}/${repoName}`, {
      headers: {
        accept: 'application/vnd.github.v3+json'
      }
    })
  }
  createUserRepository (repoName) {
    return this.request.post('/user/repos', {
      name: repoName
    },{
        headers: {
          accept: 'application/vnd.github.v3+json'
        }
      }
    )
  }
  createOrgRepository (orgName, repoName) {
    return this.request.post(`/orgs/${orgName}/repos`, {
      name: repoName
    },{
        headers: {
          accept: 'application/vnd.github.v3+json'
        }
      }
    )
  }
  getTokenUrl () {
    return 'https://github.com/settings/tokens'
  }
  getOpenApiUrl () {
    return 'https://docs.github.com/en/rest/reference'
  }
}

module.exports = Github