
        function adjustViewBox2(svg, target = '', padding = 0, decimals = 3) {
            let bb = target.getBBox();
            let [x, y, width, height] = [bb.x, bb.y, bb.width, bb.height];
            let dimAV = (width + height) / 2;

            // avoid zero height or width
            width = width ? width : dimAV;
            height = height ? height : dimAV;

            if (padding) {
                let dimMax = Math.max(width + padding, height + padding)
                x -= (dimMax - width) / 2
                y -= (dimMax - height) / 2
                width = dimMax
                height = dimMax
            }

            svg.setAttribute("viewBox", [x, y, width, height].map(val => { return +val.toFixed(decimals) }).join(" "));
        }

        function setSelectValue(select, value) {
            if ([...select.options].some(option => option.value === value)) {
                select.value = value;
            }
        }

        function cleanInput(str) {

            //inputVal = inputVal.includes('<svg') && inputVal.includes('</svg') ? cleanSvg(inputVal) : inputVal;

            return str.trim()
                // Remove XML prologues like <?xml ... ?>
                .replace(/<\?xml[\s\S]*?\?>/gi, "")
                // Remove DOCTYPE declarations
                .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
                // Remove comments <!-- ... -->
                .replace(/<!--[\s\S]*?-->/g, "")
                // remove new lines, tabs an comma with whitespace
                .replace(/[\n\r\t]/g, " ")
                // pre trim left and right whitespace
                .trim()
                // add space before minus sign
                .replace(/(\d)-/g, '$1 -')
                // decompose multiple adjacent decimal delimiters like 0.5.5.5 => 0.5 0.5 0.5
                .replace(/(\.)(?=(\d+\.\d+)+)(\d+)/g, "$1$3 ")
                .replace(/\s{2,}/g, ' ')
        }


        function renderPoint(
            svg,
            coords,
            fill = "red",
            r = "1%",
            opacity = "1",
            title = '',
            render = true,
            id = "",
            className = ""
        ) {
            if (Array.isArray(coords)) {
                coords = {
                    x: coords[0],
                    y: coords[1]
                };
            }
            let marker = `<circle class="${className}" opacity="${opacity}" id="${id}" cx="${coords.x}" cy="${coords.y}" r="${r}" fill="${fill}">
         <title>${title}</title></circle>`;

            if (render) {
                svg.insertAdjacentHTML("beforeend", marker);
            } else {
                return marker;
            }
        }
