var prefix      = 'sd',
    Filters     = require('./filters'),
    Directives  = require('./directives'),
    selector    = Object.keys(Directives).map(function (d) {
        return '[' + prefix + '-' + d + ']'
    }).join()

function Seed (opts) {

    var self = this,
        root = this.el = document.getElementById(opts.id),
        els  = root.querySelectorAll(selector),   //找到带有指令的元素
        bindings = {} // internal real data  保存内部用到的所有数据

    self.scope = {} // external interface

    // process nodes for directives
    ;[].forEach.call(els, processNode)
    processNode(root)

    // initialize all variables by invoking setters
    for (var key in bindings) {
        self.scope[key] = opts.scope[key]
    }

    function processNode (el) {    //el 顶部元素
        cloneAttributes(el.attributes).forEach(function (attr) {

            var directive = parseDirective(attr)  

            if (directive) {
                bindDirective(self, el, bindings, directive)
            }
        })
    }
}

// clone attributes so they don't change
function cloneAttributes (attributes) {
    return [].map.call(attributes, function (attr) {
        return {
            name: attr.name,
            value: attr.value
        }
    })
}

/*
    将指令的变量作为key赋给bings，key对应的值是用到该变量的所有指令和变量的值
    bindings: {
        msg:{                           //msg为scop中的变量，也即vue中data中的变量
            directives[directive],      //directives包含该变量全部被使用的信息
            value:undefined             //value该变量的值
        }
    }
*/
function bindDirective (seed, el, bindings, directive) {
    el.removeAttribute(directive.attr.name)
    var key = directive.key,
        binding = bindings[key]
    if (!binding) {
        bindings[key] = binding = {
            value: undefined,
            directives: []
        }
    }
    directive.el = el
    binding.directives.push(directive)
    // invoke bind hook if exists
    if (directive.bind) {
        directive.bind(el, binding.value)
    }

    // scope中没有这个键就绑定 getter setter
    if (!seed.scope.hasOwnProperty(key)) {
        bindAccessors(seed, key, binding)
    }
}

/*
    将binging中的值和seed中的值绑定，访问seed.scope[key]等同于访问binding[key]
    改变scope中的值时更新binging中的值，并重新渲染
*/
function bindAccessors (seed, key, binding) {
    Object.defineProperty(seed.scope, key, {
        get: function () {
            return binding.value
        },
        set: function (value) {
            binding.value = value
            binding.directives.forEach(function (directive) {
                if (value && directive.filters) {
                    value = applyFilters(value, directive)
                }

                //重新渲染
                directive.update(
                    directive.el,
                    value,
                    directive.argument,
                    directive,
                    seed
                )
            })
        }
    })
}

/*解析指令  
    @return
    {
        attr: attr,   // {name: "sd-text", value: "msg | capitalize"}
        key: key,     // "msg"
        filters: filters, // ["capitalize"]
        definition: def,  // f(el,value)
        argument: arg,    // null
        update: typeof def === 'function'
            ? def
            : def.update
    }
*/
function parseDirective (attr) {

    if (attr.name.indexOf(prefix) === -1) return

    // parse directive name and argument
    var noprefix = attr.name.slice(prefix.length + 1),
        argIndex = noprefix.indexOf('-'),
        dirname  = argIndex === -1
            ? noprefix
            : noprefix.slice(0, argIndex),
        def = Directives[dirname],
        arg = argIndex === -1
            ? null
            : noprefix.slice(argIndex + 1)

    // parse scope variable key and pipe filters
    var exp = attr.value,
        pipeIndex = exp.indexOf('|'),
        key = pipeIndex === -1
            ? exp.trim()
            : exp.slice(0, pipeIndex).trim(),
        filters = pipeIndex === -1
            ? null
            : exp.slice(pipeIndex + 1).split('|').map(function (filter) {
                return filter.trim()
            })

    return def
        ? {
            attr: attr,
            key: key,
            filters: filters,
            definition: def,
            argument: arg,
            update: typeof def === 'function'
                ? def
                : def.update
        }
        : null
}

function applyFilters (value, directive) {
    if (directive.definition.customFilter) {
        return directive.definition.customFilter(value, directive.filters)
    } else {
        directive.filters.forEach(function (filter) {
            if (Filters[filter]) {
                value = Filters[filter](value)
            }
        })
        return value
    }
}

module.exports = {
    create: function (opts) {
        return new Seed(opts)
    },
    filters: Filters,
    directives: Directives
}