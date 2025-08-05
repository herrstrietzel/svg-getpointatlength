import { detectAccuracy, roundPathData } from './rounding.js';
/*
import { pathDataCubicToArc } from './pathData_convert.js';
import { reorderPathData } from './pathData_reorder.js';
import { simplifyBezierSequence } from './simplify_bezier.js';
import { renderPoint } from './visualize.js';
import { splitSubpaths } from './split_pathdata.js';

*/

import { cleanUpPathData, optimizeStartingPoints } from './pathdata_cleanup.js';

//import { getAngle, bezierhasExtreme, getDistance  } from "./geometry";

import { pathDataArcsToCubics, pathDataQuadraticToCubic, pathDataToRelative, pathDataToAbsolute, pathDataToLonghands, pathDataToShorthands, pathDataToQuadratic, cubicToQuad, arcToBezier, pathDataToVerbose, convertArrayPathData, revertPathDataToArray, } from './pathData_convert.js';

import { simplifyPathData } from './simplify.js';
import { getPathArea, getRelativeAreaDiff } from './geometry_area.js';



/**
 * converts all commands to absolute
 * optional: convert shorthands; arcs to cubics 
 */

export function convertPathData(pathData,
    {
        normalize = null,
        optimize = 1,
        toAbsolute = true,
        toRelative = false,
        quadraticToCubic = false,
        lineToCubic = false,
        toLonghands = true,
        toShorthands = false,
        arcToCubic = false,
        arcParam = false,
        arcAccuracy = 1,

        optimizeOrder = false,
        reorderSub = false,

        // simplify options
        simplify = false,
        tolerance = 7.5,
        keepDetails = true,
        forceCubic = false,
        cubicToArc = true,
        // maybe ditched
        multipass = false,

        cubicToQuadratic = false,
        cubicToQuadraticPrecision = 0.1,
        decimals = -1,
        cubicToArcs = false

    } = {}

) {


    if (normalize === true) {
        toAbsolute = true
        toLonghands = true
        arcToCubic = true
        quadraticToCubic = true
        toShorthands = false
    }


    // clone normalized pathdata array to keep original
    pathData = JSON.parse(JSON.stringify(pathData))


    // convert to absolute
    if (toAbsolute) pathData = pathDataToAbsolute(pathData)


    // convert to longhands
    if (toLonghands) pathData = pathDataToLonghands(pathData, -1, false)


    //optimizeOrder=false
    //decimals=-1
    //toRelative= false;
    //toShorthands= false

    if (optimizeOrder) {

        // reorder paths by x/y
        //pathData = reorderPathData(pathData);
        // cleanup: remove zero length segments; move starting point
        //pathData = optimizeStartingPoints(pathData)
        //pathData = cleanUpPathData(pathData, false, false, true)
    }

    // simpify
    //simplify = true
    //multipass = true

    //console.log('simplify', simplify, optimizeOrder);
    if (simplify) {
        // original area
        let area0 = getPathArea(pathData);
        let areaDiff, areaDiff1, areaDiff2, area1, area2, pathDataSimpl_low;


        /*
        if (multipass) {
            // try with less details
            pathDataSimpl_low = JSON.parse(JSON.stringify(pathData));
            keepDetails = false;
            tolerance = tolerance * 1.25

            pathDataSimpl_low = simplifyPathData(pathDataSimpl_low, tolerance, keepDetails, multipass);
            area1 = getPathArea(pathDataSimpl_low);
            areaDiff1 = getRelativeAreaDiff(area0, area1)


            // higher accuracy
            keepDetails = true;
            tolerance = 7.5
            pathData = simplifyPathData(pathData, tolerance, keepDetails, multipass);
            area2 = getPathArea(pathData);
            areaDiff2 = getRelativeAreaDiff(area0, area2)

            //console.log(areaDiff2, areaDiff1, 'area0:', area0, area1, area2);

            // sloppier simplification is better
            if (areaDiff1 < areaDiff2) {
                pathData = pathDataSimpl_low
            }
        }
        */

        pathData = simplifyPathData(pathData, tolerance, keepDetails, forceCubic, cubicToArc, multipass);

    }


    // pre-round get suitable decimal accuracy
    pathData = detectAccuracy(pathData)

    // test if cubics can be converted to arcs
    if (cubicToArcs && !arcToCubic) pathData = pathDataCubicToArc(pathData)


    // quadratic to cubic 
    if (quadraticToCubic) pathData = pathDataQuadraticToCubic(pathData)


    // cubic to quadratic 
    if (cubicToQuadratic) pathData = pathDataToQuadratic(pathData, cubicToQuadraticPrecision)

    // arct to cubic
    if (arcToCubic) pathData = pathDataArcsToCubics(pathData)


    // override rounding for testing
    //decimals = 1

    // pre round
    if (decimals !== -1) {
        //console.log('preRound');
        pathData = roundPathData(pathData, decimals)
    }

    // to shorthands
    //if (toShorthands) pathData = pathDataToShorthands(pathData, decimals)
    if (toShorthands) pathData = pathDataToShorthands(pathData)


    // to Relative
    //console.log(toAbsolute, toRelative, toLonghands);
    //if (toRelative) pathData = pathDataToRelative(pathData, decimals)
    if (toRelative) pathData = pathDataToRelative(pathData)


    // round if not already rounded
    //let hasDecimal = pathData[0].hasOwnProperty('decimals')


    // post round
    if (decimals !== -1) {
        //console.log('post-round');
        pathData = roundPathData(pathData, decimals)
    }

    return pathData;
}


