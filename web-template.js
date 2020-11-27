/**
 * @template.js
 * @author xboxyan
 * @created: 20-11-13
 */

(function () {

    // 布尔属性
    const propsMap = ['disabled', 'hidden', 'checked', 'selected', 'required', 'open', 'readonly'];

    // html2Node '<div></div>' =>  <div></div>
    function html2Node(html) {
        return html.nodeType ? html : document.createRange().createContextualFragment(html);
    }

    // 比较属性
    function diffAttr(oldNode, newNode) {
        const patch = [];
        const oldAttrs = Array.from(oldNode.attributes);
        const newAttrs = Array.from(newNode.attributes);
        //  判断新的属性和新的属性的关系
        oldAttrs.forEach(attr => {
            const newAttr = newNode.getAttributeNode(attr.name) || { name: attr.name, value: null };
            if (attr.value !== newAttr.value) {
                patch.push(newAttr);
            }
        })
        // 旧节点没有新节点的属性
        newAttrs.forEach(attr => {
            if (!oldAttrs.find(el => el.name == attr.name)) {
                patch.push(attr);
            }
        })
        return patch;
    }

    // 比较子节点
    function diffNodes(oldNodes, newNodes, patches, oldNode) {

        const oldChildren = Array.from(oldNodes);
        const newChildren = Array.from(newNodes);

        const oldkey = oldChildren.map(el => el.nodeType === Node.ELEMENT_NODE?el.getAttributeNode('key'):null).filter(Boolean);
        const newkey = newChildren.map(el => el.nodeType === Node.ELEMENT_NODE?el.getAttributeNode('key'):null).filter(Boolean);

        // 有 key 的情况，仅限于 for 循环
        if (oldkey.length > 0) {
            oldkey.forEach((keynode, idx) => {
                // 如果新节点没有旧节点的key，就移除旧节点
                if(!newkey.find(el => el.value === keynode.value)){
                    oldkey.splice(idx,1);
                    patches.push({
                        type: 'REMOVE',
                        el: keynode.ownerElement,
                    })
                }
            });
            newkey.forEach(keynode => {
                // 如果旧节点没有新节点的key，就新增节点
                if(!oldkey.find(el => el.value === keynode.value)){
                    oldkey.push(keynode);
                }
            });

            const sort = newkey.map( el => el.value);

            // 根据新的顺序排序
            oldkey.sort((a,b) => sort.indexOf(a.value) - sort.indexOf(b.value));

            patches.push({
                type: 'SORT',
                newNode: oldkey.map( el => el.ownerElement),
                el: oldNode,
            })

            newkey.forEach((keynode,idx) => {
                // 如果不相等
                const newNode = keynode.ownerElement;
                const oldNode = oldkey[idx].ownerElement;
                if (!oldNode.isEqualNode(newNode)) {
                    walk(oldNode, newNode, patches);
                }
            });

        } else {
            // 比较旧的每一项
            oldChildren.forEach((child, idx) => {
                // 如果不相等
                if (!child.isEqualNode(newChildren[idx])) {
                    walk(child, newChildren[idx], patches);
                }
    
            });
            // 新增的节点
            newChildren.forEach((child, idx) => {
                if (!oldChildren[idx]) {
                    patches.push({
                        type: 'ADD',
                        newNode: child,
                        el: oldNode,
                    })
                }
            })
        }
    }

    // 比较差异
    function walk(oldNode, newNode, patches) {
        const currentPatch = {};
        if (!newNode) {
            // 没有新节点就删除
            currentPatch.type = 'REMOVE';
            currentPatch.el = oldNode;
        } else if (oldNode.nodeType === Node.TEXT_NODE && newNode.nodeType === Node.TEXT_NODE) {
            // 判断是文本节点
            if (oldNode.textContent.replace(/\s/g, '') !== newNode.textContent.replace(/\s/g, '')) {
                currentPatch.type = 'TEXT';
                currentPatch.el = oldNode;
                currentPatch.text = newNode.textContent;
            }
        } else if (oldNode.nodeType === newNode.nodeType && newNode.nodeType === Node.ELEMENT_NODE) {
            // 比较属性
            const attrs = diffAttr(oldNode, newNode);
            if (attrs.length > 0) {
                currentPatch.type = 'ATTRS';
                currentPatch.el = oldNode;
                currentPatch.attrs = attrs;
            }
            //  遍历子节点
            diffNodes(oldNode.childNodes, newNode.childNodes, patches, oldNode);
        } else {
            //  节点被替换
            currentPatch.type = 'REPLACE';
            currentPatch.newNode = newNode;
            currentPatch.el = oldNode;
        }
        if (currentPatch.type) {
            patches.push(currentPatch);
        }
    }

    // diff
    function diff(container, html) {
        const patches = [];
        const newNode = html2Node(html);
        diffNodes(container.childNodes, newNode.childNodes, patches, container);
        return patches;
    }

    // setDom
    function setDom(container, html) {
        const patches = diff(container, html);
        console.log(patches)
        patches.forEach(item => {
            switch (item.type) {
                case 'REMOVE':
                    item.el.remove();
                    break;
                case 'TEXT':
                    item.el.textContent = item.text;
                    break;
                case 'ATTRS':
                    item.attrs.forEach(attr => {
                        if ((propsMap.includes(attr.name) && attr.value === 'false') || !attr.value) {
                            item.el.removeAttribute(attr.name);
                        } else {
                            item.el.setAttribute(attr.name, attr.value);
                        }
                    })
                    break;
                case 'REPLACE':
                    item.el.replaceWith(item.newNode);
                    break;
                case 'ADD':
                    item.el.appendChild(item.newNode);
                    break;
                case 'SORT':
                    item.el.append(...item.newNode);
                    break;
                default:
                    break;
            }
        })
    }

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
        const vals = Object.values(params);
        const str = this.replace(/\{\{([^\}]+)\}\}/g, (all, s) => `\${${s}}`); // {{ }}  =>  ${ }
        return new Function(...names, `return \`${escape2Html(str)}\`;`)(...vals);
    };

    // 模板引擎 render
    HTMLTemplateElement.prototype.render = function (data) {
        if (!this.$fragment) {
            const rule = this.getAttribute("rule") || '$';
            this.$fragment = this.cloneNode(true);
            this.fragment = document.createElement('TEMPLATE');

            // $for 循环渲染
            // <div $for="list"></div>   =>    ${ list.map(function(item,index){ return '<div></div>' }).join('') }
            const repeatEls = this.$fragment.content.querySelectorAll(`[\\${rule}for]`);
            repeatEls.forEach(el => {
                const strFor = el.getAttribute(`${rule}for`);
                const { isArrray, items, params } = parseFor(strFor);
                el.before('${Object.entries(' + items + ').map(function([' + `${(isArrray ? '$index$' : (params[1] || 'name'))},${params[0] || (isArrray ? 'item' : 'value')}],${params[2] || 'index'}` + '){ return `');
                el.removeAttribute(`${rule}for`);
                el.after('`}).join("")}');
            })

            // $if 条件渲染
            // <div $if="if"></div>   =>    ${ if ? '<div></div>' : '' }
            const ifEls = this.$fragment.content.querySelectorAll(`[\\${rule}if]`);
            ifEls.forEach(el => {
                const ifs = el.getAttribute(`${rule}if`);
                el.before('${' + ifs + '?`');
                el.removeAttribute(`${rule}if`);
                el.after('`:`<!--if:' + el.tagName + '-->`}');
            })

            // fragment   <fragment>aa</fragment>   =>  aa
            const fragments = this.$fragment.content.querySelectorAll('fragment,block');
            fragments.forEach(el => {
                el.after(el.innerHTML);
                el.parentNode.removeChild(el);
            })
        }
        this.fragment.innerHTML = this.$fragment.innerHTML.interpolate(data);

        // props
        const propsEls = this.fragment.content.querySelectorAll(`[${propsMap.join('],[')}]`);
        propsEls.forEach(el => {
            propsMap.forEach(props => {
                // 如果这些属性值是 false ，就直接移除
                if (el.getAttribute(props) === 'false') {
                    el.removeAttribute(props);
                }
            })
        })
        return this.fragment;
    }

    // 模板引擎 mount
    HTMLTemplateElement.prototype.mount = function (data, isDiff) {
        if (!this.container) {
            this.container = document.querySelector(`[is="${this.id}"]`);
        }
        if (this.container) {
            if (isDiff) {
                this.container.html(this.render(data).content);
            } else {
                this.container.innerHTML = this.render(data).innerHTML
            }
        } else {
            throw new Error('没有找到属性 is 为 ' + this.id + ' 的容器')
        }
    }

    // dom对比渲染
    HTMLElement.prototype.html = function (html) {
        setDom(this, html);
    }

})()
