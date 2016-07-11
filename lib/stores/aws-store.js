'use strict'

const
    aws = require('aws-sdk'),
    
    Store = require('./store')

class AWSStore extends Store {
    
    constructor(options) {
        let {
            accessKeyID,
            secretAccessKey,
            region,
            bucket
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
    
    get(key, width, height) {
        key = this.makePath(key, width, height).replace('//','/')
        return new Promise((resolve, reject) => {
            this.s3.getObject({
                Bucket: this.bucket,
                Key: key
            }, (err, data) => {
                if (err) {
                    if (err.statusCode === 404) {
                        resolve()
                    } else {
                        console.error('Error checking if object exists at key "%s"', key)
                        console.error(err)
                        reject(500)
                    }
                } else {
                    resolve(data.Body)
                }
            })
        })
    }
    
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
}

module.exports = AWSStore