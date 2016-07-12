'use strict'

const
    gm = require('gm'),
    path = require('path')
    
class Store {
    
    constructor({ 
        max_width,
        max_height,
        separator = path.sep,
        root = '',
        raw = '',
        keep = true,
        inflate = false,
        imageMagick = false 
    }) {
        // this.auth = auth TODO
        this.__class = 'Store'
        this.keep = keep
        this.maxw = max_width
        this.maxh = max_height
        this.inflate = inflate
        this.root = root
        this.raw = raw
        this.gm = gm.subClass({imageMagick: imageMagick})
        this.separator = separator
        
        if (this.root && this.root[this.root.length-1] !== this.separator) {
            this.root += this.separator
        }
    }
    
    /*ABSTRACT*/ get(key, source, width, height) { throw Error('ABSTRACT FUNCTION INVOKED: Store.get') }
    /*ABSTRACT*/ init() { throw Error('ABSTRACT FUNCTION INVOKED: Store.init') }
    /*ABSTRACT*/ save(path, buffer) { throw Error('ABSTRACT FUNCTION INVOKED: Store.save') }
    
    generate(key, source, width, height) {
        let _this = this
        return new Promise((resolve, reject) => {
            this.get(key, source)
                .then(resizeImage)
                .catch(reject)
                
            function resizeImage(_buffer) {
                if (!_buffer) return reject(404)
                
                _this.resize(_buffer, width, height)
                    .then(buffer => {
                        // Save the image to the store, if set to
                        if (!_this.keep) return resolve(buffer)
                        _this.save(_this.makePath(key, source, width, height), buffer)
                            .then(() => { resolve(buffer) })
                            .catch(reject)
                    })
                    .catch(reject)
            }
        })
    }
    
    getBufferData(buffer) {
        return new Promise((resolve, reject) => {
            this.gm(buffer).identify((err, data) => {
                if (err) reject(err)
                else resolve(data)
            })
        })
    }
    
    makePrefix(width, height) {
        if (width && height) return ''+width+'x'+height+this.separator
        else if (width) return ''+width+this.separator
        else if (height) return 'x'+height+this.separator
        else return this.raw+this.separator
    }
    
    makePath(key, source = '', width, height) {
        return this.root + (source ? source + this.separator : source) + this.makePrefix(width, height) + key
    }
    
    resize(original, width, height) {
        return new Promise((resolve, reject) => {
            if (this.maxw && width > this.maxw) {
                console.warn('Invalid Width')
                console.warn('Max width: ', this.maxw)
                console.warn('Requested width: ', width)
                return reject(400) // Invalid request
            } else if (this.maxh && height > this.maxh) {
                console.warn('Invalid Height')
                console.warn('Max height: ', this.maxh)
                console.warn('Requested height: ', height)
                return reject(400) // Invalid request
            }

            let image = this.gm(original)
            image.size((err, size) => {
                if (err) {
                    if (err.code === 1) {
                        console.warn('Key Not Found: ', original)
                        return reject(404)
                    } else {
                        console.error('GM.size  Error: ', err)
                        return reject(500)
                    }
                }
                
                if (!this.inflate) {
                    if (width && width > size.width) width = size.width
                    if (height && height > size.height) height = size.height
                }
                
                let orig_ratio = size.width / size.height
                let new_ratio = width / height
                let _width = Math.floor(height * orig_ratio)
                let _height = Math.floor(width / orig_ratio)
                
                if (!width || !height || orig_ratio === new_ratio){
                    image.resizeExact(width || (height * orig_ratio), height || (width / orig_ratio))
                } else {
                    if (orig_ratio > new_ratio) {
                        image
                            .resizeExact(_width, height)
                            .crop(width, height, Math.floor((_width - width) / 2), 0)
                    } else {
                        image
                            .resizeExact(width, _height)
                            .crop(width, height, 0, Math.floor((_height - height) / 2))
                    }
                }
                
                image.toBuffer((err, buffer) => {
                    if (err) {
                        console.error('GM.toBuffer Error: ', err)
                        reject(500)
                    } else {
                        resolve(buffer)
                    }
                })
            })
        })
    }
}

module.exports = Store