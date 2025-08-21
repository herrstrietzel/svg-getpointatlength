let items= document.querySelectorAll('.font-item');
//console.log(items);  

let letternav = `<ul class="letter-links" id="navLetters"><li class="li-nav"><a href="#a">a</a></li><li class="li-nav"><a href="#b">b</a></li><li class="li-nav"><a href="#c">c</a></li><li class="li-nav"><a href="#d">d</a></li><li class="li-nav"><a href="#e">e</a></li><li class="li-nav"><a href="#f">f</a></li><li class="li-nav"><a href="#g">g</a></li><li class="li-nav"><a href="#h">h</a></li><li class="li-nav"><a href="#i">i</a></li><li class="li-nav"><a href="#j">j</a></li><li class="li-nav"><a href="#k">k</a></li><li class="li-nav"><a href="#l">l</a></li><li class="li-nav"><a href="#m">m</a></li><li class="li-nav"><a href="#n">n</a></li><li class="li-nav"><a href="#o">o</a></li><li class="li-nav"><a href="#p">p</a></li><li class="li-nav"><a href="#q">q</a></li><li class="li-nav"><a href="#r">r</a></li><li class="li-nav"><a href="#s">s</a></li><li class="li-nav"><a href="#t">t</a></li><li class="li-nav"><a href="#u">u</a></li><li class="li-nav"><a href="#v">v</a></li><li class="li-nav"><a href="#w">w</a></li><li class="li-nav"><a href="#x">x</a></li><li class="li-nav"><a href="#y">y</a></li><li class="li-nav"><a href="#z">z</a></li></ul>`;

let filters = {
    cat:['sans-serif', 'serif', 'display', 'monospace', "handwriting" ],
    type: ['vf', 'static'],
};

//render filter inputs
let filterinputs = '';
for(let f in filters){
    let terms = filters[f];

    filterinputs+=`<fieldset> <legend>${f}</legend>`
    terms.forEach(value=>{
        filterinputs+=
        `<label>
        <input class="inputFilter" data-cat="${f}" data-value="${value}" type="checkbox" value="" checked />${value}
        </label>`;
    })

    filterinputs+='</fieldset>';
}

header.insertAdjacentHTML('afterbegin', letternav+ filterinputs)

let currentFilters = filters;

let inputs = document.querySelectorAll('.inputFilter');

inputs.forEach(inp=>{

    let cat = inp.dataset.cat
    let value = inp.dataset.value

    inp.addEventListener('input', e=>{
        let checked = inp.checked;
        let ind = currentFilters[cat].indexOf(value);

        //add
        if(checked && ind<0 ){
            currentFilters[cat].push(value)
        }else{
            //remove
            currentFilters[cat].splice(ind, 1)
        }

        //hide/show 
        filteritems(items, currentFilters )
    
    })
})

function filteritems(items, currentFilters ){

    console.log(currentFilters);


    items.forEach((item,i)=>{

        let res = [];

        let filtered = true;

        let family = item.textContent.trim();
        let dataset = item.dataset;
        for( let key in dataset ){

            let val = dataset[key]

            //console.log(val,key, currentFilters[key] );
            let hasProp = currentFilters[key]!==undefined;

            if(hasProp){
                let ind = hasProp ? currentFilters[key].indexOf(val) : -1;
    
                if(ind==-1){
                    filtered = false;
                    res.push( [family, key, val, ind, filtered] );
                }
            }else{
                //filtered = true;
                //console.log('not', key);
            }
        }

        //console.log(res, filtered);
        if(filtered){
            item.style.display='block'

        }else{
            item.style.display='none'
        }
        //console.log(dataset);

    })


}



