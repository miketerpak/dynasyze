'use strict'

/**
 * TODO
 *
 *  ALLOW REDIS EXPIRE TIME TO SCALE WITH IMAGE SIZE
 *  Optional rate limiting
 *  Logging + log files (w/ aws)
 */

const _ = require('lodash')
const express = require('express')

const caches = require('./caches')
const stores = require('./stores')

const app = express()

class Server {
    
    /**
     * Constructor
     * 
     * @param {object} [options]
     * @param {string[]} [options.whitelist] a whitelist of allowed image sizes/aliases
     * @param {object} [options.aliases] a map of size aliases and their corresponding sizes (e.g. { "small": "100x100" })
     * @param {string} [options.subdirectory] directory which preceeds the size key in the media URL (e.g. localhost:3000/subdirectory/x300/img.jpeg)
     * @param {object} [options.sources] map of aliases for subdirectories within the storage location (i.e. the directories within the root directory in which the media is stored)
     * @param {object} [options.store] (see lib/stores for options) configurations for the storage mechanisms (either local filesystem or AWS S3)
     * @param {object} [options.cache] (see lib/caches for options) configuration for the data caching (either local memory or a REDIS instance) (e.g. track which images are currently being processed)
     * @param {number} [options.post = 3000] the port on the local instance on which to run the server
     */
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
    
    /**
     * Starts the media server
     * 
     * @param {number} [port] the port to run the server on 
     */
    start(port) {
        port = isNaN(port) ? this.port : parseInt(port, 10)
        console.log('Listening on port ' + port)

        // health check handler
        app.get('/health', (req, res) => {
            res.send('ALIVE')
        })

        // media request handler
        app.get(this.subdirectory + '*', (req, res) => {
            let _this = this
            let parts = req.path.replace(this.subdirectory, '').split('/')
            let key, source, width, height

            // if a source was used, extract it from the url segments
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
                
                // whitelist check
                if (this.whitelist.length && !(this.whitelist.indexOf(parts[0]) >= 0 || this.whitelist.indexOf(alias) >= 0)) {
                    return res.status(400).send()
                }
                
                key = parts[1]
                let size = parts[0].toLowerCase().split('x')
                width = size[0] ? parseInt(size[0], 10) : undefined
                height = size[1] ? parseInt(size[1], 10) : undefined
                
                // handle invalid media sizes
                if ((width !== undefined && isNaN(width)) || (height !== undefined && isNaN(height))) {
                    return res.status(400).send()
                }
            } else  {
                // 404 on any other invalid URL scheme
                return res.status(404).send()
            }
            
            // begin by checking if media file appears in processing cache
            checkCache('PROC:'+req.path)
            
            // check if the key for this media file exists in the processing cache.
            // if it does, use Fib sequence to wait for processing to finish, or error on timeout
            let timeout = 100
            let _timeout = 100
            function checkCache(_key) {
                _this.cache
                    .exists(_key)
                    .then(is_processing => {
                        if (is_processing) {
                            timeout = _timeout + (_timeout = timeout) // Fibbin it up son
                            setTimeout(() => { checkCache(_key) }, timeout)
                        } else {
                            checkIfExists()
                        }
                    })
                    .catch(code => { // return errors
                        res.status(code).send()
                    })
            }

            // checks if the given file in the given size exists, 
            function checkIfExists() {
                _this.store
                    .exists(key, source, width, height)
                    .then(exists => {
                        if (exists) {
                            getStreamFromStorage()
                        } else {
                            getResized()
                        }
                    })
                    .catch(code => { // return errors
                        res.status(code).send()
                    })
            }
            
            // fetch the existing image file from storage
            function getStreamFromStorage() {
                let stream = _this.store.stream(key, source, width, height)
                stream.on('data', data => {
                    // forward image data to response
                    res.write(data)
                })
                stream.on('end', () => {
                    // close response
                    res.end();
                })
                stream.on('error', err => {
                    // handle errors
                    console.error('Error streaming media file')
                    console.error('Key: %s, Source: %s, Width: %s, Height: %s', key, source, width, height)
                    console.error('Error: ', err.message)
                    console.error('Stack: ', err.stack)
                    res.status(500).send()
                })
            }
            
            // fetch the original image and generate a new version of the given size
            function getResized() {
                _this.cache.set('PROC:'+req.path).then()
                _this.store
                    .generate(key, source, width, height)
                    .then(done)
                    .catch(code => { // return errors
                        res.status(code).send()
                    })
            }
            
            // forward the given buffer to the response
            function done(buffer) {
                // remove from pending cache
                _this.cache.unset('PROC:'+req.path)
                // set the necessary headers and return the image file
                _this.store
                    .getBufferData(buffer)
                    .then(data => {
                        res.set('Content-Type', data['Mime type'])
                        res.end(buffer, 'binary')
                    })
                    .catch(err => {
                        console.log('Error fetching buffer data')
                        res.status(500).send()
                    })
            }
        })
        
        // 404 handler
        app.all('*', (req, res) => {
            res.status(404).send()
        })
        
        // initialize the storage mechanism and start listening for requests
        this.store
            .init()
            .then(() => { app.listen(port) })
            .catch(err => { throw err })
    }
}

module.exports = Server