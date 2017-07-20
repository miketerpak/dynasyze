'use strict'

/**
 * Abstract Store class for methods of caching media file information
 */
class Cache {

    /**
     * 
     * @param {number} expire_after timeout in seconds for waiting on the image to process
     */
    constructor(expire_after) {
        this.__class = 'Cache'
        this.expire_after = expire_after
    }
    
    /* abstract */ exists(key) { throw Error('ABSTRACT FUNCTION INVOKED: Cache#exists') }
    /* abstract */ set(key) { throw Error('ABSTRACT FUNCTION INVOKED: Cache#set') }
    /* abstract */ unset(key) { throw Error('ABSTRACT FUNCTION INVOKED: Cache#unset') }
}

module.exports = Cache