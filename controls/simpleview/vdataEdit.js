define(
    ['/public/uccello/uses/template.js', 'text!./templates/dataEdit.html'],
    function(template, tpl) {
        var vDataEdit = {};
        vDataEdit._templates = template.parseTemplate(tpl);
        vDataEdit.render = function(options) {
            var that = this;
            var item = $('#' + this.getLid());
            if (item.length == 0) {
                item = $(vDataEdit._templates['edit']).attr('id', this.getLid());
                var parent = (this.getParent()? '#' + this.getParent().getLid(): options.rootContainer);
                $(parent).append(item);

                // сохранять при потере фокуса
                item.blur(function () {
                    if (that.dataset() && that.dataField()) {
                        that.getControlMgr().userEventHandler(that, function () {
                            var dataset = that.getControlMgr().getByGuid(that.dataset());
                            dataset.setField(that.dataField(), item.val());
                        });
                    }
                });
            }

            // координаты контрола
            item.css({top: this.top() + 'px', left: this.left() + 'px'});

            // устанавливаем значение
            if (this.dataset() && this.dataField()) {
                var dataset = that.getControlMgr().getByGuid(that.dataset());
                item.val(dataset? dataset.getField(this.dataField()): '');
            }
        }
        return vDataEdit;
    }
);