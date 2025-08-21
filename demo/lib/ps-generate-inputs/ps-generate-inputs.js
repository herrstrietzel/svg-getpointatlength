async function generateFilterInputs(inputs, settings = null) {

    let booleanAtts = ['checked', 'disabled', 'selected', 'hidden', 'multiple'];
    //console.log('settings cached', settings);


    // get groups
    for (let g = 0, len = inputs.length; g < len; g++) {

        let group = inputs[g];
        let fields = group.fields;

        // only info
        if (group.info && !fields) {
            let infoBox = document.createElement('div');
            infoBox.classList.add('input-infos')
            infoBox.innerHTML = group.info;
            inputs[g].node = infoBox;
            continue
        }

        for (let i = 0, len = fields.length; i < len; i++) {

            let input = fields[i];
            let name = input.name;
            let { type = '', label = '', defaults = '', values = {}, atts = {}, disabled = [], labelPosition = '', title = '', addNumField = false, info = '', listener = 'input', sync = '' } = input;


            // only info
            if (info && !type) {
                let infoBox = document.createElement('div');
                infoBox.classList.add('input-infos')
                infoBox.innerHTML = info;
                input.node = infoBox;
                continue
            }

            // only btn
            else if (type === 'button') {
                let btn = document.createElement(type);
                btn.classList.add('btn', 'btn-default', 'input-button')
                btn.textContent = label;
                applyAtts(atts, btn, booleanAtts);
                input.node = btn;
                continue
            }


            let inputType;
            let attType = '';

            // input type or select/textarea
            switch (type) {
                case 'textarea':
                    inputType = 'textarea'
                    break;
                case 'select':
                    inputType = 'option'
                    break;
                default:
                    inputType = 'input'
                    attType = type;
                    break;
            }

            //sync
            if (sync) {
                atts['data-sync'] = sync;
            }


            /**
             * multiple values or groups
             */
            let inputEls = []
            let valueskeys = Object.keys(values)
            let valuesVals = Object.values(values)
            let isMulti = valuesVals.length > 1;
            let addLabel = false;

            // check defaults - pre selected or not
            defaults = !Array.isArray(defaults) ? ([defaults]) : defaults;

            // add labels?
            if (valuesVals.length === 0 || type === 'select' || isMulti) {
                addLabel = true
            }


            // single inputs
            if (valuesVals.length === 0) {
                valueskeys = [name]
                valuesVals = [defaults]
                atts['name'] = name;
            }

            let currentKey = valueskeys[0];
            let currentVal = valuesVals[0];


            for (let v = 0; v < valuesVals.length; v++) {

                currentKey = valueskeys[v];

                // get current value either from defaults or cache
                currentVal = valuesVals[v];

                /**
                 * sync defaults 
                 * with cache
                 */
                let useCache = true;
                //useCache = false;
                let cacheKey = currentKey;
                let currentValCache = settings[cacheKey];


                // && currentValCache!==undefined
                if (useCache) {

                    if (type === 'checkbox') {

                        if(currentValCache===undefined){
                            //currentValCache = settings[currentVal];
                        }

                        //currentValCache = settings[cacheKey];
                        defaults = currentValCache!==undefined ? [currentValCache] : defaults;
                        currentVal = (currentValCache === true || currentValCache === false) ? currentKey :
                            (currentValCache ? currentValCache : currentVal);

                        //console.log(isMulti, cacheKey, 'currentKey', currentKey, currentValCache, defaults);


                    }


                    else if (type === 'select' || type === 'radio') {
                        // take name as key
                        cacheKey = name;
                        currentValCache = settings[cacheKey]
                        defaults = currentValCache!==undefined ? [currentValCache] : defaults;


                    } else {
                        // prepend name for multi fields
                        cacheKey = isMulti ? name + currentKey : cacheKey;
                        currentValCache = settings[cacheKey] 

                        currentVal = currentValCache!==undefined ? currentValCache : currentVal;
                    }
                }



                atts['class'] = atts['class'] ? `input-${type} input-${name} ${atts['class']}` : `input-${type} input-${name}`;

                // add suffixes for multi fields
                if (isMulti && (type !== 'checkbox' && type !== 'radio')) {
                    atts['name'] = name + currentKey;
                } else {
                    atts['name'] = name;
                }

                if (attType) atts['type'] = attType;

                //multi checkboxes
                if (isMulti && (type === 'checkbox')) {
                    atts['name'] = currentVal;
                }


                let defaultIndex = currentVal ? defaults.indexOf(currentVal) : -1;

                /**
                 * selected by default value array 
                 * or attribute
                 */
                let selected = defaultIndex > -1 ||
                    (!isMulti && (atts['checked'] === true) || defaults[0] === true) ||
                    (!isMulti && atts['selected'] === true || defaults[0] === true) ? true : (false);


                // disabled array
                if (disabled && disabled.includes(currentVal)) {
                    atts['disabled'] = true;
                }

                /**
                 * create input element
                 * add to object
                 */
                let inputEl = document.createElement(inputType);

                // set type for text, number etc
                if (type !== 'select' && type !== 'textarea') {
                    inputEl.setAttribute('type', type)
                }


                /**
                 * set selection defaults
                 * data attribute is needed for resetting
                 */

                //atts['value'] = (type === 'checkbox' && currentVal !==true ) ? false : currentVal;
                atts['value'] = currentVal;

                if (selected) {
                    if ((type === 'select')) {
                        atts['selected'] = true
                        atts['data-selected'] = true
                    }
                    else if (type === 'radio' || type === 'checkbox') {
                        atts['checked'] = true
                        atts['data-checked'] = true
                    }
                }
                // not selected
                else {
                    atts['checked'] = false
                    atts['selected'] = false
                    atts['data-checked'] = false
                    atts['data-selected'] = false
                }

                // apply all
                applyAtts(atts, inputEl, booleanAtts)
                inputEl.classList.add('input')



                /**
                 * wrap checkboxes 
                 * in labels
                 */
                if ((type !== 'select' && (type === 'radio' || type === 'checkbox' || isMulti))) {
                    let labelWrap = document.createElement('label');

                    let labelTxt = label && !isMulti ? label : currentKey;
                    let labeText = document.createTextNode(`${labelTxt}`);
                    let labeTextSpace = document.createTextNode(`\u00A0`);

                    if (labelPosition !== 'top') {
                        labelWrap.classList.add('label-inline')
                    } else {
                        labelWrap.classList.add('label-inline-block')
                    }

                    if (labelPosition && labelPosition === 'left') {
                        labelWrap.append(labeText, labeTextSpace, inputEl)
                    } else {
                        labelWrap.append(inputEl, labeTextSpace, labeText)
                    }
                    inputEls.push(labelWrap)
                }


                // add option texts
                else if ((type === 'select')) {
                    let labelTxt = label && !isMulti ? label : currentKey;

                    inputEl.append(labelTxt)
                    inputEl.classList.add('input-option')
                    inputEl.classList.remove('input')

                    // first value is placeholder
                    inputEls.push(inputEl)
                }

                else {
                    if (title) inputEl.title = title;
                    inputEls.push(inputEl)
                }

                inputEl.classList.add('input-' + type)

            } // endof values loop



            /**
             * wrap input elements
             * add labels
             */
            if (type === 'select') {
                let select = document.createElement('select');
                select.classList.add('input', 'input-select')

                select.name = name;
                //select.id = name;
                if (title) select.title = title;

                // populate with dynamic options
                let dataSrc = atts['data-source']

                //sync
                if (sync) {
                    select.dataset.sync = sync
                }


                if (dataSrc) {
                    let res = await (fetch(dataSrc));
                    if (res.ok) {
                        let data = await (res).json();
                        for (let prop in data) {
                            // trim enclosing quotes
                            let val = JSON.stringify(data[prop]).replace(/^"|"$/g, '');
                            // set selected
                            let defaultSelected = null;
                            //let selected = val === valCache;
                            let selected = false;
                            let newOption = new Option(prop, val, defaultSelected, selected);
                            select.add(newOption);
                        }
                    }

                } else {
                    // regular select - options already created
                    select.append(...inputEls)
                }

                inputEls = [select];
            }


            // wrap and add to node prop
            inputWrap = document.createElement('div');
            inputWrap.classList.add('input-wrap-outer');

            //don't prepend labels for single checkboxes or radio
            if ((type === 'checkbox' || type === 'radio') && !isMulti) addLabel = false;

            // add labels
            if (addLabel) {

                let labelWrap = document.createElement('label');
                let labeText = document.createTextNode(`${label}`);
                let labeTextSpace = document.createTextNode(`\u00A0`);
                labelWrap.setAttribute('for', name)

                // set label position to top for multiple
                if (isMulti) labelPosition = 'top';

                if (labelPosition === 'top' || type === 'select' || type === 'textarea') {
                    labelWrap.classList.add('label-block')
                }
                else {
                    labelWrap.classList.add('label-inline')
                }

                if (!labelPosition || labelPosition === 'top' || labelPosition === 'left') {
                    labelWrap.append(labeText, labeTextSpace)
                    inputWrap.append(labelWrap, ...inputEls)
                } else {
                    labelWrap.append(labeTextSpace, labeText)
                    inputWrap.append(...inputEls, labelWrap)
                }

            } else {
                inputWrap.append(...inputEls)
            }

            //add info box
            if (info) {
                let infoBox = document.createElement('div');
                infoBox.classList.add('input-infos')
                infoBox.innerHTML = info;
                inputWrap.append(infoBox)
            }


            // wrap range sliders for value indicators
            if (type === 'range') {
                let label = inputWrap.querySelector('label')
                let range = inputWrap.querySelector('input')
                let rangeNum = document.createElement('span');
                rangeNum.classList.add('input-range-vals')

                let rangeNumCurrent = document.createElement('span');
                rangeNumCurrent.classList.add('input-range-val')
                rangeNumCurrent.textContent = range.value;

                rangeNum.textContent = `(${range.min}–${range.max}) `
                rangeNum.insertBefore(rangeNumCurrent, rangeNum.childNodes[1]);
                label.append(rangeNum)

            }

            input.node = inputWrap;
            //console.log('settings2', settings);
        }
    }

    // console.log('valCache', name, 'valCache', valCache, 'currentVal');
    //return settings;
}
















