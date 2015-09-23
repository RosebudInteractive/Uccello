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
                            if (that.params.noEvent) {
                                that.dataBase(val);
                            } else {
                                that.getControlMgr().userEventHandler(that, function () {
                                    that.dataBase(val);
                                });
                            }
                            return;
                        }
                    }
                });

                // Закладки Базы данных, Транзакции(1), Версии рутов(2)
                $( ".tabs" ).tabs({
                    activate: function( event, ui ) {
                        vDBNavigator.activateTab.apply(that, [ui.newTab.index()]);
                    }
                });

                // кнопка рефреш
                var btn = $('<input type="button" value="Обновить" class="refreshBtn" style="float: right;margin: 0.5em;">');
                btn.click(function(){options.refresh = true; vDBNavigator.render.apply(that, options);});
                $('.tabs').prepend(btn);
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

            // выбираем первую бд Slave
            if (!that.dataBase()) {
                var options = dbSelector.find('option');
                for(var i=0; i<options.length; i++) {
                    if ($(options[i]).html().substr(0, 5) == 'Slave') {
                        that.dataBase($(options[i]).val());
                        break;
                    }
                }
            }

            // отображаем слева рут элементы
            dbSelector.val(that.dataBase());
            var controller = that.getControlMgr().getController();
            var db = that.dataBase()? controller.getDB(that.dataBase()): null;
            if (db) {
                var rootElemLink = null;
                var rootElem = this.level()===0? null: this.rootElem();
                var cnt = db.countRoot()/*rootElem? 1: db.countRoot()*/,
                    links = [];

                for (var i = 0; i < cnt; i++) {
                    var root = db.getRoot(i).obj/*rootElem ? db: db.getRoot(i).obj*/,
                        name = vDBNavigator.getRootName.apply(this, [root]);

                    var leftTpl = $(vDBNavigator._templates.left);
                    var link = leftTpl.find('a')
                        .data('obj', root)
                        .html(name)
                        .click(function () {
                            var a = $(this), root = a.data('obj');
                            left.find('a').removeClass('active');
                            a.addClass('active');

                            if (that.params.noEvent) {
                                that.rootElem(root.getGuid());
                            } else {
                                that.getControlMgr().userEventHandler(that, function(args){
                                    that.rootElem(args.obj.getGuid());
                                }, {obj:root});
                            }

                            // выбираем рут
                            vDBNavigator.selectItem.apply(that, [root, 0]);

                            // в закладке "Версии рутов" выбираем нужный рут
                            selRoot.val(root.getGuid());
                            return false;
                        });

                    link.attr('title', 'getRootVersion' in root? 'Root versions valid:'+root.getRootVersion('valid')+' sent:'+root.getRootVersion('sent')+' draft:'+root.getRootVersion('draft'): '');
                    left.append(leftTpl);

                    if (!rootElemLink && this.rootElem() == root.getGuid())
                        rootElemLink = link;

                    //  позиционирование по умолчанию было на первый рут, который после метарута
                    if (!this.rootElem() && db && i-1>=0 && db.getRoot(i-1).obj.getGuid() == 'fc13e2b8-3600-b537-f9e5-654b7418c156') {
                        rootElemLink = link;
                    }

                    links.push({link:link,root:root});
                }

                // рут можно выбирать в комбо закладка "версии рута"
                var tabsRootVer = $('.tabs ul:first li:eq(2) a'), selRoot = $('<select></select>');
                for(var i=0, len=links.length; i<len; i++) {
                    var option = $('<option />');
                    option.attr('value', links[i].root.getGuid()).data('link', links[i].link).html(links[i].link.html());
                    if (rootElemLink == links[i].link)
                        option.attr('selected', 'selected');
                    selRoot.append(option);
                }
                tabsRootVer.css('padding', '0.3em 1em 0.4em');
                tabsRootVer.empty();
                tabsRootVer.append('Версии рута: ');
                tabsRootVer.append(selRoot);
                //selRoot.click(function(e){e.stopPropagation();});
                selRoot.change(function(e){
                    e.stopPropagation();
                    var link = $(this).find('option:selected').data('link');
                    link.click();
                    vDBNavigator.verHistButton.apply(that);
                });

                // выбираем элемент слева
                if (rootElemLink)
                    rootElemLink.click();
            }

            // открываем сохраненную закладку
            $(".tabs").tabs("option", "active", this.tabNum());
            vDBNavigator.activateTab.apply(that, [this.tabNum()]);
        };

        vDBNavigator.activateTab = function(tab) {
            switch (tab) {
                case 0:
                    break;
                case 1:
                    vDBNavigator.tranButton.apply(this);
                    break;
                case 2:
                    vDBNavigator.verHistButton.apply(this);
                    break;
                case 3:
                    vDBNavigator.remoteCallsButton.apply(this);
                    break;
            }
            this.tabNum(tab);
        };

        vDBNavigator.getRootName = function(root) {
            var name = 'name' in root? root.name(): null;

            // читаемые названия для рутов данных
            if ('getObjType' in root &&  root.getObjType() && 'getRtype' in root.getObjType() && root.getObjType().getRtype() == "data")
                name = root.getObjType().get(0);

            // если имя не найдено равно гуиду
            if (!name) name = root.getGuid();

            //  метарут надо назвать "metaroot" (гуид у него фиксированный)
            if (name == 'fc13e2b8-3600-b537-f9e5-654b7418c156') name = 'metaroot';

            return name;
        }

        vDBNavigator.toParent = function (vcomp) {
            if (!this._activeObj) return;
            var that = this;

            if (that.params.noEvent) {
                that.rootElem(that._activeObj.getGuid());
                that.level(that.level()+1);
            } else {
                that.getControlMgr().userEventHandler(that, function(){
                    that.rootElem(that._activeObj.getGuid());
                    that.level(that.level()+1);
                });
            }


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

            if (that.params.noEvent) {
                that.rootElem(that._activeRoot.getParent().getGuid());
                that.level(that.level()-1);
            } else {
                that.getControlMgr().userEventHandler(that, function(){
                    that.rootElem(that._activeRoot.getParent().getGuid());
                    that.level(that.level()-1);
                });
            }

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
                            var obj = val.data('obj');
                            obj.getControlMgr().userEventHandler(obj, function(){
                                obj[val.attr('name').charAt(0).toLowerCase() + val.attr('name').slice(1)](val.val());
                            });
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
                var tranDiv = $('.tranDiv');
                tranDiv.empty().append(vDBNavigator.renderTable.apply(this, [db, tranList, 'tran']));
            }
        };


        vDBNavigator.verHistButton = function () {
            var editor = $('#' + this.getLid());
            var dbSelector = editor.find('.dbSelector');
            var controller = this.getControlMgr().getController();
            var db = controller.getDB(dbSelector.val());
            var rootElem = this.rootElem();
            if (db && rootElem) {
                var root =  db.getRoot(rootElem);
                var tranList = root.obj.getVerHist();
                var tranDiv = $('.rootVerDiv');
                tranDiv.empty().append(vDBNavigator.renderTable.apply(this, [db, tranList, 'ver']));
            }
        };


        vDBNavigator.remoteCallsButton = function () {
            var editor = $('#' + this.getLid());
            var dbSelector = editor.find('.dbSelector');
            var controller = this.getControlMgr().getController();
            var db = controller.getDB(dbSelector.val());
            if (db && "getRcLog" in db) {
                var rcLog =  db.getRcLog();
                var tranDiv = $('.remoteCallsDiv');
                tranDiv.empty()
                var table = $('<table><tr><th></th><th>time</th><th>type</th><th>trGuid</th><th>src</th><th>objGuid</th><th>func</th><th>aparams</th></table>'), thTable, that = this;

                var trGuidGroup = {}, trGuidClass=false, currGuid=false;
                var trGuidTimeGroup = {}, trGuidTimeClass=false, currTimeGuid=false;
                for(var i in rcLog) {
                    if (currGuid != rcLog[i].trGuid)
                        trGuidClass = trGuidClass == 'trGuid1'? 'trGuid2' : 'trGuid1';
                    currGuid = rcLog[i].trGuid;
                    trGuidGroup[rcLog[i].trGuid] = trGuidClass;

                    var time = rcLog[i].time;
                    time = rcLog[i].trGuid+time.getHours()+':'+time.getMinutes()+':'+time.getSeconds()+'.'+time.getMilliseconds();
                    if (currTimeGuid != time)
                        trGuidTimeClass = trGuidTimeClass == 'time1'? 'time2' : 'time1';
                    currTimeGuid = time;
                    trGuidTimeGroup[time] = trGuidTimeClass;
                }
                for(var i in rcLog) {
                    var tr =$('<tr class="'+trGuidGroup[rcLog[i].trGuid]+'"></tr>');
                    var time = rcLog[i].time;
                    time = time.getHours()+':'+time.getMinutes()+':'+time.getSeconds()+'.'+time.getMilliseconds();
                    tr.append('<td width="5" class="'+trGuidTimeGroup[rcLog[i].trGuid+time]+'">&nbsp;</td>');
                    tr.append('<td>' + time + '</td>');
                    tr.append('<td>' + rcLog[i].type + '</td>');
                    tr.append('<td>' + rcLog[i].trGuid + '</td>');
                    tr.append('<td>' + (rcLog[i].src?rcLog[i].src:'&nbsp;') + '</td>');
                    tr.append('<td>' + (rcLog[i].rc.objGuid?rcLog[i].rc.objGuid:'&nbsp;') + '</td>');
                    tr.append('<td>' + (rcLog[i].rc.func?rcLog[i].rc.func:'&nbsp;') + '</td>');

                    var params = $('<td class="params"><pre  style="display: none;">' + (rcLog[i].rc.aparams?JSON.stringify(rcLog[i].rc.aparams, null, 1):'-') + '</pre>&nbsp;</td>');
                    tr.click(function(){
                        $(this).find('.params pre').toggle();
                    });
                    tr.append(params);
                    table.append(tr);
                }
                tranDiv.append(table);
            }
        };

        vDBNavigator.renderTable = function (db, tranList, type) {
            var table = $('<table></table>'), thTable, that = this;

            if (type == 'tran') {
                thTable = $('<tr><td colspan="10"><input type="button" value="truncate" /></td> </tr><tr><th>guid</th><th>start</th><th>end</th><th>state</th><th>src</th><th>rootGuid</th><th>min</th><th>max</th></tr>');
                thTable.find('input').click(function(){
                    var checked = table.find('.checkTrans:checked');
                    if (checked.length>0) {
                        for (var i = 0, len = checked.length; i < len; i++) {
                            db.truncTran($(checked[i]).val());
                        }
                    } else {
                        db.truncTran();
                    }
                    vDBNavigator.tranButton();
                });
            } else {
                thTable =  $('<tr><th>version</th><th>guid</th><th>tran guid</th><th>start</th><th>end</th><th>state</th><th>src</th><th>rootGuid</th><th>min</th><th>max</th></tr>');
            }
            table.append(thTable);

            for(var i in tranList) {
                var tr =$('<tr></tr>');
                var tran = type == 'tran'? tranList[i]: tranList[i].tr;
                var start = tran.start, end = tran.end?tran.end:null;
                start = start.getHours()+':'+start.getMinutes()+':'+start.getSeconds()+'.'+start.getMilliseconds();
                end = end?(end.getHours()+':'+end.getMinutes()+':'+end.getSeconds()+'.'+end.getMilliseconds()):'-';
                if (type == 'tran') {
                    tr.append('<td><input type="checkbox" value="' + tranList[i].guid + '" class="checkTrans" id="' + tranList[i].guid + '"/> <label for="' + tranList[i].guid + '">' + tranList[i].guid + '</label></td>');
                   /* tr.find('label').click(function(){
                        vDBNavigator.viewTranDetail.apply(that, [$(this).attr('for')]);
                    });*/
                    tr.append('<td>' + start + '</td>');
                    tr.append('<td>' + end + '</td>');
                    tr.append('<td>' + tran.state + '</td>');
                    tr.append('<td>' + tran.src + '</td>');
                } else {
                    tr.append('<td>'+tranList[i].ver+'</td>');
                    tr.append('<td>'+tranList[i].guid+'</td>');
                    tr.append('<td>'+tran.guid+'</td>');
                    tr.append('<td>'+start+'</td>');
                    tr.append('<td>'+end+'</td>');
                    tr.append('<td>'+tran.state+'</td>');
                    tr.append('<td>'+tran.src+'</td>');
                }
                var index = 0;
                for(var j in tran.roots) {
                    if (index!=0) {
                        var tr = $('<tr></tr>');
                        tr.append(type == 'tran'?'<td></td><td></td><td></td><td></td><td></td>':'<td></td><td></td><td></td><td></td><td></td><td></td><td></td>');
                    }
                    tr.append('<td>'+j+'</td>');
                    tr.append('<td>'+tran.roots[j].min+'</td>');
                    tr.append('<td>'+tran.roots[j].max+'</td>');
                    table.append(tr);
                    index++;
                }

                if (index == 0) {
                    tr.append('<td></td><td></td><td></td>');
                    table.append(tr);
                }
            }
            return table;
        };

        vDBNavigator.viewTranDetail = function(guid) {
            var tranDiv = $('.tranDiv'), tranInfo=tranDiv.find('.tranInfo'), tranTable=tranDiv.find('.tranTable');
            if (tranInfo.length==0) {
                tranInfo = $('<div class="tranInfo"><p>Transaction Detail: '+guid+'</p></div>');
                tranTable = $('<table class="tranTable"></table>');
                tranInfo.append(tranTable);
                tranDiv.append(tranInfo);
            } else {
                tranInfo.find('p').html('Transaction Detail: '+guid);
                tranTable.empty();
            }
            tranTable.append('<tr><td>1</td></tr>');
        };

        return vDBNavigator;
    });
