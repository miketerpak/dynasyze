'use strict'

const Cache = require('./cache')

class RedisCache extends Cache {
    
    constructor({ redis, expire_after = 15 } = {}) {
        super(expire_after)
        
        if (redis) {
            this.redis = redis
            this.redis
                .on("ready", () => {
                    console.log('REDIS successfully connected')
                })
                .on("reconnecting", () => {
                    console.log('Lost connection to REDIS, reconnecting...')
                })
                .on("end", () => {
                    console.warn('Connection to REDIS closed')
                })
                .on("error", err => {
                    console.warn('REDIS Error')
                    console.warn('Error: ', err)
                })
        } else {
            throw Error('Missing required REDIS info')
        }
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
            this.redis.get(key, (err, result) => {
                if (err) { // Fail quietly when REDIS is down
                    reject(err)
                } else if (result) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
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
            this.redis.set(key, true)
            this.redis.expire(key, this.expire_after, resolve)
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
            this.redis.del(key, resolve)
        })
    }
}

module.exports = RedisCache