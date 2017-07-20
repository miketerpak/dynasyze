'use strict'

const
    fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    
    Store = require('./store')

class LocalStore extends Store {
    
    constructor(options = {}) {
        options.root = options.root || path.join(path.dirname(require.main.filename), 'content/')
        
        if (path.isAbsolute(options.root)) options.root = path.normalize(options.root+'/')
        else options.root = path.join(path.dirname(require.main.filename), options.root+'/')
               
        super(options)
    }

    /**
     * Checks if the file with the given properties exists
     * 
     * @param {*} key filename of media
     * @param {*} [source] subdirectory of media within root
     * @param {*} [width] width of media
     * @param {*} [height] height of media
     * 
     * @returns {Promise<boolean>}
     */
    exists(key, source, width, height) {
        let _path = this.makePath(key, source, width, height)
        return new Promise((resolve, reject) => {
            fs.stat(_path, (err, stats) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        resolve(false)
                    } else {
                        console.error('Error checking if file exists "%s"', _path)
                        console.error('Error: ', err.message)
                        console.error('Stack: ', err.stack)
                        reject(500)
                    }
                } else {
                    resolve(true)
                }
            })
        })
    }
    
    /**
     * Fetches the buffer of the media file with the given properties
     * 
     * @param {*} key filename of media
     * @param {*} [source] subdirectory of media within root
     * @param {*} [width] width of media
     * @param {*} [height] height of media
     * 
     * @returns {Promise<boolean>}
     */
    get(key, source, width, height) {
        let _path = this.makePath(key, source, width, height)
        return new Promise((resolve, reject) => {
            fs.readFile(_path, (err, buffer) => {
                if (!err) resolve(buffer)
                else if (err.code === 'ENOENT') resolve()
                else {
                    console.log('Error getting file "%s"', _path)
                    console.log('Error: ', err)
                    reject(500)
                }
            })
        })
    }
    
    /**
     * Initializes the file system store
     * 
     * @returns {Promise}
     */
    init() {
        console.log('Initializing local file store at directory "%s"', this.root)
        return new Promise((resolve, reject) => {
            mkdirp(path.join(this.root, this.raw), err => {
                if (err) {
                    console.error('Could not initialize local file store!')
                    reject(err)
                } else {
                    console.log('Successfully initialized file store!')
                    resolve()
                }
            })
        })
    }
    
    /**
     * Save the image to the file system
     * 
     * @param {string} _path image destination
     * @param {Buffer} buffer image data
     * 
     * @returns {Promise}
     */
    save(_path, buffer) {
        return new Promise((resolve, reject) => {
            mkdirp(path.dirname(_path), err => {
                if (err) return reject(err)
                fs.writeFile(_path, buffer, err => {
                    if (err) {
                        console.error('Error saving image to path "%s"', _path)
                        console.error('Error: ', err.message)
                        console.error('Stack: ', err.stack)
                        reject(500)
                    } else {
                        resolve()
                    }
                })
            })
        })
    }
    
    /**
     * Create a readable stream to the media
     * 
     * @param {*} key filename of media
     * @param {*} [source] subdirectory of media within root
     * @param {*} [width] width of media
     * @param {*} [height] height of media
     * 
     * @returns {Stream}
     */
    stream(key, source, width, height) {
        return fs.createReadStream(this.makePath(key, source, width, height))
    }
}

module.exports = LocalStore