/**
 * append render inputs
 */
function appendInputs(inputs, selection = [], target, localStorageName = '') {

    let groups = [];

    for (let g = 0, len = inputs.length; g < len; g++) {

        let group = inputs[g];
        let { type = 'div', label = '', open = false, labelType = '', labelClass = 'input-group-label', info = '' } = group;
        let fields = group.fields;

        if (info && !fields) {
            groups.push(group.node);
            continue
        }

        let wrapper = document.createElement(type);
        wrapper.classList.add('input-group', `input-group-${labelType}`)

        //labelType = labelType ? labelType : (type==='details' ? 'summary' : )

        if (label) {

            //console.log('type', type, group);
            if (type === 'details') {
                wrapper.open = open;
                labelType = 'summary'
            }
            else if (type === 'fieldset') {
                labelType = 'legend'
            } else {
                labelType = labelType ? labelType : 'p'
            }

            let labelEl = document.createElement(labelType);
            labelEl.classList.add(labelClass, `${labelClass}-${labelType}`, `${labelType}`)
            labelEl.textContent = label
            wrapper.append(labelEl)
        }

        //add info box
        if (info) {
            let infoBox = document.createElement('div');
            infoBox.classList.add('input-infos')
            infoBox.innerHTML = info;
            wrapper.append(infoBox)
        }


        // fields
        for (let i = 0, len = fields.length; i < len; i++) {
            let input = fields[i];
            let node = input.node;
            wrapper.append(node)
        }
        groups.push(wrapper);

    }

    /**
     * append all
     * or selected groups 
     * to target
     */

    if (!selection.length) {
        target.append(...groups)
    } else {
        let selectedGroups = groups.filter((g, i) => { return selection.includes(i) })
        target.append(...selectedGroups)
    }


    // reset btn
    let btnReset = document.getElementById('btnReset');
    if (btnReset) bindResetBtn(btnReset, localStorageName)

    // add event listeners
    //bindInputs()

    //enhance
    enhanceInputs()

    //enhanceTextarea();


}
































