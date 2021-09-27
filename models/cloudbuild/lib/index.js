'use strict';
const log = require('@rookie-cli/log')
const io = require('socket.io-client')
const PROTOCOL = 'http'
const CONNECT_HOST_NAME = 'rookie.zsj'
const PORT = '3000'
const SOCKET_TIME_OUT = 5000
const RETRY_TIMES = 3
// reference to https://socket.io/docs/v3/client-api/#socketclose

class CloudBuild {
  constructor (git, options = {}) {
    this.git = git
    this.options = options
    this.socket = null // socket 链接
  }
  connect () {
    const { name, version, remoteRepoUrl, branch } = this.git
    const { buildCommand } = this.options
    console.log('start connect')
    return new Promise((resolve, reject) => {
      this.socket = io(`${PROTOCOL}://${CONNECT_HOST_NAME}:${PORT}`, {   
        query: {
          name,
          version,
          remoteRepoUrl,
          branch,
          buildCommand
        }
      })
      const socket = this.socket
      socket.on('connect', () => {
        clearTimeout(this.socketTimer)
        const id = socket.id
        socket.on(id, data => {
          const { taskId, message, timestamp } = data
          log.info(message)
          log.info(`current taskId is ${taskId}`)
        })
        resolve()
      })
      socket.on('disconnect', () => {
        log.info('CloudBuild has been disconnected')
        this.disconnect()
        reject()
      })
      socket.on('connect_error', (error) => {
        log.info('CloudBuild failed')
        log.error(error)
        this.disconnect()
        reject(error)
      })      
      this.socketTimer = setTimeout(() => {
        this.retry()
      }, SOCKET_TIME_OUT)
    })
  }
  disconnect () {
    // if (!this.socket.connected) { // 没有连接成功
    this.socket.disconnect()
    this.socket.close()
    // }
  }
  build () {
    return new Promise((resolve, reject) => {
      // emit build event to server
      this.socket.emit('build')
      // cloudbuild ...
      this.socket.on('build', message => {
        log.info(message)
      })
      this.socket.on('building', message => {
        log.info(message)
      })
      // finished
      this.socket.on('builded', () => {
        log.info('Cloud build finised')
      })
      // 发布完成
      this.socket.on('published', message => {
        log.info(message)
        this.disconnect()
        resolve()
      })
      // error
      this.socket.on('error_build', message => {
        log.info(message)
        this.disconnect()
        reject()
      })
    })
  }
  retry (connectFn, times) {
    //
  }
}

module.exports = CloudBuild