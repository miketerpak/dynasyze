const
    Redis = require('./redis-cache'),
    Memory = require('./memory-cache')

module.exports = {
    Redis:  options => { return new Redis(options) },
    Memory: options => { return new Memory(options) }
}