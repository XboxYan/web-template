# 利用ES6模板字符串实现一个 Vue 模板引擎

[ES6模板字符串](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/template_strings)相信大家都已经很熟悉了，先简单回顾一下

```js
const str = `string text ${expression} string text`
```

这里的 `${expression}` 是一个占位符，**需要在一个包含 expression 的环境中**，里面可以是一个变量，也可以是各种表达式

```js
const num = 10
const str = `string text ${expression} string text`
```

返回

```js
"string text 10 string text"
```

这里环境很重要，如果在运行到  `${expression}` 时，发现 expression 不存在，浏览器就会抛出一个错误

```js
VM1743:1 Uncaught ReferenceError: expression is not defined
```


## 模板容器

目前很多模板引擎都是采用的 `script` 标签作为容器，比如 [art-template](https://aui.github.io/art-template/zh-cn/docs/index.html)

```html
<script id="tpl" type="text/html">
{{if user}}
  <h2>{{user.name}}</h2>
{{/if}}
</script>
```

这样做的好处是 `script` 里面的内容不会被真正的渲染，只会当成普通的字符串，如果有图片，也不会发出请求，当做模板再合适不过了，只需要通过 `innerHTML` 就能轻松的获取模板的内容。

```js
tpl.innerHTML
"
{{if user}}
    <h2>{{user.name}}</h2>
{{/if}}
"
```

```js
const sum = new Function(['a', 'b'], 'return a + b');

console.log(sum(3, 6));
// expected output: 8
```

```html
<template>
	${
		show ? '<div></div>':''
	}
</template>
```