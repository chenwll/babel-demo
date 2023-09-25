之前笔者只知道babel是做代码转化用的，但是对于`@babel/core`，`@babel/polyfill`，`@babel/preset-env`这些都不知道有啥区别，它们各自的作用是啥没有个清晰的认知。笔者参考了一些文章写了一点自己的总结(bushi其实就是个缝合怪)，参考链接也放在文末。这次我们从零开始搭建一下babel的配置项，自此和babel成为一个"熟人"。

  # Babel

官方文档上对[Babel](https://babeljs.io/docs/)的介绍是在老版本的浏览器中，将ECMAScript 2015+的代码转化为向后兼容的JS版本，也就是我们常说的代码转化。主要的功能如下

- 语法转化(Transform syntax)
- 提供浏览器新特性Api的polyfill
- 源代码转化

**注意：** Syntax和新特性(feature)是有区别的， Syntax（指的是 `const` `let` `...` 等）， 而API指的是比如数组最新的方法（filter 、includes，Promise 等等）。

syntax是指一些基础语法，babel是可以直接转换的，比如：

- let
- const
- arrow function
- class
- template string
- destruct
- 等等

features是指`ES6+`标准推出的一些新特性，babel不能直接转换，比如：

- Promise
- Set
- Map
- Array.prototype.includes
- Object.assign
- 等等

# Babel核心库

## @babel/core

core 包的功能是串联整个编译流程，并且实现插件和preset。

![image-20230924211722346](http://120.53.221.17/blog/1695561442637.png)

## @babel/cli

安装了之后我们可以使用babel命令

## @babel/preset-env

@babel/preset-env的作用就是根据target配置来实现转译和polyfill，它有三个重要的参数：

- targets

  简单讲，该参数决定了我们项目需要适配到的环境，比如可以申明适配到的浏览器版本，这样 babel 会根据浏览器的支持情况自动引入所需要的 polyfill。

- useBuiltIns

  "usage" | "entry" | false，默认值为false，useBuiltIns主要决定了preset-env处理polyfills的方式，具体的区别我们后面用案例来说明

- corejs

  设置core-js的版本，core-js的伟大之处是它包含了所有`Es6+`的polyfill，并集成在babel等编译工具中。core-js 3中`proposals: true`，我们就可以使用proposals阶段的API了

## @babel/plugin-transform-runtime

这个插件主要做三个事情：

- 当我们使用了generator/async函数时，自动引入`@babel/runtime/regenerator`
- 提供core-js能力
- 通过`@babel/runtime/helps`实现引用各个公共helps函数，这样就可以减少helps函数被打包的次数了

所以我们在安装`@babel/plugin-transform-runtime`的时候，还需要将`@babel/runtime`安装为生成依赖

```js
npm install --save-dev @babel/plugin-transform-runtime
npm install --save @babel/runtime
```

并且，当我们将polyfill的能力交给babel/plugin-transform-runtime时，它是不能读取我们babel/preset-env中targets的配置的，如果我们配置了这个包的`corejs`选项，**它会把我们代码中所有用到的Features都转化为对corejs提供的polyfill的引用**

## @babel/polyfills

已经在babel@7.4被废弃，可以结合`@babel/preset-env`来看

# demo搭建

我们新建一个项目，从零开始配置babel，以最新版本的babel为例

```js
mkdir babel-demo
cd babel-demo
npm init
npm install --save-dev @babel/core @babel/cli
```

其中`@babel/core`是babel的核心包，这里必装，`@babel/cli`是babel提供的命令行工具，可以在终端中直接使用或配合`npm scripts`使用，用来生成转换之后的js文件

下面我们新建`src`目录，并添加`index.js`文件用来测试代码转换的效果：

```js
mkdir src
cd src
touch index.js
```

```js
// index.js
const message = "hello world"

const say = (message) => {
  console.log(message)
}

say(message)
```

package.json中配置一条指令

```js
"scripts": {
	"build":"babel ./src/index.js --out-file ./lib/index.js"
},
```

其中`out-dir`用来指定转换之后的文件输出位置，这里我们将转换后的文件都放在`lib`目录下

除了上面的转换指令，我们还需要一个配置文件，在项目根目录新建`.babelrc`，修改如下：

```js
{
    "presets": [
      [
        "@babel/preset-env",
        {
          "targets": {
            "ie": 11
          }
        }
      ]
    ],
    "plugins": []
}
```

并且安装`@babel/preset-env`

```js
npm install --save-dev @babel/preset-env
```

然后我们输入`npm run build`，转换成功后，我们会在lib目录下看到index.js文件，其中代码如下：

```JS
"use strict";

var message = "hello world";

var say = function say(message) {
  console.log(message);
};

say(message);
```

可见`const`和`arrow function`语法都转换成了**ES5**语法，可以在**IE11**中运行

targets是可以同时指定多个浏览器的，但是最终转换的代码还是以最低版本为准，比如配置如下，代码会转换为**ES5**语法

```js
"targets": {
 "ie": 11,
 "chrome": 80
}
```

## 引入Polyfill

如果我们在`index.js`里面写一些新的feature，比如promise或者Array.from

```js
const message = "hello world"

const say = (message) => {
  console.log(message)
}
console.log(Array.from('foo'));
say(message)
```

但是我们编译之后，发现Array.from并没有发生其他的转化

这是因为babel是可以直接转换基础语法的也就是`syntax`, 但是`ES6+`标准下的新特性也就是`features`，babel是不能直接转换的，需要借助`polyfill`来实现，polyfill翻译成中文就是**垫片**的意思，用来垫平不同浏览器环境之前差异。

本来`@babel/babel-polyfill`这个包就可以实现上面的features，从而完整的模拟`ES2015+`环境。但是在babel 7.4版本中已经明确表示不推荐使用了，官方建议我们使用`core-js`来替代，其实babel-polyfill内部就是用`core-js`和`regenerator-runtime/runtime`来实现的。

之前我们应该是直接在入口文件顶部这样使用

```js
import "@babel/polyfill"
```

现在可以直接改成这样，我们需要在入口文件中引入

```js
import "core-js/stable";
import "regenerator-runtime/runtime";
```

我们改变一下babel的配置文件

```js
{
    "presets": [
      [
        "@babel/preset-env",
        {
          "useBuiltIns": "usage",
          "corejs": {
            "version": 3
          },
          "targets": {
            // "chrome": 80
            "ie":11
          }
        }
      ]
    ],
    "plugins": []
}
```

上诉我们说了，babel怎么处理polyfill是通过useBuiltIns的值来确定的

**useBuiltIns**:"usage" | "entry" | false, defaults to false。这个参数决定了 preset-env 如何处理 polyfills。

1. **false**

这种方式下，不会引入 polyfills，你需要人为在入口文件处`import '@babel/polyfill`

但如上这种方式在 `@babel@7.4` 之后被废弃了，取而代之的是在入口文件处自行 import 如下代码

```js
import 'core-js/stable';
import 'regenerator-runtime/runtime';
// your code
```

**不推荐采用 `false`，这样会把所有的 polyfills 全部打入，造成包体积庞大**

2. **usage**

我们在项目的入口文件处不需要 import 对应的 polyfills 相关库。 babel 会根据用户代码的使用情况，并根据 targets 自行注入相关 polyfills。

3. **entry**

我们在项目的入口文件处 import 对应的 polyfills 相关库，例如

```js
import 'core-js/stable';
import 'regenerator-runtime/runtime';
// your code
```

此时 babel 会根据当前 targets 描述，把需要的所有的 polyfills 全部引入到你的入口文件（注意是全部，不管你是否有用到高级的 API）

> entry和usage的区别是：entry会引入target配置的所有polyfill，即使你没有用到某个API，而usage会自动引入你使用到的API的polyfill，比如你只使用了Array.from，那么usage只会引入Array.from有关的polyfill，其他的不会引入



我们来个例子看一下useBuiltIns分别为entry和usage的不同效果

```js
// index.js
const message = "hello world"

const say = (message) => {
  console.log(message)
}
console.log(Array.from('foo'));
say(message)
```

我们只使用了`Array.from`这个新的feature，当我们的`.babelrc`文件如下

```js
{
    "presets": [
      [
        "@babel/preset-env",
        {
          "useBuiltIns": "usage",
          "corejs": {
            "version": 3
          },
          "targets": {
            // "chrome": 80
            "ie":11
          }
        }
      ]
    ],
    "plugins": []
}
```

编译的结果如下，可以看出只引入了Array.from相关的polyfill

```js
"use strict";

require("core-js/modules/es.array.from.js");
require("core-js/modules/es.string.iterator.js");
var message = "hello world";
var say = function say(message) {
  console.log(message);
};
console.log(Array.from('foo'));
say(message);
```

当`"useBuiltIns": "entry"`，还需在入口文件里面import 对应的 polyfills 相关库，例如：

```js
import 'core-js/stable';
import 'regenerator-runtime/runtime';
```

它会将target配置项中所有的polyfill都会引入，结果如下：

```js
"use strict";

require("core-js/modules/es.symbol.js");
require("core-js/modules/es.symbol.description.js");
require("core-js/modules/es.symbol.async-iterator.js");
require("core-js/modules/es.symbol.has-instance.js");
require("core-js/modules/es.symbol.is-concat-spreadable.js");
require("core-js/modules/es.symbol.iterator.js");
require("core-js/modules/es.symbol.match.js");
require("core-js/modules/es.symbol.replace.js");
require("core-js/modules/es.symbol.search.js");
require("core-js/modules/es.symbol.species.js");
require("core-js/modules/es.symbol.split.js");
require("core-js/modules/es.symbol.to-primitive.js");
require("core-js/modules/es.symbol.to-string-tag.js");
require("core-js/modules/es.symbol.unscopables.js");
require("core-js/modules/es.array.concat.js");
require("core-js/modules/es.array.copy-within.js");
require("core-js/modules/es.array.fill.js");
require("core-js/modules/es.array.filter.js");
require("core-js/modules/es.array.find.js");
require("core-js/modules/es.array.find-index.js");
require("core-js/modules/es.array.flat.js");
require("core-js/modules/es.array.flat-map.js");
require("core-js/modules/es.array.from.js");
require("core-js/modules/es.array.includes.js");
require("core-js/modules/es.array.iterator.js");
require("core-js/modules/es.array.join.js");
require("core-js/modules/es.array.map.js");
require("core-js/modules/es.array.of.js");
require("core-js/modules/es.array.slice.js");
require("core-js/modules/es.array.sort.js");
require("core-js/modules/es.array.species.js");
require("core-js/modules/es.array.splice.js");
require("core-js/modules/es.array.unscopables.flat.js");
require("core-js/modules/es.array.unscopables.flat-map.js");
require("core-js/modules/es.array-buffer.constructor.js");
require("core-js/modules/es.date.to-primitive.js");
require("core-js/modules/es.function.has-instance.js");
require("core-js/modules/es.function.name.js");
require("core-js/modules/es.json.to-string-tag.js");
require("core-js/modules/es.map.js");
require("core-js/modules/es.math.acosh.js");
require("core-js/modules/es.math.asinh.js");
require("core-js/modules/es.math.atanh.js");
require("core-js/modules/es.math.cbrt.js");
require("core-js/modules/es.math.clz32.js");
require("core-js/modules/es.math.cosh.js");
require("core-js/modules/es.math.expm1.js");
require("core-js/modules/es.math.fround.js");
require("core-js/modules/es.math.hypot.js");
require("core-js/modules/es.math.imul.js");
require("core-js/modules/es.math.log10.js");
require("core-js/modules/es.math.log1p.js");
require("core-js/modules/es.math.log2.js");
require("core-js/modules/es.math.sign.js");
require("core-js/modules/es.math.sinh.js");
require("core-js/modules/es.math.tanh.js");
require("core-js/modules/es.math.to-string-tag.js");
require("core-js/modules/es.math.trunc.js");
require("core-js/modules/es.number.constructor.js");
require("core-js/modules/es.number.epsilon.js");
require("core-js/modules/es.number.is-finite.js");
require("core-js/modules/es.number.is-integer.js");
require("core-js/modules/es.number.is-nan.js");
require("core-js/modules/es.number.is-safe-integer.js");
require("core-js/modules/es.number.max-safe-integer.js");
require("core-js/modules/es.number.min-safe-integer.js");
require("core-js/modules/es.number.parse-float.js");
require("core-js/modules/es.number.parse-int.js");
require("core-js/modules/es.number.to-fixed.js");
require("core-js/modules/es.object.assign.js");
require("core-js/modules/es.object.define-getter.js");
require("core-js/modules/es.object.define-setter.js");
require("core-js/modules/es.object.entries.js");
require("core-js/modules/es.object.freeze.js");
require("core-js/modules/es.object.from-entries.js");
require("core-js/modules/es.object.get-own-property-descriptor.js");
require("core-js/modules/es.object.get-own-property-descriptors.js");
require("core-js/modules/es.object.get-own-property-names.js");
require("core-js/modules/es.object.get-prototype-of.js");
require("core-js/modules/es.object.is.js");
require("core-js/modules/es.object.is-extensible.js");
require("core-js/modules/es.object.is-frozen.js");
require("core-js/modules/es.object.is-sealed.js");
require("core-js/modules/es.object.keys.js");
require("core-js/modules/es.object.lookup-getter.js");
require("core-js/modules/es.object.lookup-setter.js");
require("core-js/modules/es.object.prevent-extensions.js");
require("core-js/modules/es.object.seal.js");
require("core-js/modules/es.object.to-string.js");
require("core-js/modules/es.object.values.js");
require("core-js/modules/es.promise.js");
require("core-js/modules/es.promise.finally.js");
require("core-js/modules/es.reflect.apply.js");
require("core-js/modules/es.reflect.construct.js");
require("core-js/modules/es.reflect.define-property.js");
require("core-js/modules/es.reflect.delete-property.js");
require("core-js/modules/es.reflect.get.js");
require("core-js/modules/es.reflect.get-own-property-descriptor.js");
require("core-js/modules/es.reflect.get-prototype-of.js");
require("core-js/modules/es.reflect.has.js");
require("core-js/modules/es.reflect.is-extensible.js");
require("core-js/modules/es.reflect.own-keys.js");
require("core-js/modules/es.reflect.prevent-extensions.js");
require("core-js/modules/es.reflect.set.js");
require("core-js/modules/es.reflect.set-prototype-of.js");
require("core-js/modules/es.regexp.constructor.js");
require("core-js/modules/es.regexp.exec.js");
require("core-js/modules/es.regexp.flags.js");
require("core-js/modules/es.regexp.to-string.js");
require("core-js/modules/es.set.js");
require("core-js/modules/es.string.code-point-at.js");
require("core-js/modules/es.string.ends-with.js");
require("core-js/modules/es.string.from-code-point.js");
require("core-js/modules/es.string.includes.js");
require("core-js/modules/es.string.iterator.js");
require("core-js/modules/es.string.match.js");
require("core-js/modules/es.string.pad-end.js");
require("core-js/modules/es.string.pad-start.js");
require("core-js/modules/es.string.raw.js");
require("core-js/modules/es.string.repeat.js");
require("core-js/modules/es.string.replace.js");
require("core-js/modules/es.string.search.js");
require("core-js/modules/es.string.split.js");
require("core-js/modules/es.string.starts-with.js");
require("core-js/modules/es.string.trim.js");
require("core-js/modules/es.string.trim-end.js");
require("core-js/modules/es.string.trim-start.js");
require("core-js/modules/es.string.anchor.js");
require("core-js/modules/es.string.big.js");
require("core-js/modules/es.string.blink.js");
require("core-js/modules/es.string.bold.js");
require("core-js/modules/es.string.fixed.js");
require("core-js/modules/es.string.fontcolor.js");
require("core-js/modules/es.string.fontsize.js");
require("core-js/modules/es.string.italics.js");
require("core-js/modules/es.string.link.js");
require("core-js/modules/es.string.small.js");
require("core-js/modules/es.string.strike.js");
require("core-js/modules/es.string.sub.js");
require("core-js/modules/es.string.sup.js");
require("core-js/modules/es.typed-array.float32-array.js");
require("core-js/modules/es.typed-array.float64-array.js");
require("core-js/modules/es.typed-array.int8-array.js");
require("core-js/modules/es.typed-array.int16-array.js");
require("core-js/modules/es.typed-array.int32-array.js");
require("core-js/modules/es.typed-array.uint8-array.js");
require("core-js/modules/es.typed-array.uint8-clamped-array.js");
require("core-js/modules/es.typed-array.uint16-array.js");
require("core-js/modules/es.typed-array.uint32-array.js");
require("core-js/modules/es.typed-array.copy-within.js");
require("core-js/modules/es.typed-array.every.js");
require("core-js/modules/es.typed-array.fill.js");
require("core-js/modules/es.typed-array.filter.js");
require("core-js/modules/es.typed-array.find.js");
require("core-js/modules/es.typed-array.find-index.js");
require("core-js/modules/es.typed-array.for-each.js");
require("core-js/modules/es.typed-array.from.js");
require("core-js/modules/es.typed-array.includes.js");
require("core-js/modules/es.typed-array.index-of.js");
require("core-js/modules/es.typed-array.iterator.js");
require("core-js/modules/es.typed-array.join.js");
require("core-js/modules/es.typed-array.last-index-of.js");
require("core-js/modules/es.typed-array.map.js");
require("core-js/modules/es.typed-array.of.js");
require("core-js/modules/es.typed-array.reduce.js");
require("core-js/modules/es.typed-array.reduce-right.js");
require("core-js/modules/es.typed-array.reverse.js");
require("core-js/modules/es.typed-array.set.js");
require("core-js/modules/es.typed-array.slice.js");
require("core-js/modules/es.typed-array.some.js");
require("core-js/modules/es.typed-array.sort.js");
require("core-js/modules/es.typed-array.subarray.js");
require("core-js/modules/es.typed-array.to-locale-string.js");
require("core-js/modules/es.typed-array.to-string.js");
require("core-js/modules/es.weak-map.js");
require("core-js/modules/es.weak-set.js");
require("core-js/modules/web.dom-collections.for-each.js");
require("core-js/modules/web.dom-collections.iterator.js");
require("core-js/modules/web.queue-microtask.js");
require("core-js/modules/web.url.js");
require("core-js/modules/web.url.to-json.js");
require("core-js/modules/web.url-search-params.js");
require("regenerator-runtime/runtime");

var message = "hello world";
var say = function say(message) {
  console.log(message);
};
console.log(Array.from('foo'));
say(message);
```



## 优化polyfill引入

会使用到`@babel/runtime`和`@babel/plugin-transform-runtime`

这两个包是一起使用的，主要是为了解决转换之后代码重复使用而造成的包体积较大的问题，因为babel在转换代码时会使用一些helpers辅助函数，比如下面的代码：

```js
async function delay() {
  console.log(new Date().getSeconds());
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 3000);
  });
  console.log(new Date().getSeconds());
}

delay();
```

转换之后，我们会发现生成的代码除了一些polyfill和实际的代码之外，还有一些helpers代码：

![image-20230924200308329](http://120.53.221.17/blog/1695556990099.png)

如果有很多文件需要转换，那这些代码可能就会重复，为了解决这个问题，我们可以使用`plugin-transform-runtime`将这些helpers辅助函数的使用方式改为引用的方式，让它们都去引用`runtime`包里的代码，这样他们就是重复引用同一个代码，就不会出现重复的问题了。其中`babel-runtime`这个包里面就包含了所有的helpers辅助函数。

```js
npm install --save-dev @babel/plugin-transform-runtime
npm install --save @babel/runtime
```

```js
{
    "presets": [
      [
        "@babel/preset-env",
        {
          "useBuiltIns": "entry",
          "corejs": {
            "version": 3
          },
          "targets": {
            "ie": 11
          }
        }
      ]
    ],
    "plugins": [
      "@babel/plugin-transform-runtime"
    ]
}
```

打包之后的结果，`_interopRequireDefault` 这个方法，明显是可以变成一个独立模块，这样打包体积会变更小

```js
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
```

但是这里又一个问题，那就是polyfill是注入到全局作用域中的，使用我们库的开发者不一定愿意污染全局作用域，所以说，合理的解决方案应该是注入到当前作用域中，不影响全局作用域。所以我们将polyfill的能力交给`@babel/plugin-transform-runtime`，配置core-js的版本，我们修改配置如下：

```js
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": {
          "version": 3
        },
        "targets": {
          "ie": 11
        }
      }
    ]
  ],
  "plugins": [
    [
      "@babel/plugin-transform-runtime",
      {
        "corejs": {
          "version": 3
        }
      }
    ]
  ]
}
```

根据babel官网的描述，**插件在preset前运行**，所以当我们在插件中配置了`corejs`的version，polyfill就会由插件来处理，就轮不到preset处理polyfill了

![image-20230925001717994](http://120.53.221.17/blog/1695572238268.png)

**PS:** 再次强调一下，`@babel/plugin-transform-runtime`这个包是不能读取`@babel/preset-env`包的`targets`选项的配置的，如果我们配置了这个包的`corejs`选项，**它会把我们代码中所有用到的Features都转化为对corejs提供的polyfill的引用**，比如我们把上面代码中的targets改为chrome 80，转换之后的代码还是会包含promise这个polyfill，详情见这个issues: [github.com/babel/websi…](https://github.com/babel/website/issues/2209)，官方建议是：这个包的corejs选项主要是为了开发第三方库时使用，因为开发者无法控制库的浏览器运行环境。

# Proposals

在实际开发中，除了使用ECMAScript标准中已存在的语法，我们还可以使用一些在提案中，但是还没有正式发布的语法，比如`String.prototype.replaceAll`

index.js代码如下：

```js
const queryString = "q=query+string+parameters";
const withSpaces = queryString.replaceAll("+", " ");
console.log(withSpaces);
```

转换之后的代码：

```js
"use strict";

var queryString = "q=query+string+parameters";
var withSpaces = queryString.replaceAll("+", " ");
console.log(withSpaces);
```

这里我们发现语法并没有转换，这里我们就需要配置`proposals`以转换这些还在提案中的语法：

```js
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": {
          "version": 3,
          "proposals": true
        },
        "targets": {
          "ie": 11
        }
      }
    ]
  ],
  "plugins": [
    [
      "@babel/plugin-transform-runtime",
      {
        "corejs": {
          "version": 3,
          "proposals": true
        }
      }
    ]
  ]
}
```

转换之后：

```js
"use strict";

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");

var _replaceAll = _interopRequireDefault(require("@babel/runtime-corejs3/core-js/instance/replace-all"));

var queryString = "q=query+string+parameters";
var withSpaces = (0, _replaceAll.default)(queryString).call(queryString, "+", " ");
console.log(withSpaces);
```

这样我们就可以愉快的进行开发了



# 最佳实践

基于上诉的例子，我们可以总结出一点最佳实践

当我们进行项目开发的时候，建议关闭`@babel/plugin-transform-runtime`的core-js。因为我们是可以接受polyfill污染全局的，并且希望按照浏览器兼容需求和实际使用情况来按需引入polyfill。虽然污染了全局，但是节省了空间，同时借用`@babel/plugin-transform-runtime`的helper辅助函数，进一步减少体积。

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
    mode: 'development',
    devtool: false,
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        targets: {
                            "browsers": ["IE 10"]
                        },
                        presets: [
                            ["@babel/preset-env", {
                                useBuiltIns: 'usage',
                                corejs: { version: 3 }
                            }]
                        ],
                        plugins: [
                            ["@babel/plugin-transform-runtime", {
                                corejs: false,
                                helpers: true,
                                regenerator: false
                            }]
                        ]
                    }
                }
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html'
        })
    ]
};
```

当我们开发类库的时候，因为要给别人使用，所以不能污染全局。采用useBuiltIns: false的方式，让preset-env只转换语法，不转换API，不通过污染全局引入polyfill。将polyfill的能力交给`@babel/plugin-transform-runtime`插件，在每个文件内按需引入需要的polyfill，使用helpers辅助函数减少体积，同时重新生成generator，防止生成window.generator造成全局污染。

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
   mode: 'development',
   devtool: false,
   entry: './src/index.js',
   output: {
       path: path.resolve(__dirname, 'dist'),
       filename: 'main.js'
   },
   module: {
       rules: [
           {
               test: /\.js$/,
               exclude: /node_modules/,
               use: {
                   loader: 'babel-loader',
                   options: {
                       targets: {
                           "browsers": ["IE 10"]
                       },
                       presets: [
                           //@babel/preset-env只转换语法，不要提供polyfill
                           ["@babel/preset-env", {
                               useBuiltIns: false
                           }]
                       ],
                       plugins: [
                           ["@babel/plugin-transform-runtime", {
                               corejs: { version: 3 },//不污染全局作用域
                               helpers: true,
                               regenerator: true //不污染全局作用域
                           }]
                       ]
                   }
               }
           }
       ]
   },
   plugins: [
       new HtmlWebpackPlugin({
           template: './src/index.html'
       })
   ]
};
// useBuiltIns: false  400 KiB 把polyfill全量引入，不考虑浏览器兼容性
```

思考：

1. 为什么@babel/preset-env不能使用不污染全局作用域的polyfill方式呢？非要交给plugin-transform-runtime进行处理？
2. 为什么plugin-transform-runtime不能设置targets？选择了不污染全局作用域就只能妥协掉`preset-env`中targets带来的体积优势了呢？

babel官方也意识到了这个问题，详细请看[babel-polyfills](https://github.com/babel/babel-polyfills)

# 参考文章

- [从零开始配置babel](https://juejin.cn/post/6844904090833518600)
- [吃一堑长一智系列: 99% 开发者没弄明白的 babel 知识](https://zhuanlan.zhihu.com/p/361874935)
- [想弄懂Babel?你必须得先弄清楚这几个包](https://zhuanlan.zhihu.com/p/361874935)