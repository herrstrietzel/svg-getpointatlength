// init poly simplify
import { getPathLengthLookup, getPathDataFromEl, normalizePathInput, stringifyPathData } from '../dist/svg-getpointatlength.esm.js';

//import{ simplifyRC} from '..dist/'


let localStorageName = 'settings_pointatlength';
let settingsChangeEventName = 'settingsChange';
let settingsChangeEvent = new Event(settingsChangeEventName);
let inputPathEl;

let settings

(async () => {

    /**
     * build UI
     * input and output options
     */
    let settingsCache = getSettingsCache(localStorageName);
    let hasSettings = Object.keys(settingsCache).length;

    settings = hasSettings ? settingsCache : {};
    //console.log('settings from cache', settings);

    // left group: simplification settings
    await generateFilterInputs(fieldsInput, settings);
    appendInputs(fieldsInput, [], optionsWrpInput, localStorageName);

    // right group: output settings
    await generateFilterInputs(fieldsOutput, settings);
    appendInputs(fieldsOutput, [], optionsWrpOutput, localStorageName);

    //get all settings from inputs
    settings = !hasSettings ? getSettingsFromInputs() : settings;
    //settings = getSettingsFromInputs();

    // init settings cache
    cacheSettings(settings, settingsChangeEventName, localStorageName)
    //console.log('getSettingsFromInputs', hasSettings, settings);

    // add EventListeners
    bindInputs('.input', settings, settingsChangeEvent);


    /**
     * load samples
     */

    // load examples     
    let selectSamples = document.querySelector('[name=selectSamples]')
    inputPathEl = document.querySelector('[name=inputPath]')

    let optIndex = 0
    for (let g in samples_grouped) {
        let name = g;
        let items = samples_grouped[g];

        //new group 
        let optgroup = document.createElement('optgroup');
        optgroup.label = name;

        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let key = Object.keys(item)[0];
            let value = cleanInput(item[key]);
            //console.log(key, value);
            let option = new Option(key, value)
            optgroup.append(option);
            // add index
            item.index = optIndex
            optIndex++
        }

        selectSamples.append(optgroup);

    }
    //console.log(samples_grouped);

    let ind1 = 0;
    let first = selectSamples.options[ind1];
    first.selected = true;

    let inputVal = settings.inputPath ? settings.inputPath : first.value;

    // sync with cache
    if(settings.inputPath){
        setSelectValue(selectSamples, inputVal)
    }

    // sanitize
    inputPathEl.value = cleanInput(inputVal);



    // init
    update(settings)


    document.addEventListener(settingsChangeEventName, () => {
        update(settings)
    });






})();






