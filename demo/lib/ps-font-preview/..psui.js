
document.fonts.ready.then(function () {
});

animateDetails();


function animateDetails() {

    //calculate content heights
    function setDetailContentHeight(cnt) {

        let expanded = cnt.closest('details').hasAttribute('open');

        // add some padding

        cnt.style.overflow = 'visible';
        cnt.style.maxHeight = 'inherit';

        let h = cnt.offsetHeight;
        console.log('cnt', cnt, h,);


        let detailsNested = cnt.querySelectorAll('.aria-cnt');
        let nestedHeight = 0;

        if (detailsNested.length) {
            //cnt.style.maxHeight = 'inherit';
            nestedHeight = 0;

            detailsNested.forEach((nested) => {

                /*
                // reset style to calculate correct height
                nested.style.overflow = 'visible';
                nested.style.maxHeight = 'inherit';
                //let height = nested.dataset.height ? +nested.dataset.height : nested.offsetHeight;
                let height =  nested.offsetHeight;
                nestedHeight += height;

                console.log(  nested, 'nestedHeight:', nestedHeight, 'height:', height, 'offsetHeight:', nested.offsetHeight);

                h +=  nestedHeight;
                */

            })
        }

        h += 100;
        //console.log('h', nestedHeight, cnt.offsetHeight, h);

        // save to data attribute
        cnt.dataset.height = h;

        //if (!expanded) cnt.style.maxHeight = '0px';

        cnt.style.maxHeight = `${h}px`;
        cnt.style.removeProperty('overflow');
    }

    function updateDetailContentHeights() {
        let accWrps = document.querySelectorAll('.aria-cnt');
        accWrps.forEach(cnt => {
            //setDetailContentHeight(cnt);
        })
    }


    // select all detail elements
    let details = document.querySelectorAll('details');

    details.forEach((detail,d) => {

        //let accWrp = detail.querySelector('.aria-cnt');
        let cnt = document.createElement('div');

        // wrap content in detail element
            let children = [...detail.children];
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (child.nodeName.toLowerCase() !== 'summary') cnt.append(child);
            }
            detail.append(cnt);


            //calculate heights
            let h = cnt.offsetHeight;
            cnt.dataset.height = h;

            cnt.classList.add('content', 'aria-cnt', 'aria-cnt-'+d);
        

            console.log(cnt, h);


        // set expanded/collapsed class names according elements
        let summary = detail.querySelector('summary')
        let expanded = detail.hasAttribute('open')

        //if (expanded) detail.classList.add('expanded')

        let style = window.getComputedStyle(cnt);
        let delay = parseFloat(style.transitionDelay);
        let duration = parseFloat(style.transitionDuration) + delay;


        // attach event listeners; prevent defaults
        summary.addEventListener('click', e => {
            e.preventDefault();
            let current = e.currentTarget;
            let detail = current.closest('details');
            let cnt = detail.querySelector('.aria-cnt');
            h = +cnt.dataset.height;
            expanded = detail.hasAttribute('open');

            // collapse
            if (expanded) {
                detail.classList.remove('expanded')
                detail.classList.add('collapsed')

                //console.log('collapse');
                cnt.style.maxHeight = '0px';

                // wait according to CSS timings to apply open attribute
                setTimeout(() => {
                    detail.open = false;
                }, duration * 1000);

            }
            else if (!expanded) {
                //console.log('expand');
                detail.classList.add('expanded')
                detail.classList.remove('collapsed')
                detail.open = true;

                cnt.style.maxHeight = `${h}px`;


                // tiny delay for firefox
                timeout = setTimeout(() => {
                }, duration * 100);

            }
        })
    })


    // calculate max-heights
    //updateDetailContentHeights();


    // update/recalculate heights on resize
    window.addEventListener('resize', (e) => {
        //updateDetailContentHeights();
    })

}



/**
 * style form
 */

styleInputs();
function styleInputs() {
    let inputs = document.querySelectorAll('input');

    inputs.forEach(el => {
        let type = el.type;
        switch (type) {
            case 'search':
                el.classList.add('icn-bg-search', 'icn-bg-rgh')
                break;

            case 'file':
                el.classList.add('icn-bg-file', 'icn-bg-lft')
                break;

        }
    });
}