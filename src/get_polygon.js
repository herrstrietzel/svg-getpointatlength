
import { pointAtT, svgArcToCenterParam, getAngle, checkLineIntersection, normalizeAngle, toParametricAngle, toNonParametricAngle, getPathDataVertices } from "./geometry";
import { getSubPathBBoxes, checkBBoxIntersections } from "./geometry_bbox";
import { getPolygonArea, getBezierArea, getEllipseArea, getEllipseArea_param } from "./geometry_area";
import { renderPoint } from './visualize.js';
import { splitSubpaths } from './pathData_split';
import { deg2rad } from "./constants";
import { getAreaData } from './get_Area.js';
import { checkClosePath } from './pathData_analyze.js';


export function getPolygonFromLookup(lookup, {
    /**
     * prevents corner cutting by 
     * adjusting split lengths to 
     * fit into actual segment length
     */
    keepCorners = true,
    // don't add additional points for linetos
    keepLines = true,
    vertices = 16,
    threshold = 1,
    decimals = 3

} = {}) {

    /*
    let opts = {
        keepCorners, threshold, decimals, vertices, adaptive
    }

    console.log('poly options', opts);
    */


    /**
     * ensure area Data is addded
     * needed for adaptive accuracy
     */
    getAreaData(lookup);


    // basic data from lookup
    let { pathData, segments, totalLength } = lookup;
    let step = totalLength / vertices;
    //let lastLength = 0;


    /**
     * collect subpath data for 
     * compound paths e.g sub path starting indices
     * or if sub paths are closed or open
     */
    let subPathIndices = pathData
        .filter(com => com.type === 'M')
        .map(com => com.index);
    let subLen = subPathIndices.length
    let hasSubPaths = subLen > 1

    let polyArr = [[]];
    let s = 0;
    let nextSubInd = hasSubPaths ? subPathIndices[1] : Infinity;


    // check if paths are closed
    let closedPaths = [];
    let subPaths = [pathData];
    let done = false

    if (subLen) {
        subPaths = splitSubpaths(pathData)
    }

    // check if pathdata is already polygon
    let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
    let isPoly = /[acsqt]/gi.test(commands) ? false : true;


    subPaths.forEach((sub, i) => {
        // closed or open
        let isClosed = checkClosePath(sub)
        if (isClosed) closedPaths.push(i)

        if (keepCorners && isPoly) {

            let vertices = getPathDataVertices(sub, decimals)
            if (vertices.length) {
                // new sub path
                polyArr[i] = vertices;

                // polyArr[i] = vertices
                if (isClosed) {
                    // copy starting point to make it explicitely closed
                    polyArr[i].push(vertices[0])
                }
            }
        }
    })

    //console.log(polySubPaths, subLen);
    polyArr = polyArr.filter(Boolean)

    if (keepCorners && isPoly) {
        done = true
        console.log('done - only polys', polyArr);
    }




    /**
     * simple polygon - ignore segments
     * like brute force getPointAtLength
     * cuts corners!
     */
    if (!done && !keepCorners) {

        let subPoly = polyArr[s];
        for (let i = 0; i < vertices; i++) {
            let lenN = step * i
            let pt = lookup.getPointAtLength(lenN, false, true, decimals);
            let { x, y } = pt

            let { index } = pt;
            if (hasSubPaths && s < subLen - 1 && index > nextSubInd) {
                polyArr.push([]);
                s++
                nextSubInd = subPathIndices[s + 1]
            }

            // update current sub poly
            subPoly = polyArr[s];

            // add point
            subPoly.push({ x, y });
        }


        // add last point
        let segments = lookup.segments;
        let segmentLast = segments[segments.length - 1];
        let p = segmentLast.points[segmentLast.points.length - 1];
        subPoly = polyArr[s];
        subPoly.push(p);

        //console.log('polyArr non-adaptive', polyArr);


    }

    //console.log('polyArr', polyArr);

    if (!done && keepCorners) {

        //console.log('adaptive');
        let subPoly = polyArr[0];
        let lastLength = 0


        for (let i = 0, l = pathData.length; i < l; i++) {

            let com = pathData[i];
            let { type, values, index } = com;
            //console.log('index', index);

            //new subpath
            if (type === 'M') {
                if (i > 0 && s < subLen - 1) {
                    s++
                    polyArr.push([])
                    subPoly = polyArr[s];
                }
                //console.log('new sub', polyArr, s);
                continue;
            }

            // sync with segment indices
            let indexCom = com.hasOwnProperty('index') ? index : i;
            let segment = segments.find(seg => seg.index === indexCom) || null

            if (segment) {

                subPoly = polyArr[s];
                let { total, points } = segment;

                // first point
                let M = points[0];

                // last point
                let p = points[points.length - 1];

                subPoly.push(M);

                // adjust step length
                let segSplits = Math.ceil(total / step);
                let stepA = (total / segSplits);

                //console.log('segment', segment,  'step', step, 'segSplits', segSplits, 'stepA', stepA);

                if ( !keepLines || type !== 'L' ) {

                    let len = 0;
                    for (let i = 1; i < segSplits; i++) {
                        len = lastLength + stepA * i;
                        let pt = lookup.getPointAtLength(len, false, true, decimals);
    
                        // drop additional info
                        pt = { x: pt.x, y: pt.y }
                        subPoly.push(pt);
                    }
                }

                lastLength += total;

                // add last point
                if (i === l - 1) {
                    subPoly.push(p);
                }
            }
        }

        console.log(polyArr, s);

    }


    /**
     * create output data
     * path data
     * polygon point array
     * point string for SVG polygons or polylines
     */
    let d = '';
    let points = '';
    let poly = polyArr.length === 1 ? polyArr[0] : polyArr;

    polyArr.forEach((sub, i) => {

        if (decimals > -1) sub = sub.map(pt => { return { x: +pt.x.toFixed(decimals), y: +pt.y.toFixed(decimals) } });

        let pointStr = `${sub.map(pt => `${pt.x} ${pt.y}`).join(' ')} `;

        points += pointStr
        d += `M ${pointStr}`
        if (closedPaths.includes(i)) d += 'Z '
    })

    let outputData = { poly, d, points }
    console.log('outputData', outputData);
    return outputData



}





export function getPolygonFromLookup0(lookup, {
    max = 16,
    retainPoly = true,
    threshold = 1

} = {}) {

    let poly = [];
    let pathDataPoly = []

    let { pathData, segments } = lookup;

    // split sub paths for compound paths
    let subPaths = splitSubpaths(pathData);

    //console.log('subPaths', subPaths);

    subPaths.forEach((pathData, s) => {
        //console.log('pathData', pathData);

        let pathPoly = getPathDataVertices(pathData);

        for (let i = 0, l = pathData.length; i < l; i++) {
            let com = pathData[i];
            let { type, values } = com;
            let p0, p;


            // sync with segment indices
            let index = com.hasOwnProperty('index') ? com.index : i;
            let segment = segments.find(seg => seg.index === index) || null

            // M commands
            if (!segment) {
                p = { x: values[0], y: values[1] }
                poly.push(p)
                //console.log('so seg', com);
                continue
            }

            let { segIndex } = segment;

            //console.log('segment', segment);

        }


    })

    return poly;
}
