## usage

init details options via
* JS options object


* classnames applied to first details
*  type attribute applied to
    * details
    * summary
    * content element


    * hash targets

    *open all


    ## Features
    * nested shortcode support!



// optional: define custom svg icon
summaryIcons['arrow-right'] = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>`;

let options = {
    target: 'body',
    icon: summaryIcons['arrow-right'],
    round: false,
    right: false
}

enhanceDetails(options);