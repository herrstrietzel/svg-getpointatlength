/**
 * open targets
 */
function openTargetDetails(selector='.details-target') {

    const update = (selector)=>{
        let hash = window.location.hash.substring(1);
        let detailsOpen = document.querySelectorAll(`${selector}[open]`)
        if(hash) {
            let target = document.getElementById(hash)
            let details = target.querySelector(selector) 

            detailsOpen.forEach(detail=>{
                detail.open=false
            })
    
            if(details) details.open=true
        }
    }
    update(selector)
    window.addEventListener('hashchange', (e)=>{
        update(selector)
    });
  }

openTargetDetails()