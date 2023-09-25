"use strict";

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");
var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));
var _includes = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/includes"));
new _promise.default(function (resolve) {
  resolve();
});
var arr = [1, 2, 3];
console.log((0, _includes.default)(arr).call(arr, 3));
