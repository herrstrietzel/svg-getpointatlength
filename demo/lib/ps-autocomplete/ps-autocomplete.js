
let autoCompleteEls = document.querySelectorAll('[data-search')
autoCompleteEls.forEach(el=>{

    //let dataTarget = el.dfa
    initAutoComplete(el)

})

async function initAutoComplete(target) {
    //wrap element
    let wrp = document.createElement('div')
    wrp.classList.add('autocomplete-wrap')

    let resultWrp = document.createElement('div')
    resultWrp.classList.add('autocomplete-result-list-wrp', 'scrollbar','autocomplete-inactive')

    target.parentNode.insertBefore(wrp, target)
    wrp.append(target, resultWrp)

    //get data
    let res = await (fetch(target.dataset.search));
    let obj = await res.json();

    target.addEventListener('input', async (e) => {
        let str = e.currentTarget.value;
        let results = await searchInObj(obj, str);
        let searchHTML = '<ul class="autocomplete-result-ul">';

        // no results or empty string
        if (!results.length || !str) {
            resultWrp.innerHTML = '';
            resultWrp.classList.add('autocomplete-inactive');
            resultWrp.classList.remove('autocomplete-active');
            
        } else {
            

            results.forEach(result => {
                searchHTML +=
                `<li class="autocomplete-result-li" data-value="${result.url}" title="${result.url}">
                    <a class="autocomplete-result-link" href="${result.url}" >${result.label}</a>
                </li>`;

            })

            searchHTML += '</ul>';
            resultWrp.innerHTML = searchHTML;
            //console.log('results', results);


            let autoFillItems = resultWrp.querySelectorAll('.autocomplete-result-link');
            let resultsTotal = results.length

            autoFillItems.forEach(btn=>{
                btn.addEventListener('click', (e)=>{
                    e.preventDefault();
                    let val = btn.href;
                    target.value = val
                    resultWrp.classList.remove('autocomplete-active')
                    resultWrp.classList.add('autocomplete-inactive');
                    target.dispatchEvent(new Event('input'))
                })
            })

            // make active if has more than 1 item
            if(resultsTotal>1){
                //console.log('make active');
                resultWrp.classList.add('autocomplete-active');
                resultWrp.classList.remove('autocomplete-inactive');
            }
        }
    })

    target.addEventListener('blur', e => {
        //resultWrp.classList.remove('active')
        //resultWrp.classList.add('inactive')
    })

}


function searchInObj(obj, str) {

    str = str.toLowerCase();
    if (str.length < 2) {
        return []
    }

    let results = []
    obj.forEach(item => {
        item.score = 0
        let score = 0;
        let vals = Object.values(item)

        vals.forEach(val => {

            let valStr = val.toString();
            if (valStr.indexOf(str) > -1 || valStr.toLowerCase().indexOf(str) > -1) {
                score++
                item.score = score
            }
        })

        // add to results
        if (score) {
            results.push(item)
        }
    })

    //sort by relevance
    results.sort((a, b) => (a.score > b.score) ? 1 : ((b.score > a.score) ? -1 : 0))

    return results
}


