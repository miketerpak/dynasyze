# **dynasyze**
A standalone media server that dynamically resizes and crops image files

## WARNING

    THE PLATFORM IS CURRENTLY NONFUNCTIONAL VIA THE USAGE BELOW.  IT MUST BE INSTALLED
    LOCALLY AND RUN VIA "node /path/to/dynasyze/index.js" WITH THE LOCAL CONFIG BEING 
    USED/MODIFIED.  ALIAS SUPPORT FOR CLI ACCESS NEXT TO BE IMPLEMENTED

## Installing

Requires Node 5.0.0+

    npm install -g dynasyze
    
[GraphicsMagick](http://www.graphicsmagick.org/README.html) or [ImageMagick](http://www.imagemagick.org/script/binary-releases.php)
    
## Usage

    dynasyze --config /path/to/config.json
    
#### Example request

    http://localhost:3000/300x300/test.jpeg
    
## Help
    
    dynasyze --help

## config.json

#### Options

`port` - Local port on which to run the media server

`whitelist` - If not empty, only size strings that appear within this array will be accepted.

`aliases` - Map of custom directory names and their corresponding size string. (e.g. `{ "small": "300x300" }`)

`store` - Storage settings

`store.max_width` - Maximum width able to be requested (`null` for no max)

`store.max_height` - Maximum height able to be requested (`null` for no max)

`store.root` - The root directory for media storage

`store.raw` - The directory containing the original media files (`""` or `null` for same as root)

`store.keep` - `true` to keep resized media, `false` to discard

`store.inflate` - If `true` and the requested size is larger than the requested image, inflated the image to fill the container

`store.aws` - Parameters for using AWS S3 for media storage.  If null, uses local filesystem

`store.aws.accessKeyID` - AWS access key ID

`store.aws.secretAccessKey` - AWS secret access key

`store.aws.region` - Region of S3 Bucket

`store.aws.bucket` - Bucket for media storage

`cache` - Cache settings, used to track processing images and allow subsequent calls to wait on the processing file

`cache.expire_after` - Seconds to wait before timing out on a processing image

`cache.redis` - Parameters for creating a redis client (see package [redis](https://www.npmjs.com/package/redis#rediscreateclient)).  If null, uses `Map` object

#### Default
```json
{
    "port": 3000,
    "whitelist": [ ],
    "aliases": { },
    "store": {
        "max_width": null,
        "max_height": null,
        "root": "",
        "raw": "raw",
        "keep": true,
        "inflate": false,
        "imageMagick": false,
        "aws": null
    },
    "cache": {
        "expire_after": 15,
        "redis": null
    }
}
```

## Notes

When requesting a size that is not proportional to the original image, the content is centered and cropped.  Currently, this gravity of the cropping is not optional.

## License

[MIT](https://raw.githubusercontent.com/miketerpak/needs-params/master/LICENSE)