if(typeof summaryIcons==='undefined'){
    summaryIcons = {
        'arrow-right': `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>`,
        'chevron': `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><path d="m9 18 6-6-6-6"/></svg>`
    }
}

// define default options
if(typeof detailsDefaults==='undefined'){
    detailsDefaults = {
        target: 'body',
        icon: '',
        round: false,
        right: false
    }
}


/**
* auto init by class name or data-attributes
*/

window.addEventListener('DOMContentLoaded', (e) => {

    let detailsToEnhance = document.querySelectorAll('.details-enhanced, [data-details]');

    if (detailsToEnhance.length) {
        enhanceDetails(detailsDefaults)
    }
})

function enhanceDetails(options = {}) {

    console.log(summaryIcons);
    // default options
    options = {
        ...{
            target: 'body',
            icon: '',
            round: false,
            right: false,
            plus: false
        },
        ...options
    }
    let { target, icon, round, right } = options;


    // selector el
    let selection = document.querySelector(target);

    // details wraps
    let details = selection.querySelectorAll('details');

    // current hash
    let hash = window.location.hash.replace('#', '');


    /**
     *  loop through details
     */
    details.forEach((detail) => {

        /**
         * skip if 
         * already processed
         */
        let processed = detail.querySelector('.details-content') ? true : false;
        if (processed) return false;

        let classModifiers = '', summarMarkerStyle = '', summarMarkerAlignment = '', summaryMarkerState = '';


        /**
        * all wrap detail's content: 
        * outer wrap for grid display context
        * and inner for hidden overflow
        */
        let detailsContent = document.createElement("div");
        detailsContent.classList.add("details-content");
        let detailsContentInner = document.createElement("div");
        detailsContentInner.classList.add("details-content-inner");

        let children = [...detail.children];
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            if (child.nodeName.toLowerCase() !== "summary") detailsContentInner.append(child);
        }
        detailsContent.append(detailsContentInner);
        detail.append(detailsContent);

        /**
        * add anchors
        * add expanded classes for
        * auto expand targeted details by hash/anchor id
        * expand current hash
        */

        let summary = detail.querySelector('summary');
        let anchorID = textToAnchorUrl(summary.textContent);

        // if ID is already reserved - add numeric suffix
        if (document.getElementById(anchorID)) {
            let len = document.querySelectorAll(`#${anchorID}`).length;
            anchorID = `${anchorID}-${len + 1}`;
        }
        summary.id = anchorID;

        if (hash === anchorID) detail.open = true;
        let expanded = detail.hasAttribute("open");

        // expand when "open" attribute is set
        if (expanded) {
            detail.classList.add("details-expanded");
            summary.classList.add("summary-expanded");
            summaryMarkerState = 'summary-marker-expanded';
            detailsContent.classList.add("details-content-expanded");
        } else {
            summaryMarkerState = 'summary-marker-collapsed';
        }


        /**
         * merge options from data attribute
         * css class applied to parent, details
         * or summary element
         */

        //get summary options - highest priority
        let summaryOptions = getDetailsCSSOptions(summary)
        let optionsData = {}

        if (Object.keys(summaryOptions).length) {
            optionsData = {
                ...optionsData,
                ...summaryOptions
            }

        } else {
            // get custom parent options
            let dataParent = detail.closest('[data-details]')
            optionsData = dataParent ? JSON.parse(dataParent.dataset.details) : {}

            // CSS option parent
            let cssInitEl = detail.closest('.details-enhanced');
            summaryOptions = getDetailsCSSOptions(cssInitEl)

            optionsData = {
                ...summaryOptions,
                ...optionsData
            }
        }


        //console.log(options);


        options = {
            ...options,
            ...summaryOptions,
            ...optionsData
        }

        //extract final options
        let { target, icon, round, right, plus } = options;



        /** 
         * add toggle icon
         * 1. add round background
         * 2. customize icon
         */

        // custom icon from icon object or svg markup in icon property
        let markerIconCustom = summaryIcons[icon] ? summaryIcons[icon] : (icon ? icon : '');

        // round background
        if (round) {
            classModifiers = ' summary-marker-round';
        }

        // plus/minus style
        if ((icon == '+' || icon == 'plus' || plus)) {
            markerIconCustom = '';
            summarMarkerStyle = 'summary-marker-plus';
        }

        // right or left alignment
        if (right) {
            summarMarkerAlignment = 'summary-marker-right';
        }

        // custom svg icon
        if (markerIconCustom) summarMarkerStyle = 'summary-marker-icon';

        let markerIcon = `<span class="summary-marker ${classModifiers} ${summarMarkerStyle} ${summarMarkerAlignment} ${summaryMarkerState}" aria-hidden="true" focusable="false">${markerIconCustom}</span>`;
        summary.insertAdjacentHTML("afterbegin", markerIcon);


        /**
         * events and 
         * animation
         */
        // toggle open state after transition end
        detailsContent.addEventListener("transitionend", (e) => {
            //console.log("Transition ended");
            if (!expanded) {
                detail.open = false;
            } else {
                detailsContent.classList.add("details-content-open");
            }
        });

        // toggle states on click
        summary.addEventListener("click", (e) => {
            e.preventDefault();
            let current = e.currentTarget;
            let detail = current.closest("details");
            let detailsContent = current.parentNode.querySelector('.details-content');
            let summaryMarker = current.querySelector('.summary-marker');

            // collapse
            if (expanded) {
                expanded = false;
                detail.classList.remove("details-expanded");
                detailsContent.classList.remove("details-content-expanded");
                detailsContent.classList.remove("details-content-open");

                summary.classList.remove("summary-expanded");
                summaryMarker.classList.replace("summary-marker-expanded", "summary-marker-collapsed");

            }
            // expand
            else if (!expanded) {
                expanded = true;
                detail.open = true;
                summary.classList.add("summary-expanded");
                summaryMarker.classList.replace("summary-marker-collapsed", "summary-marker-expanded");


                // tiny delay for expand transition
                timeout = setTimeout(() => {
                    detail.classList.add("details-expanded");
                    detailsContent.classList.add("details-content-expanded");
                }, 10);


            }
        });

        //add custom class names to prevent multiple processing
        detail.classList.add('details', 'details-enhanced');
        summary.classList.add("summary");

    })


    /**
     * helpers
     */
    function getDetailsCSSOptions(el) {
        let els = ['details', 'summary'];
        let options = {
            right: false,
            round: false,
            plus: false,
        }

        let hasOptions = false;

        let classList = [...el.classList];
        classList.forEach(cl => {
            let preArr = cl.split('-')
            let val = preArr[preArr.length - 1];

            if (els.includes(preArr[0])) {
                if (options.hasOwnProperty(val)) {
                    options[val] = true;
                    hasOptions = true;
                }
            }
        })
        return hasOptions ? options : {};
    }


    function replaceUmlauts(str) {
        const umlautMap = {
            'ä': 'ae',
            'ö': 'oe',
            'ü': 'ue',
            'Ä': 'Ae',
            'Ö': 'Oe',
            'Ü': 'Ue',
            'ß': 'ss'
        };

        return str.replace(/[äöüÄÖÜß]/g, function (match) {
            return umlautMap[match];
        });
    }

    // helper sanitize text for anchors
    function textToAnchorUrl(text) {
        text = replaceUmlauts(text);
        let anchorId = text.trim().toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')

        //prefix numeric anchor ids
        if (!isNaN(anchorId.substr(0, 1))) anchorId = 'a-' + anchorId;
        return anchorId;
    }
}


