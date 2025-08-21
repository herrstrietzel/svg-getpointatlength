

/**
 * mutation observer
 * inject/replace dynamically added icons
 */

let mutationElInputs = document.querySelectorAll('.mutation-listen');
let mutationOptionsInputs = {
    childList: true,
    subtree: true
};

let inputsEnhanced = false;


function mutationCallbackInputs(mutations) {
    for (let mutation of mutations) {
        if (mutation.type === 'childList') {
            inputsEnhanced = true;
            //console.log('mutation');
            setTimeout(() => {
                //console.log('Mutation Detected:', mutation.target);
                enhanceInputs()
            }, 10)

        }
    }
}


window.addEventListener('DOMContentLoaded', (e) => {
    //enhanceInputs();
    //console.log('enhance inputs');
})


function enhanceSelects(selector="select"){
    let inputs = document.querySelectorAll(selector);

    let chevron = `<svg viewBox="0 0 95 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icn-svg icn-select" ><path stroke="currentColor" d="M84.4 32l-37.5 37.5l-37.5 -37.5" /></svg>`


    for(let i=0; i<inputs.length; i++){
        let select = inputs[i];

        let wrap = select.closest('.input-wrap-select')
        if(wrap) continue;

        wrap = document.createElement('div');
        wrap.classList.add('input-wrap', 'input-wrap-select');

        select.parentNode.insertBefore(wrap, select)
        wrap.append(select)

        wrap.insertAdjacentHTML('beforeend', chevron);

        select.onfocus= ()=>{
            select.classList.add('input-select-active')
        }

        select.oninput= ()=>{
            select.classList.remove('input-select-active')
        }

        select.onblur= ()=>{
            select.classList.remove('input-select-active')
        }
        //if (parent.classList.contains('input-wrap')) continue

    }
}


