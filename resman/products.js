/**
 * Created by staloverov on 22.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define([
        //UCCELLO_CONFIG.uccelloPath + 'controls/controlMgr',
        //UCCELLO_CONFIG.uccelloPath + '/predicate/predicate',
        './resUtils'
    ],

    function(ResUtils) {
        function Product(productObj) {
            this.id = productObj.id();
            this.code = productObj.code();
            this.name = productObj.name();
            this.description = productObj.description();
            this.currVerId = productObj.currVerId();
        }

        var Products = UccelloClass.extend({

            init : function(db) {
                this.db = db;
                this.products = [];
                this.current = null;
                this.state = ResUtils.state.new;

                this.queryGuid = '846ff96f-c85e-4ae3-afad-7d4fd7e78144';
            },

            load : function(done) {
                if (this.isLoaded()) {
                    done()
                } else {
                    var that = this;

                    this.db.getRoots([this.queryGuid], {rtype: "data", expr: {model: {name: "SysProduct"}}}, function (guids) {
                        var _objectGuid = guids.guids[0];
                        that.queryGuid = _objectGuid;

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
                this.current = this.getByCode(productCode);
            }


        });

        return Products;
    }

);