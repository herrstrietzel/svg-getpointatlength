import { pathDataArcsToCubics, pathDataQuadraticToCubic, quadratic2Cubic, pathDataToRelative, pathDataToAbsolute, pathDataToLonghands, pathDataToShorthands, pathDataToQuadratic, cubicToQuad, arcToBezier, pathDataToVerbose, convertArrayPathData, revertPathDataToArray, cubicToArc } from './pathData_convert.js';


import { getAngle, bezierhasExtreme, getDistance, getSquareDistance, pointAtT, checkLineIntersection, interpolate, getPointOnEllipse, commandIsFlat, getPathDataVertices } from "./geometry";

import { getPathArea, getPolygonArea, getRelativeAreaDiff, getBezierAreaAccuracy } from "./geometry_area.js";

import { renderPoint } from './visualize.js';



/**
 * Function to simplify cubic Bézier sequences
 * thresh defines a threshold based on the 
 * segment size
 * tolerance describes a percentage based deviation 
 * comparing unoptimized against combined segment areas
 */
export function simplifyBezierSequence(chunk, tolerance = 7.5, keepDetails = true, forceCubic = false) {


    //console.log('forceCubic simplifyBezierSequence', forceCubic);
    //tolerance = 20

    // t value for control point extrapolation
    const t = 1.333;

    // collect simplified path data commands
    let simplified = [];
    let Clen = chunk.length;
    let { type, p0, cp1, cp2 = null, p, values } = chunk[0];

    // get original chunk area for error detection
    let pathDataChunk = [{ type: 'M', values: [p0.x, p0.y] }, ...chunk];

    // unoptimized area
    let area0 = getPathArea(pathDataChunk);

    let p0_1, cp1_1, cp2_1, p_1;
    let cp1_2, cp2_2, p_2;
    let areaDiff, cp1_cubic, cp2_cubic;

    let indexEnd = chunk.length - 1;
    let indexMid = chunk.length > 2 ? Math.ceil(chunk.length / 2) - 1 : 1

    // compare accuracy
    let accurate = false;
    let areaDiff1 = 10000
    let areaDiff2 = 10000
    let areaDiff3 = 10000
    let comAreaDiff1, comAreaDiff2, comAreaDiff3;
    let ptMid, cp1_cubic_1, cp2_cubic_1, cp1_cubic_2, cp2_cubic_2, cp1_cubic_3, cp2_cubic_3;
    let areaCptPoly

    let log = []
    let c_3_1 = 0, c_3_2 = 0, c_2_1 = 0, c_2_2 = 0;


    /**
     * try to replace single cubics 
     * with quadratic commands
     */

    //forceCubic = true;
    //if (area0 < 0.01) forceCubic = true;

    if (!forceCubic && Clen === 1 && type === 'C') {

        let thresh = area0 * 4;
        //check flatness
        let flatness = commandIsFlat([p0, cp1, cp2, p])
        areaCptPoly = flatness.area

        
        if (flatness.flat) {
            console.log('is flat cubic!');
            console.log(flatness, 'thresh');

            simplified = [{ type: 'L', values: [p.x, p.y] }];
            log.push('cubic to quadratic')
            return simplified
        }


        // quadratic controlpoint
        let cpQ = checkLineIntersection(p0, cp1, p, cp2, false);
        simplified = [chunk[0]];

        if (cpQ) {
            comAreaDiff1 = getBezierAreaAccuracy([p0, cpQ, p], area0, areaCptPoly, tolerance).areaDiff

            // can be converted to quadratic
            if (comAreaDiff1 < tolerance) {
                simplified = [{ type: 'Q', values: [cpQ.x, cpQ.y, p.x, p.y] }];
                log.push('cubic to quadratic')
            }
        }
        return simplified
    }


    if (Clen > 1) {


        //console.log(Clen, area0);

        /**
         * normalize quadratic 
         * to cubics
         */

        // convert quadratic to cubic

        if (type === 'Q') {
            chunk.forEach((com, i) => {
                let c1 = quadratic2Cubic(com.p0, com.values);

                //console.log('com Q', com, c1);
                //let dQ = `M ${com.p0.x} ${com.p0.y} Q ${com.values.join(' ')}`

                let cp1 = { x: c1.values[0], y: c1.values[1] };
                let cp2 = { x: c1.values[2], y: c1.values[3] };

                //chunk[i] = {type:'C', values:[cp1_1.x, cp1_1.y, cp2_1.x, cp2_1.y, com.values[2], com.values[3]]};
                chunk[i].type = 'C'
                chunk[i].cp1 = cp1;
                chunk[i].cp2 = cp2;
                chunk[i].values = [cp1.x, cp1.y, cp2.x, cp2.y, com.p.x, com.p.y];

                //let d = `M ${com.p0.x} ${com.p0.y} C ${[cp1.x, cp1.y, cp2.x, cp2.y, com.p.x, com.p.y].join(' ')}`
                //renderPoint(svg1, p, 'orange')
                //console.log('dQ', dQ+d);
            })

            type = 'C';
            //console.log('chunk Q', chunk);
        }


        p0_1 = chunk[1].p0;
        cp1_1 = chunk[1].cp1;
        cp2_1 = type === 'C' ? chunk[1].cp2 : null;
        p_1 = chunk[1].p;

        //get end points
        p_2 = chunk[indexEnd].p;
        cp1_2 = chunk[indexEnd].cp1;
        cp2_2 = type === 'C' ? chunk[indexEnd].cp2 : chunk[indexEnd].cp1;

        areaCptPoly = getPolygonArea([p0, cp1, cp2_1, p_2])
        //console.log('cp2_2',p0_1, p_1, cp2_2, cp1_2, p_2,  areaCptPoly);


        /**
         * check flatness of chunk
         * beziers might be linots
         */


        //console.log('forceCubic', forceCubic);

        //forceCubic= true
        if (!forceCubic) {

            //renderPoint(svg1, p, 'cyan' )

            let chunkPoints = chunk.map(com => { return [com.p0, com.cp1, com.cp2, com.p] }).flat()
            let { flat, ratio } = commandIsFlat(chunkPoints)
            //console.log('chunkPoints', chunkPoints, flat);

            /*
            if (flat) {
                let last = chunkPoints.slice(-1)[0]
                simplified.push({ type: 'L', values: [last.x, last.y] });
                //console.log('chunk flat', simplified, last);
                log.push('all commands are flat')
                return simplified
            }else{
            }
            */
        }


    }


    // 3 or more subsequent bezier segments
    if (Clen > 2) {

        /**
         * Cubics to Arcs:
         * educated guess - 
         * check if control points build a right angle
         */
        let { com, isArc, area } = cubicToArc(p0, cp1, cp2_2, p_2);
        areaDiff = getRelativeAreaDiff(area0, area)
        //console.log('flat', chunkPoints, flatness);
        //renderPoint(svg1, p, 'cyan')

        // arc approximations should be more precise - otherwise we prefer cubics
        if (isArc && areaDiff < tolerance * 0.75) {
            simplified = [com];
            //renderPoint(svg1, p, 'orange')
            log.push('cubic to arc')
            return simplified
        }


        /**
         * more than 2 segments
         * try to interpolate tangents from
         * mid control point tangents
         */

        // get mid segment and get tangent intersection
        let p_m = chunk[indexMid].p;
        //console.log('indexMid', indexMid, chunk.length);


        // get mit segments cps
        let cpMid_1 = type === 'C' ? chunk[indexMid].cp2 : chunk[indexMid].cp1;
        let cp1_Int = checkLineIntersection(p_m, cpMid_1, p0, cp1, false);


        if (cp1_Int) {
            let cp2_Int = checkLineIntersection(p_m, cpMid_1, p_2, cp2_2, false);
            cp1_cubic = cp1_Int;
            cp2_cubic = cp2_Int;

            //renderPoint(svg1, cpMid_1, 'orange')
            //renderPoint(svg1, cp1_cubic, 'magenta')
            //renderPoint(svg1, cp2_cubic, 'cyan')

            // extrapolate control points
            cp1_cubic_1 = pointAtT([p0, cp1_cubic], t);
            cp2_cubic_1 = pointAtT([p_2, cp2_cubic], t);

            // test accuracy
            comAreaDiff1 = getBezierAreaAccuracy([p0, cp1_cubic_1, cp2_cubic_1, p_2], area0, areaCptPoly, tolerance);
            accurate = comAreaDiff1.accurate;
            areaDiff1 = comAreaDiff1.areaDiff
            areaDiff = areaDiff1;

            //console.log('3.1: ', areaDiff1);

        }


        /**
         * 2nd try 
         * odd - calculate interpolated mid tangents
         */
        if (!accurate) {
            let controlPoints = type === 'C' ? [p0_1, cp1_1, cp2_1, p_1] : [p0_1, cp1_1, p_1];

            // interpolate mid point in mid segment and get cpts
            ptMid = pointAtT(controlPoints, 0.5, true, true);

            let cp1_mid = type === 'C' ? ptMid.cpts[2] : ptMid.cpts[0];
            cp1_cubic_2 = checkLineIntersection(ptMid, cp1_mid, cp1, p0, false);
            cp2_cubic_2 = checkLineIntersection(ptMid, cp1_mid, cp2_2, p_2, false);


            // extrapolate control points
            cp1_cubic_2 = pointAtT([p0, cp1_cubic_2], t);
            cp2_cubic_2 = pointAtT([p_2, cp2_cubic_2], t);

            // test accuracy
            comAreaDiff2 = getBezierAreaAccuracy([p0, cp1_cubic_2, cp2_cubic_2, p_2], area0, areaCptPoly, tolerance);
            accurate = comAreaDiff2.accurate;
            areaDiff2 = comAreaDiff2.areaDiff
            //console.log('3.2: ', areaDiff2);

        }

        // final 
        cp1_cubic = areaDiff1 < areaDiff2 ? cp1_cubic_1 : cp1_cubic_2
        cp2_cubic = areaDiff1 < areaDiff2 ? cp2_cubic_1 : cp2_cubic_2
        areaDiff = areaDiff1 < areaDiff2 ? areaDiff1 : areaDiff2
        log.push(areaDiff1 < areaDiff2 ? '3.1 is better' : '3.2 is better')


        if (areaDiff < tolerance) {
            //renderPoint(svg1, p, 'magenta')
        }


    }

    // combine 2 cubic segments
    else if (Clen === 2) {


        cp2_1 = chunk[0].cp2;
        cp2_2 = chunk[1].cp2;

        /**
         * Approach 1:
         * get combined control points
         * by extrapolating mid tangent intersection
         */

        // Get cp intersection point
        let cpI, cp1_cubicInter, cp2_cubicInter;

        cpI = checkLineIntersection(p0, cp1, cp2_2, p_2, false);
        if (cpI) {
            //console.log('2 cubics:', p, cp2_1, p0, cpI);
            cp1_cubicInter = checkLineIntersection(p, cp2_1, p0, cpI, false);
            cp2_cubicInter = checkLineIntersection(p, cp1_2, p_2, cpI, false);

            // extrapolate control points
            cp1_cubic_1 = pointAtT([p0, cp1_cubicInter], t);
            cp2_cubic_1 = pointAtT([p_2, cp2_cubicInter], t);
    
            // get area to detect sign changes
            comAreaDiff1 = getBezierAreaAccuracy([p0, cp1_cubic_1, cp2_cubic_1, p_2], area0, areaCptPoly, tolerance);
    
            accurate = comAreaDiff1.accurate;
            areaDiff1 = comAreaDiff1.areaDiff
        }

        //console.log('2.1: ', areaDiff1, cp1_cubic_1, cp2_cubic_1);
        //renderPoint(svg1, cp1_cubic_1, 'cyan')
        //renderPoint(svg1, cp2_cubic_1, 'orange')
        //renderPoint(svg1, p, 'magenta')

        if (comAreaDiff1 < tolerance) {
            //renderPoint(svg1, p, 'blue')
        }


        /**
         * If Approach 1 is too imprecise:
         * Approach 2:
         * add segments' cp tangents lengths for
         * combined control points
         */

        if (!accurate) {

            // 1  distances between "tangent handles"
            let t0Length = getDistance(p0, cp1_1);
            let t1Length = getDistance(p_1, cp2_2);

            // new average tangent length
            let t2Length = t0Length + t1Length;
            let tRat0 = t2Length / t0Length;
            let tRat1 = t2Length / t1Length;

            // extrapolate cp tangents
            cp1_cubic_2 = pointAtT([p0, cp1_1], tRat0);
            cp2_cubic_2 = pointAtT([p_1, cp2_2], tRat1);

            // accuracy
            comAreaDiff2 = getBezierAreaAccuracy([p0, cp1_cubic_2, cp2_cubic_2, p_2], area0, areaCptPoly, tolerance);
            accurate = comAreaDiff2.accurate;
            areaDiff2 = comAreaDiff2.areaDiff

            // renderPoint(svg1, cp1_cubic_2, 'cyan')
            // renderPoint(svg1, cp2_cubic_2, 'orange')

        }

        /**
         * 3rd try
         * take larger segment as reference
         */

        if (!accurate) {

            //[p0, cp1, cp2, p] = chunk[0];
            //console.log('chunk[0]', chunk[0]);

            cp1 = chunk[0].cp1
            cp2 = chunk[0].cp2
            p = chunk[0].p

            let controlPoints = [p0, cp1, cp2, p]

            // interpolate mid point in mid segment and get cpts
            ptMid = pointAtT(controlPoints, 0.5, true, true);

            let cp1_mid = type === 'C' ? ptMid.cpts[2] : ptMid.cpts[0];
            cp1_cubic_3 = checkLineIntersection(ptMid, cp1_mid, cp1, p0, false);
            cp2_cubic_3 = checkLineIntersection(ptMid, cp1_mid, cp2_2, p_2, false);


            // extrapolate control points
            cp1_cubic_3 = pointAtT([p0, cp1_cubic_3], t);
            cp2_cubic_3 = pointAtT([p_2, cp2_cubic_3], t);


            // test accuracy
            comAreaDiff2 = getBezierAreaAccuracy([p0, cp1_cubic_3, cp2_cubic_3, p_2], area0, areaCptPoly, tolerance);
            accurate = comAreaDiff2.accurate;
            areaDiff3 = comAreaDiff2.areaDiff

            if (areaDiff3 < tolerance && areaDiff3 < areaDiff2) {
                cp1_cubic_2 = cp1_cubic_3
                cp2_cubic_2 = cp2_cubic_3
                areaDiff2 = areaDiff3
                //console.log('2.3');
                log.push(areaDiff3 < areaDiff2 ? '2.3 is better' : '2.2 is better', areaDiff3, areaDiff2)
            }

        }

        // final 
        cp1_cubic = areaDiff1 < areaDiff2 ? cp1_cubic_1 : cp1_cubic_2
        cp2_cubic = areaDiff1 < areaDiff2 ? cp2_cubic_1 : cp2_cubic_2
        areaDiff = areaDiff1 < areaDiff2 ? areaDiff1 : areaDiff2

        //cp1_cubic = cp1_cubic_1
        //cp2_cubic = cp2_cubic_1


        if (areaDiff < tolerance) {
            /*
            let polyArea = getPolygonArea([p0,cp1_cubic, cp2_cubic, p_2 ])

            //console.log('area0', area0, areaDiff, comAreaDiff2, comAreaDiff3, comAreaDiff1);
            console.log('area0', area0, 'areaDiff', areaDiff, 'tolerance', tolerance, comAreaDiff1, comAreaDiff2, comAreaDiff3, 'polyArea', polyArea);
            renderPoint(svg1, p, 'blue')
            renderPoint(svg1, cp1_cubic, 'magenta')
            renderPoint(svg1, cp2_cubic, 'orange')
            */
        }

        log.push(areaDiff1 < areaDiff2 ? '2.1 is better' : '2.2 is better', areaDiff1, areaDiff2)


    }


    // no cpts - return original
    if (!cp1_cubic || !cp2_cubic) {
        //console.log('no cpts', [...chunk]);
        return [...chunk];
        //return [...chunk];
    }


    // !!! CAN be simplified
    if (areaDiff < tolerance) {
        //console.log('!!! IS simplified!!!', area0, areaDiff, tolerance);
        simplified.push({ type: 'C', values: [cp1_cubic.x, cp1_cubic.y, cp2_cubic.x, cp2_cubic.y, p_2.x, p_2.y] });
    }

    // !!! no way to simplify
    else {
        //simplified = [...chunk];
        simplified = chunk;
        //console.log('not simplified!!!', areaDiff, 'area0:', area0, 'areaSimple', areaSimple, tolerance);
        /*
        let d = comSimple.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ')
        let d0 = pathDataChunk.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ')
        */

    }

    let diffCom = pathDataChunk.length - simplified.length
    log.push('saved:' + diffCom, 'results:' + [c_3_1, c_3_2, c_2_1, c_2_2].join(', '))

    //console.log(log);

    return simplified;
}


