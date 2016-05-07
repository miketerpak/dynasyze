'use strict'

const
    fs = require('fs'),
    path = require('path'),
    
    Store = require('./store')

class LocalStore extends Store {
    
    constructor(options = {}) {
        options.root = options.root || path.join(path.dirname(require.main.filename), 'content/')
        
        if (path.isAbsolute(options.root)) options.root = path.normalize(options.root+'/')
        else options.root = path.join(path.dirname(require.main.filename), options.root+'/')
               
        super(options)
    }
    
    get(key, width, height) {
        let _path = this.makePath(key, width, height)
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
    
    init() {
        console.log('Initializing local file store at directory "%s"', this.root)
        return new Promise((resolve, reject) => {
            this.mkdirp(this.root)
                .then(() => {
                    console.log('Successfully initialized file store!')
                    resolve()
                })
                .catch(err => {
                    console.error('Could not initialize local file store!')
                    reject(err)
                })
        })
    }
    
    mkdirp(_path) {
        return new Promise((resolve, reject) => {
            fs.mkdir(_path, err => {
                if (!err || err.code === 'EEXIST') {
                    resolve()
                } else if (err.code === 'ENOENT') {
                    this.mkdirp(path.join(_path, '..')).then(() => {
                        this.mkdirp(_path).then(resolve).catch(reject)
                    }).catch(reject)
                }else {
                    console.error('Error %s initializing content directory "%s" on directory "%s": %s', err.code, this.root, _path, err.message)
                    reject(err)
                }
            })
        })
    }
    
    save(_path, buffer) {
        return new Promise((resolve, reject) => {
            this.mkdirp(path.dirname(_path))
                .then(() => {
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
                .catch(reject)
        })
    }
}

module.exports = LocalStore