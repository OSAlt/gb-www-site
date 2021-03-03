const Readable = require('stream').Readable;
const fs = require('fs');
const path = require('path');
const Promisify = require('util').promisify;
const micromatch = require('micromatch');
const _ = require('lodash');
const File = require('./file');
const util = require('./util');

const readdirAsync = Promisify(fs.readdir);
const statAsync = Promisify(fs.stat);
const readFileAsync = Promisify(fs.readFile);
const accessAsync = Promisify(fs.access);

const constants = {
    GLOBS: {
        all: '*(../)*(**/)*',
        ignore: '*(../)*(**/)(.git|node_modules)',
        dot: '*(../)*(**/)!(.)*'
    }
};

const defaults = {
    cwd: process.cwd(),
    root: './',
    require: false,
    stream: false,
    read: false,
    contents: false,
    buffer: false,
    src: constants.GLOBS.all,
    dot: true,
    ignore: constants.GLOBS.ignore,
    encoding: null,
    objectMode: true,
    resolve: true
};

class NotFoundError extends Error {
    constructor (str) {
        let msg = `File or Directory Not Found: ${str}`;
        super(msg);
        Error.captureStackTrace(this, NotFoundError);
        this.name = 'NotFoundError';
        this.code = 'PATHNOTFOUND';
        this.path = str;
    }
}

class NotResolvedError extends Error {
    constructor (str) {
        let msg = `Unable to Resolve File or Directory: ${str}`;
        super(msg);
        Error.captureStackTrace(this, NotResolvedError);
        this.name = 'NotResolvedError';
        this.code = 'PATHNOTRESOLVED';
        this.path = str;
    }
}

class Walk extends Readable {

    constructor (paths, opts) {

        if (_.isPlainObject(paths)) {
            [opts, paths] = [paths, opts];
        }

        if (paths) {
            if (!Array.isArray(paths)) {
                paths = [paths];
            }
        } else {
            paths = [];
        }

        opts = _.defaults(opts, defaults);

        super(opts);

        if (!opts.dot && opts.src === constants.GLOBS.all) {
            opts.src = constants.GLOBS.dot;
        }

        opts.root = util.stripTrailingSep(path.resolve(opts.cwd, opts.root));

        if (opts.require || opts.read === 'require') {
            opts.read = 'require';
        } else if (opts.stream || opts.read === 'stream') {
            opts.read = 'stream';
        } else if (opts.read || opts.contents || opts.buffer) {
            opts.read = 'contents';
        }

        this.opts = opts;
        this.include = null;
        this.exclude = null;

        if (opts.src) {
            this.include = micromatch.matcher(opts.src, { dot: opts.dot });
        }

        if (opts.ignore) {
            this.exclude = micromatch.matcher(opts.ignore, { dot: opts.dot });
        }

        this.queue = [];
        this.paths = paths;
        this.pending = 0;
        this.inFlight = 0;
        this.res = [];

    }

    _read () {
        this.readFromQueue();
    }

    resolveFilePath (str) {
        return path.resolve(this.opts.root, str);
    }

    addPathIfExists (str) {

        str = this.resolveFilePath(str);

        this.pending++;

        accessAsync(str, fs.constants.F_OK).then(() => {

            this.pending--;
            this.pushToQueue(str);
            this.readFromQueue();

        }).catch(err => {

            this.pending--;

            if (this.opts.resolve) {
                try {
                    str = require.resolve(str);
                    this.pushToQueue(str);
                    this.readFromQueue();
                } catch (err) {
                    this.emit('error', new NotResolvedError(str));
                }
            } else {
                this.emit('error', new NotFoundError(str));
            }

        });

    }

    pushToQueue (str) {
        this.queue.push(str);
    }

    readFromQueue () {

        while (this.paths.length) {
            this.addPathIfExists(this.paths.shift());
        }

        if (!this.inFlight) {
            if (!this.queue.length) {
                if (!this.pending) {
                    this.push(null);
                }
            } else {
                this.inFlight++;
                this.walkFileOrDir(this.queue.shift());
            }
        }

    }

    pushFile (file) {
        this.inFlight--;
        if (this.push(file)) {
            this.readFromQueue();
        }
    }

    getFileContents (file) {

        return Promise.resolve().then(() => {

            if (this.opts.read === 'require') {

                return require(file.path);

            } else if (this.opts.read === 'stream') {

                return fs.createReadStream(file.path);

            } else {

                return readFileAsync(file.path).then(buff => {
                    if (this.opts.buffer) {
                        return buff;
                    } else {
                        return buff.toString();
                    }
                });

            }

        }).then(contents => {

            file.contents = contents;

        }).then(() => {

            return file;

        });

    }

