define(
    ['/public/uccello/uses/template.js', 'text!./templates/button.html'],
    function(template, tpl) {
        var vButton = {};
        vButton._templates = template.parseTemplate(tpl);
        vButton.render = function(options) {
            var item = $('#' + this.getLid());
            if (item.length == 0) {
                item = $(vButton._templates['button']).attr('id', this.getLid());
                var parent = '#' + (this.getParent()? this.getParent().getLid():options.rootContainer);
                $(parent).append(item);
            }
            item.css({top: this.top() + 'px', left: this.left() + 'px'}).val(this.caption());
        }
        return vButton;
    }
);