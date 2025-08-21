export {abs, acos, asin, atan, atan2, ceil, cos, exp, floor, hypot,
    log, max, min, pow, random, round, sin, sqrt, tan, PI} from './constants';

// parsing and normalization
import { normalizePathData, parsePathDataString, parsePathDataNormalized, stringifyPathData } from './pathData_parse.js';
import { normalizePathInput } from './normalizeInput.js';
import { getPathDataFromEl } from './pathData_parse_els.js';

// length and lookup
import { PathLengthObject, getPathLookup, getPathLengthLookup, getPathLength } from './get_pathData_length.js';



// points and segments
import {getPointAtLength} from './get_point_at_length.js';
import { getSegmentExtremes} from './get_BBox.js';
import { getAreaData } from './get_Area.js';
import {getSegmentAtLength} from './get_SegmentAtLength.js'
import {splitPathAtLength} from './splitPathAtLength.js'
import {getPolygonFromLookup} from './get_polygon.js';

// canvas Path2d extention
import {Path2D_svg} from './canvas_path2D_svg.js'

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


// get all segment extrema for bbox calculation
PathLengthObject.prototype.getExtremes = function () {
    return getSegmentExtremes(this);
}

// get bbox data
PathLengthObject.prototype.getBBox = function () {
    // add bbox data if not present
    if (this.hasOwnProperty('bbox')) {
        //console.log('has bbox!!!');
        return this.bbox
    }

    getSegmentExtremes(this);
    let bb = this.bbox;
    return bb;
}


// pathLengthLookup
PathLengthObject.prototype.getArea = function () {
    return getAreaData(this);
}

// get polygon
PathLengthObject.prototype.getPolygon = function ({
    keepCorners = true,
    keepLines = true,
    threshold = 1,
    vertices = 16,
    decimals = 3
} = {}) {
    return getPolygonFromLookup(this, {keepCorners, keepLines, threshold, vertices, decimals});
}



PathLengthObject.prototype.getSegmentAtLength = function (length = 0, getBBox = true, getArea=true, decimals=-1) {
    return getSegmentAtLength(this, length, getBBox, getArea, decimals);
}


PathLengthObject.prototype.splitPathAtLength = function (length = 0) {
    return splitPathAtLength(this, length)
}



export { getPathLengthLookup as getPathLengthLookup };
export { getPathLookup as getPathLookup };
export {stringifyPathData as stringifyPathData};
export { parsePathDataString as parsePathDataString };
export { getPathDataFromEl as getPathDataFromEl };
export { getPathLength as getPathLength };
export { normalizePathInput as normalizePathInput };
export { normalizePathData as normalizePathData };
export { parsePathDataNormalized as parsePathDataNormalized };
export {getPolygonFromLookup as  getPolygonFromLookup};
//export {Canvas2SVG as Canvas2SVG};
export {Path2D_svg as Path2D_svg};

// Browser global
if (typeof window !== 'undefined') {
    window.getPathLengthLookup = getPathLengthLookup;
    window.getPathLookup = getPathLookup;
    window.getPathLength = getPathLength;
    window.parsePathDataString = parsePathDataString;
    window.normalizePathInput = normalizePathInput;
    window.parsePathDataNormalized = parsePathDataNormalized;
    window.getPathDataFromEl = getPathDataFromEl;
    window.normalizePathData = normalizePathData;
    window.stringifyPathData = stringifyPathData;
    window.getPolygonFromLookup = getPolygonFromLookup;
    //window.Canvas2SVG = Canvas2SVG;
    window.Path2D_svg = Path2D_svg;
    //window.getArea = getArea;
}


