# web-template

web-template.js 是一款基于 [ES6 模板字符串](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/template_strings)解析的模板引擎。

## 特点

1. 纯原生浏览器解析，无任何依赖，无需编译，不拖泥带水
1. 类 vue 模板语法，上手快，几乎可以不用看文档
1. 支持 dom-diff 局部更新，性能高效
1. 代码量极少，~~包含注释不到 100 行~~（由于添加了 dom-diff 特性，已经超过 100 行了~），方便学习和扩展

[演示 demo](https://xboxyan.codelabo.cn/web-template/index.html)

## 更新

* 2020-11-27
  * 列表渲染支持 `key` 属性
* 2020-11-24
  * 支持 `dom-diff` 局部更新
* 2020-11-20
  * 新增 `mount` 方法
  * 新增 `block` 标签
* 2020-11-19
  * 支持 `{{}}` 插值表达式
  * 新增 `fragment` 标签
  * 新增 `open` 布尔值属性

## 适用场景

适用于原生开发，又希望有一定模板渲染能力的场景，比如一大堆列表循环渲染

在使用之前

```js
var html = '';
arrData.forEach(function (obj, index) {
    html = html + '\
    <tr>\
        <td><input type="checkbox" value="' + obj.id + '"></td>\
        <td><div class="ell">' + obj.title + '</div></td>\
        <td>' + obj.time + '</td>\
        <td align="right">' + obj.comment + '</td>\
    </tr>';
});
console.log(html);
```

使用 ES6 模板字符串

```js
let html = `${data.map(function (obj, index) {
  return `<tr>
    <td><input type="checkbox" value="${obj.id}"></td>
    <td><div class="ell">${obj.title}</div></td>
    <td>${obj.time}</td>
    <td align="right">${obj.comment}</td>
  </tr>`;
}).join('')}`;
console.log(html);
```

使用 web-template.js 之后

```html
<template id="template" rule="v-">
    <tr v-for="obj in data">
        <td><input type="checkbox" value="${obj.id}"></td>
        <td><div class="ell">${obj.title}</div></td>
        <td>${obj.time}</td>
        <td align="right">${obj.comment}</td>
    </tr>
</template>
```

```js
console.log(template.render(data).content); // dom节点
console.log(template.render(data).innerTHML); // dom字符串
```

是不是清爽了许多，可读性也更强了

## 使用方式 

直接引用 `web-template.js`

```html
<script src="web-template.js"></script>
```

在 HTML 页面上添加 `template` 标签，放入模板

```html
<ul id="list">

</ul>

<template id="template">
  <li $for="(item,index) in list">${ index + 1} - ${ item }</li>
</template>
```

假设有如下数据

```js
const data = {
  list : [ 'Apple', 'Banana', 'Cat']
}

list.appendChild(template.render(data).content)
```

最终，页面上 ul 会被渲染成

```html
<ul id="list">
  <li>1 - Apple</li>
  <li>2 - Banana</li>
  <li>3 - Cat</li>
</ul>
```

更多用法，可参考下面的详细介绍


## 模板语法

模板必须放在 `<template></template>` 标签中

```html
<template>
    <!-- 你的模板 -->
</template>
```

> 以下所有规则都在这个标签中

### 1.插值

数据绑定采用的是 ES6 模板字符串的语法， `${ }`：

*目前已兼容 `{{ }}` 的语法*

```html
<span>Message: ${ msg }</span>
```

```js
const data = {
    msg: 'hello'
}
```

返回

```html
<span>Message: hello</span>
```

各种属性，或者说只要出现插值语法的地方都会被替换成普通文本

```html
<span data-type="${type}">Message: ${ msg }</span>
```

```js
const data = {
    msg: 'hello',
    type: 'normal',
}
```

返回

```html
<span data-type="normal">Message: hello</span>
```

一些为布尔值的属性，比如 `disabled`、`hidden`、`required`、`checked`、`selected`、`readonly`,`open`（欢迎补充~），如果设置值为 `false` ，那么将会移除该属性

```html
<button disabled="${disabled}">button</button>
<button hidden="${hidden}">button</button>
```

```js
const data = {
    disabled: true,
    hidden: false,
}
```

返回

```html
<button disabled="true">button</button>
<button>button</button> <!-- hidden属性被移除 -->
```

### 2.JavaScript 表达式

JavaScript 表达式也可以用到模板中的任意地方

```html
<span>${ number + 1 }</span>
${ ok ? 'YES' : 'NO' }
```

```js
const data = {
    number: 10,
    ok: true,
}
```

返回

```html
<span>11</span>
YES
```

> 注意，这里是单个表达式，推荐使用三元表达式，vue 和 react 也是同样的规定

JavaScript 函数也可以直接访问，可以是全局函数，也可以是自己定义的函数

```html
<span>${ new Date() }</span>
<span>${ add(1,2) }</span>
```

```js
// 定义在全局的函数
function add(m,n){
    return m + n
}
```


返回

```html
<span>Tue Nov 17 2020 11:13:44 GMT+0800 (中国标准时间)</span>
<span>3</span>
```

更极端的是，可以直接嵌套函数，但是必须是立即执行函数

```html
<span>${
    (()=>{
        return 'hello';
    })()    
}</span>
```

返回

```html
<span>hello</span>
```

> 当然强烈不推荐这么做，把一段 js 放在 html 中实在不怎么优雅

### 3.指令

指令是带有特殊前缀的属性，默认是 `$`，当然你也可以更换成你喜欢的，比如 `v-`，通过修改 `template` 标签的 rule 属性

```html
<template rule="v-">
    <!-- 模板 -->
</template>
```

> 以下就以 `v-` 为例

目前有两个指令，分别是**条件渲染**和**列表渲染**

#### 3.1.条件渲染

`v-if` 用来条件性地渲染一块内容，当值为 false 时，内容会被完全移除

```html
<h1 v-if="show">Template is awesome!</h1>
<h1 v-if="!show">Oh no 😢</h1>
```

```js
const data = {
    show: true
}
```

返回

```html
<h1>Template is awesome!</h1>
<!-- $if H1 -->
```

> 注意，指令的属性值不需要包裹 `${ }`

 `v-show` 内部通过属性 `hidden` 来实现样式上的隐藏

```html
<h1 v-show="show">Template is awesome!</h1>
<h1 v-show="!show">Oh no 😢</h1>
```

```js
const data = {
    show: true
}
```

返回

```html
<h1>Template is awesome!</h1>
<h1 hidden>Oh no 😢</h1> <!--样式上被隐藏-->
```

> 注意，这里是普通的属性，所以需要包裹 `${ }`

#### 3.2.列表渲染

##### 别名

`v-for` 用来循环渲染一个列表，格式形如 `item in items`，其中 `items` 是数据源，`item` 是被循环的数组元素的**别名**。

```html
<template>
  <li v-for="item in items">
    ${ item.message }
  </li>
</template>
```

```js
const data = {
    items: [
        { message: 'Foo' },
        { message: 'Bar' }
    ]
}
```

返回

```html
<li>Foo</li>
<li>Bar</li>
```

##### 索引

此外，还支持第二个可选参数，表示**索引**（默认为 `index` ），形如 `(item,index) in items`

```html
<template>
  <li v-for="(item,index) in items">
    ${ index } - ${ item.message }
  </li>
</template>
```

返回

```html
<li>0 - Foo</li>
<li>1 - Bar</li>
```

##### 作用域

每个循环都有自己的作用域，这在多重循环中特别有用，如下可以轻易的实现一个 9*9 乘法表

```html
<template>
  <div v-for="i in [1,2,3,4,5,6,7,8,9]">
    <span v-for="j in [1,2,3,4,5,6,7,8,9]" v-if="i>=j"> ${i*j} </span>
  </div>
</template>
```

返回

```html
<div>
    <span> 1 </span>
</div>
<div>
    <span> 2 </span><span> 4 </span>
</div>
<div>
    <span> 3 </span><span> 6 </span><span> 9 </span>
</div>
<div>
    <span> 4 </span><span> 8 </span><span> 12 </span><span> 16 </span>
</div>
<div>
    <span> 5 </span><span> 10 </span><span> 15 </span><span> 20 </span><span> 25 </span>
</div>
<div>
    <span> 6 </span><span> 12 </span><span> 18 </span><span> 24 </span><span> 30 </span><span> 36 </span>
</div>
<div>
    <span> 7 </span><span> 14 </span><span> 21 </span><span> 28 </span><span> 35 </span><span> 42 </span><span> 49 </span>
</div>
<div>
    <span> 8 </span><span> 16 </span><span> 24 </span><span> 32 </span><span> 40 </span><span> 48 </span><span> 56 </span><span> 64 </span>
</div>
<div>
    <span> 9 </span><span> 18 </span><span> 27 </span><span> 36 </span><span> 45 </span><span> 54 </span><span> 63 </span><span> 72 </span><span> 81 </span>
</div>
```

##### 简写

每次都要写 `item in items` 有些麻烦，这里可以简写成 `items`，此时默认**别名**和**索引**分别是 `item` 和 `index`

```html
<template>
  <li v-for="items">
    ${ index } - ${ item.message }
  </li>
</template>
```

返回

```html
<li>0 - Foo</li>
<li>1 - Bar</li>
```

##### 重复次数

`v-for` 也可以接受整数。在这种情况下，它会把模板重复对应次数。

```html
<template>
  <span v-for="10">${ index } </span>
</template>
```

返回

```html
<span>0</span>
<span>1</span>
<span>2</span>
<span>3</span>
<span>4</span>
<span>5</span>
<span>6</span>
<span>7</span>
<span>8</span>
<span>9</span>
```

> 虽然有些鸡肋，某些情况下还是有点作用的

返回如上

##### 使用 key 属性

如果列表有可能会发生顺序改变，可以指定一个不重复的 key ，这样在渲染时会优先根据 key 的顺序重新排序，而不会重新渲染。

```html
<template>
  <li v-for="items" key="${item.id}">
    ${ index } - ${ item.message }
  </li>
</template>
```

> 目前仅适用于循环渲染

##### 对象迭代

你也可以用 `v-for` 来遍历一个对象，这里用 `of` 来区分，形如 `value of object`

```html
<template>
  <li v-for="value of object">
    ${ value }
  </li>
</template>
```

```js
const data = {
    object: {
        title: 'How to do lists in Vue',
        author: 'Jane Doe',
        publishedAt: '2016-04-10'
    }
}
```

返回

```html
<li>How to do lists in Vue</li>
<li>Jane Doe</li>
<li>2016-04-10</li>
```

同时，支持三个参数，形如 `(value, name, index) of object`，分别为**值**、**键名**、**索引**

```html
<template>
  <li v-for="(value, name, index) of object">
    ${ index }. ${ name }. ${ value }
  </li>
</template>
```

返回

```html
<li>0. title. How to do lists in Vue</li>
<li>1. author. Jane Doe</li>
<li>2. publishedAt. 2016-04-10</li>
```

> 对象迭代不支持简写，尽量多使用数组遍历吧

#### 3.3 fragment 片段

有时候我们可能需要遍历这样一种没有父级的元素

```html
<dl>
  <dt></dt>  
  <dd></dd>
  <dt></dt>  
  <dd></dd> 
  <dt></dt>  
  <dd></dd> 
<dl>
```

这时可以借助 fragment 标签包裹，渲染后 fragment 标签会被移除

```html
<template>
  <dl>
    <fragment v-for="[1,2,3]">
      <dt></dt>
      <dd></dd>
    </fragment>
  </dl>
</template>
```

在 `v-if` 中也适用的

```html
<template>
  <dl>
    <fragment v-if="true">
      <dt>1 dt</dt>
      <dd>1 dd</dd>
    </fragment>
    <fragment v-if="false">
      <dt>2 dt</dt>
      <dd>2 dd</dd>
    </fragment>
  </dl>
</template>
```

返回

```html
<dl>
  <dt>1 dt</dt>
  <dd>1 dd</dd>
</dl>
```

其他任意地方也可以添加，只不过不会被渲染

> 也可使用 block 标签，功能完全一致 （参考微信小程序）

### 4.渲染

在原生 `template` 标签扩展了 `render` 方法，可以传入一个对象，然后返回一个 `template`文档片段（[`document-fragment`](https://developer.mozilla.org/zh-CN/docs/Web/API/DocumentFragment)）

```js
const tpl = template.render(data) // template document-fragment

tpl.content;  // 返回dom节点
tpl.innerHTML;  // 返回字符串
```

一般通过 `.content` 可以得到模板的 dom 结构，直接以 `appendChild` 的方式渲染到页面，这种方式在追加数据的时候更加有效

```js
container.appendChild(tpl.content);
```

如果内容需要重置，可以简单粗暴的使用 `.innerHTML`

```js
container.innerHTML = tpl.innerHTML;
```

如果需要局部更新，可使用 `.html()` 方法

```js
// 支持dom节点
container.html(tpl.content);
// 字符串也支持
container.html(tpl.innerHTML);
```

### 5. 挂载

一般情况通过 `template.render(data)` 来获取到模板的内容，然后再通过容器的 `.innerHTML` 就可以了，但是有些啰嗦，这里提供一个更为简单的方法 `template.mount()`

需要在容器上指定和模板 id 相同的值，形成映射关系，比如

```html
<div is="tpl"></div>

<template id="tpl">
  <span class="name">${name}</span>
</template>
```

然后执行

```js
tpl.mount(data);
```

这样模板内容就自动挂载在页面上了

> 一般情况下均可满足，不满足的情况可以采用 render 方式，更加灵活

如果需要局部更新，可以传入第2个参数，表示是否进行 diff 比较

```js
tpl.mount(data, isDiff);
```

> 一般情况下，diff 并不会比直接 innerHTML 要快，但是可以保留元素的状态，建议初次渲染选择 innerHTML，后面更新使用 dom-diff

## 兼容性和一些局限

需要支持 ES6 模板字符串语法的浏览器，还在用 IE 的小伙伴可以放弃了

dom-diff 基本够用，还有待完善

由于使用了很多 DOM API，依赖浏览器环境，因此不支持 Node 等其他非浏览器环境，不支持服务端渲染

## 参考

[Vue 模板语法](https://cn.vuejs.org/v2/guide/syntax.html)

[ES6模板字符串在HTML模板渲染中的应用](https://www.zhangxinxu.com/wordpress/2020/10/es6-html-template-literal/)