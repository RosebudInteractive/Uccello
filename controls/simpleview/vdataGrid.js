define(
    ['/public/uccello/uses/template.js', 'text!./templates/dataGrid.html'],
    function(template, tpl) {
        var vDataGrid = {};
        vDataGrid._templates = template.parseTemplate(tpl);

        /**
         * Рендер DOM грида
         * @param options
         */
        vDataGrid.render = function(options) {
            console.time('renderGrid '+this.name());

            var that = this;
            var grid = $('#' + this.getLid());
            var table = grid.find('.table');
            var dataset = null;

            // если не создан грид
            if (grid.length == 0) {
                grid = $(vDataGrid._templates['grid']).attr('id', this.getLid());
                table = grid.find('.table');
                var parent = (this.getParent()? '#' + this.getParent().getLid(): options.rootContainer);
                $(parent).append(grid);

                grid.find('.refresh').click(function () {
                    vDataGrid.render.apply(that);
                });

                // клик на таблицу
                table.click(function(e){
                    var rowTr = $(e.target).parent();
                    if (rowTr.hasClass('data')){
                        e.stopPropagation();
                        that.getControlMgr().userEventHandler(that, function(){
                            vDataGrid.renderCursor.apply(that, [rowTr.attr('data-id')]);
                            that.getControlMgr().getByGuid(that.dataset()).cursor(rowTr.attr('data-id'));
                        });
                    }
                });

            } else {
                table.empty();
            }

            var cm = this.getControlMgr();
            var db = cm.getDB();
            var rootElem = null;


            if (this.dataset()) {
                dataset = cm.getByGuid(this.dataset());
                if (dataset) {
                    rootElem = dataset.root();
                    rootElem = rootElem? db.getObj(rootElem): null;
                }
            }

            if (rootElem)
            {
                var col = rootElem.getCol('DataElements');
                var columns = this.getObj().getCol('Columns');
                var fields = dataset.getObj().getCol('Fields');
                var idIndex = null, cursor = dataset.cursor(), rows = '', cursorIndex = -1;
                var fieldsArr = {};
                for (var i = 0, len = fields.count(); i < len; i++) {
                    var field = fields.get(i);
                    fieldsArr[field.getGuid()] = field.get('Name');
                    if (field.get('Name') == 'Id')
                        idIndex = field.getGuid();
                }

                if (columns.count() != 0) {
                    // header
                    var row = $(vDataGrid._templates['row']), columnsArr=[];
                    for (var i = 0, len = columns.count(); i < len; i++) {
                        var column = columns.get(i);
                        var header = $(vDataGrid._templates['header']).html(column.get('Label'));
                        header.css('width', column.get('Width')+'%');
                        row.append(header);
                        columnsArr.push({field:column.get('Field'), width:column.get('Width')});
                    }
                    table.append(row);

                    // rows
                    var columnsArrLen=columnsArr.length;
                    for (var i = 0, len = col.count(); i < len; i++) {
                        var obj = col.get(i);
                        var id = null, cells = '';

                        // добавляем ячейка
                        for (var j = 0, len2 = columnsArrLen; j < len2; j++) {
                            var text = obj.get(fieldsArr[columnsArr[j].field]);
                            var width = columnsArr[j].width;
                            cells += '<div class="cell" style="width:'+(width?width:'10%')+'%;">' + (text ? text : '&nbsp;') + '</div>';
                            if (idIndex == columnsArr[j].field)
                                id = text;
                        }
                        rows += '<div class="row data" data-id="' + id + '">' + cells + '</div>';

                        // запоминаем текущий курсор
                        if (cursor == id)
                            cursorIndex = i;
                    }
                }
                else {

                    // header
                    var row = $(vDataGrid._templates['row']);
                    for (var i = 0, len = fields.count(); i < len; i++) {
                        var cell = $(vDataGrid._templates['header']).html(fields.get(i).get('Name')).addClass('w60');
                        row.append(cell);
                    }
                    table.append(row);

                    // rows
                    for (var i = 0, len = col.count(); i < len; i++) {
                        var obj = col.get(i);
                        var id = null, cells = '';

                        // добавляем ячейка
                        for (var j in fieldsArr) {
                            var text = obj.get(fieldsArr[j]);
                            cells += '<div class="cell w60">' + (text ? text : '&nbsp;') + '</div>';
                            if (idIndex == j)
                                id = text;
                        }
                        rows += '<div class="row data" data-id="' + id + '">' + cells + '</div>';

                        // запоминаем текущий курсор
                        if (cursor == id)
                            cursorIndex = i;
                    }
                }

                table.append(rows);

                // устанавливаем курсор
                if (cursorIndex != -1)
                    table.find('.row.data:eq(' + cursorIndex + ')').addClass('active');
            }

            grid.css({top: this.top() + 'px', left: this.left() + 'px', width: this.width() + 'px', height: this.height() + 'px'});
            console.timeEnd('renderGrid '+this.name());
        }

        /**
         * Рендер курсора
         * @param id
         */
        vDataGrid.renderCursor = function(id) {
            var table = $('#' + this.getLid()).find('.table');
            var rowTr = table.find('.row.data[data-id='+id+']');
            table.find('.row.active').removeClass('active');
            rowTr.addClass('active');
        }

        /**
         * Рендер ячейки грида
         * @param id
         * @param datafield
         * @param value
         */
        vDataGrid.renderCell = function(id, datafield, value) {
            var index=null, columns = this.getObj().getCol('Columns');
            if (columns) {
                for (var i = 0, len = columns.count(); i < len; i++) {
                    if (columns.get(i).get('Field') == datafield) {
                        index = i;
                        break;
                    }
                }
                if (index) {
                    var table = $('#' + this.getLid()).find('.table');
                    var rowTr = table.find('.row.data[data-id='+id+']');
                    $(rowTr.children()[index]).html(value);
                }
            }
        }

        /**
         * Рендер ширины столбца
         * @param index
         * @param width
         */
        vDataGrid.renderWidth = function(index, width) {
            var table = $('#' + this.getLid()).find('.table');
            var header = table.find('.header');
            $(header.children()[index]).css('width', width+'%');
            var rowsTr = table.find('.row');
            for(var i = 0, len = rowsTr.length; i<len; i++)
                $($(rowsTr[i]).children()[index]).css('width', width+'%');
        }

        return vDataGrid;
    }
);