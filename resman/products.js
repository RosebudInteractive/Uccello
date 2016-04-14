/**
 * Created by staloverov on 22.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define([
        './resUtils', 'events'
    ],

    function(ResUtils, EventEmitter) {
        function Product(productObj) {
            this.id = productObj.id();
            this.code = productObj.code();
            this.name = productObj.name();
            this.description = productObj.description();
            this.currVerId = productObj.currVerId();
        }

        return UccelloClass.extend({

            init : function(db) {
                this.db = db;
                this.products = [];
                this.current = null;
                this.state = ResUtils.state.new;
                this.events = new EventEmitter();

                this.queryBuildResGuid = '846ff96f-c85e-4ae3-afad-7d4fd7e78144';
            },

            load : function(done) {
                if (this.isLoaded()) {
                    done()
                } else {
                    var that = this;

                    this.db.getRoots([this.queryBuildResGuid], {rtype: "data", expr: {model: {name: "SysProduct"}}}, function (guids) {
                        var _objectGuid = guids.guids[0];
                        that.queryBuildResGuid = _objectGuid;

                        var _elements = that.db.getObj(_objectGuid).getCol('DataElements');
                        for (var i = 0; i < _elements.count(); i++) {
                            var _product = new Product(_elements.get(i));
                            that.products.push(_product);
                            if ((that.currentProductCode) && (_product.code == that.currentProductCode)) {
                                that.currentProduct = _product
                            }
                        }

                        that.state = ResUtils.state.loaded;
                        done();
                    });
                }
            },

            isLoaded : function() {
                return this.state == ResUtils.state.loaded;
            },

            getById : function(id) {
                return this.products.find(function(product) {
                    return product.id == id
                })
            },

            getByCode : function(code) {
                return this.products.find(function(product) {
                    return product.code == code
                })
            },

            setCurrent : function(productCode) {
                if ((!this.current) || (this.current.code != productCode)) {
                    var _current = this.getByCode(productCode);
                    if (!_current) {
                        throw ResUtils.newObjectError('Product [' + productCode + '] not found')
                    }
                    this.current = _current;
                    this.events.emit('changeCurrent');
                }
            }
        });
    }

);