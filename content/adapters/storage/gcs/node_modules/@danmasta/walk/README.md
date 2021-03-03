# Walk
Directory and file walking utility for node apps

Features:
* Easy to use
* Simple, lightweight, and fast
* Sync, async, streams, and promise api
* Simple filtering with glob pattern matching
* Require file contents, or read as stream, buffer, or string
* Resolves require-style path strings
* Normalized file objects with helper methods
* Fast pattern matching via [micromatch](https://github.com/micromatch/micromatch)
* Include and exclude pattern matching options
* Only 2 dependencies: [micromatch](https://github.com/micromatch/micromatch), [lodash](https://github.com/lodash/lodash)

## About
I needed a better way to walk directories and read files during build and/or run time. I wanted an api that was simple, supported glob pattern matching like gulp, and returned objects with a similar format as vinyl. This package allows you to simply read any directory (or file), return an array of objects, and filter results with glob pattern matching. It can also require file contents, or read them as strings, streams, or buffers, and resolve require-style path strings.

## Usage
Add walk as a dependency for your app and install via npm
```bash
npm install @danmasta/walk --save
```

Require the package in your app
```javascript
const walk = require('@danmasta/walk');
```
By default walk returns a readable stream interface. You can use the methods: `promise()`, `map()`, `each()`, and `sync()` to consume file objects via promises or as a synchronous array.

### Options
name | type | description
-----|----- | -----------
`cwd` | *`string`* | Base directory to start walk from. Default is `process.cwd`
`root` | *`string`* | Directory or file path as root to walk from. This gets normalized as `path.resolve(cwd, root)`. Default is `./`
`require` | *`boolean`* | If true, `file.contents` will be a resolved object using `require`. Default is `false`
`stream` | *`boolean`* | If true, `file.contents` will be a `Readable` stream. Default is `false`
`read` | *`boolean\|string`* | If `true`, will read file contents as a buffer or string. If string, accepts either `'require'`, `'stream'`, or `'contents'`. Default is `false`
`contents` | *`boolean`* | If true, will read file contents as string. Default is `false`
`buffer` | *`boolean`* | If true, when reading file conents, contents will remain a buffer instead of being converted to a string. Default is `false`
`src` | *`Array\|String\|RegExp`* | [Micromatch pattern](https://github.com/micromatch/micromatch#matcher) for result filtering by including any matches. Can be a path string, glob pattern string, regular expression, or an array of strings. Defaults to `*(../)*(**/)*`
`ignore` | *`Array\|String\|RegExp`* | [Micromatch pattern](https://github.com/micromatch/micromatch#matcher) for result filtering by ignoring any matches. Can be a path string, glob pattern string, regular expression, or an array of strings. Defaults to `*(../)*(**/)(.git\|node_modules)`
`dot` | *`boolean`* | Whether or not to include dot files when matching. Default is `true`
`resolve` | *`boolean`* | Whether or not to attempt to resolve file paths if not found. Default is `true`

### Methods
Name | Description
-----|------------
`promise()` | Returns a promise that resolves with an array of file objects
`map(fn)` | Runs an iterator function over each file. Returns a promise that resolves with the new `array`
`each(fn)` | Runs an iterator function over each file. Returns a promise that resolves with `undefined`
`sync()` | Walks files and directories in syncronous mode. Returns an array of file objects
`require()` | Enables reading of file contents by requiring them
`stream()` | Enables reading of file contents as a stream
`buffer()` | Enables reading of file contents as a buffer
`contents(str)` | Enables reading of file contents. First parameter can be: `'require'`, `'stream'`, or `'buffer'`
`resolveFilePath(str)` | Resolve a file path relative to options


## File Objects
Each file returned from walk has the following signature
### Properties
name | type | description
-----|----- | -----------
`cwd` | *`string`* | Current working directory. Defaults to `process.cwd`
`root` | *`string`* | Base directory to use for relative pathing. Defaults to `cwd`
`path` | *`string`* | Absolute path of the file on disk
`relative` | *`string`* | Relative path of file based from normalized `root`
`relativeFromCwd` | *`string`* | Relative path of file based from normalized `cwd`
`dir` | *`string`* | Parent directory where file is located
`base` | *`string`* | File name with extension
`name` | *`string`* | File name without extension
`ext` | *`string`* | File extension
`stat` | *`object`* | The [fs.stat](https://nodejs.org/api/fs.html#fs_class_fs_stats) object for the file
`contents` | *`string\|object`* | Contents of the file. If `require` is `true`, will be resolved `object`, otherwise `string`. Default is `null`

### Methods
name | description
-----| -----------
`isBuffer` | Returns `true` if `file.contents` is a [`buffer`](https://nodejs.org/api/buffer.html#buffer_class_method_buffer_isbuffer_obj)
`isStream` | Returns `true` if `file.contents` is a [`stream`](https://nodejs.org/api/stream.html)
`isNull` | Returns `true` if `file.contents` is `null`
`isString` | Returns `true` if `file.contents` is a `string`
`isDirectory` | Returns `true` if the file is a [directory](https://nodejs.org/api/fs.html#fs_stats_isdirectory)
`isSymbolic` | Returns `true` if the file is a [symbolic link](https://nodejs.org/api/fs.html#fs_stats_issymboliclink)
`isBlockDevice` | Returns `true` if the file is a [block device](https://nodejs.org/api/fs.html#fs_stats_isblockdevice)
`isCharacterDevice` | Returns `true` if the file is a [character device](https://nodejs.org/api/fs.html#fs_stats_ischaracterdevice)
`isFIFO` | Returns `true` if the file is a [first-in-first-out (FIFO) pipe](https://nodejs.org/api/fs.html#fs_stats_isfifo)
`isFile` | Returns `true` if the file is a [file](https://nodejs.org/api/fs.html#fs_stats_isfile)
`isSocket` | Returns `true` if the file is a [socket](https://nodejs.org/api/fs.html#fs_stats_issocket)
`isEmpty` | Returns `true` if the file is empty (zero bytes)


## Examples
```js
const walk = require('@danmasta/walk');
```
Walk the current working directory and pipe all files to a destination stream
```js
walk('./').pipe(myDestinationStream());
```

Walk the current working directory, exclude all `.json` files
```js
walk('./', { src: '**/*.!(json)' }).promise().then(res => {
    console.log('files:', res);
});
```
Walk a child directory, include only `.json` files
```js
walk('./config', { src: '**/*.json' }).promise().then(res => {
    console.log('files:', res);
});
```
Walk a directory using an absolute path
```js
walk('/usr/local').promise().then(res => {
    console.log('files:', res);
});
```

Read the contents of all `pug` files in `./views`
```js
walk('./views', { src: '**/*.pug', contents: true }).promise().then(res => {
    console.log('templates:', res);
});
```
Read the contents of all `pug` files in `./views` as a `buffer`
```js
walk('./views', { src: '**/*.pug', buffer: true }).promise().then(res => {
    console.log('templates:', res);
});
```

Require all `js` files in the `./routes` directory and run a callback for each one
```js
walk('./routes', { src: '**/*.js', require: true }).each(route => {
    app.use(route());
}).then(() => {
    console.log('all routes loaded');
});
```

Load all templates from the `./views` directory synchronously
```js
const templates = walk('./views', { src: '**/*.pug' }).sync();
console.log('templates:', templates);
```

## Testing
Testing is currently run using mocha and chai. To execute tests just run `npm run test`. To generate unit test coverage reports just run `npm run coverage`

## Contact
If you have any questions feel free to get in touch
