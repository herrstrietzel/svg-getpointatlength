


//add icon svg via data attribute path
let SVGPathRef = document.querySelector('[data-icon-sprite]');
let SVGPathUrl = SVGPathRef ? SVGPathRef.dataset.iconSprite : '';



/**
 * mutation observer
 * inject/replace dynamically added icons
 */
let mutationEl = document.body;
let mutationOptions = {
  childList: true,
  //subtree: true
};


function mutationCallback(mutations) {
  for (let mutation of mutations) {
    if (mutation.type === 'childList') {
      //console.log('Mutation Detected:');
      setTimeout( ()=>{
        injectIcons();
      }, 0)
    }
  }
}

window.addEventListener('DOMContentLoaded', e => {
  (async () => {
    let spriteSVGUrl = SVGPathUrl ? SVGPathUrl : './lib/ps-icons/ps-icons.svg';
    loadIconAssets(spriteSVGUrl);
    injectIcons();

  })();


  const mutationObserver = new MutationObserver(mutationCallback);
  mutationObserver.observe(mutationEl, mutationOptions);
  //console.log('observe');
  
})


/**
 * init header
 */

async function loadIconAssets(url) {
  let assetSVGWrp = document.querySelector('#svgIconAssets');
  let ns = "http://www.w3.org/2000/svg";
  if (!assetSVGWrp) {
    assetSVGWrp = document.createElement('div');
    assetSVGWrp.id = 'svgIconAssets';
    let res = await fetch(url);
    if(res.ok){
      let markup = await res.text();
      assetSVGWrp.innerHTML = markup;
      document.body.append(assetSVGWrp)

      //icon map
      getIconMap()

    }
  }
}


function getIconMap(){
  let wrap = document.querySelector('[data-icon-map]');
  let iconSvg = document.querySelector('#svgIconAssets');
  //console.log(wrap, iconSvg);
  if(wrap && iconSvg){
    let symbols = iconSvg.querySelectorAll('symbol')
    let map='';
    symbols.forEach(sym=>{
      let vb = sym.getAttribute('viewBox')
      map+=`<svg viewBox="${vb}" class="icn-svg "><use href="#${sym.id}" /></svg>`
    })

    wrap.insertAdjacentHTML('beforeend', map)
  }


}



/**
 * style standard links
 */
let contentLinks = document.querySelectorAll('.hentry a');
contentLinks.forEach(link => {
  let href = link.href;
  if (href.includes('mailto:') || (href.includes('@') && !href.includes('https://'))) {
    injectIcon(link, 'envelope');
  }

  else if (href.includes('tel:') && !link.classList.contains('fa-phone')) {
    injectIcon(link, 'phone-alt');
  }
})




function injectIcons() {
  let placeholders = document.querySelectorAll("[data-icon]");
  let ns = "http://www.w3.org/2000/svg";

  placeholders.forEach((el) => {
    let data = el.dataset.icon.split(' ');
    let symbolID = 'icn-' + data[0];
    let iconClass = data[1] ? data[1] : '';
    let symbol = document.getElementById(symbolID);
    let type = el.nodeName.toLowerCase();
    let elClasses = [...el.classList];

    if (symbol) {
      let newSvg = document.createElementNS(ns, "svg");
      let vB = symbol.getAttribute("viewBox");

      //console.log(vB, symbolID);
      newSvg.setAttribute('viewBox', vB)
      newSvg.setAttribute('class', `icn-svg ${symbolID} ${iconClass}`)
      let use = document.createElementNS(ns, "use");
      use.setAttribute('href', '#' + symbolID);
      newSvg.append(use)

      if(type==='span'){
        newSvg.classList.add(...elClasses)
        el.replaceWith(newSvg);
      }else{
        el.removeAttribute('data-icon');
        el.append(newSvg);
      }


    }
  });
}


// replace icon font
function injectIcon(el, symbolID = '') {

  if (symbolID) {
    let ns = "http://www.w3.org/2000/svg";
    //let data = el.dataset.icon.split(' ');
    //symbolID = data[0];
    symbolID = 'icn-' + symbolID;
    let symbol = document.getElementById(symbolID);

    if (symbol) {
      let vB = symbol.getAttribute("viewBox");
      el.insertAdjacentHTML('afterbegin', `<svg viewBox="${vB}" class="icn-inline icn-svg ${symbolID}"><use href="#${symbolID}" /></svg>`);
    }
  }
}


