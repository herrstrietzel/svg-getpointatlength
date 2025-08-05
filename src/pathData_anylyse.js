import { splitSubpaths } from './pathData_split.js';
import { getAngle, bezierhasExtreme, getPathDataVertices, svgArcToCenterParam, getSquareDistance, commandIsFlat } from "./geometry";
import { getPolygonArea, getPathArea } from './geometry_area.js';
import { getPolyBBox } from './geometry_bbox.js';
import { renderPoint, renderPath } from "./visualize";



/**
 * analyze path data for
 * decimal detection
 * sub paths 
 * directions
 * crucial geometry properties
 */

export function analyzePathData(pathData = [], debug = true) {

    // clone
    pathData = JSON.parse(JSON.stringify(pathData));

    // split to sub paths
    let pathDataSubArr = splitSubpaths(pathData)

    // collect more verbose data
    let pathDataPlus = [];

    // log
    let simplyfy_debug_log = [];

    /**
     * analyze sub paths
     * add simplified bbox (based on on-path-points)
     * get area
     */
    pathDataSubArr.forEach(pathData => {

        let pathDataArea = getPathArea(pathData);
        let pathPoly = getPathDataVertices(pathData);
        let bb = getPolyBBox(pathPoly)
        let { left, right, top, bottom, width, height } = bb;

        // initial starting point coordinates
        let M0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
        let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
        let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
        let p;

        // init starting point data
        pathData[0].p0 = M;
        pathData[0].p = M;
        pathData[0].lineto = false;
        pathData[0].corner = false;
        pathData[0].extreme = false;
        pathData[0].directionChange = false;
        pathData[0].closePath = false;


        // add first M command
        let pathDataProps = [pathData[0]];
        let area0 = 0;
        let len = pathData.length;

        for (let c = 2; len && c <= len; c++) {

            let com = pathData[c - 1];
            let { type, values } = com;
            let valsL = values.slice(-2);

            /**
             * get command points for 
             * flatness checks:
             * this way we can skip certain tests
             */
            let commandPts = [p0];
            let isFlat = false;

            // init properties
            com.lineto = false;
            com.corner = false;
            com.extreme = false;
            com.directionChange = false;
            com.closePath = false;

            /**
             * define angle threshold for 
             * corner detection
             */
            let angleThreshold = 0.05
            p = valsL.length ? { x: valsL[0], y: valsL[1] } : M;


            // update M for Z starting points
            if (type === 'M') {
                M = p;
                p0 = p
                //p0 = p
            }
            else if (type.toLowerCase() === 'z') {
                //p0 = M;
                p = M;
            }

            // add on-path points
            com.p0 = p0;
            com.p = p;

            let cp1, cp2, cp1N, cp2N, pN, typeN, area1;

            /**
             * explicit and implicit linetos 
             * - introduced by Z
             */
            if (type === 'L') com.lineto = true;

            if (type === 'Z') {
                com.closePath = true;
                // if Z introduces an implicit lineto with a length
                if (M.x !== M0.x && M.y !== M0.y) {
                    com.lineto = true;
                }
            }

            // if bezier
            if (type === 'Q' || type === 'C') {
                cp1 = { x: values[0], y: values[1] }
                cp2 = type === 'C' ? { x: values[2], y: values[3] } : null;
                com.cp1 = cp1;
                if (cp2) com.cp2 = cp2;
            }

            /**
             * check command flatness
             * we leave it to the bezier simplifier
             * to convert flat beziers to linetos
             * otherwise we may strip rather flat starting segments
             * preventing a better simplification
             */

            if(values.length>2){
                if (type === 'Q' || type === 'C' ) commandPts.push(cp1);
                if (type === 'C') commandPts.push(cp2);
                commandPts.push(p);
    
                let commandFlatness = commandIsFlat(commandPts);
                isFlat = commandFlatness.flat;
                com.flat = isFlat;

                if(isFlat){
                    com.extreme = false;
                    /*
                    pathDataProps.push(com)
                    p0 = p;
                    continue;
                    */
                }
            }


            /**
             * is extreme relative to bounding box 
             * in case elements are rotated we can't rely on 90degree angles
             * so we interpret maximum x/y on-path points as well as extremes
             * but we ignore linetos to allow chunk compilation
             */
            if (!isFlat && type !== 'L' && (p.x === left || p.y === top || p.x === right || p.y === bottom)) {
                com.extreme = true;
            }


            // add to average
            //let squareDist = getSquareDistance(p0, p)
            //com.size = squareDist;

            let dimA = (width + height) / 2;
            com.dimA = dimA;
            //console.log('decimals', decimals, size);

            //next command
            let comN = pathData[c] ? pathData[c] : null;
            let comNValsL = comN ? comN.values.slice(-2) : null;
            typeN = comN ? comN.type : null;


            // get bezier control points
            if (comN) {
                pN = comN ? { x: comNValsL[0], y: comNValsL[1] } : null;

                if (comN.type === 'Q' || comN.type === 'C') {
                    cp1N = { x: comN.values[0], y: comN.values[1] }
                    cp2N = comN.type === 'C' ? { x: comN.values[2], y: comN.values[3] } : null;
                }
            }


            /**
             * Detect direction change points
             * this will prevent distortions when simplifying
             * e.g in the "spine" of an "S" glyph
             */
            area1 = getPolygonArea(commandPts)
            let signChange = (area0 < 0 && area1 > 0) || (area0 > 0 && area1 < 0) ? true : false;
            // update area
            area0 = area1

            if (signChange) {
                //renderPoint(svg1, p0, 'orange', '1%', '0.75')
                com.directionChange = true;
            }


            /**
             * check extremes or corners for adjacent curves by control point angles
             */
            if ((type === 'Q' || type === 'C') ) {

                if ((type === 'Q' && typeN === 'Q') || (type === 'C' && typeN === 'C')) {

                    // check extremes
                    let cpts = commandPts.slice(1);

                    let w = Math.abs(pN.x - p0.x)
                    let h = Math.abs(pN.y - p0.y)
                    let thresh = (w + h) / 2 * 0.1;
                    let pts1 = type === 'C' ? [p, cp1N, cp2N, pN] : [p, cp1N, pN];

                    let flatness2 = commandIsFlat(pts1, thresh)
                    let isFlat2 = flatness2.flat;

                    //console.log('isFlat2', isFlat2, isFlat);

                    /**
                     * if current and next cubic are flat
                     * we don't flag them as extremes to allow simplification
                     */
                    let hasExtremes =  (isFlat && isFlat2) ? false : (!com.extreme ? bezierhasExtreme(p0, cpts, angleThreshold) : true);

                    if (hasExtremes) {
                        com.extreme = true
                    }

                    // check corners
                    else {

                        let cpts1 = cp2 ? [cp2, p] : [cp1, p];
                        let cpts2 = cp2 ? [p, cp1N] : [p, cp1N];

                        let angCom1 = getAngle(...cpts1, true)
                        let angCom2 = getAngle(...cpts2, true)
                        let angDiff = Math.abs(angCom1 - angCom2) * 180 / Math.PI


                        let cpDist1 = getSquareDistance(...cpts1)
                        let cpDist2 = getSquareDistance(...cpts2)

                        let cornerThreshold = 10
                        let isCorner = angDiff > cornerThreshold && cpDist1 && cpDist2

                        if (isCorner) {
                            com.corner = true;
                        }
                    }
                }
            }



            let debug = false
            //debug = true
            if (debug) {
                if (com.signChange) {
                    renderPoint(svg1, p0, 'orange', '1.5%', '0.75')
                }
                if (com.extreme) {
                    renderPoint(svg1, p, 'cyan', '1%', '0.75')
                }
                if (com.corner) {
                    renderPoint(svg1, p, 'magenta')
                }
            }

            pathDataProps.push(com)
            p0 = p;

        }


        //decimalsAV = Array.from(decimalsAV)
        //decimalsAV = Math.ceil(decimalsAV.reduce((a, b) => a + b) / decimalsAV.length);
        //console.log('decimalsAV', decimalsAV);
        //pathDataProps[0].decimals = decimalsAV

        //decimalsAV = Math.floor(decimalsAV/decimalsAV.length);
        let dimA = (width + height) / 2
        pathDataPlus.push({ pathData: pathDataProps, bb: bb, area: pathDataArea, dimA: dimA })


        if (simplyfy_debug_log.length) {
            console.log(simplyfy_debug_log);
        }

    })



    return pathDataPlus

}
