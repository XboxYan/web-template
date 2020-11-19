/**
 * @template.js
 * @author xboxyan
 * @created: 20-11-13
 */

(function () {

    // HTML字符反转义   &lt;  =>  < 
    function escape2Html(str) {
        var arrEntities = { 'lt': '<', 'gt': '>', 'nbsp': ' ', 'amp': '&', 'quot': '"' };
        return str.replace(/&(lt|gt|nbsp|amp|quot);/ig, function (all, t) {
            return arrEntities[t];
        });
    }

    // parseFor  "(item, index) in items"  =>   {items:[item,index],items:items}
    function parseFor(strFor){
        // 是否是对象
        const isObject = strFor.includes(' of ');
        const reg = /\s(?:in|of)\s/g;
        // "(item, index) in items" => ["(item, index)","items"]
        const [keys,obj] = strFor.match(reg)?strFor.split(/\s(?:in|of)\s/g):["item",strFor];
        const items = Number(obj) > 0 ? `[${'null,'.repeat(Number(obj) - 1)}null]`: obj;
        // "(item, index)" => ["item","index"]
        const params = keys.split(/[\(|\)|,\s?]/g).filter(Boolean);
        return {isArrray:!isObject,items,params}
    }

    // 字符串转模板字符串 https://www.zhangxinxu.com/wordpress/2020/10/es6-html-template-literal/
    String.prototype.interpolate = function (params) {
        const names = Object.keys(params);
        const vals = Object.values(params);
        const str = this.replace(/\{\{([^\}]+)\}\}/g,(all,s)=>`\${${s}}`); // {{ }}  =>  ${ }
        return new Function(...names, `return \`${escape2Html(str)}\`;`)(...vals);
    };

    // 模板引擎
    HTMLTemplateElement.prototype.render = function (data) {
        if (!this.$fragment) {
            const rule = this.getAttribute("rule") || '$';
            this.$fragment = this.cloneNode(true);
            this.fragment = document.createElement('TEMPLATE');
            
            // $for 循环渲染
            // <div $for="list"></div>   =>    ${ list.map(function(item,index){ return '<div></div>' }).join('') }
            const repeatEls = Array.from(this.$fragment.content.querySelectorAll(`[\\${rule}for]`));
            repeatEls.forEach(el => {
                const strFor = el.getAttribute(`${rule}for`);
                const {isArrray,items,params} = parseFor(strFor);
                el.before('${Object.entries(' + items + ').map(function(['+`${(isArrray?'$index$':(params[1]||'name'))},${params[0]||(isArrray?'item':'value')}],${params[2]||'index'}`+'){ return `');
                if (el.tagName === 'FRAGMENT'){
                    // 如果是 fragment 标签
                    el.after(el.innerHTML + '`}).join("")}');
                    el.parentNode.removeChild(el);
                } else {
                    el.removeAttribute(`${rule}for`);
                    el.after('`}).join("")}');
                }
            })

            // $if 条件渲染
            // <div $if="if"></div>   =>    ${ if ? '<div></div>' : '' }
            const ifEls = Array.from(this.$fragment.content.querySelectorAll(`[\\${rule}if]`));
            ifEls.forEach(el => {
                const ifs = el.getAttribute(`${rule}if`);
                el.removeAttribute(`${rule}if`);
                el.before('${' + ifs + '?`');
                el.after('`:``}');
            })
        }

        this.fragment.innerHTML = this.$fragment.innerHTML.interpolate(data);

        // props
        const propsMap = ['disabled','hidden','checked','selected','required','open'];
        const propsEls = Array.from(this.fragment.content.querySelectorAll(`[${propsMap.join('],[')}]`));
        propsEls.forEach(el => {
            propsMap.forEach(props => {
                // 如果这些属性值是 false ，就直接移除
                if(el.getAttribute(props)==='false'){
                    el.removeAttribute(props)
                }   
            })
        })

        return this.fragment;
    }
})()
