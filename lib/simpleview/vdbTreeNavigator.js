define(
    ['../../uses/template', 'text!./templates/dbTreeNavigator.html'],
    function(template, tpl) {
        var vDBTreeNavigator = {};
        vDBTreeNavigator._templates = template.parseTemplate(tpl);
        vDBTreeNavigator._linksRoot = [];
        vDBTreeNavigator._history = [];
        vDBTreeNavigator._historyIndex = 0;
        vDBTreeNavigator.render = function (options) {
            var that = this;
            var editor = $('#' + that.getLid()), dbSelector = null;
            if (editor.length === 0) {
                editor = $(vDBTreeNavigator._templates.navigator).attr('id', that.getLid());

                var parent = this.getParent()? '#ch_' + this.getLid(): options.rootContainer;
                $(parent).append(editor);

                dbSelector = editor.find('.dbSelector');
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
                $( ".tabsNavi" ).tabs({
                    activate: function( event, ui ) {
                        vDBTreeNavigator.activateTab.apply(that, [ui.newTab.index()]);
                    }
                });

                var btn = $('<input type="button" value="truncate" class="refreshBtn" style="float: right;margin: 0.5em;">');
                btn.click(function(){
                    var db = that.getControlMgr().getController().getDB(that.dataBase());
                    db.truncTran();
                    vDBTreeNavigator.tranButton();
                });
                $('.tabsNavi').prepend(btn);

                // кнопка рефреш
                var btn = $('<input type="button" value="Обновить" class="refreshBtn" style="float: right;margin: 0.5em;">');
                btn.click(function(){options.refresh = true; vDBTreeNavigator.render.apply(that, options);});
                $('.tabsNavi').prepend(btn);

                // кнопки вперед-назад
                var btn = $('<input type="button" value="<" title="назад" disabled class="refreshBtn prevHist" style="float: right;margin: 0.5em;">');
                btn.click(function(){vDBTreeNavigator.prevHist.apply(that);});
                $('.tabsNavi').prepend(btn);
                var btn = $('<input type="button" value=">" title="вперед" disabled class="refreshBtn nextHist" style="float: right;margin: 0.5em;">');
                btn.click(function(){vDBTreeNavigator.nextHist.apply(that);});
                $('.tabsNavi').prepend(btn);


            }

            // заполняем бд
            dbSelector = editor.find('.dbSelector').empty();
            dbSelector.append('<option />');
            //if (!this.params.dbSelector){ // если базы не указаны берем из контроллера
            this.params.dbSelector = [];
            var dbList = that.getControlMgr().getController().getDbList();
            for(i=0; i<dbList.length; i++)
                this.params.dbSelector.push({name:dbList[i].db.getName(), guid:dbList[i].db.getGuid()});
            //}
            for(var i=0, len=this.params.dbSelector.length; i<len; i++) {
                var option = $('<option />').attr('value', this.params.dbSelector[i].guid).html(this.params.dbSelector[i].name);
                dbSelector.append(option);
            }

            var left = editor.find('.left');
            var tree = editor.find('.tree');
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
                var levelCol = $(vDBTreeNavigator._templates.levelCol);
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
                vDBTreeNavigator._linksRoot = [];

                for (var i = 0; i < cnt; i++) {
                    var root = db.getRoot(i).obj/*rootElem ? db: db.getRoot(i).obj*/,
                        name = vDBTreeNavigator.getRootName.apply(this, [root]);

                    var leftTpl = $(vDBTreeNavigator._templates.left);
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
                            vDBTreeNavigator.selectItem.apply(that, [root, 0]);

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
                    vDBTreeNavigator._linksRoot.push({"text" : link.html(), "id" : root.getGuid(), "children" : true, data:root,  icon:true});
                }

                // рут можно выбирать в комбо закладка "версии рута"
                var tabsRootVer = $('.tabsNavi ul:first li:eq(2) a'), selRoot = $('<select></select>');
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
                    tree.jstree(true).deselect_all();
                    tree.jstree(true).select_node(link.data('obj').getGuid());
                    vDBTreeNavigator.verHistButton.apply(that);
                });

                // создаем дерево
                vDBTreeNavigator.createTree.apply(that);

                // выбираем элемент слева
                if (rootElemLink)
                    rootElemLink.click();
                // выбираем элемент дерева
                //tree.jstree(true).deselect_all();
                tree.jstree(true).select_node(rootElemLink.data('obj').getGuid());
            }

            // открываем сохраненную закладку
            $(".tabsNavi").tabs("option", "active", this.tabNum());
            vDBTreeNavigator.activateTab.apply(that, [this.tabNum()]);
        };


        vDBTreeNavigator.createTree = function () {
            var tree = $('#' + this.getLid()).find('.tree');
            var selRoot = $('.tabsNavi ul:first li:eq(2) a').find('select');
            var that = this;

            // уничтожаем дерево и историю переходов
            tree.jstree('destroy');
            vDBTreeNavigator._history = [];

            // дерево
            tree.jstree({
                'core' : {
                    'data' : function (node, cb) {
                        if(node.id === "#") {
                            cb(vDBTreeNavigator._linksRoot);
                        }
                        else {
                            if (node.icon == 'collection')
                                cb(vDBTreeNavigator.getElems(node.data));
                            else
                                cb(vDBTreeNavigator.getCols(node.data, node.id));
                        }
                    }
                }
            });
            tree.on("changed.jstree", function (e, data) {
                if (data.action == "select_node") {
                    var node = data.instance.get_node(data.selected[0]);
                    if (node) {
                        $("#" + data.selected[0].replace('@', '\\@') + "_anchor").focus();
                        vDBTreeNavigator._history.splice(vDBTreeNavigator._historyIndex+1, vDBTreeNavigator._history.length);
                        vDBTreeNavigator._historyIndex = vDBTreeNavigator._history.length>0 ? vDBTreeNavigator._history.length : 0;
                        vDBTreeNavigator._history.push(node.data);
                        vDBTreeNavigator.histStates.apply(that);

                        // в закладке "Версии рутов" выбираем нужный рут
                        if (node.parent === '#') selRoot.val(node.id);
                        vDBTreeNavigator.selectItem.apply(that, [node.data, 0]);
                    }
                }
            });
        }

        vDBTreeNavigator.getCols = function (obj, parentId) {
            var cols = [];
            if (obj && obj.countCol) {
                for (var i = 0, len = obj.countCol(); i < len; i++) {
                    var col = obj.getCol(i);
                    var name = col.getName();
                    if (!name)
                        name = col.getGuid();
                    cols.push({"text" : name, "id" : ("getGuid" in col)? col.getGuid(): parentId+'_'+i, data:col, "children" : vDBTreeNavigator.getElems(col).length!=0, icon:'collection'});
                }
            }
            return cols;
        }

        vDBTreeNavigator.getElems = function (obj) {
            var elems = [];
            for (var i = 0, len = obj.count(); i < len; i++) {
                var col = obj.get(i);
                var name = 'name' in col && col.name()? col.name(): col.getGuid();
                elems.push({"text" : name, "id" :  col.getGuid(), data:col, "children" : vDBTreeNavigator.getCols(col, 'test').length!=0, icon:false});
            }
            return elems;
        }

        vDBTreeNavigator.openNode = function (node, noevent) {
            var parents = [], p, tree = $('#' + this.getLid()).find('.tree'), nodeTree = node, found=false, collId=false;
            while (p=nodeTree.getParent())  {
                var cols = vDBTreeNavigator.getCols(p, p.getGuid());
                found=false;
                for(var i=0; i<cols.length; i++) {
                    if (node == cols[i].data) {
                        collId = cols[i].id;
                        found=true;
                        break;
                    }
                    var elems = vDBTreeNavigator.getElems(cols[i].data);
                    for(var j=0; j<elems.length; j++) {
                        if (nodeTree == elems[j].data) {
                            parents.push(cols[i].id);
                            found=true;
                            break;
                        }
                    }
                }
                if (!found) {
                    alert('Объект не найден!');
                    return false;
                }
                parents.push(p.getGuid());
                nodeTree = p;
            }
            for(var i=0, len=parents.length; i<len; i++)
                tree.jstree("open_node", parents.pop());
            tree.jstree(true).deselect_all();
            var id = 'getGuid' in node ? node.getGuid() : collId;
            tree.jstree(true).select_node('getGuid' in node ? node.getGuid() : collId, noevent?true:false);
            return id;
        }

        vDBTreeNavigator.prevHist = function () {
            if (vDBTreeNavigator._historyIndex > 0) {
                vDBTreeNavigator._historyIndex--;
                var selRoot = $('.tabsNavi ul:first li:eq(2) a').find('select');
                var node = vDBTreeNavigator._history[vDBTreeNavigator._historyIndex];
                var id = vDBTreeNavigator.openNode.apply(this, [node, true]);
                if (id) {
                    $("#" + id.replace('@', '\\@') + "_anchor").focus();
                    if (!node.getParent()) selRoot.val(id);
                    vDBTreeNavigator.selectItem.apply(this, [node, 0]);
                }
            }
            vDBTreeNavigator.histStates.apply(this);
        }

        vDBTreeNavigator.nextHist = function () {
            if (vDBTreeNavigator._historyIndex < vDBTreeNavigator._history.length-1) {
                vDBTreeNavigator._historyIndex++;
                var selRoot = $('.tabsNavi ul:first li:eq(2) a').find('select');
                var node = vDBTreeNavigator._history[vDBTreeNavigator._historyIndex];
                var id = vDBTreeNavigator.openNode.apply(this, [node, true]);
                if (id) {
                    $("#" + id.replace('@', '\\@') + "_anchor").focus();
                    if (!node.getParent()) selRoot.val(id);
                    vDBTreeNavigator.selectItem.apply(this, [node, 0]);
                }
            }
            vDBTreeNavigator.histStates.apply(this);
        }

        vDBTreeNavigator.histStates = function () {
            var prevHist = $('#' + this.getLid()).find('.prevHist');
            var nextHist = $('#' + this.getLid()).find('.nextHist');

            if (vDBTreeNavigator._historyIndex < vDBTreeNavigator._history.length-1)
                nextHist.attr('disabled', false);
            else
                nextHist.attr('disabled', true);

            if (vDBTreeNavigator._historyIndex > 0)
                prevHist.attr('disabled', false);
            else
                prevHist.attr('disabled', true);
        }

        vDBTreeNavigator.activateTab = function(tab) {
            switch (tab) {
                case 0:
                    break;
                case 1:
                    vDBTreeNavigator.tranButton.apply(this);
                    break;
                case 2:
                    vDBTreeNavigator.verHistButton.apply(this);
                    break;
                case 3:
                    vDBTreeNavigator.remoteCallsButton.apply(this);
                    break;
            }
            this.tabNum(tab);
        };

        vDBTreeNavigator.getRootName = function(root) {

            if (typeof root == 'string')
                root = this.getControlMgr().getController().getDB(this.dataBase()).getRoot(root).obj;

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



        vDBTreeNavigator.selectItem = function (obj, level) {
            vDBTreeNavigator.viewRight.apply(this, [obj]);
        };

        vDBTreeNavigator.selectCol = function (obj, level) {

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
                var centerTpl = $(vDBTreeNavigator._templates['centerTop']);
                var link = centerTpl.find('a')
                    .data('obj', col)
                    .html(name)
                    .click(function () {
                        var a = $(this);
                        centerBottom.find('a').removeClass('active');
                        a.addClass('active');
                        vDBTreeNavigator.selectObj.apply(that, [a.data('obj'), level]);
                        return false;
                    });
                centerBottom.append(centerTpl);
            }
            vDBTreeNavigator.viewRight.apply(this, [obj]);
        };

        vDBTreeNavigator.selectObj = function (obj, level) {
            if (level==0)
                this._activeObj = obj;
            if (this.nlevels()>level+1)
                vDBTreeNavigator.selectItem.apply(this, [obj, level+1]);
            vDBTreeNavigator.viewRight.apply(this, [obj]);
        };

        vDBTreeNavigator.viewRight = function (obj) {
            var that = this;
            var editor = $('#' + this.getLid());

            // отображаем справа поля
            var right = editor.find('.right');
            right.empty();
            if (obj.count) {

                if ("getGuid" in obj)
                    right.append('<p><span class="name" style="width: 54px;vertical-align: top;">Guid</span> <textarea style="width: 285px;height: 20px;" class="value"  >'+obj.getGuid()+'</textarea> <input style="vertical-align: top;" class="save" type="button" value="c" title="copy" onclick="$(this).prev().select(); document.execCommand(\'copy\');"></p>');
                if ("getTypeGuid" in obj)
                    right.append('<p><span class="name" style="width: 54px;vertical-align: top;">TypeGuid</span> <textarea style="width: 285px;height: 20px;" class="value"  >'+obj.getTypeGuid()+'</textarea> <input style="vertical-align: top;" class="save" type="button" value="c" title="copy" onclick="$(this).prev().select(); document.execCommand(\'copy\');"></p>');
                if ('getRootVersion' in obj)
                    right.append('<p><span class="name" style="width: 100%;vertical-align: top;">Root versions valid:'+obj.getRootVersion('valid')+' sent:'+obj.getRootVersion('sent')+' draft:'+obj.getRootVersion('draft')+'</span></p>');
                for (var i = 0, len = obj.count(); i < len; i++) {
                    if (obj.getFieldType) {
                        if (obj.getFieldType(i).typeName() == 'ref') {
                            var rightTpl = $(vDBTreeNavigator._templates.rightRef), name=obj.getFieldName(i);
                            rightTpl.find('.name').html(obj.getFieldName(i));
                            rightTpl.find('.type').html('ref');

                            var ref = obj[name.charAt(0).toLowerCase() + name.slice(1)]? obj[name.charAt(0).toLowerCase() + name.slice(1)](): null;
                            if (ref) {
                                rightTpl.find('.ref').data('ref', ref).html('name' in ref?ref.name():ref.getGuid()).click(function () {
                                    var ref = $(this).data('ref');
                                    vDBTreeNavigator.openNode.apply(that, [ref]);
                                    return false;
                                });
                            } else {
                                rightTpl.find('.ref').html('null').click(function () {
                                    return false;
                                });
                            }

                        } else {
                            var rightTpl = $(vDBTreeNavigator._templates.right);
                            rightTpl.find('.name').html(obj.getFieldName(i));
                            rightTpl.find('.type').html(obj.getFieldType(i).typeName());
                            rightTpl.find('.value').attr('name', obj.getFieldName(i)).data('obj', obj).val(obj.get(i));
                            rightTpl.find('.save').click(function () {
                                var val = $(this).parent().find('.value');
                                var obj = val.data('obj');
                                obj.getControlMgr().userEventHandler(obj, function(){
                                    obj[val.attr('name').charAt(0).toLowerCase() + val.attr('name').slice(1)](val.val());
                                });
                                return false;
                            });
                        }
                        right.append(rightTpl);
                    }
                }
            }
        };

        vDBTreeNavigator.selectFirst = function (num) {
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

        vDBTreeNavigator.tranButton = function () {
            var editor = $('#' + this.getLid())
            var dbSelector = editor.find('.dbSelector');
            var controller = this.getControlMgr().getController();
            var db = controller.getDB(dbSelector.val());
            if (db && "getTranList" in db) {
                var tranList = db.getTranList();
                var tranDiv = $('.tranDiv');
                tranDiv.empty().append(vDBTreeNavigator.renderTable.apply(this, [db, tranList, 'tran']));
            }
        };


        vDBTreeNavigator.verHistButton = function () {
            var editor = $('#' + this.getLid());
            var dbSelector = editor.find('.dbSelector');
            var controller = this.getControlMgr().getController();
            var db = controller.getDB(dbSelector.val());
            var rootElem = this.rootElem();
            if (db && rootElem) {
                var root =  db.getRoot(rootElem);
                var tranList = root.obj.getVerHist();
                var tranDiv = $('.rootVerDiv');
                tranDiv.empty().append(vDBTreeNavigator.renderTable.apply(this, [db, tranList, 'ver']));
            }
        };


        vDBTreeNavigator.remoteCallsButton = function () {
            var editor = $('#' + this.getLid());
            var dbSelector = editor.find('.dbSelector');
            var controller = this.getControlMgr().getController();
            var db = controller.getDB(dbSelector.val());
            if (db && "getRcLog" in db) {
                var rcLog =  db.getRcLog();
                var tranDiv = $('.remoteCallsDiv');
                tranDiv.empty()
                var table = $('<table width="100%"><tr><th></th><th>time</th><th>type</th><th>trGuid</th><th>src</th><th>objGuid</th><th>func</th><th>aparams</th></table>'), thTable, that = this;

                var trGuidGroup = {}, trGuidClass=false, currGuid=false;
                var trGuidTimeGroup = {}, trGuidTimeClass=false, currTimeGuid=false;
                for(var i in rcLog) {
                    if (currGuid != rcLog[i].trGuid)
                        trGuidClass = trGuidClass == 'trGuid1'? 'trGuid2' : 'trGuid1';
                    currGuid = rcLog[i].trGuid;
                    trGuidGroup[rcLog[i].trGuid] = trGuidClass;

                    var time = rcLog[i].time;
                    time = rcLog[i].trGuid+rcLog[i].type+time.getHours()+':'+time.getMinutes()+':'+time.getSeconds()+'.'+time.getMilliseconds();
                    if (currTimeGuid != time)
                        trGuidTimeClass = trGuidTimeClass == 'time1'? 'time2' : 'time1';
                    currTimeGuid = time;
                    trGuidTimeGroup[time] = trGuidTimeClass;
                }
                for(var i in rcLog) {
                    var tr =$('<tr class="'+trGuidGroup[rcLog[i].trGuid]+'"></tr>');
                    var time = rcLog[i].time;
                    time = time.getHours()+':'+time.getMinutes()+':'+time.getSeconds()+'.'+time.getMilliseconds();
                    tr.append('<td width="5" class="'+trGuidTimeGroup[rcLog[i].trGuid+rcLog[i].type+time]+'">&nbsp;</td>');
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

        vDBTreeNavigator.renderTable = function (db, tranList, type) {
            var table = $('<table width="100%"></table>'), thTable, that = this;

            if (type == 'tran') {
                thTable = $('<tr><td colspan="10"><input type="button" value="truncate" /></td> </tr><tr><th>guid</th><th>start</th><th>p-duration</th><th>c-duration</th><th>state</th><th>src</th><th>rootGuid</th><th>min</th><th>max</th></tr>');
                thTable.find('input').click(function(){
                    var checked = table.find('.checkTrans:checked');
                    if (checked.length>0) {
                        for (var i = 0, len = checked.length; i < len; i++) {
                            db.truncTran($(checked[i]).val());
                        }
                    } else {
                        db.truncTran();
                    }
                    vDBTreeNavigator.tranButton();
                });
            } else {
                thTable =  $('<tr><th>version</th><th>guid</th><th>tran guid</th><th>start</th><th>p-duration</th><th>c-duration</th><th>state</th><th>src</th><th>min</th><th>max</th></tr>');
            }
            table.append(thTable);

            for(var i in tranList) {
                var tr =$('<tr></tr>');
                var tran = type == 'tran'? tranList[i]: tranList[i].tr;
                var start = vDBTreeNavigator.timeFormat(tran.start), end = tran.end?tran.end:null, pend=tran.pend?tran.pend:null;
                end = end?end.getTime():null;
                pend = pend?pend.getTime():null;
                if (type == 'tran') {
                    tr.append('<td><input type="checkbox" value="' + tranList[i].guid + '" class="checkTrans" id="' + tranList[i].guid + '"/> <label for="' + tranList[i].guid + '">' + tranList[i].guid + '</label></td>');
                    /* tr.find('label').click(function(){
                     vDBTreeNavigator.viewTranDetail.apply(that, [$(this).attr('for')]);
                     });*/
                    tr.append('<td>' + start + '</td>');
                    tr.append('<td>' + (pend?pend-tran.start.getTime():'-') + '</td>');
                    tr.append('<td>' + (end?end-tran.start.getTime():'-') + '</td>');
                    tr.append('<td>' + tran.state + '</td>');
                    tr.append('<td>' + tran.src + '</td>');
                } else {
                    tr.append('<td>'+tranList[i].ver+'</td>');
                    tr.append('<td>'+tranList[i].guid+'</td>');
                    tr.append('<td>'+tran.guid+'</td>');
                    tr.append('<td>'+start+'</td>');
                    tr.append('<td>' + (pend?pend-tran.start.getTime():'-') + '</td>');
                    tr.append('<td>' + (end?end-tran.start.getTime():'-') + '</td>');
                    tr.append('<td>'+tran.state+'</td>');
                    tr.append('<td>'+tran.src+'</td>');
                }
                var index = 0;
                for(var j in tran.roots) {
                    if (index!=0) {
                        var tr = $('<tr></tr>');
                        tr.append(type == 'tran'?'<td></td><td></td><td></td><td></td><td></td><td></td>':'<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>');
                    }
                    if (type == 'tran')
                        tr.append('<td title="'+j+'">'+vDBTreeNavigator.getRootName.apply(this, [j])+'</td>');
                    tr.append('<td>'+tran.roots[j].min+'</td>');
                    tr.append('<td>'+tran.roots[j].max+'</td>');
                    table.append(tr);
                    index++;
                }

                if (index == 0) {
                    if (type == 'tran')
                        tr.append('<td></td><td></td><td></td>');
                    else
                        tr.append('<td></td><td></td>');
                    table.append(tr);
                }
            }
            return table;
        };

        vDBTreeNavigator.viewTranDetail = function(guid) {
            var tranDiv = $('.tranDiv'), tranInfo=tranDiv.find('.tranInfo'), tranTable=tranDiv.find('.tranTable');
            if (tranInfo.length==0) {
                tranInfo = $('<div class="tranInfo"><p>Transaction Detail: '+guid+'</p></div>');
                tranTable = $('<table class="tranTable" width="100%"></table>');
                tranInfo.append(tranTable);
                tranDiv.append(tranInfo);
            } else {
                tranInfo.find('p').html('Transaction Detail: '+guid);
                tranTable.empty();
            }
            tranTable.append('<tr><td>1</td></tr>');
        };

        vDBTreeNavigator.timeFormat = function (date) {
            if (!date) return null;
            var hours   = date.getHours();
            var minutes = date.getMinutes()
            var seconds = date.getSeconds();
            var milliseconds = date.getMilliseconds();
            if (hours   < 10) {hours   = "0"+hours;}
            if (minutes < 10) {minutes = "0"+minutes;}
            if (seconds < 10) {seconds = "0"+seconds;}
            if (milliseconds < 10) {milliseconds = "00"+milliseconds;}
            else if (milliseconds < 100) {milliseconds = "0"+milliseconds;}
            var time = hours+':'+minutes+':'+seconds+'.'+milliseconds;
            var time = hours+':'+minutes+':'+seconds+'.'+milliseconds;
            return time;
        }

        return vDBTreeNavigator;
    });
