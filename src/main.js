var config     = require('./config'),
    Seed       = require('./seed'),
    directives = require('./directives'),
    filters    = require('./filters')

//根据directives（指令）构造选择权
function buildSelector () {
    config.selector = Object.keys(directives).map(function (directive) {
        return '[' + config.prefix + '-' + directive + ']'
    }).join()
}

//导入配置，抽出公用变量 方便以后修改
Seed.config = config
buildSelector()

//扩展extend并在Seed.prototype上添加属性
Seed.extend = function (opts) {
    var Spore = function () {

        //将Seed的成员变量赋给Spore
        Seed.apply(this, arguments)

        //把extend的属性绑在scope上
        for (var prop in this.extensions) {
            var ext = this.extensions[prop]
            this.scope[prop] = (typeof ext === 'function')
                ? ext.bind(this)
                : ext
        }
    }

    //Spore.prototype.prototype = Seed.prototype
    Spore.prototype = Object.create(Seed.prototype)
    Spore.prototype.extensions = {}

    //将扩展的方法赋给 Spore.prototype.extensions
    for (var prop in opts) {
        Spore.prototype.extensions[prop] = opts[prop]
    }
    return Spore
}

Seed.directive = function (name, fn) {
    directives[name] = fn
    buildSelector()
}

Seed.filter = function (name, fn) {
    filters[name] = fn
}

module.exports = Seed