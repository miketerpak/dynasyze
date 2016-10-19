'use strict'

class Cache {
    constructor(expire_after) {
        this.__class = 'Cache'
        this.expire_after = expire_after
    }
    
    /* abstract */ exists(key) { throw Error('ABSTRACT FUNCTION INVOKED: Cache#exists') }
    /* abstract */ set(key) { throw Error('ABSTRACT FUNCTION INVOKED: Cache#set') }
    /* abstract */ unset(key) { throw Error('ABSTRACT FUNCTION INVOKED: Cache#unset') }
}

module.exports = Cache