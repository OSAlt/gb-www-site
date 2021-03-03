const path = require('path');
const isBuffer = require('buffer').Buffer.isBuffer;

function normalize (str) {
    return str && path.normalize(str);
}

function stripStartingSep (str) {
    return str && normalize(str).replace(/^[\\/]+/, '');
}

function stripTrailingSep (str) {
    return str && normalize(str).replace(/[\\/]+$/, '');
}

function isStream (contents) {

    let pipe = contents && contents.pipe;

    if (pipe && typeof pipe === 'function') {
        return true;
    } else {
        return false;
    }

}

function unixify (str) {
    return str.replace(/\\+/g, '/');
}

exports.normalize = normalize;
exports.stripStartingSep = stripStartingSep;
exports.stripTrailingSep = stripTrailingSep;
exports.isStream = isStream;
exports.isBuffer = isBuffer;
exports.unixify = unixify;
