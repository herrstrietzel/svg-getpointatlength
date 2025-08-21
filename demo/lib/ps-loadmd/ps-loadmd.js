
window.addEventListener('DOMContentLoaded', e=>{
    loadMDs();

})

async function loadMDs() {
  let mdTargets = document.querySelectorAll("[data-md]");


  for (let i = 0, len = mdTargets.length; len && i < len; i++) {
    let target = mdTargets[i];
    let readmefileUrl = target.dataset.md;
    let markdown = readmefileUrl
      ? await (await fetch(readmefileUrl)).text()
      : target.innerHTML.trim();
    
    /*
    let doc = target;
    let nodes = [...doc.childNodes].filter(el=>{return el.textContent.trim() || el.childNodes.length})
    console.log(nodes)
    */
    
    let mdp = makeMDP();
    let html = mdp.render(markdown);
    target.innerHTML=html

  }
}
