const axios = require('axios')

function createAxiosInstance ({ baseURL }) {
  const instance = axios.create({
    baseURL,
    timeout: 100000
  })
  instance.interceptors.response.use(response => {
      // console.log(response, 'success')
      return response.data
    }, error => {
      const response = error && error.response
      if (response && response.data) {
        console.log(response, response.status, 'error')
        if (response.status === 404) {
          console.log('return')
          return null
        }
      }
      return Promise.reject(error)
    }
  )
  return instance
}

module.exports = createAxiosInstance