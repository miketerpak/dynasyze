'use strict'

const Cache = require('./cache')

class MemoryCache extends Cache {
    
    constructor({ expire_after = 15 } = {}) {
        super(expire_after)
        this.processing_map = new Map()
        console.log('Using local memory cache')
    }
    
    /**
     * Check if the media file exists in the processing cache
     * 
     * @param {string} key the unique key representing the file to check
     * 
     * @returns {Promise<boolean>}
     */
    exists(key) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(this.processing_map.has(key))
            }, 0)
        })
    }
    
    /**
     * Mark the file as processing
     * 
     * @param {string} key the unique key representing the file to mark as pending
     * 
     * @returns {Promise}
     */
    set(key) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.processing_map.set(key, true)
                resolve()
            }, 0)
            setTimeout(() => { // Delete key regardless of status after max ms TTL reached
                this.processing_map.delete(key)
            }, this.expire_after * 1000)
        })
    }
    
    /**
     * Mark the file as finished processing
     * 
     * @param {string} key the unique key representing the file to mark as complete
     * 
     * @returns {Promise}
     */
    unset(key) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.processing_map.delete(key)
                resolve()
            }, 0)
        })
    }
}

module.exports = MemoryCache