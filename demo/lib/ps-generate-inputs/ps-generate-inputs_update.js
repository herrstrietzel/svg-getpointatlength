function getSettingsFromInputs(selector = '.input') {
    let settings = {};
    inputEls = document.querySelectorAll(selector);

    inputEls.forEach(inputEl => {

        //console.log(inputEl);
        let nodeName = inputEl.nodeName.toLowerCase();
        let type = inputEl.hasAttribute('type') ? inputEl.type : nodeName;
        //let isArray = (/\[\]/).test(inputEl.name);
        let propName = inputEl.name.replace(/\[\]/g, '')
        let isSelected = (inputEl.checked || inputEl.selected) ? true : false;
        let propVal = isNaN(inputEl.value) ? inputEl.value : +inputEl.value;

        let readOnly = inputEl.hasAttribute('readonly');
        if (readOnly) return false;
        if (type === 'checkbox' || type === 'radio') propVal = isSelected === true ? true : false;

        //settings[propName] = propVal==='false' ? 'false!!!' : propVal;
        //console.log('propName', propName, propVal);
        settings[propName] = propVal;

    })

    return settings;
}



/**
 * add Event listeners 
 * for inputs
 */
function bindInputs(selector = '.input', settings = {}, settingsChangeEvent = null) {

    inputEls = document.querySelectorAll(selector);
    //console.log('inputEls', inputEls);

    for(let i=0,l=inputEls.length; i<l; i++){
        let inputEl = inputEls[i];

        // skip initialized
        if(inputEl.classList.contains('inp-active')) continue;

        inputEl.addEventListener('input', (e) => {
            let current = e.currentTarget;
            let nodeName = current.nodeName.toLowerCase();
            let type = current.hasAttribute('type') ? current.type : nodeName;

            let propName = current.name.replace(/\[\]/g, '')
            let propVal = isNaN(current.value) ? current.value : +current.value;
            let currentType = current.hasAttribute('type') ? current.type : nodeName;
            let isSelected = current.checked || current.selected ? true : false;

            if (currentType === 'checkbox') propVal = isSelected;

            if (currentType === 'range') {
                let currentVal = current.closest('.input-wrap-outer').querySelector('.input-range-val')
                if (currentVal) currentVal.textContent = +propVal;
            }

            // synced fields
            let sync = current.dataset.sync;
            if (sync) {
                let syncedInput = document.querySelector(`*[name=${sync}]`);
                if (syncedInput) {
                    syncedInput.value = propVal;
                    syncedInput.dispatchEvent(new Event('input'));
                }
            }

            settings[propName] = propVal;

            // trigger event
            if (settingsChangeEvent) document.dispatchEvent(settingsChangeEvent);
        })

        inputEl.classList.add('inp-active');
    }

    return settings;
}


/**
 * listen to setting changes 
 * and store them to lcal storage
 */

function cacheSettings(settings = {}, settingsChangeEvent = 'settingsChange', localStorageName = 'settingsCache') {
    document.addEventListener(settingsChangeEvent, (e) => {
        let settingsJSON = JSON.stringify(settings);
        localStorage.setItem(localStorageName, settingsJSON);
    });
}

/**
 * get settings cache
 * overwrite default settings
 */

function getSettingsCache(localStorageName = 'settingsCache') {
    let settingsCached = localStorage.getItem(localStorageName) ? JSON.parse(localStorage.getItem(localStorageName)) : {};
    return settingsCached;
}