'use strict'

class Cache {
    constructor(expire_after) {
        this.__class = 'Cache'
        this.expire_after = expire_after
    }
    
    /* abstract */ exists(key) { throw new Error('Error: Unimplemented abstract function') }
    /* abstract */ set(key) { throw new Error('Error: Unimplemented abstract function') }
    /* abstract */ unset(key) { throw new Error('Error: Unimplemented abstract function') }
}

module.exports = Cache