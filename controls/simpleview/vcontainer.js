define(
    ['/public/uccello/uses/template.js', 'text!./templates/container.html'],
    function(template, tpl) {
        var vContainer = {};
        vContainer._templates = template.parseTemplate(tpl);
        vContainer.render = function(options) {
            var item = $('#' + this.getLid());
            if (item.length == 0) {
                item = $(vContainer._templates['container']).attr('id', this.getLid());
                var parent = (this.getParent()? '#' + this.getParent().getLid(): options.rootContainer);
                $(parent).append(item);
            }
            item.css({top: this.top() + 'px', left: this.left() + 'px', width: this.width() + 'px', height: this.height() + 'px'});

            // убираем удаленные объекты
            var del = this.getObj().getLogCol('Children').del;
            for (var guid in del)
                $('#' + del[guid].getLid()).remove();

        }
        return vContainer;
    }
);