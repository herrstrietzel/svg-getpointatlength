
function enhanceAllDetails(options = {}) {

  // helper sanitize text for anchors
  const textToAnchorUrl = (text) => {
    let anchorId = text.trim().toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
    if (!isNaN(anchorId.substr(0, 1))) anchorId = 'a-';
    return anchorId;
  }


  // details wraps
  let details = document.querySelectorAll('details');
  let detailsWraps = [];

  //expand current hash
  let hash = window.location.hash.replace('#', '');


  for (let i = 0; i < details.length; i++) {
    let detail = details[i];
    let parent = detail.parentNode;
    if (!detailsWraps.includes(parent)) {
      detailsWraps.push(parent);
    }
  }

  detailsWraps.forEach(wrap => {
    let optionData = wrap.dataset.details ? JSON.parse(wrap.dataset.details) : {};
    let target = optionData.target ? optionData.target : '';
    let selected = target ? wrap.querySelector('details').closest(target) : wrap;

    // details wrap in selection
    if (selected) {

      // merge custom options with defaults
      let optionDefaults = {
        target: '',
        icon: '',
        round: false,
        right: false
      };

      let optionsMerged = {
        ...optionDefaults,
        ...optionData
      }

      let { target, icon, round, right } = optionsMerged;
      //console.log(selected, optionData);

      // process all details instances
      let details = selected.querySelectorAll("details");


      /**
       *  run through details
       */
      details.forEach((detail, d) => {

        console.log(target, icon, round, right );

        // quit if already processed    
        let processed = detail.classList.contains('details') ? true : false;
        if (processed) return false;

        //add custom class names to prevent multiple processing
        detail.classList.add('details', 'details-enhanced');

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
         * process summary elements
         * append icons
         * add classes: icon types etc.
         * add IDs for anchor navigation
         */
        // replace marker icons from list-style type property    
        let summary = detail.querySelector("summary");
        summary.classList.add("summary");
        let classModifiers, summarMarkerStyle, summarMarkerAlignment, summaryMarkerState;

        //add anchor IDs for anchor jumps
        let anchorID = textToAnchorUrl(summary.textContent);

        // if ID is already reserved - add numeric suffix
        if (document.getElementById(anchorID)) {
          let len = document.querySelectorAll(`#${anchorID}`).length;
          anchorID = `${anchorID}-${len + 1}`;
        }
        summary.id = anchorID;

        let markerIconCustom = summary.dataset.marker ? summary.dataset.marker : (icon ? icon : '');


        /**
        * add expanded classes for
        * default states as specified by 
        * "open" attribute
        */
        //auto expand targeted details by hash/anchor id
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
         * add toggle icon
         * 1. add round background
         * 2. customize icon
         */

        // round background
        if (round) {
          classModifiers = ' summary-marker-round';
        }

        // plus/minus style
        if (icon == '+') {
          markerIconCustom = '';
          summarMarkerStyle = 'summary-marker-plus';
        }

        // right or left alignment
        if (right) {
          summarMarkerAlignment = 'summary-marker-right';
        }

        // custom svg icon
        if (markerIconCustom) summarMarkerStyle = 'summary-marker-icon';


        console.log(classModifiers, summarMarkerStyle, summarMarkerAlignment, summaryMarkerState);


        let markerIcon = `<span class="summary-marker ${classModifiers} ${summarMarkerStyle} ${summarMarkerAlignment} ${summaryMarkerState}" aria-hidden="true" focusable="false">${markerIconCustom}</span>`;
        summary.insertAdjacentHTML("afterbegin", markerIcon);


        // inherit transition speed from CSS
        let style = window.getComputedStyle(detailsContent);
        let delay = parseFloat(style.transitionDelay);
        let duration = parseFloat(style.transitionDuration) + delay;

        // toggle events
        summary.addEventListener("click", (e) => {
          e.preventDefault();
          let current = e.currentTarget;
          let detail = current.closest("details");
          let detailsContent = current.parentNode.querySelector('.details-content');
          let summaryMarker = current.querySelector('.summary-marker');
          expanded = detail.hasAttribute("open");

          // collapse
          if (expanded) {
            detail.classList.remove("details-expanded");
            detailsContent.classList.remove("details-content-expanded");
            summary.classList.remove("summary-expanded");
            summaryMarker.classList.replace("summary-marker-expanded", "summary-marker-collapsed");

            // wait according to CSS timings to apply open attribute
            setTimeout(() => {
              detail.open = false;
            }, duration * 1000);
          }
          // expand
          else if (!expanded) {
            detail.open = true;
            summary.classList.add("summary-expanded");
            summaryMarker.classList.replace("summary-marker-collapsed", "summary-marker-expanded");

            // tiny delay for transition
            timeout = setTimeout(() => {
              detail.classList.add("details-expanded");
              detailsContent.classList.add("details-content-expanded");

            }, 10);
          }
        });

      });


    }
  })

  //console.log(detailsWrapsData);
  //console.log(detailsWraps);


}


