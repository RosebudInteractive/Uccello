define(
    ['/public/uccello/uses/template.js', 'text!./templates/edit.html'],
    function(template, tpl) {
        var vEdit = {};
        vEdit._templates = template.parseTemplate(tpl);
        vEdit.render = function(options) {
            var item = $('#' + this.getLid());
            if (item.length == 0) {
                item = $(this._templates['edit']).attr('id', this.getLid());
                var parent = (this.getParent()? '#' + this.getParent().getLid(): options.rootContainer);
                $(parent).append(item);
            }
            item.css({top: this.top() + 'px', left: this.left() + 'px'}).val(this.value());
        }
        return vEdit;
    }
);