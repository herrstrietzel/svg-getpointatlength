import md2dom from "https://cdn.jsdelivr.net/npm/md2dom@24.2.9/md2dom.min.js";

loadMDs();

async function loadMDs() {
    let mdTargets = document.querySelectorAll('[data-md]');

    /**
     * helper: fix uls
     */
    function fixNestedUls(el) {
        let lists = el.querySelectorAll('ul, ol')
        lists.forEach(list => {
            let prev = list.previousElementSibling;
            let children = list.children;
            if (prev && prev.nodeName === list.nodeName && children.length === 1) {
                prev.append(...children);
                list.remove();
            }
        })
        return el
    }

    /*
    function sanitizeWhitespace(text) {

        //normalize line breaks
        text = text.replace(/\r\n/g, '\n').replace(/\s+\n/g, '\n');
        let lines = text.split('\n').filter(Boolean)

        //remove indendations
        let indent = lines[0].match(/^[ \t]+/)[0].length;
        let regex = new RegExp(`\ {${indent}}`, 'g');

        return text.replace(regex, '');
    }
    */
    function sanitizeWhitespace(text) {

        //normalize line breaks
        text = text.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n");
        let lines = text.split("\n").filter(Boolean);

        //remove indendations
        let indent = lines[0].match(/^[ \t]+/);


        if (indent[0]) {

            console.log('indent', indent);

            indent = indent[0].length;
            let regex = new RegExp(`\ {${indent}}`, "g");
            text = text.replace(regex, "");
        }

        return text;
    }


    // parse all md targets
    for (let i = 0, len = mdTargets.length; len && i < len; i++) {

        let target = mdTargets[i];
        let readmefileUrl = target.dataset.md;

        let Md = new md2dom();
        let readme = readmefileUrl ? await (await (fetch(readmefileUrl))).text() : target;


        let doc = readmefileUrl ? new DOMParser().parseFromString(readme, 'text/html').querySelector('body') : target
        let nodes = doc.childNodes
        let els = [];


        nodes.forEach(node => {

            // text node - parse md
            if (node.nodeType === 3) {
                let text = sanitizeWhitespace(node.textContent);
                let htmlEls = Md.parse(text);

                for (let i = 0; i < htmlEls.length; i++) {
                    let el = htmlEls[i];
                    els.push(fixNestedUls(el));
                }
            }
            //is html
            else {
                els.push(node)
            }
        })

        target.replaceChildren(...els);
    }

}




