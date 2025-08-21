export {abs, acos, asin, atan, atan2, ceil, cos, exp, floor, hypot,
    log, max, min, pow, random, round, sin, sqrt, tan, PI} from './constants';


// length and lookup
import { PathLengthObject, getPathLookup, getPathLengthLookup, getPathLength } from './get_pathData_length.js';

import {stringifyPathData } from './pathData_parse.js';



// points and segments
import {getPointAtLength} from './get_point_at_length.js';
import {getSegmentAtLength_lite} from './get_SegmentAtLength.js'
import { normalizePathInput } from './normalizeInput.js';
import { getPathDataFromEl } from './pathData_parse_els.js';


SVGGeometryElement.prototype.getPathLookup = function (precision = 'medium', onlyLength = false, getTangent = true){
    return getPathLengthLookup(this,precision, onlyLength, getTangent )
}

SVGGeometryElement.prototype.getPathLengthLookup = function (precision = 'medium', onlyLength = false, getTangent = true){
    return getPathLengthLookup(this,precision, onlyLength, getTangent )
}


//pathLengthLookup
PathLengthObject.prototype.getPointAtLength = function (length = 0, getTangent = false, getSegment = false, decimals=-1) {
    return getPointAtLength(this, length, getTangent, getSegment, decimals);
}

PathLengthObject.prototype.getSegmentAtLength = function (length = 0) {
    return getSegmentAtLength_lite(this, length);
}


export { getPathLengthLookup as getPathLengthLookup };
export { getPathLookup as getPathLookup };
export { getPathLength as getPathLength };

export { normalizePathInput as normalizePathInput };
export { getPathDataFromEl as getPathDataFromEl };
export {stringifyPathData as stringifyPathData};


/*
export { parsePathDataString as parsePathDataString };
export { normalizePathData as normalizePathData };
export { parsePathDataNormalized as parsePathDataNormalized };
export {getPolygonFromLookup as  getPolygonFromLookup};
//export {Canvas2SVG as Canvas2SVG};
export {Path2D_svg as Path2D_svg};
*/

// Browser global
if (typeof window !== 'undefined') {
    window.getPathLengthLookup = getPathLengthLookup;
    window.getPathLookup = getPathLookup;
    window.getPathLength = getPathLength;
    window.normalizePathInput = normalizePathInput;
    window.getPathDataFromEl = getPathDataFromEl;
    window.stringifyPathData = stringifyPathData;



    /*
    window.parsePathDataString = parsePathDataString;
    window.parsePathDataNormalized = parsePathDataNormalized;
    window.normalizePathData = normalizePathData;
    window.stringifyPathData = stringifyPathData;
    window.getPolygonFromLookup = getPolygonFromLookup;
    //window.Canvas2SVG = Canvas2SVG;
    window.Path2D_svg = Path2D_svg;
    //window.getArea = getArea;
    */
}


