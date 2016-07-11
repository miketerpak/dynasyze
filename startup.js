'use strict'

// TODO Implement when npm has permissions to create aliases

const os = require('os')
const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec

const HOME_DIR = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME']

function setupUnix(file_loc) {
    let payload = `alias dynasyze='node ${path.resolve('./index.js')}'`
    fs.readFile(file_loc, (err, data) => {
        if (err && err.code !== 'ENOENT') {
            throw err
        } else if (!err) {
            payload = data.toString().replace(/((\r)?\nalias dynasyze.*)+/, '') + '\n' + payload
        }

        fs.writeFile(file_loc, payload, err => {
            if (err) throw err
            exec(payload)
        })
    })
}

switch (os.platform()) {
    case 'linux':
        setupUnix('/etc/bash.bashrc')
        break
    case 'darwin':
        setupUnix(path.join(HOME_DIR, '.bash_profile'))
        break
    case 'win32':
    case 'win64':
        exec('DOSKEY dynasyze=node "%APPDATA%\npm\node_modules\dynasyze\index.js"')
        break
}
