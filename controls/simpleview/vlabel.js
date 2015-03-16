define(
    ['/public/uccello/uses/template.js', 'text!./templates/label.html'],
    function(template, tpl) {
        var vLabel = {};
        vLabel._templates = template.parseTemplate(tpl);
        vLabel.render = function(options) {
            var item = $('#' + this.getLid());
            if (item.length == 0) {
                item = $(vLabel._templates['label']).attr('id', this.getLid());
                var parent = (this.getParent()? '#' + this.getParent().getLid(): options.rootContainer);
                $(parent).append(item);
            }
            item.css({top: this.top() + 'px', left: this.left() + 'px'}).html(this.label());
        }
        return vLabel;
    }
);