# **dynasyze**
A standalone server that dynamically resizes and crops image files

## Installing

Requires Node 5.0.0+

    npm install dynasize
    
[GraphicsMagick](http://www.graphicsmagick.org/README.html) or [ImageMagick](http://www.imagemagick.org/script/binary-releases.php)
    
## Usage

    const dynasyze = require('dynasyze')
    
### dynasyze.Caches

Caches are used to store the currently processing keys.  If a client makes a request to the server and the requested key appears in the cache, the client will wait until the image is done processing.

#### `dynasyze.Caches.Memory({ expire_after = 15 } = {})`

Cache is stored within the context of the application

Parameters
-   `expire_after` Amount of seconds allow for image processing before resetting the connection.

#### `dynasyze.Caches.Redis({ redis, expire_after = 15 } = {})`

Cache is stored on REDIS server via provided client

Parameters
-   `redis` Redis client (generated via package `redis`)
-   `expire_after` Amount of seconds allow for image processing before resetting the connection.

### dynasyze.Stores

Stores are the places from which data will be fetched and saved by this server.  Currently, the following options are supported for storage:

#### `dynasyze.Stores.Local({ max_width, max_height, root = '', keep = true, inflate = false, imageMagick = false })`

Images are stored on the local filesystem, within a centralized media directory.

Parameters
-   `max_width` (optional) The maximum width allowed in a request
-   `max-height` (optional) The maximum height allowed in a request
-   `root` The root directory within which to fetch/store images.  **NOTE: root directory must contain directory `raw` for storing all original images**
-   `keep` If server should save the processed images and fetch it in the future instead of generating it every for request
-   `inflate` If the image should be inflated so it covers the requested dimensions (trims overflow content).
-   `imageMagick` If true, GM will use imageMagick instead of GM  

#### `dynasyze.Stores.AWS({ ... , aws: { accessKeyID, secretAccessKey, region, bucket, prefix = '' } })`
    
Images are stored in the provided AWS S3 bucket and subdirectory

Parameters
-   `max_width` (optional) The maximum width allowed in a request
-   `max-height` (optional) The maximum height allowed in a request
-   `keep` If server should save the processed images and fetch it in the future instead of generating it every for request
-   `inflate` If the image should be inflated so it covers the requested dimensions (trims overflow content).
-   `imageMagick` If true, GM will use imageMagick instead of GM 

-   `aws`
-   `aws.accessKeyID` AWS S3 Access Key ID
-   `aws.secretAccessKey`AWS S3 Secret Access Key
-   `aws.region` Region of S3 bucket 
-   `aws.bucket` Name of S3 bucket
-   `aws.prefix` Subdirectory to work within. **NOTE: the root directory must contain `raw` directory for storing all original images**

### dynasyze.Server({ port = 3000, store = dynasyze.Stores.Local(), cache = dynasyze.Caches.Memory() })

The server which runs the image processor, powered with `express`, using the provided or default `Store` and `Cache`

Parameters
-   `port` The port on which to run the server
-   `store` Either an initialized Store object, the parameters to create one (see above), or nothing the default local storage.
-   `cache` Either an initialized Cache object, the parameters to create one (see above), or nothing the default memory cache.

## Implementation

In order to implement **Dynasyze**, `require` it within your code and start the server

For example:
```javascript
const dynasyze = require('./index')
const redis = require('redis')

let Server = dynasyze.Server({
    port: 4040,
    // Automatically initialize a redis cache by provide a redis client
    cache: {
        redis: redis.createClient(...)
    },
    // Create an AWS store using the provided class
    store: dynasyze.Stores.AWS({
        keep: true,
        inflate: true,
        aws: {
            accessKeyID: 'TESTTESTTESTTESTTEST',
            secretAccessKey: '121213434356565787879090912121232345+45',
            bucket: 'com.test.images.raw',
            prefix: 'images',
            region: 'us-east-1'
        }
    })
})

// Start the server
Server.start()
```

## License
[MIT](https://raw.githubusercontent.com/miketerpak/needs-params/master/LICENSE)