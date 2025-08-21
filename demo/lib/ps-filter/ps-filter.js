//initFilter();
function filterObjectArray(arr, filter) {
    let filteredArray = []
    let propsLength = Object.keys(filter).length

    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        let match = 0
        for (let prop in filter) {
            if (filter[prop].length && !filter[prop].includes(item[prop])) {
                continue
            }
            match++
        }
       if(match === propsLength) filteredArray.push(item)
    }
    return filteredArray
}



function initFilter(dataAtt = 'data-category', selectorFilterInputs = '.filterInputs') {

    let filterItems = document.querySelectorAll(`[${dataAtt}]`);
    let filterInputs = document.querySelectorAll(`${selectorFilterInputs}`);

    if (!filterItems.length || !filterInputs.length) {
        //console.log('no filter elements');
        return false;
    }

    /**
     * add css
     */
    let css = `

    .filtr-container {
        --filter-gap:1em;
        display: flex;
        flex-wrap: wrap;
        gap: 1em;
      }
  
      .filtr-item {
        flex: 0 1 auto;
        width: 25%;
      }
  
      select {
        width: 100%;
      }
  
      .filtr-item {
        transform-origin: center;
        transform-box: fill-box;
        transition: 0.5s;
      }
  
      .hide_filtered {
        position:absolute;
        flex: 0 0 0;
        opacity: 0;
        transform: scale(0);
        width: 0;
        height:0;
        margin: 0;
        margin-left:0;
        margin-right:calc(var(--filter-gap) * -1);
        margin-bottom:calc(var(--filter-gap) * -1);
      }
  
  
      .show_filtered {
        opacity: 1;
      }
  
  
      figure{
        margin:0;
        padding:0;
      }
  
      img{
        max-width:100%;
        height:auto;
      }
    `;

    let newStyle = document.createElement('style');
    newStyle.textContent = css;
    document.head.append(newStyle);

    /**
     * get current filters from inputs
     */
    let filterArr = getCurrentFilters(filterInputs);

    /**
     * add event listeners:
     * update on input
     */
    filterInputs.forEach(input => {
        //update filter object
        input.addEventListener('input', e => {
            filterArr = getCurrentFilters(filterInputs)
            hideFiltered(filterArr)
            //console.log(filterArr);
        })
    })


    function hideFiltered(filterArr) {

        //console.log('filterArr', filterArr);

        let results = filterItems.length;
        filterItems.forEach(el => {
            let matches = 0;
            let itemCats = el.dataset.category.split(', ').filter(Boolean).map(val => { return val.trim() });

            // loop through all filter categories
            for (let i = 0; i < filterArr.length; i++) {
                //let filterName = filterArr[i];
                let filterValue = filterArr[i];
                if (itemCats.includes(filterValue) || filterValue === 'all') {
                    matches++;
                }
            }
            //console.log('matches', matches, 'itemCats:', itemCats, filterArr);

            // item must have all categories of global filter
            if (matches >= filterArr.length) {
                el.classList.remove('hide_filtered');
                el.classList.add('show_filtered');
                results++
            } else {
                el.classList.add('hide_filtered');
                el.classList.remove('show_filtered');
                results--
            }

        })


        // override if no results and family defined
        if(results===0 && filterArr.join('').includes('cat_family_')  ){
            let filterFamily = filterArr.filter(val=>{return val.includes('cat_family')})[0]
            let item = document.querySelector(`[data-category*=${filterFamily}]`)
            item.classList.remove('hide_filtered');
            item.classList.add('show_filtered');
            filterArr = [filterFamily]
            results = 1
        }


    }
}


