define(
    ['../../uses/template', 'text!./templates/dbNavigator.html'],
    function(template, tpl) {
        var vDBNavigator = {};
        vDBNavigator._templates = template.parseTemplate(tpl);
        vDBNavigator.render = function (options) {
            var that = this;
            var editor = $('#' + that.getLid()), dbSelector = null;
            if (editor.length === 0) {
                editor = $(vDBNavigator._templates.navigator).attr('id', that.getLid());

                var parent = this.getParent()? '#ch_' + this.getLid(): options.rootContainer;
                $(parent).append(editor);
                // перейти к паренту
                editor.find('.dragRight').click(function () {
                    vDBNavigator.toParent.apply(that);
                });
                // перейти к чайлду
                editor.find('.dragLeft').click(function () {
                    vDBNavigator.toChild.apply(that);
                });
                // рефреш
                editor.find('.refresh').click(function () {
                    that.getControlMgr().userEventHandler(that);
                });

                dbSelector = editor.find('.dbSelector');
                dbSelector.append('<option />');
                if (!this.params.dbSelector){ // если базы не указаны берем из контроллера
                    this.params.dbSelector = [];
                    var dbList = that.getControlMgr().getController().getDbList();
                    for(i=0; i<dbList.length; i++)
                        this.params.dbSelector.push({name:dbList[i].db.getName(), guid:dbList[i].db.getGuid()});
                }
                for(var i=0, len=this.params.dbSelector.length; i<len; i++) {
                    var option = $('<option />').attr('value', this.params.dbSelector[i].guid).html(this.params.dbSelector[i].name);
                    dbSelector.append(option);
                }
                dbSelector.change(function(){
                    var val = $(this).val();
                    var db = that.getControlMgr().getController().getDB(val);
                    editor.find('.dbVersionSpan').html(
                        //'DB versions valid:'+db.getVersion('valid')+
                        //' sent:'+db.getVersion('sent')+
                        //' draft:'+db.getVersion('draft')+
                        ' guid:'+db.getGuid()
                    );
                    for(var i=0, len=that.params.dbSelector.length; i<len; i++) {
                        if (val == that.params.dbSelector[i].guid) {
                            that.getControlMgr().userEventHandler(that, function () {
                                that.dataBase(val);
                            });
                            return;
                        }
                    }
                });

                //рядом с бд кнопка "тран" - открывает список транзакций,
                //    со след инфо guid,start,end,src (end может отсутствовать для незакрытой)
                //плюс есть еще у каждой roots - это объект где проперти - гуиды рутов,
                //    а внутри есть поля которые надо бы просто пробежать и вывести куда-то
                editor.find('.tranButton').click(function () {
                    vDBNavigator.tranButton.apply(that);
                });
                editor.find('.verHistButton').click(function () {
                    vDBNavigator.verHistButton.apply(that);
                });
                if ($('.tranDiv.ui-dialog-content').length==0)
                {
                    $('.tranDiv').dialog({
                        title: "Transactions List",
                        resizable: true,
                        width: 670,
                        height: 400,
                        modal: true,
                        autoOpen: false,
                        buttons: {}
                    });
                }
            }

            var left = editor.find('.left');
            var centerTop = editor.find('.centerTop');
            var centerBottom = editor.find('.centerBottom');
            var right = editor.find('.right');
            dbSelector = editor.find('.dbSelector');
            left.empty();
            centerTop.empty();
            centerBottom.empty();
            right.empty();

            // добавляем уровни
            var levels = editor.find('.levels');
            levels.empty();
            for(var i=0, len=this.nlevels(); i<len; i++) {
                var levelCol = $(vDBNavigator._templates.levelCol);
                levelCol.find('.centerTop').addClass('level'+i);
                levelCol.find('.centerBottom').addClass('level'+i);
                levels.append(levelCol);
            }

            that._activeRoot = null;
            that._activeCol = null;
            that._activeObj = null;

            // отображаем слева рут элементы
            dbSelector.val(that.dataBase());
            //var controller = that.getControlMgr().getDB().getController();
            var controller = that.getControlMgr().getController();
            var db = that.dataBase()? controller.getDB(that.dataBase()): null;
            if (db) {
                var rootElemLink = null;
                var rootElem = this.level()===0? null: this.rootElem();
                var cnt = rootElem? 1: db.countRoot();

                for (var i = 0; i < cnt; i++) {
                    //var root = rootElem? db.getObj(rootElem): db.getRoot(i).obj;
                    var root = rootElem ? db: db.getRoot(i).obj;
                    var name = 'name' in root? root.name(): null;

                    // читаемые названия для рутов данных
                    if ('getObjType' in root &&  root.getObjType() && 'getRtype' in root.getObjType() && root.getObjType().getRtype() == "data") {
                        name = root.getObjType().get(0);
                    }

                    if (!name)
                        name = root.getGuid();

                    var leftTpl = $(vDBNavigator._templates.left);
                    var link = leftTpl.find('a')
                        .data('obj', root)
                        .html(name)
                        .click(function () {
                            var a = $(this);
                            left.find('a').removeClass('active');
                            a.addClass('active');
                            that.getControlMgr().userEventHandler(that, function(args){
                                that.rootElem(args.obj.getGuid());
                                vDBNavigator.selectItem.apply(that, [args.obj, 0]);
                            }, {obj:a.data('obj')});
                            return false;
                        });

                    link.attr('title', 'getRootVersion' in root? 'Root versions valid:'+root.getRootVersion('valid')+' sent:'+root.getRootVersion('sent')+' draft:'+root.getRootVersion('draft'): '');
                    left.append(leftTpl);

                    if (!rootElemLink && this.rootElem() == root.getGuid())
                        rootElemLink = link;
                }


                if (rootElemLink) {
                    left.find('a').removeClass('active');
                    rootElemLink.addClass('active');
                    vDBNavigator.selectItem.apply(this, [rootElemLink.data('obj'), 0]);
                }

                //vDBNavigator.selectFirst.apply(that);
            }
        };

        vDBNavigator.toParent = function (vcomp) {
            if (!this._activeObj) return;
            var that = this;

            that.getControlMgr().userEventHandler(that, function(){
                that.rootElem(that._activeObj.getGuid());
                that.level(that.level()+1);
            });

            var editor = $('#' + this.getLid());
            var left = editor.find('.left');
            var centerTop = editor.find('.centerTop.level0');
            var centerBottom = editor.find('.centerBottom.level0');
            var right = editor.find('.right');
            var name = centerBottom.find('a.active').html();
            left.empty();
            centerTop.empty();
            centerBottom.empty();
            right.empty();
            var leftTpl = $(vDBNavigator._templates['left']);
            var link = leftTpl.find('a')
                .data('obj', this._activeObj)
                .html(name)
                .click(function () {
                    var a = $(this);
                    left.find('a').removeClass('active');
                    a.addClass('active');
                    vDBNavigator.selectItem.apply(that, [a.data('obj'), 0]);
                    return false;
                });
            left.append(leftTpl);
            link.click();


        };

        vDBNavigator.toChild = function (vcomp) {
            if (!this._activeRoot || !this._activeRoot.getParent()) return;
            var that = this;

            that.getControlMgr().userEventHandler(that, function(){
                that.rootElem(that._activeRoot.getParent().getGuid());
                that.level(that.level()-1);
            });

            var editor = $('#' + this.getLid());
            var left = editor.find('.left');
            var centerTop = editor.find('.centerTop');
            var centerBottom = editor.find('.centerBottom');
            var right = editor.find('.right');
            var parent = this._activeRoot.getParent();
            var name = 'name' in parent &&  parent.name() ? parent.name() : parent.getGuid();
            left.empty();
            centerTop.empty();
            centerBottom.empty();
            right.empty();
            var leftTpl = $(vDBNavigator._templates['left']);
            var link = leftTpl.find('a')
                .data('obj', parent)
                .html(name)
                .click(function () {
                    var a = $(this);
                    left.find('a').removeClass('active');
                    a.addClass('active');
                    vDBNavigator.selectItem.apply(that, [a.data('obj'), 0]);
                    return false;
                });
            left.append(leftTpl);
            link.click();
        };

        vDBNavigator.selectItem = function (obj, level) {

            if (level==0) {
                this._activeRoot = obj;
                this._activeCol = null;
                this._activeObj = null;
            }

            var that = this;
            var editor = $('#' + this.getLid());

            // очищаем все низшие уровни
            for(var i=level; i<this.nlevels(); i++) {
                editor.find('.centerTop.level'+i).empty();
                editor.find('.centerBottom.level'+i).empty();
            }

            // отображаем в центре коллекции объекта
            var centerTop = editor.find('.centerTop.level'+level);
            var centerBottom = editor.find('.centerBottom.level'+level);
            if (obj.countCol)
                for (var i = 0, len = obj.countCol(); i < len; i++) {
                    var col = obj.getCol(i);
                    var name = col.getName();
                    if (!name)
                        name = col.getGuid();
                    var centerTpl = $(vDBNavigator._templates['centerTop']);
                    var link = centerTpl.find('a')
                        .data('obj', col)
                        .html(name)
                        .click(function () {
                            var a = $(this);
                            centerTop.find('a').removeClass('active');
                            a.addClass('active');
                            vDBNavigator.selectCol.apply(that, [a.data('obj'), level]);
                            return false;
                        });
                    centerTop.append(centerTpl);
                }
            //vDBNavigator.selectFirst.apply(this, [1]);
            vDBNavigator.viewRight.apply(this, [obj]);
        };

        vDBNavigator.selectCol = function (obj, level) {

            if (level==0){
                this._activeCol = obj;
                this._activeObj = null;
            }

            var that = this;
            var editor = $('#' + this.getLid());

            // очищаем все низшие уровни
            for(var i=level; i<this.nlevels(); i++) {
                editor.find('.centerBottom.level'+i).empty();
            }

            // отображаем в центре субэлементы  коллекции объекта
            var centerBottom = editor.find('.centerBottom.level'+level);
            for (var i = 0, len = obj.count(); i < len; i++) {
                var col = obj.get(i);
                var name = 'name' in col && col.name()? col.name(): null;
                if (!name)
                    name = col.getGuid();
                var centerTpl = $(vDBNavigator._templates['centerTop']);
                var link = centerTpl.find('a')
                    .data('obj', col)
                    .html(name)
                    .click(function () {
                        var a = $(this);
                        centerBottom.find('a').removeClass('active');
                        a.addClass('active');
                        vDBNavigator.selectObj.apply(that, [a.data('obj'), level]);
                        return false;
                    });
                centerBottom.append(centerTpl);
            }
            vDBNavigator.viewRight.apply(this, [obj]);
        };

        vDBNavigator.selectObj = function (obj, level) {
            if (level==0)
                this._activeObj = obj;
            if (this.nlevels()>level+1)
                vDBNavigator.selectItem.apply(this, [obj, level+1]);
            vDBNavigator.viewRight.apply(this, [obj]);
        };

        vDBNavigator.viewRight = function (obj) {
            var that = this;
            var editor = $('#' + this.getLid());

            // отображаем справа поля
            var right = editor.find('.right');
            right.empty();
            if (obj.count) {

                if ("getGuid" in obj)
                    right.append('<p><span class="name" style="width: 54px;vertical-align: top;">Guid</span> <textarea style="width: 157px;height: 30px;" class="value"  >'+obj.getGuid()+'</textarea> <input style="vertical-align: top;" class="save" type="button" value="c" title="copy" onclick="$(this).prev().select(); document.execCommand(\'copy\');"></p>');
                if ("getTypeGuid" in obj)
                    right.append('<p><span class="name" style="width: 54px;vertical-align: top;">TypeGuid</span> <textarea style="width: 157px;height: 30px;" class="value"  >'+obj.getTypeGuid()+'</textarea> <input style="vertical-align: top;" class="save" type="button" value="c" title="copy" onclick="$(this).prev().select(); document.execCommand(\'copy\');"></p>');
                if ('getRootVersion' in obj)
                    right.append('<p><span class="name" style="width: 100%;vertical-align: top;">Root versions valid:'+obj.getRootVersion('valid')+' sent:'+obj.getRootVersion('sent')+' draft:'+obj.getRootVersion('draft')+'</span></p>');
                for (var i = 0, len = obj.count(); i < len; i++) {
                    if (obj.getFieldType) {
                        var rightTpl = $(vDBNavigator._templates.right);
                        rightTpl.find('.name').html(obj.getFieldName(i));
                        rightTpl.find('.type').html(obj.getFieldType(i));
                        rightTpl.find('.value').attr('name', obj.getFieldName(i)).data('obj', obj).val(obj.get(i));
                        rightTpl.find('.save').click(function () {
                            var val = $(this).parent().find('.value');
                            val.data('obj')[val.attr('name').charAt(0).toLowerCase() + val.attr('name').slice(1)](val.val());
                            return false;
                        });
                        right.append(rightTpl);
                    }
                }
            }
        };


        vDBNavigator.selectFirst = function (num) {
            var editor = $('#' + this.getLid());
            var left = editor.find('.left');
            var centerTop = editor.find('.centerTop');
            var centerBottom = editor.find('.centerBottom');
            var f1, f2, f3, links;

            if (!num) {
                links = left.find('a');
                if (this._activeRoot) {
                    for(var i= 0, len=links.length; i<len; i++) {
                        if (this._activeRoot == $(links[i]).data('obj'))
                            f1 = $(links[i]);
                    }
                } else
                    f1 = links.length>0 ? $(links[0]) : null;
                if (f1) f1.click();
            }

            links = centerTop.find('a');
            if (this._activeCol) {
                for(var i= 0, len=links.length; i<len; i++) {
                    if (this._activeCol == $(links[i]).data('obj'))
                        f2 = $(links[i]);
                }
            } else
                f2 = links.length>0 ? $(links[0]) : null;
            if (f2) f2.click();

            links = centerBottom.find('a');
            if (this._activeObj) {
                for(var i= 0, len=links.length; i<len; i++) {
                    if (this._activeObj == $(links[i]).data('obj'))
                        f3 = $(links[i]);
                }
            } else
                f3 = links.length>0 ? $(links[0]) : null;
            if (f3) f3.click();
        };

        vDBNavigator.tranButton = function () {
            var editor = $('#' + this.getLid())
            var dbSelector = editor.find('.dbSelector');
            var controller = this.getControlMgr().getController();
            var db = controller.getDB(dbSelector.val());

            if (db && "getTranList" in db) {
                var tranList = db.getTranList();
                var tranDiv = $('.tranDiv.ui-dialog-content');
                tranDiv.empty();
                for(var i=0, len=tranList.length; i<len; i++) {
                    var start = tranList[i].start, end = tranList[i].end?tranList[i].end:null;
                    start = start.getHours()+':'+start.getMinutes()+':'+start.getSeconds()+'.'+start.getMilliseconds();
                    end = end?(end.getHours()+':'+end.getMinutes()+':'+end.getSeconds()+'.'+end.getMilliseconds()):'-';
                    tranDiv.append('<p>guid:'+tranList[i].guid+', start:'+start+', end:'+end+', src:'+tranList[i].src+'</p>');
                    for(var j=0 in tranList[i].roots) {
                        var props = [];
                        for (var k = 0 in tranList[i].roots[j]) {
                            props.push(k+':'+tranList[i].roots[j][k]);
                        }
                        tranDiv.append('<p>&nbsp;&nbsp;&nbsp;&nbsp;' + j + ':' +props.join(', '));
                    }
                }


                $(tranDiv).dialog('option', 'title', "Transactions List");
                $(tranDiv).dialog('open');
            }
        };


        vDBNavigator.verHistButton = function () {
            var editor = $('#' + this.getLid())
            var dbSelector = editor.find('.dbSelector');
            var controller = this.getControlMgr().getController();
            var db = controller.getDB(dbSelector.val());
            var rootElem = this.rootElem();

            if (db && rootElem) {
                var root =  db.getRoot(rootElem);
                var tranList = root.obj.getVerHist();
                var tranDiv = $('.tranDiv.ui-dialog-content');
                tranDiv.empty();
                for(var i=0 in tranList) {
                    var start = tranList[i].start, end = tranList[i].end?tranList[i].end:null;
                    start = start.getHours()+':'+start.getMinutes()+':'+start.getSeconds()+'.'+start.getMilliseconds();
                    end = end?(end.getHours()+':'+end.getMinutes()+':'+end.getSeconds()+'.'+end.getMilliseconds()):'-';
                    tranDiv.append('<p>guid:'+tranList[i].guid+', start:'+start+', end:'+end+', src:'+tranList[i].src+'</p>');
                    for(var j=0 in tranList[i].roots) {
                        var props = [];
                        for (var k = 0 in tranList[i].roots[j]) {
                            props.push(k+':'+tranList[i].roots[j][k]);
                        }
                        tranDiv.append('<p>&nbsp;&nbsp;&nbsp;&nbsp;' + j + ':' +props.join(', '));
                    }
                }
                $(tranDiv).dialog('option', 'title', "Root Versions");
                $(tranDiv).dialog('open');
            }
        };

        return vDBNavigator;
    });
