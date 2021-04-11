/**
 * @model.js
 * @author xboxyan
 * @created: 20-11-13
 */

(function () {

    // 事件
    const eventList = ['submit', 'click', 'dblclick', 'input', 'change', 'focus', 'blur', 'keydown', 'keyup', 'keypress', 'scroll', 'submit', 'invalid', 'mousedown', 'mousemove', 'mouseup', 'mouseenter', 'mouseleave', 'drag', 'dragstart', 'dragenter', 'dragover', 'dragleave', 'dragend', 'drop'] 

    // 表单绑定
    const modelMap = [
        {
            selector: 'input:not([type=checkbox]):not([type=radio]),textarea',
            attrName: 'value',
            attrValue: (name) => '${' + name + '}',
            event: 'input',
            fn: (name) => `this.${name}=$this.value`
        },
        {
            selector: 'select',
            attrName: 'value',
            attrValue: (name) => '${' + name + '}',
            event: 'change',
            fn: (name) => `this.${name}=$this.value`
        },
        {
            selector: '[type=radio]',
            attrName: 'checked',
            attrValue: (name, value) => `\${${name}==${value}}`,
            event: 'change',
            fn: (name) => `this.${name}=$this.value`
        },
        {
            selector: '[type=checkbox]',
            attrName: 'checked',
            attrValue: (name, value, isArray) => isArray ? `\${${name}.includes(${value})}` : `\${${name}}`,
            event: 'change',
            fn: (name, isArray) => isArray ? `function(){ if(this.${name}.includes($this.value)){ this.${name} = this.${name}.filter(el => el!==$this.value) } else { this.${name} = this.${name}.concat($this.value)}}` : `this.${name}=$this.checked`
        },
    ]

    // parseFor  "(item, index) in items"  =>   {items:[item,index],items:items}
    function parseFor(strFor) {
        // 是否是对象
        const isObject = strFor.includes(' of ');
        const reg = /\s(?:in|of)\s/g;
        const [keys, obj] = strFor.match(reg) ? strFor.split(reg) : ["item", strFor];
        const items = Number(obj) > 0 ? `[${'null,'.repeat(Number(obj) - 1)}null]` : obj;
        const params = keys.split(/[\(|\)|,\s?]/g).filter(Boolean);
        return { isArrray: !isObject, items, params }
    }

    // 模板渲染之前
    HTMLTemplateElement.prototype.interpolateBefore = function (fragment, { data, options: { computed }, rule }) {
        // 表单绑定 $model="val"
        const modelEls = fragment.content.querySelectorAll(`[\\${rule}model]`);
        modelEls.forEach(el => {
            let name = el.getAttribute(`${rule}model`);
            const value = el.getAttribute('value');
            const reg = /\$\{([^\}]+)\}/g;
            const attrvalue = reg.test(value) ? value.replace(reg, '$1') : `'${value}'`;
            // const forEl = el.closest(`[\\${rule}for]`);

            // if (forEl) {
            //     const strFor = forEl.getAttribute(`${rule}for`);
            //     const { isArrray, items, params } = parseFor(strFor);
            //     const item = params[0] || (isArrray ? 'item' : 'value');
            //     const index = isArrray ? '__index__' : (params[1] || 'name');
            //     name = name.replaceAll(item+'.',`${items}[${index}].`);
            // }

            modelMap.forEach(item => {
                if (el.matches(item.selector)) {
                    if (el.tagName === 'SELECT' && !data[name]) {
                        el.insertAdjacentHTML('afterbegin', '<option value="">请选择</option>');
                    }
                    const isArray = Array.isArray(data[name]);
                    el.setAttribute(item.attrName, item.attrValue(name, attrvalue, isArray));
                    el.setAttribute('v-on:'+item.event, item.fn(name, isArray));
                    el.removeAttribute(`${rule}model`);
                }
            })
        })
        // on
        // const onEls = this.$fragment.content.querySelectorAll(`[\\${rule}on],[my-on]`);
        // onEls.forEach(el => {
        //     const forEl = el.closest(`[\\${rule}for]`);
        //     if (forEl) {
        //         const strFor = forEl.getAttribute(`${rule}for`);
        //         const { isArrray, params } = parseFor(strFor);
        //         const name = isArrray ? '__index__' : (params[1] || 'name');
        //         const index = (isArrray?params[1]:params[2])||'index';
        //         const attr = el.attributes[`my-on`] || el.attributes[`${rule}on`];
        //         if (attr) {
        //             attr.value = attr.value.replace(RegExp(`(${name}|${index})`),'${$1}');
        //         }
        //     }
        // })
        // computed
        Object.keys(computed).forEach(el => {
            Object.defineProperty(data, el, {
                writable: false,
                enumerable: true,
                value: computed[el].bind(data)
            })
        })

    }

    // 模板渲染之后
    HTMLTemplateElement.prototype.interpolateAfter = function (fragment, { options: { methods }, rule }) {
        const app = this.app;
        // select
        const selectEls = fragment.content.querySelectorAll(`select`);
        selectEls.forEach(el => {
            if (!el.value) {
                el.selectedOptions[0].disabled = true;
            }
        })

        // 绑定事件 @click="fn"
        const eventEls = fragment.content.querySelectorAll(eventList.map( el => `[\\@${el}]`).join(',') + `,[v-on\\:input],[v-on\\:change]`);
        eventEls.forEach(el => {
            const attrs = Array.from(el.attributes).filter( attr => eventList.includes(attr.name.split(RegExp(`(?:@|v-on:|${rule}-on)`))[1]) )
            attrs.forEach(attr => {
                if (methods && Object.keys(methods).length && app) {
                    const name = attr.name.split(RegExp(`(?:@|v-on:|${rule}-on)`))[1];
                    const events = attr.value;
                    const fn = function (event) {
                        if (events.includes('(') || events.includes('this')) {
                            const names = Object.keys(methods);
                            const vals = Object.values(methods);
                            if (events.startsWith('function')) {
                                // $this , $event 内置DOM原生对象
                                return Function(...names, '$this', '$event', '"use strict";(' + events + ').call(this)').call(app.vm, ...vals, this, event);
                            }
                            return Function(...names, '$this', '$event', '"use strict";' + events.replace(/\(/, '.call(this,')).call(app.vm, ...vals, this, event);
                        } else {
                            return methods[events].call(app.vm);
                        }
                        // console.warn(name+'事件未定义，请在 methods 中添加');
                    }
                    if (name === 'input' && el.tagName === 'INPUT') {
                        el.addEventListener(name, () => {
                            this.timer && clearTimeout(this.timer);
                            this.timer = setTimeout(() => {
                                fn.call(el)
                            }, 100)
                        });
                    } else {
                        el.addEventListener(name, fn);
                    }
                    //el.removeAttribute(attr.name);
                }
            })
        })
    }

    // 模板引擎 model
    HTMLElement.prototype.model = function ({ data, created, methods = {}, computed = {}, watch = {} }) {
        if (!this.html) {
            throw new Error('请先引入 web-diff.js');
        }
        if (!this.template) {
            this.template = document.querySelector(`template[is="${this.id}"]`);
        }
        if (this.template) {
            if (!this.template.render) {
                throw new Error('请先引入 web-template.js');
            }
            const app = this;
            if (!app.vm) {
                this.template.app = app;
                app.html(app.template.render(data, { methods, watch, computed }).content);
                // 数据更新
                let timer = null;
                const delay = (cb) => {
                    timer && clearTimeout(timer);
                    timer = setTimeout(() => {
                        cb && cb(data);
                    })
                }
                // 监听
                const watches = {};

                Object.keys(watch).forEach(el => {
                    watches[el] = data[el];
                })


                const handler = {
                    get(target, key) {
                        if (target[key] == null && methods[key]) {
                            return methods[key];
                        }
                        if (typeof target[key] === 'object' && target[key] !== null) {
                            return new Proxy(target[key], handler);
                        }
                        return Reflect.get(target, key);
                    },
                    set(target, key, value) {
                        if (methods[key]) {
                            return;
                        }
                        if (target[key] !== value) {
                            delay((data) => {
                                if (watches[key] !== data[key] && watch[key]) {
                                    watch[key](watches[key],data[key]);
                                    watches[key] = data[key];
                                }
                                app.html(app.template.render(data, { methods, watch, computed }).content);
                            })
                        }
                        return Reflect.set(target, key, value);
                    }
                }

                Object.defineProperty(app, 'vm', {
                    writable: false,
                    value: new Proxy(data, handler)
                })
                // 初始化完成
                created && created.call(app.vm);
            } else {
                throw new Error('不能重复调用model');
            }
        } else {
            throw new Error(`没有找到 is 属性为 ${this.id} 的模板`);
        }
    }
})()
