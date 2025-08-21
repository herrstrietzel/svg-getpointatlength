/**
 * fetch font list
 */

async function fetchFontList() {
    btnGenerate.disabled = true;

    let apiKey = inputApiKey.value;
    let cacheJson = `json/gfontList_vf_ttf.json`;
    //cacheJson = `json/gfontList_ttf.json`;

    //get cache or fresh list from API
    let fontListUrl = apiKey ?
        `https://www.googleapis.com/webfonts/v1/webfonts?capability=VF&capability=CAPABILITY_UNSPECIFIED&sort=alpha&key=${apiKey}` :
        cacheJson;


    let res = await fetch(fontListUrl);
    if (!res.ok) {
        //console.log('API key is not valid - we take the cache!');
        spanApiValidity.textContent = 'API key is not valid - we take the cache! Cached font list may not be up-to-date! ';
        spanApiValidity.className = 'invalid';

        res = await fetch(cacheJson);
    } else {
        //console.log('API key is valid');
        if (apiKey)
            spanApiValidity.textContent = 'API key is valid! ';
        spanApiValidity.className = 'valid';
    }

    btnGenerate.disabled = false;

    let fontList = await (await (res.json())).items;
    return fontList;
}