function closeAllDetails() {
    let details = document.querySelectorAll('details')
    details.forEach(detail => {
        detail.open = false;
        let detailContent = detail.querySelector('.details-content')
        detail.classList.remove('details-expanded');
        detailContent.classList.remove('details-content-expanded');
    })
}

function openAllDetails() {
    let details = document.querySelectorAll('details')
    details.forEach(detail => {
        detail.open = true;
        let detailContent = detail.querySelector('.details-content')
        detail.classList.add('details-expanded');
        detailContent.classList.add('details-content-expanded');
    })
}


/**
 * convert to details wrapped in content class
 * "details-content-init"
 */
function content2Details() {
    let detailsCnt = document.querySelectorAll('.details-content-init');
    detailsCnt.forEach(cnt => {
        let summaryPrev = cnt.previousElementSibling;
        let details = document.createElement('details');
        details.classList.add('details-enhanced');
        details.open = cnt.hasAttribute('open') || cnt.classList.contains('details-expanded');

        // get options
        let dataAtt = cnt.getAttribute('data-details');
        if (dataAtt) details.setAttribute('data-details', dataAtt);
        let summary = document.createElement('summary');

        details.append(summary, cnt);
        summaryPrev.parentNode.insertBefore(details, summaryPrev);
        summary.classList.add('summary');
        summary.append(summaryPrev)

    })
}
