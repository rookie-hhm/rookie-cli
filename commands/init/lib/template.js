const request = require('@rookie-cli/request')

function getTemplateInfo (type) {
  return request.get(`/templateInfo/${type}`)
}
module.exports = {
  getTemplateInfo
}