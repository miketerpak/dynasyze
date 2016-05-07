'use strict'

const Cache = require('./cache')

class MemoryCache extends Cache {
    
    constructor({ expire_after = 15 } = {}) {
        super(expire_after)
        this.processing_map = new Map()
        console.log('Using local memory cache')
    }
    
    exists(key) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(this.processing_map.has(key))
            }, 0)
        })
    }
    
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