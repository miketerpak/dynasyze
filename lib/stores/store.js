'use strict'

const
    gm = require('gm'),
    path = require('path')

/**
 * Abstract Store class for methods of storing media files
 */
class Store {
    
    /**
     * Constructor
     * 
     * @param {object} [options]
     * @param {number} [options.max_height] the maximum height allowed for an image
     * @param {number} [options.max_width] the maximum width allowed for an image
     * @param {string} [options.separator] the path delimeter for the given storage service (e.g. '\' for windows, '/' for unix and aws)
     * @param {string} [options.root] the root directory of the image files within the filesystem
     * @param {string} [options.raw] the directory in root that holds the raw image files (leave empty if raws are kept in root)
     * @param {boolean} [options.keep = true] if true, save all resized versions of images. if false, discard them
     * @param {boolean} [options.inflate = false] if true and the requested dimensions exceed the media size, enlarge to fill the container. if false, ignore resize and return full image
     * @param {boolean} [options.imageMagick = false] if true, use ImageMagick. if false, use GraphicsMagick
     */
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
    
    /*ABSTRACT*/ exists(key, source, width, height) { throw Error('ABSTRACT FUNCTION INVOKED: Store#exists') }
    /*ABSTRACT*/ get(key, source, width, height) { throw Error('ABSTRACT FUNCTION INVOKED: Store#get') }
    /*ABSTRACT*/ init() { throw Error('ABSTRACT FUNCTION INVOKED: Store#init') }
    /*ABSTRACT*/ save(path, buffer) { throw Error('ABSTRACT FUNCTION INVOKED: Store#save') }
    /*ABSTRACT*/ stream(path) { throw Error('ABSTRACT FUNCTION INVOKED: Store#stream') }
    
    /**
     * 
     * @param {*} key 
     * @param {*} source 
     * @param {*} width 
     * @param {*} height 
     */
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
    
    /**
     * Fetch the metadata of the image from its buffer
     * 
     * @param {Buffer} buffer 
     * 
     * @returns {object} map of image metadata
     */
    getBufferData(buffer) {
        return new Promise((resolve, reject) => {
            this.gm(buffer).identify((err, data) => {
                if (err) reject(err)
                else resolve(data)
            })
        })
    }
    
    /**
     * Convert the width and height provided into a dimensional string with a trailing path separator
     * 
     * @param {number} [width] 
     * @param {number} [height]
     * 
     * @returns {string} the size prefix for the resized image (e.g. 100x200/, x100/, 300/, etc)
     */
    makePrefix(width, height) {
        if (width && height) return ''+width+'x'+height+this.separator
        else if (width) return ''+width+this.separator
        else if (height) return 'x'+height+this.separator
        else return this.raw+this.separator
    }
    
    /**
     * Compile a path to the given media target
     * 
     * @param {string} key the name of the media file
     * @param {string} [source] the subdirectory location of the media file within root
     * @param {number} [width] the width of the media 
     * @param {number} [height] the height of the media
     * 
     * @returns {string} path representing the location of the provided media file
     */
    makePath(key, source = '', width, height) {
        return this.root + (source ? source + this.separator : source) + this.makePrefix(width, height) + key
    }
    
    /**
     * Resizes the given media file buffer based on the provided dimensions
     * 
     * @param {Buffer} original 
     * @param {number} [width] 
     * @param {number} [height]
     * 
     * @returns {Promise<Buffer>}
     */
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