if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * Модуль Graphset
 * @module Graphset
 */
define (
    function() {
        var Graphset = UccelloClass.extend({

            init: function() {
				this.pvt = {};
				this.pvt.pts = {};
				this.pvt.sPts = {};
				this.pvt.ePts = {};
				

            },
			
			_addPoint: function(id, obj) {
				if (this.pvt.pts[id]) return false;
				var p = {};
				p.obj = obj;
				p.id = id;
				p.inLinks = {};
				p.outLinks = {};
				this.pvt.pts[id] = p;	// при добавении точка не зависит ни от одной другой
				this.pvt.sPts[id] = p;
				this.pvt.ePts[id] = p;
				return true;
			},
			
			_addLink: function(fromId, toId, cb) {
				if (!(this.pvt.pts[fromId]) && (this.pvt.pts[toId])) return false;
				var l = {};
				l.fromPt = this.pvt.pts[fromId];
				l.toPt = this.pvt.pts[toId];
				l.fromPt.outLinks[toId] = l;
				l.toPt.inLinks[fromId] = l;
				l.cb = cb;

				if (this.pvt.sPts[toId]) delete this.pvt.sPts[toId];
				if (this.pvt.ePts[fromId]) delete this.pvt.ePts[fromId];
			},
			
			_delPoint: function(id) {
			},
			
			_delLink: function(fromId, toId) {
			},
			
			getPt: function(id) {
				if (this.pvt.pts[id]) return this.pvt.pts[id];
				else return undefined;
			},

            /**
             * подписаться элементу на другой элемент
             * @param subsId - подписчик
             * @param publId - генератор события
             * @param cb - объект с коллбэком
             */			
			on: function(subsId, publId, cb) {

				if (!this.getPt(subsId))
					this._addPoint(subsId,null);
				if (!this.getPt(publId))
					this._addPoint(publId,null);
				this.addLink(publId,subsId,cb);
			},
			
			fire: function(id, result) {
				var p = this.getPt(id); 
				if (!p) return false;
				for (var i in p.outLinks) {
					p.outLinks[i].cb.callback.apply(cb.context,result);
				}
			},


        });

        return Graphset;
    }
);