const
    AWS = require('./aws-store'),
    Local = require('./local-store')

module.exports = {
    AWS:    options => { return new AWS(options) },
    Local:  options => { return new Local(options) }
}