//import { checkFlatnessByPolygonArea, svgArcToCenterParam, getAngle, getLegendreGaussValues, toParametricAngle, getEllipseLengthLG, pointAtT, getLength, getPointOnEllipse, getTangentAngle, rotatePoint, normalizeAngle, getArcExtemes_fromParametrized, getBezierExtremes } from './geometry';


import { getSegmentExtremes} from './get_BBox.js';
import { getAreaData } from './get_Area.js';
import {getPointAtLength} from './get_point_at_length.js';
//import { normalizePathData, parse, parsePathDataNormalized, stringifyPathData } from './pathData_parse.js';
import { stringifyPathData } from './pathData_parse.js';


export function getSegmentAtLength( lookup, length = 0, getBBox = true, getArea=true, decimals=-1) {

    if (getBBox) {
        // add bbox data if not present
        getSegmentExtremes(lookup);
    }

    if(getArea){
        getAreaData(lookup);
    }

    let segments = lookup.segments;
    let segment = getPointAtLength(lookup, length, true, true, decimals);
    let { com, t, index, segIndex, angle, x, y } = segment
    let M =  { type: "M", values: [com.p0.x, com.p0.y] };


    // convert closepath to explicit lineto
    if (com.type.toLowerCase() === 'z') {
        //let { points } = segments[segments.length - 1];
        let { points } = segments[segIndex];
        let p = points[points.length - 1];
        com = { type: "L", values: [p.x, p.y] }
        //index++
    }

    // get self contained path data
    let pathData = [
        M,
        com
    ];

    let d = stringifyPathData(pathData);

    let res = {
        angle,
        com,
        index,

        pathData,
        d,
        t,
        x,
        y
    };

    if (getBBox) {
        //res.bbox = segments[index - 1]?.bbox;
        //res.bbox = segments[index - 1]?.bbox;
        res.bbox = segments[segIndex]?.bbox;
        if(!segments[segIndex]){
            console.log('no bb', segIndex);
        }
    }

    if(getArea){
        //console.log('segments[index - 1]', segments[index - 1]);
        //res.area = segments[index - 1]?.area || 0;
        res.area = segments[segIndex]?.area || 0;
    }

    //console.log('res', res);
    return res
}



export function getSegmentAtLength_lite( lookup, length = 0, decimals=-1) {

    let segments = lookup.segments;
    let segment = getPointAtLength(lookup, length, true, true, decimals);
    let { com, t, index, segIndex, angle, x, y } = segment
    let M =  { type: "M", values: [com.p0.x, com.p0.y] };


    // convert closepath to explicit lineto
    if (com.type.toLowerCase() === 'z') {
        //let { points } = segments[segments.length - 1];
        let { points } = segments[segIndex];
        let p = points[points.length - 1];
        com = { type: "L", values: [p.x, p.y] }
        //index++
    }

    // get self contained path data
    let pathData = [
        M,
        com
    ];

    let d = stringifyPathData(pathData);

    let res = {
        angle,
        com,
        index,

        pathData,
        d,
        t,
        x,
        y
    };

    //console.log('res', res);
    return res
}