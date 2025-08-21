async function generateFilterInputs(inputs, settings = {}, localStorageName = '') {

    // settings change event
    const settingsChangeEvent = new Event('settingsChange');
    let settingsCache = {}
    let valCache = ''


    if (localStorageName) {
        // sync with cache
        settingsCache = localStorage.getItem(localStorageName);
        settingsCache = settingsCache ? JSON.parse(settingsCache) : settings

        // update local storage on change
        document.addEventListener('settingsChange', () => {
            localStorage.setItem(localStorageName, JSON.stringify(settings));
        });

        //console.log('settingsCache', settingsCache);
    }


    let booleanAtts = ['checked', 'disabled', 'selected', 'hidden', 'multiple'];

    // apply attributes to input elements helper
    const applyAtts = (atts, inputEl, booleanAtts) => {
        for (att in atts) {
            if (booleanAtts.includes(att)) {
                if (atts[att] === true) inputEl[att] = true
                inputEl.setAttribute(att, atts[att])

            }
            else if (att === 'class' || att === 'className') {
                let classes = atts[att].split(' ').filter(Boolean);
                inputEl.classList.add(...classes);
            }
            else {
                inputEl.setAttribute(att, atts[att])
            }
        }
    }

    // settings from cache
    //settings = settingsCache;
    //console.log('settings init', settings);


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
            //console.log(inputs);
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



            /**
             * multiple values or groups
             */
            let inputEls = []
            let valueskeys = Object.keys(values)
            let valuesVals = Object.values(values)
            let isMulti = valuesVals.length > 1;
            let addLabel = false;

            // check defaults - pre selected or not
            //defaults = !Array.isArray(defaults) ? (defaults !== true ? [defaults] : []) : defaults;
            defaults = !Array.isArray(defaults) ? ([defaults]) : defaults;

            // add labels?
            if (valuesVals.length === 0 || type === 'select' || isMulti) {
                addLabel = true
            }

            // single inputs
            if (valuesVals.length === 0) {
                valueskeys = [name]
                valuesVals = [defaults]

                // value from settings cache
                if (settingsCache[name] !== '') {
                    valCache = settingsCache[name]
                    //console.log('valCache', name, valCache);

                    // uncheck for boolean
                    if (valCache === false) {
                        atts['checked'] = false
                        atts['data-checked'] = false
                    }
                }

                atts['name'] = name;
            }


            for (let v = 0; v < valuesVals.length; v++) {

                let currentKey = valueskeys[v]
                let currentVal = valuesVals[v]

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
                valCache = isMulti ? (type === 'radio' ? settingsCache[name] : settingsCache[currentVal]) : valCache;



                if(isMulti){

                    //console.log('valCache', name, 'currentKey:', currentKey, settingsCache[name], 'valCache', valCache, isMulti);
                }


                /**
                 * selected by default value array 
                 * or attribute
                 */
                let selected = defaultIndex > -1 || (!isMulti && atts['checked'] === true) || (!isMulti && atts['selected'] === true) ? true : (false);

                
                //selected by defaults but overridden by cache
                if (selected && valCache===false ) {
                    selected = false
                }
                

                if (disabled && disabled.includes(currentVal)) {
                    atts['disabled'] = true;
                }

                /**
                 * create input element
                 */
                let inputEl = document.createElement(inputType);


                if (selected) {
                    if ((type === 'select')) {
                        atts['selected'] = true
                    }
                    else if (type === 'radio' || type === 'checkbox') {
                        atts['checked'] = true
                        atts['data-checked'] = true
                    }
                } else {
                    atts['checked'] = false
                    atts['selected'] = false
                    atts['data-checked'] = false
                }



                /**
                 * set values
                 * take value from settings cache
                 */


                //settingsCache[atts['name']]
                if (settingsCache[atts['name']] !== '') {
                    valCache = settingsCache[atts['name']] || '';
                }

                //textarea
                if (type === 'textarea') {
                    //console.log(defaults);
                    currentVal = defaults ? defaults : currentVal;
                    inputEl.value = valCache !== '' ? valCache : currentVal
                }

                else if (type === 'checkbox') {
                    inputEl.checked = valCache === true ? true : (defaults[0]===true && valCache ? true : false)
                    //console.log(currentKey, defaults, 'valCache:', `"${valCache}"`, inputEl.checked);

                    atts['value'] = currentVal;
                    //atts['checked'] = valCache === true ? true : false;
                }

                else if (type === 'radio') {
                    inputEl.checked = valCache === currentVal ? true : false
                    atts['value'] = currentVal;
                    atts['checked'] = valCache === currentVal ? true : false;

                    //console.log('valCache', name, 'currentKey:', currentKey, settingsCache[name], 'valCache', valCache, isMulti);
                    //console.log('valCache', name, 'valCache', valCache, 'currentVal', currentVal);


                }

                else {
                    atts['value'] = currentVal;
                    inputEl.value = valCache !== '' ? valCache : currentVal
                    //console.log('valCache', valCache, currentVal);
                }


                // set attributes
                if (type !== 'select') {
                    applyAtts(atts, inputEl, booleanAtts)
                }

                // wrap checkboxes in labels
                //|| type==='textarea'
                if ((type === 'radio' || type === 'checkbox' || isMulti)) {
                    let labelWrap = document.createElement('label');

                    //console.log('currentKey', currentKey, name);
                    let labelTxt = label&&!isMulti ? label : currentKey;
                    //console.log('labelTxt', labelTxt);
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


                // add option labels
                else if ((type === 'select')) {
                    let labelText = document.createTextNode(` ${label}`);
                    inputEl.append(labelText)
                    inputEl.classList.add('input', 'input-option')

                    // first value is placeholder
                    if (!values.length) {
                        inputEl.disabled = true;
                    }
                    inputEls.push(inputEl)
                }

                else {
                    if (title) inputEl.title = title;
                    inputEl.classList.add('input', 'input-' + type)
                    inputEls.push(inputEl)
                }

            }


            // wrap select
            if (type === 'select') {
                let select = document.createElement('select');
                select.classList.add('input', 'input-select')

                select.name = name;
                if (title) select.title = title;

                // apply attributes
                applyAtts(atts, select, booleanAtts)

                // populate with dynamic options
                let dataSrc = atts['data-source']

                if (dataSrc) {
                    let res = await (fetch(dataSrc));
                    if (res.ok) {
                        let data = await (res).json();

                        for (let prop in data) {
                            // trim enclosing quotes
                            let val = JSON.stringify(data[prop]).replace(/^"|"$/g, '');
                            // set selected
                            let defaultSelected = null;
                            let selected = val === valCache;
                            let newOption = new Option(prop, val, defaultSelected, selected);
                            select.add(newOption);
                        }
                    }

                } else {
                    select.append(...inputEls)
                }

                inputEls = [select];
            }


            // wrap and add to node prop
            inputWrap = document.createElement('div');
            inputWrap.classList.add('input-wrap-outer');

            //don't add labels for single checkboxes or radio
            if( (type==='checkbox' || type==='radio') && !isMulti ) addLabel = false;


            // add labels
            if (addLabel) {

                //console.log('addLabel', addLabel, label, isMulti, type);

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
                    //inputWrap.append(labeText , labeTextSpace, labelWrap)
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


            /**
             * addEventlistener
             */
            inputEls.forEach(inputEl => {

                let nodeName = inputEl.nodeName.toLowerCase();
                inputEl = nodeName === 'label' ? inputEl.querySelector('input, textarea') : inputEl;
                let type = inputEl.type;
                let isArray = (/\[\]/).test(inputEl.name);
                let propName = inputEl.name.replace(/\[\]/g, '')
                let propVal = isNaN(inputEl.value) ? inputEl.value : +inputEl.value;
                let isSelected = inputEl.checked || inputEl.selected ? true : false;


                // !!! populate settings
                // start new set
                if (isArray && !settings[propName]) {
                    settings[propName] = isSelected ? new Set([propVal]) : new Set([]);
                    //console.log('set cache val array', settings[propName]);
                }


                else {

                    // add to set
                    if (isArray && isSelected) {
                        settings[propName].add(propVal)
                    }
                    // add single value
                    else if (!isArray) {
                        if (propVal === 'true' || type === 'checkbox') propVal = isSelected ? true : false;
                        settings[propName] = propVal
                    }
                    //console.log('set cache val', settings[propName]);
                }



                // !!! separate props
                if (isArray) {
                    settings[propVal] = inputEl.checked;
                }

                inputEl.addEventListener(listener, (e) => {
                    let current = e.currentTarget;
                    let currentName = current.name
                    let currentNameClean = currentName.replace(/\[\]/g, '')
                    let currentType = current.type
                    let val = !isNaN(current.value) ? +current.value : current.value
                    let isArray = (/\[\]/).test(currentName);

                    if (currentType === 'checkbox'  || currentType === 'radio') {

                        if (isArray) {
                            if (current.checked) {
                                //console.log('add', val);
                                settings[currentNameClean].add(val)
                                settings[val] = true
                            } else {
                                //console.log('remove', val);
                                settings[currentNameClean].delete(val)
                                settings[val] = false
                            }
                        } else {
                            // single boolean checkbox or radio
                            if (current.checked) {
                                settings[currentName] = currentType === 'checkbox' ? true : val;
                                //console.log('checked', currentName, settings[currentName]);
                            } else {
                                if(currentType === 'checkbox') settings[currentName] = false
                            }
                        }
                    }

                    else {
                        if (currentType === 'range') {
                            let currentVal = current.closest('.input-wrap-outer').querySelector('.input-range-val')
                            if (currentVal) currentVal.textContent = val;
                        }

                        // ignore readonly fields
                        if (!atts['readonly']) {
                            settings[currentNameClean] = val
                        }
                    }

                    // synced fields
                    if (sync) {
                        let syncedInput = document.querySelector(`*[name=${sync}]`);
                        if (syncedInput) {
                            syncedInput.value = val;
                            syncedInput.dispatchEvent(new Event('input'));
                        }
                        settings[sync] = val
                        //console.log('synced', sync, val );
                    }

                    // trigger event
                    document.dispatchEvent(settingsChangeEvent);
                    //console.log('new settings', settings);

                })

            })
            //console.log('inputWrap', inputWrap);

        }

    }

    // console.log('valCache', name, 'valCache', valCache, 'currentVal');


    //console.log('settings2', settings);
    return settings;

}

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

        if (label ) {

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
    if(btnReset) bindResetBtn(btnReset, localStorageName)


    //enhance
    enhanceInputs()

    //enhanceTextarea();


}



function bindResetBtn(btnReset=null, localStorageName = '') {


    if (btnReset) {
        btnReset.addEventListener('click', e => {
            resetSettings(localStorageName)
        })
    }
}


function resetSettings(localStorageName = '') {

    
    if (localStorageName) {
        localStorage.removeItem(localStorageName);
    }

    let inputs = document.querySelectorAll('input, select');

    inputs.forEach(inp => {
        let defaultVal = inp.getAttribute('value');
        //let isChecked = inp.checked

        if (inp.type === 'checkbox' || inp.type === 'radio') {
            let isChecked = inp.getAttribute('data-checked') && inp.getAttribute('data-checked') === 'true' ? true : false;

            //console.log('isChecked', isChecked);

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

}