function getCurrentFilters(filterInputs) {
    let filterArr = [];
    filterInputs.forEach(input => {
        let current = input;
        let currentType = current.type ? current.type : current.nodeName.toLowerCase();
        let value;
        let filterValue = current.dataset.filtervalue;

        /**
         * filter relation: 
         * 'and'= all values must match
         * "or" = one of selected option must match
         */
        if (currentType === 'select-multiple') {
            value = [...current.selectedOptions].map(el => { return el.dataset.filtervalue });
        }
        else if (currentType === 'checkbox' || currentType === 'radio') {
            value = current.checked ? filterValue : ''
        }
        //text input
        else {
            value = current.value.trim() ? `cat_${current.name}_${current.value.toLowerCase().replaceAll(' ', '-')}` : '';
        }
        filterArr.push(value)
    })

    filterArr = filterArr.flat().filter(Boolean)
    return filterArr;
}





/**
 * generate filter inputs
 * from object
 */

function getfilterInputsFromObj(props, radios = [], presets = {}, exclude = [], addLabels = true, labels=[]) {

    let checkboxesHtml = '';

    let i=0;
    for (let prop in props) {
        // normalize and remove empty
        let vals = Array.isArray(props[prop]) ? props[prop] : [props[prop]];
        vals = vals.filter(Boolean);
        if(!vals.length) continue

        // exclude props
        if (exclude.length && exclude.includes(prop)) continue;

        // sort values alphanumerically
        if (Array.isArray(vals[0])) {
            vals = [
                vals.filter(val => val.toLowerCase() === val && isNaN(val.substring(0, 1))).sort(
                    (a, b) => {
                        return a > b ? 1 : -1;
                    }),
                vals.filter(val => val.substring(0, 1).toUpperCase() === val.substring(0, 1)).sort(
                    (a, b) => {
                        return a > b ? 1 : -1;
                    })
            ].flat();
        }

        checkboxesHtml += `<p class="inpWrp">`;

        let type = radios.includes(prop) ? 'radio' : Array.isArray(props[prop]) ? 'checkbox' : 'text';

        //add labels

        let label = labels.length ? labels[i] : prop
        if (addLabels) checkboxesHtml += `<label class="label-prop">${label}</label> `;

        vals.forEach(val => {

            //filterClassCache
            let checked = presets[prop] ? presets[prop].includes(val) || presets[prop].includes('all') : false ;
            let checkAtt = checked  ? 'checked' : ''
            let placeHolder = type==='text' ? `placeholder="${prop}"` : '';

            let fieldHTML = `<input class="inpFilter inp-${type}" type="${type}" data-filter="${val}" value="${val}" name="${prop}" 
            ${checkAtt}  ${placeHolder}>`;

            if(type==='checkbox' || type==='radio'){
                checkboxesHtml +=
                `<label class="label-filter dsp-inl-blc">
                    ${fieldHTML}  ${type !== 'text' ? val : ''}
                  </label> `;
            }else{
                checkboxesHtml +=
                `${fieldHTML}`;
            }
        })

        // reset to all
        if (type === 'radio') {
            checkboxesHtml +=
                `<label class="label-filter dsp-inl-blc">
                  <input class="inpFilter" type="radio" data-filter="" value="" name="${prop}"> none
              </label> `
        }

        checkboxesHtml += `</p>`;
        i++
    }

    return checkboxesHtml;
}


function getCurrentFilterObject(filterInputs) {
    let filterObj = {};
    filterInputs.forEach(input => {
        let current = input;
        let currentType = current.type ? current.type : current.nodeName.toLowerCase();
        let value;
        let filterValue = current.value;
        let prop = current.name;

        if (!filterObj[prop]) {
            filterObj[prop] = [];
        }

        /**
         * filter relation: 
         * 'and'= all values must match
         * "or" = one of selected option must match
         */
        if (currentType === 'select-multiple') {
            value = [...current.selectedOptions].map(el => { return el.dataset.filter });
        }
        else if (currentType === 'checkbox' || currentType === 'radio') {
            value = current.checked ? filterValue : ''
        }
        //text input
        else {
            value = current.value;
        }

        if (value) filterObj[prop].push(value)
    })

    //filterArr = filterArr.flat().filter(Boolean)
    return filterObj;
}