function enhanceInputs(selector = "input[type=checkbox], input[type=radio]") {

    let inputs = document.querySelectorAll(selector);
    function parseSvgIcon(markup) {
        let svg = new DOMParser()
            .parseFromString(markup, "text/html")
            .querySelector("svg");
        svg.removeAttribute("xmlns");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        return svg;
    }

    function addFeatherIcons(iconNames = []) {
        let icons = [];
        iconNames.forEach((iconName, i) => {
            let iconMarkup;

            // take svg markup or retrieve via feather object
            if (typeof feather == "object" && !iconName.includes("<svg")) {
                iconMarkup = feather.icons[iconName].toSvg();
            } else {
                iconMarkup = iconName;
            }
            let icon = parseSvgIcon(iconMarkup);
            icon.classList.add("feather-input-icon", `feather-input-icon${i + 1}`);
            icons.push(icon);
        });
        return icons;
    }

    let featherIcons = {
        checkbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-square feather-input-icon feather-input-icon1">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" style="fill:var(--color-bg, white)"/></svg>`,
        checkboxChecked: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check-square feather-input-icon feather-input-icon2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" style="stroke:none;fill:var(--color-bg, white)"/>
    <polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
        radio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-circle feather-input-icon feather-input-icon1">
    <circle cx="12" cy="12" r="10" style="fill:var(--color-bg, white)" ></circle></svg>`,
        radioChecked: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-circle feather-input-icon feather-input-icon1"><circle cx="12" cy="12" r="10" style="fill:var(--color-bg, white)" /> <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" /></svg>`,
    };

    for (let i = 0; i < inputs.length; i++) {
        let inp = inputs[i];
        let type = inp.type;
        let parent = inp.parentNode;
        let needsWrapping =
            parent.nodeName.toLowerCase() === "label" ? false : true;

        let style = window.getComputedStyle(inp)
        let { marginLeft, marginRight } = style;

        //already processed
        if (parent.classList.contains('input-wrap')) continue
        if (parent.querySelector('svg')) continue

        // wrap inputs
        if (needsWrapping) {
            let label = inp.previousElementSibling;
            label = label.nodeName.toLowerCase() === "label" ? label : "";

            let sibling = inp.nextSibling;
            parent = label ? label : document.createElement("span");

            if (label) {
                label.insertBefore(inp, label.childNodes[0]);
            } else {
                inp.parentNode.insertBefore(parent, parent.children[0]);
            }
            parent.append(inp, sibling);
        }


        parent.classList.add("input-wrap");

        let iconWrap, icons;

        iconWrap = document.createElement("span");
        iconWrap.classList.add("input-icon-wrap");
        parent.insertBefore(iconWrap, parent.children[0]);

        iconWrap.style.marginLeft = parseFloat(marginLeft) - 1 + 'px';
        iconWrap.style.marginRight = parseFloat(marginRight) - 1 + 'px';;


        switch (type) {
            case "checkbox":
                icons = addFeatherIcons([
                    featherIcons["checkbox"],
                    featherIcons["checkboxChecked"]
                ]);
                //append
                iconWrap.append(...icons);
                break;

            case "radio":
                icons = addFeatherIcons([
                    featherIcons["radio"],
                    featherIcons["radioChecked"]
                ]);
                //append
                iconWrap.append(...icons);
                break;

            default:
            // input
        }
    }

    //selects
    enhanceSelects();


    // enhance number field mouse controls
    enhanceNumberFields();

    // add tools to textareas
    enhanceTextarea();

}




/**
 * enhance textareas
 */

function enhanceTextarea() {
    addtextareaTools();
    bindToolbar();
    bindToggleBtns();
    injectIcons();
}



/**
 * add tools
 */

function addtextareaTools() {
    let textareas = document.querySelectorAll('[data-tools]')
    //let textareas = document.querySelectorAll('textarea')

    for (let i = 0, len = textareas.length; i < len; i++) {
        let el = textareas[i];

        let parent = el.closest('.wrap-textarea');
        if (parent) {
            continue;
        }

        el.spellcheck = false;

        // search for previous label
        let prevSibling = el.previousElementSibling;
        let label = prevSibling && prevSibling.nodeName.toLowerCase() === 'label' ? prevSibling : null;
        let accept = el.getAttribute('accept');

        // create wrapper
        let wrap = document.createElement('div')
        wrap.classList.add('wrap-textarea', 'pst-rlt', 'brd', 'brd-rad', 'pdd-0-3em')
        el.parentNode.insertBefore(wrap, el)

        // create header
        let header = document.createElement('header')
        header.classList.add('header-textarea', 'dsp-flx', 'alg-itm-flx-end', 'jst-cnt-spc-btw', 'pdd-0-5em', 'pdd-btt');
        wrap.append(header);

        // add label
        if (label) header.append(label)


        // move textarea to wrap
        wrap.append(el);


        // file name for downloads
        let filename = el.dataset.file

        let tools = el.dataset.tools.split(' ')
        let html = `<div class="toolbar-wrap dsp-flx jst-cnt-flx-end alg-itm-flx-end  flx-1 gap-0-5em">`;

        tools.forEach(tool => {
            if (tool !== 'size') {
                html += `<button type="button" data-icon="${tool}" class="btn btn-non btn-toolbar btn-${tool}" title="${tool}" data-btn="${tool}"></button>`
            }
            else if (tool == 'size') {
                html += `<div  class="textarea-size usr-slc-non" title="${tool}"></div>`
            }

            // add hidden inputs
            if (tool === 'download') {
                html += `<a href="" class="sr-only link-download" title="download code" download="${filename}"></div>`
            }

            if (tool === 'upload') {
                html += `<input type="file" class="sr-only input-file" accept="${accept}" >`
            }
        })

        header.insertAdjacentHTML('beforeend', html)
    }
}

function bindToolbar() {
    let btns = document.querySelectorAll('.btn-toolbar')

    // size indicator
    let textareaSizeIndicators = document.querySelectorAll('.textarea-size')

    const getTextareaByteSize = (textarea) => {
        let len = textarea.value.trim().length
        let kb = len / 1024
        let mb = kb / 1024
        let bytesize = kb < 1024 ? kb : mb;
        let unit = kb < 1024 ? 'KB' : 'MB'
        return +bytesize.toFixed(3) + ' ' + unit
    }

    const trackTextareaValue = (textarea, sizeEl) => {
        let lastValue = textarea.value;

        function checkForChanges() {
            if (textarea.value !== lastValue) {
                lastValue = textarea.value;
                sizeEl.textContent = getTextareaByteSize(textarea);
            }
            requestAnimationFrame(checkForChanges);
        }

        requestAnimationFrame(checkForChanges);
    }


    textareaSizeIndicators.forEach(sizeEl => {
        let textarea = sizeEl.closest('.wrap-textarea').querySelector('textarea');
        if (textarea) {
            sizeEl.textContent = getTextareaByteSize(textarea)

            trackTextareaValue(textarea, sizeEl);
        }
    })


    for (let i=0,l=btns.length; i<l; i++){
        let btn = btns[i];

        // skip if already initialized
        if(btn.classList.contains('btn-active')) continue;

        //let type = btn.classList.contains('btn-copy') ? 'copy' : 'download'
        let type = btn.dataset.btn
        let parent = btn.closest('.wrap-textarea')
        let textarea = parent.querySelector('textarea');


        if (type === 'upload') {

            let fileInput = parent.querySelector('input[type=file]');
            fileInput.addEventListener('input', async (e) => {
                let current = e.currentTarget;
                let textarea = current.closest('.wrap-textarea').querySelector('textarea');
                let file = current.files[0];
                if (file) {
                    let cnt = await file.text()
                    textarea.value = cnt;
                    textarea.dispatchEvent(new Event('input'))
                }
            });

            // Add event listeners for drag and drop events
            ['dragenter', 'dragover'].forEach(event => {
                textarea.addEventListener(event, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    textarea.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(event => {
                textarea.addEventListener(event, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    textarea.classList.remove('drag-over');
                });
            });

            // Handle drop event to assign file to the file input
            textarea.addEventListener('drop', (e) => {
                let files = e.dataTransfer.files;

                if (files.length > 0) {
                    fileInput.files = files; // Assign the dragged files to the file input
                    fileInput.dispatchEvent(new Event('input'));
                }
            });
        }

        btn.addEventListener('click', e => {
            let current = e.currentTarget
            let parent = current.closest('.wrap-textarea')
            let text = parent.querySelector('textarea').value;

            if (type === 'copy') {
                navigator.clipboard.writeText(text)
            }

            else if (type === 'download') {
                let linkDownload = parent.querySelector('.link-download')
                let mime = linkDownload.getAttribute('download') ? linkDownload.getAttribute('download').split('.').slice(-1)[0] : 'plain';
                let objectUrl = URL.createObjectURL(new Blob([text], { type: `text/${mime}` }));

                linkDownload.href = objectUrl;
                linkDownload.click()
            }

            else if (type === 'upload') {
                let fileInput = parent.querySelector('input[type=file]');
                fileInput.click();
            }

        })

        // add class to avoid duplicate processing
        btn.classList.add('btn-active')
    }
}


/**
 * add triple click custom event
 */

function registerTripleClickEvent() {
    document.addEventListener("click", (e) => {
        const target = e.target;
        if (!target._tripleClickData) {
            target._tripleClickData = { count: 0, timer: null };
        }

        const data = target._tripleClickData;
        data.count++;

        if (data.timer) clearTimeout(data.timer);

        data.timer = setTimeout(() => {
            if (data.count === 3) {
                const tripleClickEvent = new CustomEvent("tripleClick", { bubbles: true, cancelable: true });
                target.dispatchEvent(tripleClickEvent);
            }
            data.count = 0; // Reset after timeout
        }, 300); // Typical double-click timeout
    });
}

// Initialize the triple click listener globally
registerTripleClickEvent();


/**
 * add mouse controls
 * to number fields
 */
function enhanceNumberFields() {
    let numberFields = document.querySelectorAll("input[type=number]");

    // Initialize the triple click listener globally
    const registerTripleClickEvent = () => {
        // Store click counts and timeouts for each element
        const clickCounts = new WeakMap();
        const timeouts = new WeakMap();

        // Define the tripleClick event
        const tripleClickEvent = new Event("tripleClick", { bubbles: true });

        // Override the addEventListener method to handle tripleClick
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (
            type,
            listener,
            options
        ) {
            if (type === "tripleClick") {
                // Set up triple click detection for this element
                clickCounts.set(this, 0);

                // Listen for clicks on the element
                originalAddEventListener.call(this, "click", () => {
                    let count = clickCounts.get(this) || 0;
                    count++;

                    if (count === 3) {
                        // Dispatch the tripleClick event
                        this.dispatchEvent(tripleClickEvent);
                        count = 0; // Reset the count
                    }

                    clickCounts.set(this, count);

                    // Reset the count if the timeout expires
                    clearTimeout(timeouts.get(this));
                    timeouts.set(
                        this,
                        setTimeout(() => {
                            clickCounts.set(this, 0);
                        }, 300)
                    ); // Adjust the timeout duration (in milliseconds) as needed
                });
            }

            // Call the original addEventListener for other events
            originalAddEventListener.call(this, type, listener, options);
        };
    }
    registerTripleClickEvent();

    function safeCalculation(input) {
        const cleanValue = input.value
            .replace(/,/g, ".")
            .replace(/[^0-9+\-*/.\se]/g, "");

        try {
            const result = Function(`'use strict'; return (${cleanValue})`)();
            if (!isNaN(result)) {
                input.value = result;
            }
        } catch (e) {
            console.warn("Invalid calculation");
        }
    }

    for (let i = 0, len = numberFields.length; len && i < len; i++) {
        let input = numberFields[i];

        let wrap = input.closest(".wrap-number");
        if (wrap) continue;

        // convert type number to text
        input.type = "text";
        //input.pattern = "[0-9+-/*eE.]+";
        input.title = "Use Mousewheel or arrow keys to change values";
        input.classList.add('input-number')


        //let { min, max, step } = input.dataset;
        let min = input.min ? +input.min : Infinity;
        let max = input.max ? +input.max : Infinity;
        let step = input.step ? +input.step : 0.1;

        input.addEventListener("change", () => safeCalculation(input));

        input.addEventListener("keydown", (e) => {
            let val = +input.value;
            let newVal = val;
            let key = e.key;

            if (
                e.keyCode == 38 ||
                e.keyCode == 39 ||
                e.keyCode == 40 ||
                e.keyCode == 37
            ) {
                // up or right arrow = increase
                if (e.keyCode == 38 || e.keyCode == 39) {
                    newVal += step;
                }
                // down or left arrow = decrease
                else if (e.keyCode == 40 || e.keyCode == 37) {
                    newVal -= step;
                }

                if (newVal < min) newVal = min;
                if (newVal > max) newVal = max;
                input.value = +newVal.toFixed(8);
                input.dispatchEvent(new Event('input'))
            }
        });

        //reset to default
        input.addEventListener("tripleClick", () => {
            input.value = +input.getAttribute("value");
            //console.log("reset");
            input.dispatchEvent(new Event('input'))
        });



        //{passive:true}


        /*
          input.addEventListener("wheel", (e) => {
            let offY = e.deltaY * 0.05;
            let val = +input.value;
            offY = Math.round(offY / step) * step;
            let newVal = +(val - offY).toFixed(8);
      
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            input.value = newVal;
          });
          */


    }
}


/**
 * toggle states
 */

function bindToggleBtns() {
    let btnsToggle = document.querySelectorAll('[data-toggle-class]');

    btnsToggle.forEach(btn => {

        let targetSel = btn.dataset.target;
        let target = document.getElementById(targetSel)
        let toggleClasses = btn.dataset.toggleClasses.split(' ')

        btn.addEventListener('click', (e) => {
            let current = e.currentTarget;
            let toggleClass = current.dataset.toggleClass;
            let classCurrent = toggleClasses[0]
            let classNext = toggleClasses[1]

            if (toggleClass === toggleClasses[0]) {
                classCurrent = toggleClasses[1];
                classNext = toggleClasses[0];
                current.classList.add('active')
                //current.dataset.toggleClass = classCurrent;
                //target.classList.replace(classNext, classCurrent)
            } else {
                classCurrent = toggleClasses[0];
                classNext = toggleClasses[1];
                current.classList.remove('active');
            }
            if (!target.classList.contains(classCurrent) && !target.classList.contains(classNext)) {
                target.classList.add(classNext)
                current.dataset.toggleClass = classNext;
            } else {
                current.dataset.toggleClass = classCurrent;
                target.classList.replace(classNext, classCurrent)
            }
        })

    })
}