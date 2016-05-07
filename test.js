const Dynasyze = require('./index')
const fs = require('fs')

let Server = Dynasyze.Server({
    store: Dynasyze.Stores.Local({})
})

Server.start()