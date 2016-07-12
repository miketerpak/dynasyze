'use strict'

/**
 * TODO
 *
 *  ALLOW REDIS EXPIRE TIME TO SCALE WITH IMAGE SIZE
 *  AWS - implement correct metadata to allow downloads and such
 *  customizable maximum REDIS waiting-for-image timeout (finished? test)
 *  Optional rate limiting
 *  Logging + log files (w/ aws)
 */

const _ = require('lodash')
const express = require('express')

const caches = require('./caches')
const stores = require('./stores')

const app = express()

class Server {
    
    constructor({ whitelist = [], aliases = {}, subdirectory = "", sources, store = {}, cache = {}, port = 3000 } = {}) {
        this.port = port
        this.aliases = aliases
        this.whitelist = whitelist
        this.subdirectory = subdirectory ? ('/' + subdirectory +'/').replace('//','/') : '/';
        this.sources = sources
        
        if (store.__class === 'Store') {
            this.store = store
        } else if (_.isEmpty(store.aws)) {
            this.store = stores.Local(store)
        } else {
            this.store = stores.AWS(store)
        }
        
        if (cache.__class === 'Cache') {
            this.cache = cache
        } else if (cache.redis) {
            this.cache = caches.Redis(cache)
        } else {
            this.cache = caches.Memory(cache)
        }
    }
    
    start(port) {
        port = isNaN(port) ? this.port : parseInt(port, 10)
        app.get(this.subdirectory + '*', (req, res) => {
            let _this = this
            let parts = req.path.replace(this.subdirectory, '').split('/')
            let key, source, width, height

            if (this.sources && this.sources[parts[0]]) {
                source = this.sources[parts[0]]
                parts = parts.slice(1)
            }
            
            // If redis is availale, check if the requested file key is being processed
            if (parts.length === 1) {
                key = parts[0]
            } else if (parts.length === 2) {
                // Alias handling
                let alias, aliasOf = this.aliases[parts[0]]
                if (aliasOf) {
                    alias = parts[0]
                    parts[0] = aliasOf
                }
                
                if (this.whitelist.length && !(this.whitelist.indexOf(parts[0]) >= 0 || this.whitelist.indexOf(alias) >= 0)) {
                    return res.status(400).send()
                }
                
                key = parts[1]
                let size = parts[0].toLowerCase().split('x')
                width = size[0] ? parseInt(size[0], 10) : undefined
                height = size[1] ? parseInt(size[1], 10) : undefined
                if ((width !== undefined && isNaN(width)) || (height !== undefined && isNaN(height))) {
                    return res.status(400).send()
                }
            } else  {
                return res.status(404).send()
            }
            
            checkCache('PROC:'+req.path)
            
            let timeout = 100
            let _timeout = 100
            function checkCache(_key) {
                _this.cache
                    .exists(_key)
                    .then(exists => {
                        if (exists) {
                            timeout = _timeout + (_timeout = timeout) // Fibbin it up son
                            setTimeout(() => { checkCache(_key) }, timeout)
                        } else {
                            getFromStorage()
                        }
                    })
                    .catch(getFromStorage) // Bypass cache if not working TODO
            }
            
            function getFromStorage() {
                _this.store
                    .get(key, source, width, height)
                    .then(buffer => {
                        if (buffer) done(buffer)
                        else getResized()
                    })
                    .catch(code => {
                        res.status(code).send()
                    })
            }
            
            function getResized() {
                _this.cache.set('PROC:'+req.path).then()
                _this.store
                    .generate(key, source, width, height)
                    .then(done)
                    .catch(code => {
                        res.status(code).send()
                    })
            }
            
            function done(buffer) {
                _this.cache.unset('PROC:'+req.path).then()
                _this.store
                    .getBufferData(buffer)
                    .then(data => {
                        res.set('Content-Type', data['Mime type']) // TODO correct content type
                        res.end(buffer, 'binary')
                    })
                    .catch(err => {
                        console.log('Error fetching buffer data')
                        res.status(500).send()
                    })
            }
        })
        
        app.all('*', (req, res) => {
            res.status(404).send()
        })
        
        this.store
            .init()
            .then(() => { app.listen(port) })
            .catch(err => { throw err })
    }
}

module.exports = Server