const path = require('path');
const _ = require('lodash');
const util = require('./util');

const defaults = {
    cwd: process.cwd(),
    root: null,
    path: null,
    relative: null,
    relativeFromCwd: null,
    dir: null,
    base: null,
    name: null,
    ext: null,
    stat: null,
    contents: null
};

class File {

    constructor (opts) {

        _.defaults(this, opts, defaults);

        this.root = this.root ? util.stripTrailingSep(this.root) : this.cwd;

        if (!this.path && this.relative) {
            this.path = util.normalize(path.join(this.root, this.relative));
        }

        if (!this.path) {
            throw new Error('File Error: path or relative field is required');
        }

        this.relative = path.relative(this.root, this.path);
        this.relativeFromCwd = path.relative(this.cwd, this.path);
        this.dir = path.dirname(this.path);
        this.base = path.basename(this.path);
        this.ext = path.extname(this.path);
        this.name = path.basename(this.path, this.ext);

    }

    isBuffer () {
        return util.isBuffer(this.contents);
    }

    isStream () {
        return util.isStream(this.contents);
    }

    isNull () {
        return this.contents === null;
    }

    isString () {
        return typeof this.contents === 'string';
    }

    isDirectory () {
        return this.stat && this.stat.isDirectory();
    }

    isSymbolic () {
        return this.stat && this.stat.isSymbolicLink();
    }

    isBlockDevice () {
        return this.stat && this.stat.isBlockDevice();
    }

    isCharacterDevice () {
        return this.stat && this.stat.isCharacterDevice();
    }

    isFIFO () {
        return this.stat && this.stat.isFIFO();
    }

    isFile () {
        return this.stat && this.stat.isFile();
    }

    isSocket () {
        return this.stat && this.stat.isSocket();
    }

    isEmpty () {
        return this.stat && this.stat.size === 0;
    }

}

module.exports = File;
