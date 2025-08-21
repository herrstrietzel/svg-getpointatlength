window.addEventListener('DOMContentLoaded', e => {
    // custom svg icon
    summaryIcons = {
        'arrow-right': `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>`,
        'arrow-left': ``,
    }

    let options = {
        target: 'main',
        //icon: summaryIcons['arrow-right'],
        round: false,
        right: false
    }

    enhanceDetails(options);

})