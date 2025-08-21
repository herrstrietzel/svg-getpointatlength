import { lgVals, deg2rad, rad2deg, PI2, PI, PI_half } from './constants.js';
//import { PathLengthObject } from './PathLengthObject.js';

import { checkFlatnessByPolygonArea, svgArcToCenterParam, getAngle, getLegendreGaussValues, toParametricAngle, getEllipseLengthLG, pointAtT, getLength, getPointOnEllipse, getTangentAngle, rotatePoint, normalizeAngle, getArcExtemes_fromParametrized, getBezierExtremes } from './geometry.js';

import {roundPoint}  from './rounding.js';


//import { renderPoint } from './visualize.js';
//import { getAreaData } from './getArea.js';
//import { normalizePathData, parse, parsePathDataNormalized, stringifyPathData } from './pathData_parse.js';




export function getPointAtLength(lookup, length = 0, getTangent = true, getSegment = true, decimals=-1) {

    let { segments, pathData, totalLength } = lookup;

    // disable tangents if no angles present in lookup
    if (!segments[0].angles.length) getSegment = false;

    // get control points for path splitting
    let getCpts = getSegment;


    // 1st segment
    let seg0 = segments[0];
    let seglast = segments[segments.length - 1];
    let M = seg0.points[0];
    let angle0 = seg0.angles[0]
    angle0 = angle0 < 0 ? angle0 + Math.PI * 2 : angle0;

    let newT = 0;
    let foundSegment = false;
    let pt = { x: M.x, y: M.y };

    // round - opional
    if(decimals>-1) pt = roundPoint(pt)

    // tangent angles for Arcs
    let tangentAngle, rx, ry, xAxisRotation, tangentAdjust = 0;


    if (getTangent) {
        pt.angle = angle0;

        if (seg0.type === 'A') {

            let { arcData } = seg0;

            ({ rx, ry, xAxisRotation, tangentAdjust } = !arcData.isEllipse ? arcData : seg0.arcData_param);


            if (rx !== ry) {
                // calulate tangent angle
                tangentAngle = normalizeAngle(getTangentAngle(rx, ry, angle0) - xAxisRotation + tangentAdjust);
                pt.angle = tangentAngle;

            }
        }

    }

    // return segment data
    if (getSegment) {
        pt.index = segments[0].index;
        pt.segIndex = 0;
        pt.com = segments[0].com;
    }

    // first or last point on path
    if (length === 0) {
        return pt;
    }

    //return last on-path point when length is larger or equals total length
    else if (length >= totalLength) {

        //console.log('last', length);

        let ptLast = seglast.points[seglast.points.length - 1]
        let angleLast = seglast.angles[seglast.angles.length - 1]

        pt.x = ptLast.x;
        pt.y = ptLast.y;

        if (getTangent) {
            pt.angle = angleLast;

            if (seglast.type === 'A') {

                let { arcData } = seglast;
                ({ rx, ry, xAxisRotation, tangentAdjust } = !arcData.isEllipse ? arcData : seglast.arcData_param);

                if (rx !== ry) {

                    // calulate tangent angle
                    tangentAngle = normalizeAngle(getTangentAngle(rx, ry, angleLast) - xAxisRotation + tangentAdjust);
                    pt.angle = tangentAngle;
                }
            }
        }

        if (getSegment) {
            //pt.index = segments.length - 1;
            pt.index = pathData.length-1;
            pt.segIndex = segments.length-1;
            pt.com = segments[segments.length - 1].com;
        }

        if(decimals>-1) pt = roundPoint(pt)
        return pt;
    }

    //loop through segments
    for (let i = 0; i < segments.length && !foundSegment; i++) {
        let segment = segments[i];
        let { type, lengths, points, total, angles, com } = segment;
        let end = lengths[lengths.length - 1];
        let tStep = 1 / (lengths.length - 1);

        // find path segment
        if (end >= length) {
            foundSegment = true;
            let foundT = false;
            let diffLength;

            switch (type) {
                case 'L':
                    diffLength = end - length;
                    newT = 1 - (1 / total) * diffLength;

                    pt = pointAtT(points, newT, getTangent, getCpts)
                    pt.type = 'L'
                    if (getTangent) pt.angle = angles[0];
                    break;

                case 'A':

                    diffLength = end - length;
                    let { arcData } = segment;
                    //console.log('arcData', arcData);
                    let { rx, ry, cx, cy, startAngle, endAngle, deltaAngle, xAxisRotation, tangentAdjust, sweep } = !arcData.isEllipse ? arcData : segment.arcData_param;

                    // final on-path point
                    let pt1 = segment.points[1]
                    let xAxisRotation_deg = xAxisRotation * rad2deg;


                    // is ellipse
                    if (rx !== ry) {

                        //console.log('ellipse', length);

                        for (let i = 1; i < lengths.length && !foundT; i++) {
                            let lengthN = lengths[i];

                            if (length < lengthN) {
                                // length is in this range
                                foundT = true;
                                let lengthPrev = lengths[i - 1]
                                let lengthSeg = lengthN - lengthPrev;
                                let lengthDiff = lengthN - length;

                                let rat = (1 / lengthSeg) * lengthDiff || 1;
                                let anglePrev = angles[i - 1];
                                let angle = angles[i];

                                // interpolated angle
                                let angleI = (anglePrev - angle) * rat + angle;

                                // get point on ellipse
                                pt = getPointOnEllipse(cx, cy, rx, ry, angleI, xAxisRotation, false, false);

                                // calulate tangent angle
                                tangentAngle = normalizeAngle(getTangentAngle(rx, ry, angleI) - xAxisRotation + tangentAdjust)

                                // return angle
                                pt.angle = tangentAngle;


                                // segment info
                                if (getSegment) {

                                    // recalculate large arc based on split length and new delta angles
                                    let delta1 = Math.abs(angleI - startAngle)
                                    let delta2 = Math.abs(endAngle - angleI)
                                    let largeArc1 = delta1 >= Math.PI ? 1 : 0
                                    let largeArc2 = delta2 >= Math.PI ? 1 : 0

                                    pt.commands = [
                                        { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc1, sweep, pt.x, pt.y] },
                                        { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc2, sweep, pt1.x, pt1.y] },
                                    ]

                                }

                            } 
                            // is at end of segment
                            else if(length === lengthN){
                                pt = pt1
                                tangentAngle = normalizeAngle( getTangentAngle(rx, ry, endAngle) - xAxisRotation + tangentAdjust)
                                pt.angle = tangentAngle
                                //console.log('last!!!', pt);
                                foundT = true;
                            }
                        }


                    } else {

                        newT = 1 - (1 / total) * diffLength;
                        let newAngle = -deltaAngle * newT;

                        // rotate point
                        let cosA = Math.cos(newAngle);
                        let sinA = Math.sin(newAngle);
                        let p0 = segment.points[0];

                        pt = {
                            x: (cosA * (p0.x - cx)) + (sinA * (p0.y - cy)) + cx,
                            y: (cosA * (p0.y - cy)) - (sinA * (p0.x - cx)) + cy
                        }

                        // angle
                        if (getTangent) {
                            let angleOff = deltaAngle > 0 ? PI_half : -PI_half;
                            pt.angle = normalizeAngle(startAngle + (deltaAngle * newT) + angleOff)
                        }

                        // segment info
                        if (getSegment) {
                            let angleI = Math.abs(deltaAngle * newT);

                            let delta1 = Math.abs(deltaAngle - angleI)
                            let delta2 = Math.abs(deltaAngle - delta1)
                            let largeArc1 = delta1 >= Math.PI ? 1 : 0
                            let largeArc2 = delta2 >= Math.PI ? 1 : 0

                            //console.log('angleI', angleI, 'deltaAngle', deltaAngle, 'delta1', delta1, newT);

                            pt.commands = [
                                { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc1, sweep, pt.x, pt.y] },
                                { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc2, sweep, pt1.x, pt1.y] },
                            ]
                        }
                    }


                    break;
                case 'C':
                case 'Q':

                    // is curve
                    for (let i = 0; i < lengths.length && !foundT; i++) {
                        let lengthAtT = lengths[i];
                        if (getTangent) pt.angle = angles[0];

                        // first or last point in segment
                        if (i === 0) {
                            pt.x = com.p0.x
                            pt.y = com.p0.y
                        }
                        else if (lengthAtT === length) {
                            pt.x = points[points.length - 1].x
                            pt.y = points[points.length - 1].y
                        }

                        // found length at t range
                        else if (lengthAtT > length && i > 0) {

                            foundT = true;

                            let lengthAtTPrev = i > 0 ? lengths[i - 1] : lengths[i];
                            let t = tStep * i;

                            // length between previous and current t
                            let tSegLength = lengthAtT - lengthAtTPrev;
                            let diffLength = lengthAtT - length;

                            // ratio between segment length and difference
                            let tScale = (1 / tSegLength) * diffLength || 0;
                            newT = t - tStep * tScale || 0;

                            // return point and optionally angle
                            pt = pointAtT(points, newT, getTangent, getCpts)

                        }
                    }
                    break;
            }

            pt.t = newT;
        }

        if (getSegment) {
            //pathdata index
            pt.index = segment.index;
            //segment index
            pt.segIndex = segment.segIndex;
            pt.com = segment.com;
        }

    }

    return pt;

}