    readDir (str) {

        readdirAsync(str).then(list => {

            list.map(name => {

                let res = path.resolve(str, name);
                let rel = path.relative(this.opts.root, res);

                if (!this.exclude || !this.exclude(rel)) {
                    this.pushToQueue(res);
                }

            });

            this.inFlight--;
            this.readFromQueue();

        });

    }

    readFile (str, stat) {

        let root = this.opts.root;
        let cwd = this.opts.cwd;

        let file = new File({ path: str, stat, cwd, root });

        if (!this.include || this.include(file.relative || file.base)) {

            if (this.opts.read) {
                this.getFileContents(file).then(file => {
                    this.pushFile(file);
                });
            } else {
                this.pushFile(file);
            }

        } else {
            this.inFlight--;
            this.readFromQueue();
        }

    }

    walkFileOrDir (str) {

        statAsync(str).then(stat => {

            if (stat.isDirectory()) {
                this.readDir(str);
            } else {
                this.readFile(str, stat);
            }

        });

    }

    require () {
        this.opts.require = true;
        this.opts.read = 'require';
        return this;
    }

    stream () {
        this.opts.stream = true;
        this.opts.read = 'stream';
        return this;
    }

    buffer () {
        this.opts.buffer = true;
        this.opts.read = 'contents';
        return this;
    }

    contents (str) {

        this.opts.contents = true;

        if (str === 'require' || str === 'stream') {
            this.opts.read = str;
        } else if (str === 'buffer') {
            this.opts.buffer = true;
            this.opts.read = 'contents';
        } else {
            this.opts.read = 'contents';
        }

        return this;

    }

    iterateAsPromise (fn, collect) {

        this.on('data', file => {
            if (fn) {
                file = fn(file);
            }
            if (collect) {
                this.res.push(file);
            }
        });

        return new Promise((resolve, reject) => {
            this.once('end', () => {
                if (collect) {
                    resolve(this.res);
                } else {
                    resolve();
                }
            });
            this.once('error', err => {
                reject(err);
            });
        });

    }

    map (fn) {
        fn = _.isFunction(fn) ? fn : file => file;
        return this.iterateAsPromise(fn, true);
    }

    each (fn) {
        fn = _.isFunction(fn) ? fn : _.noop;
        return this.iterateAsPromise(fn, false);
    }

    promise () {
        return this.iterateAsPromise(null, true);
    }

    addPathIfExistsSync (str) {

        str = this.resolveFilePath(str);

        try {
            fs.accessSync(str, fs.constants.F_OK);
            this.pushToQueue(str);
        } catch (err) {
            if (this.opts.resolve) {
                try {
                    str = require.resolve(str);
                    this.pushToQueue(str);
                } catch (err) {
                    throw new NotResolvedError(str);
                }
            } else {
                throw new NotFoundError(str);
            }
        }

    }

    pushFileSync (file) {
        this.res.push(file);
    }

    getFileContentsSync (file) {

        if (this.opts.read === 'require') {

            file.contents = require(file.path);

        } else if (this.opts.read === 'stream') {

            file.contents = fs.createReadStream(file.path);

        } else {

            let buff = fs.readFileSync(file.path);

            if (this.opts.buffer) {
                file.contents = buff;
            } else {
                file.contents = buff.toString();
            }

        }

        return file;

    }

    readDirSync (str) {

        fs.readdirSync(str).map(name => {

            let res = path.resolve(str, name);
            let rel = path.relative(this.opts.root, res);

            if (!this.exclude || !this.exclude(rel)) {
                this.pushToQueue(res);
            }

        });

    }

    readFileSync (str, stat) {

        let root = this.opts.root;
        let cwd = this.opts.cwd;

        let file = new File({ path: str, stat, cwd, root });

        if (!this.include || this.include(file.relative || file.base)) {

            if (this.opts.read) {
                this.pushFileSync(this.getFileContentsSync(file));
            } else {
                this.pushFileSync(file);
            }

        }

    }

    walkFileOrDirSync (str) {

        let stat = fs.statSync(str);

        if (stat.isDirectory()) {
            this.readDirSync(str);
        } else {
            this.readFileSync(str, stat);
        }

    }

    readFromQueueSync () {
        this.walkFileOrDirSync(this.queue.shift());
    }

    sync () {

        while (this.paths.length) {
            this.addPathIfExistsSync(this.paths.shift());
        }

        while (this.queue.length) {
            this.readFromQueueSync();
        }

        return this.res;

    }

    static factory () {
        let Fn = this;
        return function walkFactory (...args) {
            return new Fn(...args);
        }
    }

    static get NotFoundError () {
        return NotFoundError;
    }

    static get NotResolvedError () {
        return NotResolvedError;
    }

}

module.exports = exports = Walk;
