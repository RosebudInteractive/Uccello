/**
 * Created by staloverov on 22.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}


define([
        './products',
        './versions',
        './resTypes',
        'events'
    ],

    function(Products, Versions, ResTypes, EventEmitter) {

        return UccelloClass.extend({

            init : function(db) {
                this.products = new Products(db);
                this.versions = new Versions(db);
                this.resTypes = new ResTypes(db);
                this.events = new EventEmitter;

                var that = this;
                this.products.events.on('changeCurrent', function() {
                    that.onChangeCurrentProduct()
                });

                this.versions.events.on('changeCurrent', function() {
                    that.onChangeCurrentVersion()
                });
            },

            load : function(done) {
                var that = this;

                if (this.isLoaded()) {
                    done()
                } else {
                    if (!this.products.isLoaded()) {
                        this.products.load(checkLoading)
                    }

                    if (!this.versions.isLoaded()) {
                        this.versions.load(checkLoading)
                    }

                    if (!this.resTypes.isLoaded()) {
                        this.resTypes.load(checkLoading)
                    }
                }

                function checkLoading() {
                    if (that.isLoaded()) {
                        done()
                    }
                }
            },

            setCurrentProduct : function(currentProductCode) {
                this.products.setCurrent(currentProductCode);
            },

            getCurrentProduct : function() {
                return this.products.current
            },

            getCurrentVersion : function() {
                return this.versions.current
            },

            onChangeCurrentProduct: function () {
                this.versions.setCurrent(this.products.current.currVerId);
            },

            onChangeCurrentVersion: function () {
                this.events.emit('changeCurrentVersion')
            },

            isLoaded : function() {
                return this.products.isLoaded() && this.versions.isLoaded() && this.resTypes.isLoaded()
            },

            getResType : function(typeGuid) {
                return this.resTypes.getByGuid(typeGuid)
            }


        });
    }
);