function update(settings) {


    let { inputPath, inputLength, quadraticToCubic, arcToCubic, quality, showFill, } = settings;
    let conversions = {
        arcToCubic,
        quadraticToCubic
    }


    // validate before rendering
    let validationReport =  normalizePathInput(inputPath, {}, true)
    //console.log('validObj', validationReport);
    let {isValid, dummyPath} = validationReport
    if(!isValid){
        //console.warn('!!!inputPath', inputPath, isValid);
        inputPath = dummyPath
        settings.inputPath = dummyPath;
        inputPathEl.value = dummyPath;
    }


    //let lookup = getPathLengthLookup(inputPath, quality, false, true, conversions)
    let lookup = getPathLookup(inputPath, quality, false, true, conversions)
    //console.log('lookup', lookup);
    //console.log('lookup', JSON.stringify(lookup.pathData, null, ' '));


    /**
     * render polygon
     */

    let pathPoly = document.getElementById('pathPoly')
    let options = {
        keepCorners: true,
        keepLines:true,
        threshold: 1,
        vertices: 24,
        decimals: 9,
    }

    /*
    let t0= performance.now()
    //let polyData = getPolygonFromLookup(lookup, options)
    let polyData = lookup.getPolygon(options)
    let {points, poly} = polyData;
    let t1= performance.now()-t0;
    console.log('polygon conversion', t1);
    console.log('polyData', polyData);
    pathPoly.setAttribute('d', polyData.d)
    */


    let { totalLength, pathData } = lookup;


    // current sample
    let selectSamples = document.querySelector('[name=selectSamples]');
    let ideal = '';
    let ind = selectSamples.selectedIndex;
    let selected = selectSamples.options[ind];

    let group = selected ? selectSamples.options[ind].parentElement.label : '';
    let sampleItem = samples_grouped[group]

    if (sampleItem) {
        sampleItem = sampleItem ? sampleItem.find(item => item.index + 1 === ind) : null;
        ideal = sampleItem && sampleItem.res ? sampleItem.res : ''
    }

    //console.log(pathData);
    //console.log('settings', settings, lookup, ind);

    // render path 
    let d0 = stringifyPathData(pathData);
    pathPreview.setAttribute('d', d0)




    //let lookup2 = getPathLengthLookup(pathPreview);
    //console.log('lookup2', lookup2);


    /**
     * point at length
     * and segment
     */
    let len = totalLength / 100 * inputLength
    let segment = lookup.getSegmentAtLength(len)
    let bb = lookup.bbox;
    let { x, y, angle, index, d, bbox, area, t } = segment;

    //console.log('!!!segment', segment);

    let bbSeg = bbox;

    // compare against native
    let pathTmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathTmp.setAttribute('d', d0);
    let totalLengthN = pathTmp.getTotalLength();
    let ptN = pathTmp.getPointAtLength(len)
    splitN.setAttribute('cx', ptN.x);
    splitN.setAttribute('cy', ptN.y);

    // render segment
    segAtPoint.setAttribute('d', d)


    //console.log('segment', x,y, segment);
    split.setAttribute('cx', x)
    split.setAttribute('cy', y)

    // update viewBox fit into viewport
    let padding = 10;
    adjustViewBox2(svgPreview, pathPreview, padding)


    /**
     * render tangent
     */


    //let tangetLen = totalLength * 0.025;
    let maxDim = Math.max(bb.width, bb.height)
    let tangetLen = maxDim * 0.05;
    let pT = getTangentPt({ x, y }, tangetLen, angle - Math.PI / 2)

    tangent.setAttribute('x1', x)
    tangent.setAttribute('y1', y)
    tangent.setAttribute('x2', pT.x)
    tangent.setAttribute('y2', pT.y)

    //tangentAngle.textContent = `radians: ${+angle.toFixed(3)}; degrees: ${+(angle * 180 / Math.PI).toFixed(3)}`


    /**
     * render bboxes
     */


    //console.log(bbSeg);
    bboxRect.setAttribute('x', bb.x)
    bboxRect.setAttribute('y', bb.y)
    bboxRect.setAttribute('width', bb.width)
    bboxRect.setAttribute('height', bb.height)

    bboxRectSegment.setAttribute('x', bbSeg.x)
    bboxRectSegment.setAttribute('y', bbSeg.y)
    bboxRectSegment.setAttribute('width', bbSeg.width)
    bboxRectSegment.setAttribute('height', bbSeg.height)






    /**
     * render report
     */

    let objLen = {
        'Current length': len,
        'Total length native': totalLengthN,
        'Total length lookup': totalLength,
        'Diff from native': Math.abs(totalLengthN - totalLength),
        'Ideal (if existent)': ideal,
        'Diff from ideal': ideal ? Math.abs(ideal - totalLength) : '?',
        'Area': lookup.area,
    }


    let reportHTML = '';
    for (let key in objLen) {
        let val = objLen[key];
        reportHTML += `<p><strong>${key}:</strong><br> ${val} </p>`
    }

    reportLength.innerHTML = reportHTML;

    let objSeg = {
        'area segment': area,
        'index': index,
        'pathdata': d,
        'area segment': area,
        'tangent angle': `${angle} rad <br> ${angle * 180 / Math.PI}°`,
    }


    let reportHTMLSeg = '';
    for (let key in objSeg) {
        let val = objSeg[key];
        reportHTMLSeg += `<p><strong>${key}:</strong><br> ${val} </p>`
    }


    reportSegment.innerHTML = reportHTMLSeg;

    if (settings.showBB) {
        svgPreview.classList.add('showBB')
    } else {
        svgPreview.classList.remove('showBB')
    }

    if (settings.showBBSeg) {
        svgPreview.classList.add('showBBSeg')
    } else {
        svgPreview.classList.remove('showBBSeg')
    }



    let reportHTMLBB = '';
    let objBB = {
        'bbox': `x: ${bb.x}<br> y: ${bb.y}<br> width: ${bb.width}<br> height: ${bb.height}`,
        'bbox segment': `x: ${bbSeg.x}<br> y: ${bbSeg.y}<br> width: ${bbSeg.width} <br>height: ${bbSeg.height}`

    }

    for (let key in objBB) {
        let val = objBB[key];
        reportHTMLBB += `<p><strong>${key}:</strong><br> ${val} </p>`
    }
    reportBB.innerHTML = reportHTMLBB;



}


function getTangentPt(pt, len = 10, angle) {
    let ptA = {
        x: pt.x + len * Math.cos(angle),
        y: pt.y + len * Math.sin(angle)
    }
    return ptA
}