function enhanceDetails(options = {}) {

  const textToAnchorUrl = (text) => {
    let anchorId = text.trim().toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
    if (!isNaN(anchorId.substr(0, 1))) anchorId = 'a-';
  }

  // merge custom options with defaults
  let optionsMerged = {
    ...{
      target: '',
      icon: '',
      round: false,
      right: false
    },
    ...options
  }


  let { target, icon, round, right } = optionsMerged;
  let targetEl = !target ? document.body : document.querySelector(target)

  // search for data attribute options
  let dataOptionsEl = targetEl.querySelector('details').closest('[data-details]');
  if (dataOptionsEl) {
    let dataOptions = JSON.parse(dataOptionsEl.dataset.details);
    optionsMerged = {
      ...optionsMerged,
      ...dataOptions
    };
    console.log(optionsMerged);
    ({ target, icon, round, right } = optionsMerged);
  }


  //expand current hash
  let hash = window.location.hash.replace('#', '');

  // quit if no target element or no details elements exist
  if (!targetEl || document.querySelectorAll('.details-enhanced').length) return false

  // process all details instances
  let details = targetEl.querySelectorAll("details");
  details.forEach((detail, i) => {

    // quit if already processed    
    let processed = detail.classList.contains('details') ? true : false;
    if (processed) return false;

    //add custom class names to prevent multiple processing
    detail.classList.add('details', 'details-enhanced');

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
     * process summary elements
     * append icons
     * add classes: icon types etc.
     * add IDs for anchor navigation
     */
    // replace marker icons from list-style type property    
    let summary = detail.querySelector("summary");
    summary.classList.add("summary");
    let classModifiers, summarMarkerStyle, summarMarkerAlignment, summaryMarkerState;

    //add anchor IDs for anchor jumps
    let anchorID = textToAnchorUrl(summary.textContent);

    // if ID is already reserved - add numeric suffix
    if (document.getElementById(anchorID)) {
      let len = document.querySelectorAll(`#${anchorID}`).length;
      anchorID = `${anchorID}-${len + 1}`;
    }
    summary.id = anchorID;

    let markerIconCustom = summary.dataset.marker ? summary.dataset.marker : (icon ? icon : '');


    /**
    * add expanded classes for
    * default states as specified by 
    * "open" attribute
    */
    //auto expand targeted details by hash/anchor id
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
     * add toggle icon
     * 1. add round background
     * 2. customize icon
     */

    // round background
    if (round) {
      classModifiers = ' summary-marker-round';
    }

    // plus/minus style
    if (icon == '+') {
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


    // inherit transition speed from CSS
    let style = window.getComputedStyle(detailsContent);
    let delay = parseFloat(style.transitionDelay);
    let duration = parseFloat(style.transitionDuration) + delay;

    // toggle events
    summary.addEventListener("click", (e) => {
      e.preventDefault();
      let current = e.currentTarget;
      let detail = current.closest("details");
      let detailsContent = current.parentNode.querySelector('.details-content');
      let summaryMarker = current.querySelector('.summary-marker');
      expanded = detail.hasAttribute("open");

      // collapse
      if (expanded) {
        detail.classList.remove("details-expanded");
        detailsContent.classList.remove("details-content-expanded");
        summary.classList.remove("summary-expanded");
        summaryMarker.classList.replace("summary-marker-expanded", "summary-marker-collapsed");

        // wait according to CSS timings to apply open attribute
        setTimeout(() => {
          detail.open = false;
        }, duration * 1000);
      }
      // expand
      else if (!expanded) {
        detail.open = true;
        summary.classList.add("summary-expanded");
        summaryMarker.classList.replace("summary-marker-collapsed", "summary-marker-expanded");

        // tiny delay for transition
        timeout = setTimeout(() => {
          detail.classList.add("details-expanded");
          detailsContent.classList.add("details-content-expanded");

        }, 10);
      }
    });

  });
}
