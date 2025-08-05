
/**
 * split path data into chunks 
 * to detect subsequent cubic segments 
 * that could be  combined
 */

//import { splitSubpaths, shiftSvgStartingPoint } from "./convert_segments";
import { shiftSvgStartingPoint } from "./pathData_reorder.js";
import { splitSubpaths, getPathDataPlusChunks } from './pathData_split.js';

import { getAngle, bezierhasExtreme, getPathDataVertices } from "./geometry";
import { renderPoint, renderPath } from "./visualize";


//import { optimizeStartingPoints } from './cleanup.js';
//import { getPathDataVertices, getPointOnEllipse, pointAtT, checkLineIntersection, getDistance, interpolate } from './geometry.js';

import { getPolygonArea, getPathArea, getRelativeAreaDiff } from './geometry_area.js';
import { getPathDataBBox, getPolyBBox } from './geometry_bbox.js';

import { optimizeStartingPoints, cleanUpPathData } from './pathdata_cleanup.js';

import { pathDataArcsToCubics, pathDataQuadraticToCubic, quadratic2Cubic, pathDataToRelative, pathDataToAbsolute, pathDataToLonghands, pathDataToShorthands, pathDataToQuadratic, cubicToQuad, arcToBezier, pathDataToVerbose, convertArrayPathData, revertPathDataToArray, combineArcs, replaceCubicsByArcs } from './pathData_convert.js';

import {unitePolygon} from './simplify_polygon.js';

import { simplifyBezierSequence } from './simplify_bezier.js';
//import { simplifyBezierSequence } from './simplify_bezier_back16_working.js';
//import { simplifyBezierSequence } from './simplify_bezier_back17_working.js';



import { simplifyLinetoSequence } from './simplify_linetos.js';
import { analyzePathData } from "./pathData_anylyse.js";
import { scalePathData } from "./pathData_scale.js";
//import { analyzePathData } from "./pathData_anylyse_back1.js";



export function simplifyPathData(pathData, tolerance = 3, keepDetails = true, forceCubic = false, cubicToArc = true, multipass = false, debug = false) {

    ///devcomment

    //console.log('forceCubic simplifyPathData', forceCubic);

    // unoptimized area
    let area0 = getPathArea(pathData);

    // get bbox for adjustment scaling 
    let bb = getPathDataBBox(pathData);
    //console.log('bb', bb);

    let dimA = (bb.width + bb.height) / 2;
    let scale = dimA < 10 ? 100 / dimA : 1;

    // scale small paths
    if (scale != 1) pathData = scalePathData(pathData, scale, scale)

    // remove zero length commands and shift starting point
    let addExtremes = true;
    addExtremes = false;

    let removeFinalLineto = false
    let startToTop = true;
    //tolerance = 5;

    // show chunks
    //debug = true

    /**
     * optimize starting point
     * remove zero length segments
     */
    pathData = cleanUpPathData(pathData, addExtremes, removeFinalLineto, startToTop, debug)


    // get verbose pathdata properties
    let pathDataPlus = analyzePathData(pathData);

    // add chunks to path object
    let pathDataPlusChunks = getPathDataPlusChunks(pathDataPlus, debug);

    // create simplified pathData
    let pathDataSimple = [];

    // loop sup path
    for (let s = 0, l = pathDataPlusChunks.length; l && s < l; s++) {
        let sub = pathDataPlusChunks[s];
        let { chunks, dimA, area } = sub;

        let thresh = dimA * 0.1
        let len = chunks.length;
        let simplified;
        //console.log('sub', chunks);

        //forceCubic = true

        for (let i = 0; i < len; i++) {
            let chunk = chunks[i];
            let type = chunk[0].type;

            // try to convert cubic to quadratic

            //forceCubic = true
            
            if (!forceCubic && chunk.length === 1 && type === 'C') {
                simplified = simplifyBezierSequence(chunk);
                pathDataSimple.push(...simplified);
                //console.log('simplified cubic to quadratic', simplified);
                continue;
            }

            // nothing to combine
            if (chunk.length < 2) {
                pathDataSimple.push(...chunk);
                //console.log('simple',chunk );
                continue;
            }

            // simplify linetos
            if (type === 'L' && chunk.length > 1) {
                //simplified = simplifyLinetoSequence(chunk, thresh);
                //console.log('lineto');
                simplified = simplifyLinetoSequence(chunk);
                pathDataSimple.push(...simplified);
            }

            // Béziers
            else if (chunk.length > 1 && (type === 'C' || type === 'Q')) {
                //console.log('hasCubics');
                if (chunk.length) {

                    multipass = false
                    //multipass = true

                    let directionChange = chunk[0].directionChange;
                    //directionChange = false

                    /**
                     * prevent too aggressive simplification 
                     * e.g for quadratic glyphs
                     * by splitting large chunks in two
                     */
                    //keepDetails = false

                    //(directionChange && chunk.length > 4) ||  (!directionChange && chunk.length > 4) 
                    if (keepDetails && (chunk.length > 4) && !multipass) {
                        let split = Math.ceil((chunk.length - 1) / 2)
                        let chunk1 = chunk.slice(0, split)
                        let chunk2 = chunk.slice(split)
                        //console.log('chunk:', chunk);
                        //renderPoint(svg1,chunk[0].p0, 'magenta' )

                        //console.log('forceCubic keepDetails', forceCubic);
                        let simplified1 = simplifyBezierSequence(chunk1, tolerance, keepDetails, forceCubic);
                        let simplified2 = simplifyBezierSequence(chunk2, tolerance, keepDetails, forceCubic);

                        pathDataSimple.push(...simplified1, ...simplified2);
                    }

                    else {
                        simplified = simplifyBezierSequence(chunk, tolerance, keepDetails, forceCubic);
                        pathDataSimple.push(...simplified);
                    }
                }
            }

            // No match, keep original commands
            else {
                //chunk.forEach(com => pathDataSimple.push({ type: com.type, values: com.values }));
                pathDataSimple.push(...chunk);
            }
        }
    }


    /**
     * try to replace cubics 
     * to arcs
     */
    //cubicToArc = false;
    if (cubicToArc) {
        //console.log();
        pathDataSimple = replaceCubicsByArcs(pathDataSimple, tolerance * 0.5);

        // combine adjacent arcs
        pathDataSimple = combineArcs(pathDataSimple);

        console.log('arcs', pathDataSimple);
    }


    // rescale small paths
    if (scale != 1) pathDataSimple = scalePathData(pathDataSimple, 1 / scale, 1 / scale)


    /**
     * final area check
     * fallback to original if difference is too large
     */
    /*
    let areaS = getPathArea(pathDataSimple);
    let areaDiff = getRelativeAreaDiff(area0, areaS)

    if (areaDiff > tolerance) {
        //pathDataSimple = pathData;
        //console.log('take original', pathDataSimple);
    }
        */


    /**
     * final optimization
     * simplify adjacent linetos
     * optimize start points
     * we done it before 
     * but we need to apply this again to 
     * avoid unnecessary close linetos
     */

    // prefer first lineto to allow implicit closing linetos by "Z"
    removeFinalLineto = true;
    startToTop = false;
    addExtremes = false;
    debug = false;

    pathDataSimple = cleanUpPathData(pathDataSimple, addExtremes, removeFinalLineto, startToTop, debug)
    console.log('pathDataSimple post', pathDataSimple);

    return pathDataSimple;
}
















