'use strict';
const axios = require('axios')

const baseURL = process.env.BASE_URL ? process.env.BASE_URL : 'http://rookie.zsj:3000/'
const instance = axios.create({
  baseURL,
  timeout: 50000
})

instance.interceptors.request.use(config => {
  return config
})

instance.interceptors.response.use(response => {
    return response.data
  }, error => {
    return Promise.reject(error)
  }
)

module.exports = instance