function bindResetBtn(btnReset = null, localStorageName = '') {


    if (btnReset) {
        btnReset.addEventListener('click', e => {
            resetSettings(localStorageName);
            window.location.reload();
        })
    }
}


function resetSettings(localStorageName = '') {

    console.log('delete', localStorageName);
    if (localStorageName) {
        localStorage.removeItem(localStorageName);
    }

    /*
    let inputs = document.querySelectorAll('input, select');

    inputs.forEach(inp => {
        let defaultVal = inp.getAttribute('value');
        //let isChecked = inp.checked

        if (inp.type === 'checkbox' || inp.type === 'radio') {
            let isChecked = inp.getAttribute('data-checked') && inp.getAttribute('data-checked') === 'true' ? true : false;

            if (isChecked) {
                inp.checked = true
            } else {
                inp.checked = false
            }
        } else {
            if (defaultVal !== '') {
                inp.value = defaultVal
            }
        }

        // trigger change event
        inp.dispatchEvent(new Event('input'));
    })
    */

}


/**
 * apply attributes to 
 * input elements helper
 */
function applyAtts(atts, inputEl, booleanAtts) {
    for (att in atts) {
        // checkboxes, radio or select
        if (booleanAtts.includes(att)) {
            if (atts[att] === true) inputEl[att] = true
        }
        else if (att === 'class' || att === 'className') {
            let classes = atts[att].split(' ').filter(Boolean);
            inputEl.classList.add(...classes);
        }
        else {
            if (inputEl.nodeName.toLowerCase() === 'textarea' && att === 'value') {
                inputEl.value = atts[att]
            } else {
                inputEl.setAttribute(att, atts[att])
            }
        }
    }
}


