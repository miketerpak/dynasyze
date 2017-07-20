'use strict'

const
    aws = require('aws-sdk'),
    
    Store = require('./store')

class AWSStore extends Store {
    
    constructor(options) {
        let {
            accessKeyID, // AWS access key ID
            secretAccessKey, // AWS access key secret
            region, // AWS bucket region
            bucket // AWS bucket name
        } = options.aws || {}
        options.separator = '/'
        
        super(options)
        
        if (!accessKeyID)       throw Error('Missing AWS Access Key ID [accessKeyID]')
        if (!secretAccessKey)   throw Error('Missing AWS Secret Access Key [secretAccessKey]')
        if (!region)            throw Error('Missing AWS Region [region]')
        if (!bucket)            throw Error('Missing Aws S3 Bucket [bucket]')
        
        aws.config.update({
            accessKeyId:        accessKeyID,
            secretAccessKey:    secretAccessKey,
            region:             region
        })
        
        this.s3 = new aws.S3()
        this.bucket = bucket
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
        key = this.makePath(key, source, width, height)
        return new Promise((resolve, reject) => {
            this.s3.headObject({
                Bucket: this.bucket,
                Key: key
            }, (err, data) => {
                if (err) {
                    if (err.statusCode === 404) {
                        resolve(false)
                    } else {
                        console.error('Error checking if object exists at key "%s"', key)
                        console.error(err)
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
        key = this.makePath(key, source, width, height).replace('//','/')
        return new Promise((resolve, reject) => {
            this.s3.getObject({
                Bucket: this.bucket,
                Key: key
            }, (err, data) => {
                if (err) {
                    if (err.statusCode === 404) {
                        resolve()
                    } else {
                        console.error('Error getting object at key "%s"', key)
                        console.error(err)
                        reject(500)
                    }
                } else {
                    resolve(data.Body)
                }
            })
        })
    }
    
    /**
     * Initialize the S3 bucket store connection
     * 
     * @returns {Promise}
     */
    init() {
        console.log('Initializing AWS S3...')
        return new Promise((resolve, reject) => {
            this.s3.headBucket({ Bucket: this.bucket }, (err, data) => {
                if (err) {
                    if (err.statusCode === 404) console.log('S3 Error: Bucket "%s" not found', this.bucket)
                    else if (err.statusCode === 401 || data.statusCode === 403) console.log('S3 Error: Unauthorized')
                    else console.error('Error initializing S3!')
                    reject(err)
                } else {
                    console.log('S3 successfully connected!')
                    resolve()
                }
            })
        })
    }
    
    /**
     * Save the image to S3
     * 
     * @param {string} _path image destination
     * @param {Buffer} buffer image data
     * 
     * @returns {Promise}
     */
    save(key, buffer) {
        return new Promise((resolve, reject) => {
            this.s3.putObject({
                Bucket: this.bucket,
                Key: key,
                Body: buffer
            }, (err, data) => {
                if (err) {
                    console.error('Error saving to S3 [key="%s"]', key)
                    console.error('Error: ', err.message)
                    console.error('Stack: ', err.stack)
                    reject(500)
                } else {
                    resolve()
                }
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
        return this.s3.getObject({
            Bucket: this.bucket,
            Key: this.makePath(key, source, width, height).replace('//','/')
        }).createReadStream()
    }
}

module.exports = AWSStore