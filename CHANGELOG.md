# Change Log

This file documents all notable changes to pluggable-json. The release numbering uses [semantic versioning](http://semver.org).

## 0.2.0

Released 2016-02-25

### Major Changes
NOTICE: This release includes that changes the serialization format.
- Serialization format changes [[#7](https://github.com/juttle/pluggable-json/pull/7)]
 - change default separator to '$' instead of ':'
 - encode serializer type into object property instead of object key
 - add the separator both at the beginning of the serialized string and between the serializer type and serialized value

## 0.1.4

Released 2016-02-16

### Bug Fixes

- fix bug where separators in object keys and array values weren't being properly escaped. [[#4](https://github.com/juttle/pluggable-json/pull/4)]

## 0.1.3

Released 2016-01-21

### Bug Fixes

- Make pluggable-json compatible with commonjs `require()`. [[#2](https://github.com/juttle/pluggable-json/pull/2)]

## 0.1.2

Released 2016-01-11

### Bug Fixes

- Built `lib` folder should be included in npm package. [[#1](https://github.com/juttle/pluggable-json/pull/2)]

## 0.1.1

Released 2016-01-08

### Bug Fixes

- Fixed travis badge URL.

## 0.1.0

Released 2016-01-08

- Initial release.
