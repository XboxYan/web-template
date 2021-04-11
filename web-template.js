/**
 * @template.js
 * @author xboxyan
 * @created: 20-11-13
 */

(function () {
    
    // 布尔类型属性
    const propsMap = ['disabled', 'value', 'hidden', 'checked', 'selected', 'required', 'open', 'readonly', 'novalidate', 'reversed'];
    
    // HTML字符反转义   &lt;  =>  < 
    function escape2Html(str) {
        var arrEntities = { 'lt': '<', 'gt': '>', 'nbsp': ' ', 'amp': '&', 'quot': '"' };
        return str.replace(/&(lt|gt|nbsp|amp|quot);/ig, function (all, t) {
            return arrEntities[t];
        });
    }

    // parseFor  "(item, index) in items"  =>   {items:[item,index],items:items}
    function parseFor(strFor) {
        // 是否是对象
        const isObject = strFor.includes(' of ');
        const reg = /\s(?:in|of)\s/g;
        // "(item, index) in items" => ["(item, index)","items"]
        const [keys, obj] = strFor.match(reg) ? strFor.split(reg) : ["item", strFor];
        const items = Number(obj) > 0 ? `[${'null,'.repeat(Number(obj) - 1)}null]` : obj;
        // "(item, index)" => ["item","index"]
        const params = keys.split(/[\(|\)|,\s?]/g).filter(Boolean);
        return { isArrray: !isObject, items, params }
    }

    // 字符串转模板字符串 https://www.zhangxinxu.com/wordpress/2020/10/es6-html-template-literal/
    String.prototype.interpolate = function (params) {
        const names = Object.keys(params);
        const vals = Object.values(params).map( el => typeof el === 'function' ? el() : el);
        const str = this.replace(/\{\{([^\}]+)\}\}/g, '${$1}'); // {{xx}} => ${xx}
        return new Function(...names, `return \`${escape2Html(str)}\`;`)(...vals);
    };

    // 模板引擎 render
    HTMLTemplateElement.prototype.render = function (data, options) {
        const rule = this.getAttribute("rule") || '$';
        if (!this.$fragment) {
            this.$fragment = this.cloneNode(true);
            this.fragment = document.createElement('TEMPLATE');
            
            // 模板渲染之前 interpolateBefore
            this.interpolateBefore && this.interpolateBefore(this.$fragment, {data, options, rule});
            
            // $for 循环渲染 e.g. <div $for="list"></div>  =>   ${ list.map(function(item,index){ return '<div></div>' }).join('') }
            const repeatEls = this.$fragment.content.querySelectorAll(`[\\${rule}for]`);
            repeatEls.forEach(el => {
                const strFor = el.getAttribute(`${rule}for`);
                const { isArrray, items, params } = parseFor(strFor);
                const name = isArrray ? '__index__' : (params[1] || 'name');
                const value = params[0] || (isArrray ? 'item' : 'value');
                const index = (isArrray?params[1]:params[2])||'index';
                el.before('${Object.entries(' + items + ').map(function([' + `${name},${value}],${index}` + '){ return `');
                el.removeAttribute(`${rule}for`);
                el.after('`}).join("")}');
            })

            // $if 条件渲染 e.g. <div $if="if"></div>   =>    ${ if ? '<div></div>' : '' }
            const ifEls = this.$fragment.content.querySelectorAll(`[\\${rule}if]`);
            ifEls.forEach(el => {
                const ifs = el.getAttribute(`${rule}if`);
                el.before('${' + ifs + '?`');
                el.removeAttribute(`${rule}if`);
                el.after('`:`<!--if:' + el.tagName + '-->`}');
            })

            // fragment e.g. <fragment>aa</fragment>   =>  aa
            const fragments = this.$fragment.content.querySelectorAll('fragment,block');
            fragments.forEach(el => {
                el.after(el.innerHTML);
                el.remove();
            })

            // $show e.g. <div $show="show"></div>   =>  <div hidden="${!show}"></div>
            const showEls = this.$fragment.content.querySelectorAll(`[\\${rule}show]`);
            showEls.forEach(el => {
                const shows = el.getAttribute(`${rule}show`);
                el.setAttribute('hidden','${!'+shows+'}')
                el.removeAttribute(`${rule}show`);
            })

            // $bind:class e.g. <div :class="{cur:show}"></div>   =>  <div class="${show?'cur':''}"></div>
            const classEls = this.$fragment.content.querySelectorAll(`[\\:class],[\\${rule}bind\\:class]`);
            classEls.forEach(el => {
                const classes = el.getAttribute(`:class`)||el.getAttribute(`${rule}bind:class`);
                if (classes.includes('{')) {
                    // object格式
                    const classList = classes.replace(/\s/g,'').split(/[\{\}:,]/g).filter(Boolean);
                    for (let i=0;i<classList.length;i+=2) {
                        el.classList.add("${!!"+classList[i+1]+"?'"+classList[i]+"':''}");
                    }
                    el.removeAttribute(`:class`);
                    el.removeAttribute(`${rule}bind:class`);
                }
            })

            const keyEls = this.$fragment.content.querySelectorAll(`[\\:key],[\\${rule}bind\\:key]`);
            keyEls.forEach(el => {
                const key = el.getAttribute(`:key`)||el.getAttribute(`${rule}bind:key`);
                el.key = key;
                el.setAttribute('v-data-key','${'+key+'}')
                el.removeAttribute(`:key`);
                el.removeAttribute(`${rule}bind:key`);
            })
        }
        this.fragment.innerHTML = this.$fragment.innerHTML.interpolate(data);
        
        // 表单props特殊处理，false直接移除
        const propsEls = this.fragment.content.querySelectorAll(`[${propsMap.join('],[')}]`);
        propsEls.forEach(el => {
            propsMap.forEach(props => {
                // 如果这些属性值是 false ，就直接移除
                if (el.getAttribute(props) === 'false') {
                    el.removeAttribute(props);
                }
            })
        })

        // 模板渲染之后 interpolateAfter
        this.interpolateAfter && this.interpolateAfter(this.fragment, {data, options, rule});
        return this.fragment;
    }
})()