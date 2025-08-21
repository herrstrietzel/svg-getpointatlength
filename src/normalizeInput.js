import { isClosedPolygon } from './geometry_bbox.js'
import { getPathDataFromEl } from './pathData_parse_els.js';

import { normalizePathData, parsePathDataString, parsePathDataNormalized, stringifyPathData } from './pathData_parse.js';


/**
 * normalize input
 * path data string
 * path data array
 * native getPathData object
 */
export function normalizePathInput(d, { arcToCubic = false, arcAccuracy = 4, quadraticToCubic = false } = {}, validate=false) {

    let report = {isValid:false, dummyPath: `M40 10h20v50h-20zm0 60h20v20h-20z`}

    const cleanSvg = (svgString) => {
        return svgString
            // Remove XML prologues like <?xml ... ?>
            .replace(/<\?xml[\s\S]*?\?>/gi, "")
            // Remove DOCTYPE declarations
            .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
            // Remove comments <!-- ... -->
            .replace(/<!--[\s\S]*?-->/g, "")
            // Trim extra whitespace
            .trim();
    }


    // no input
    if (!d) return;

    // check type: string, array or element
    let type = Array.isArray(d) && d.length ? 'array' : (d ? typeof d : null);


    /**
    * if cached JSON
    */
    if (d && type === 'string') {

        let isSVGMarkup = d.includes('<svg') && d.includes('</svg');
        let isLengthObject = d.includes('totalLength') && d.includes('segments');
        let isPointObject = !isLengthObject ? d.includes('{') && d.includes('"x"') && d.includes('"y"') : false;

        if (isSVGMarkup) {
            d = cleanSvg(d);
            //console.log('clean', d);
        }

        if (!isSVGMarkup && (isLengthObject || isPointObject)) {
            try {
                let obj = JSON.parse(d);
                if (isLengthObject) {
                    d = obj.pathData;
                }
                else if (isPointObject) {
                    d = obj;
                    //console.log('point array', d);
                }
                type = 'array';

            } catch {
                throw Error("No valid JSON");
            }
        }

    }


    // new path data
    let pathData = [];

    // conversions
    let options = { arcToCubic, arcAccuracy, quadraticToCubic };
    let needNormalization = true;


    // is SVG parent or child element
    if (type === 'object' && d.nodeName) {

        let svgEls = ['path', 'polygon', 'polyline', 'line', 'circle', 'ellipse', 'rect'];

        // is parent SVG
        if (d.nodeName === 'svg') {
            let els = d.querySelectorAll(`${svgEls.join(', ')}`)
            els.forEach(el => {
                pathData.push(...getPathDataFromEl(el));
            })
        }

        // is SVG child element
        else if (d.closest('svg') && svgEls.includes(d.nodeName)) {
            type = 'element';
            pathData = getPathDataFromEl(d)

        }

        if (pathData.length) {
            d = pathData;
            type = 'array';
        } else {
            type === null
        }
    }

    // exit
    if (!type) return null;


    /**
     * convert native path data object
     * to decoupled object array
     * for better editability
     * Firefox has native support fr getPathData
     */
    const nativePathDataToArr = (pathData) => {
        let pathDataArr = []
        let lastType = 'M';
        pathData.forEach(com => {
            let { type, values } = com;

            // add explicit M subpath start when omitted
            if (lastType.toLocaleLowerCase() === 'z' && type.toLocaleLowerCase() !== 'm') {
                //console.log('omitted M subpath start');
                pathDataArr.push({ type: 'm', values: [0, 0] })
            }
            pathDataArr.push({ type: type, values: values })
            lastType = type;
        })
        return pathDataArr;
    }

    /**
     * group point pairs
     * and convert to pathData
     */
    const coordinatePairsToPathData = (d) => {
        let pathData = [{ type: 'M', values: [d[0], d[1]] }];
        for (let i = 3, l = d.length; i < l; i += 2) {
            let [x, y] = [d[i - 1], d[i]];
            pathData.push({ type: 'L', values: [x, y] });
        }
        return pathData
    }

    // poly string to point data array
    const coordinatePairsToPoly = (d) => {
        let poly = [{ x: d[0], y: d[1] }];
        for (let i = 3, l = d.length; i < l; i += 2) {
            let [x, y] = [d[i - 1], d[i]];
            poly.push({ x, y });
        }
        return poly
    }


    // is already path data array
    if (type === 'array') {

        let isPathData = d[0].type ? true : false;

        // 1. is pathdata array
        if (isPathData) {
            // is native pathdata object (Firefox supports getpathData() natively)
            let isNative = typeof d[0] === 'object' && typeof d[0].constructor !== 'object';
            if (isNative) {
                d = nativePathDataToArr(d);
            }

            pathData = d;

        } else {

            // multi poly point array
            let isMulti = Array.isArray(d[0])

            if (isMulti) {

                let isNestedPointArray = typeof d[0][0] === 'object' && d[0][0].x && !isNaN(d[0][0].x) ? true : false;
                let isNestedPairs = d[0][0].length === 2 && !isNaN(d[0][0][0]) ? true : false;

                if (isNestedPointArray || isNestedPairs) {
                    //console.log(d, d.length);
                    //console.log(isNestedPointArray, isNestedPairs);
                    for (let i = 0, l = d.length; i < l; i++) {
                        let subPath = d[i];
                        for (let j = 0, k = subPath.length; j < k; j++) {
                            let line = subPath[j];
                            let type = j === 0 ? 'M' : 'L';
                            let pts = isNestedPointArray ? [line.x, line.y] : [line[0], line[1]]
                            pathData.push({ type: type, values: pts })
                        }
                    }
                } else {


                    let isSinglePairArr = d[0].length === 2 && !isNaN(d[0][0]) ? true : false;
                    if (isSinglePairArr) {
                        pathData = [{ type: 'M', values: [d[0][0], d[0][1]] }];
                        for (let i = 1, l = d.length; i < l; i++) {
                            let pt = d[i];
                            pathData.push({ type: 'L', values: [pt[0], pt[1]] });
                        }
                    }
                }
            }

            // flat
            else {
                let isFlatArr = !isNaN(d[0]) ? true : false;
                let isPointObject = d[0].hasOwnProperty('x') && d[0].hasOwnProperty('y')

                if (isPointObject) {
                    //console.log('pts', d);
                    pathData = [{ type: 'M', values: [d[0].x, d[0].y] }];
                    for (let i = 1, l = d.length; i < l; i++) {
                        let pt = d[i];
                        pathData.push({ type: 'L', values: [pt.x, pt.y] });
                    }
                    let isclosed = isClosedPolygon(d)
                    //console.log('isclosed', isclosed, pts);
                    if (isclosed) pathData.push({ type: 'Z', values: [] });
                }

                else if (isFlatArr) {
                    pathData = coordinatePairsToPathData(d)
                }
            }
        }
    }

    // is string
    else {

        d = d.trim();
        let isSVG = d.startsWith('<svg');
        //console.log('parse SVG');

        /**
         * if svg parse
         * and combine elements pathData
         */
        if (isSVG) {
            //console.log('isSVG');
            let svg = new DOMParser().parseFromString(d, 'text/html').querySelector('svg');
            let allowed = ['path', 'polygon', 'polyline', 'line', 'rect', 'circle', 'ellipse'];
            let children = svg.querySelectorAll(`${allowed.join(', ')}`);

            for (let i = 0, l = children.length; i < l; i++) {
                let child = children[i];
                let isDef = child.closest('defs') || child.closest('symbol') || child.closest('pattern') || child.closest('mask') || child.closest('clipPath')

                // ignore defs, masks, clip-paths etc
                if (isDef) continue;

                // check hidden layers - commonly hidden via attribute by graphic apps
                let parentGroup = child.closest('g')
                if (parentGroup) {
                    let isHidden = (parentGroup.getAttribute('display') === 'none') || parentGroup.style.display === 'none' ? true : false;
                    if (isHidden) continue
                }

                let pathDataEl = getPathDataFromEl(child);
                pathData.push(...pathDataEl);

            }

        }

        // regular d pathdata string - parse and normalize
        else {
            let isPathDataString = d.startsWith('M') || d.startsWith('m');
            let hasCommands = /[lcqamtsvhs]/gi.test(d);
            //console.log('isPathDataString', isPathDataString, hasCommands);

            if (isPathDataString) {
                pathData = parsePathDataNormalized(d, options);

                // no normalization needed when parsed from string
                needNormalization = false
            } else {
                let isPolyString = !isNaN(d.trim()[0]) && !hasCommands;
                //console.log('is poly string', d, isPolyString);

                if (isPolyString ) {

                    try {

                        d = d.split(/,| /).map(Number);
                        pathData = coordinatePairsToPathData(d)

                        let pts = coordinatePairsToPoly(d)
                        let isclosed = isClosedPolygon(pts)
                        //console.log('isclosed', isclosed, pts);
                        if (isclosed) pathData.push({ type: 'Z', values: [] });
                        needNormalization = false
                    } catch {
                        console.warn('not a valid poly string');
                    }
                } 

            }
        }
    }

    //console.log('pathData', pathData);
    if(!pathData.length){
        console.warn('No valid input  - could not create lookup');
        if(validate){
            pathData =  parsePathDataNormalized(report.dummyPath);
            return report
        }
        return [];
    }

    // is valid return result
    if(validate){
        report.isValid=true;
        //console.log('is valid', report);
        return report
    }

    if (needNormalization) pathData = normalizePathData(pathData, options);


    return pathData;

}