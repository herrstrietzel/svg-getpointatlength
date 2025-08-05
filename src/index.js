import { lgVals } from './constants.js';
import { parse, parsePathDataNormalized} from './pathData_parse.js';
//import {  } from './geometry.js';
import { pathDataToAbsoluteOrRelative, pathDataToLonghands, cubicToArc } from './pathData_convert.js';
import { getPathDataFromEl } from './pathData_parse_els.js';
import { getPathLengthLookupFromPathData } from './pathData_length.js';
import { PathLengthObject } from './point_at_length.js';
//import {getPathDataFromEl} from './pathData_parse_els.js';



function getPathLengthLookup_core(d, precision = 'medium', onlyLength = false, getTangent = true) {

    
    // exit
    if (!d) throw Error("No path data defined");

    /*
    let t0 = performance.now()
    let t1 = performance.now() - t0
    console.log('lengthLookup', t1);
    */

    //let pathData = normalizePathInput(d);
    let pathData = parsePathDataNormalized(d);
    //let pathData = parsePathDataNormalized_old(d);

    // exit
    if (!pathData) throw Error("No valid path data to parse");


    /**
     * create lookup
     * object
     */
    let lengthLookup = getPathLengthLookupFromPathData(pathData, precision, onlyLength, getTangent)


    if (onlyLength) {
        return lengthLookup.pathLength;
    } else {
        return new PathLengthObject(lengthLookup.totalLength, lengthLookup.segments, pathData);
    }
}

export function getPathLengthFromD(d, precision = 'medium', onlyLength = true) {
    let pathData = parsePathDataNormalized(d);
    return getPathDataLength(pathData, precision, onlyLength);
}


// only total pathlength
export function getPathDataLength(pathData, precision = 'medium', onlyLength = true) {
    return getPathLengthLookupFromPathData(pathData, precision, onlyLength)
}

export function stringifyPathData(pathData) {
    return pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
}


/**
 * normalize input
 * path data string
 * path data array
 * native getPathData object
 */
export function normalizePathInput(d, stringify = false) {

    let type = Array.isArray(d) && d.length ? 'array' : (d.length ? typeof d : null);
    if (!type) return null;

    /**
     * convert native path data object
     * to decoupled object array
     */
    const nativePathDataToArr = (pathData) => {
        let pathDataArr = []
        pathData.forEach(com => {
            pathDataArr.push({ type: com.type, values: com.values })
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

    // new path data
    let pathData = [];

    // is already path data array
    if (type === 'array') {

        let isPathData = d[0].type ? true : false;

        // 1. is pathdata array
        if (isPathData) {
            // is native pathdata object 
            let isNative = typeof d[0] === 'object' && typeof d[0].constructor !== 'object';
            if (isNative) {
                d = nativePathDataToArr(d);
            }

            /**
             * normalize pathdata 
             * check if relative or shorthand commands are present
             */
            let commands = Array.from(new Set(d.map(com => com.type))).join('');
            let hasRelative = /[lcqamts]/gi.test(commands);
            let hasShorthands = /[vhst]/gi.test(commands);
            if (hasRelative) d = pathDataToAbsoluteOrRelative(d, false);
            if (hasShorthands) d = pathDataToLonghands(d);

            pathData = d;

        } else {

            // multi poly point array
            let isMulti = Array.isArray(d[0])
            //let dN = [];

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
                if (isFlatArr) {
                    pathData = coordinatePairsToPathData(d)
                }
            }
        }
    }

    // is string
    else {

        d = d.trim();
        let isSVG = d.startsWith('<svg');

        /**
         * if svg parse
         * and combine elements pathData
         */
        if (isSVG) {
            //console.log('isSVG');
            let svg = new DOMParser().parseFromString(d, 'text/html').querySelector('svg');
            let allowed = ['path', 'polygon', 'polyline', 'line', 'rect', 'circle', 'ellipse'];
            let children = [...svg.children].filter(node => { return allowed.includes(node.nodeName.toLowerCase()) })

            children.forEach(child => {
                let pathDataEl = getPathDataFromEl(child);
                pathData.push(...pathDataEl);
            })
        }

        // regular d pathdata string - parse and normalize
        else {
            let isPathDataString = d.startsWith('M') || d.startsWith('m');
            if (isPathDataString) {
                pathData = parsePathDataNormalized(d);
                //pathData = parsePathDataNormalized_old(d);
            } else {
                let isPolyString = !isNaN(d.trim()[0]);
                if (isPolyString) {
                    d = d.split(/,| /).map(Number);
                    pathData = coordinatePairsToPathData(d)
                }
            }
        }
    }


    return stringify ? pathData.length && stringifyPathData(pathData) : pathData;

}



export { getPathLengthLookup_core as getPathLengthLookup };
export { getPathDataFromEl as getPathDataFromEl };
export {parse as parse}  ;
//export {getPathLengthFromD as getPathLengthFromD};

// Browser global
if (typeof window !== 'undefined') {
    window.getPathLengthLookup = getPathLengthLookup_core;
    window.getPathLengthFromD = getPathLengthFromD;
    window.getPathDataFromEl = getPathDataFromEl;
    window.normalizePathInput = normalizePathInput;
    window.stringifyPathData = stringifyPathData;
    window.parse = parse;

}


