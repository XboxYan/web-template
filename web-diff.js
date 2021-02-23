/**
 * @set-dom.js
 * @author xboxyan
 * @created: 20-11-13
 */

(function () {

    // 属性操作
    const propsMap = ['disabled', 'value', 'hidden', 'checked', 'selected', 'required', 'open', 'readonly', 'novalidate', 'reversed'];

    // html2Node '<div></div>' =>  <div></div>
    function html2Node(html) {
        return html.nodeType ? html : document.createRange().createContextualFragment(html);
    }

    // 比较属性
    function diffAttr(oldAttributes, newAttributes) {
        const patch = [];
        const oldAttrs = Array.from(oldAttributes);
        const newAttrs = Array.from(newAttributes);
        //  判断新的属性和新的属性的关系
        oldAttrs.forEach(attr => {
            const newAttr = newAttributes[attr.name] || { name: attr.name, value: false };
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

        const oldkey = oldChildren.map(el => el.nodeType === Node.ELEMENT_NODE ? el.getAttributeNode('key') : null).filter(Boolean);
        const newkey = newChildren.map(el => el.nodeType === Node.ELEMENT_NODE ? el.getAttributeNode('key') : null).filter(Boolean);

        // 有 key 的情况，仅限于 for 循环
        if (oldkey.length > 0) {
            oldkey.forEach((keynode, idx) => {
                // 如果新节点没有旧节点的key，就移除旧节点
                if (!newkey.find(el => el.value === keynode.value)) {
                    oldkey.splice(idx, 1);
                    patches.push({
                        type: 'REMOVE',
                        el: keynode.ownerElement,
                    })
                }
            });
            newkey.forEach(keynode => {
                // 如果旧节点没有新节点的key，就新增节点
                if (!oldkey.find(el => el.value === keynode.value)) {
                    oldkey.push(keynode);
                }
            });

            const sort = newkey.map(el => el.value);

            // 根据新的顺序排序
            oldkey.sort((a, b) => sort.indexOf(a.value) - sort.indexOf(b.value));

            patches.push({
                type: 'SORT',
                newNode: oldkey.map(el => el.ownerElement),
                el: oldNode,
            })

            newkey.forEach((keynode, idx) => {
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
            const attrs = diffAttr(oldNode.attributes, newNode.attributes);
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
    function webDiff(container, html) {
        const patches = [];
        const newNode = html2Node(html);
        diffNodes(container.childNodes, newNode.childNodes, patches, container);
        return patches;
    }

    // setDom
    function setDom(container, html) {
        const patches = webDiff(container, html);
        // console.log(patches)
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
                        item.el.setAttribute(attr.name, attr.value);
                        if (propsMap.includes(attr.name)) {
                            item.el[attr.name] = attr.value;
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

    // dom对比渲染
    HTMLElement.prototype.html = function (html) {
        // html可以是字符串，也可以是dom
        setDom(this, html);
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

})()
