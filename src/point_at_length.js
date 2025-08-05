import { checkFlatnessByPolygonArea, svgArcToCenterParam, getAngle, getLegendreGaussValues, toParametricAngle, getEllipseLengthLG, pointAtT, getLength, getPointOnEllipse, getTangentAngle, rotatePoint } from './geometry';


export function PathLengthObject(totalLength = 0, segments = [], pathData = []) {
    this.totalLength = totalLength;
    this.segments = segments;
    this.pathData = pathData;
}


//pathLengthLookup
PathLengthObject.prototype.getPointAtLength = function (length = 0, getTangent = false, getSegment = false) {
    return getPointAtLengthCore(this, length, getTangent, getSegment);
}

PathLengthObject.prototype.getSegmentAtLength = function (length = 0, getTangent = true, getSegment = true) {
    let segment = getPointAtLengthCore(this, length, getTangent, getSegment);
    let { com, t, index, angle, x, y, segments } = segment
    let M = { type: "M", values: [com.p0.x, com.p0.y] };


    // convert closepath to explicit lineto
    if(com.type.toLowerCase()==='z'){
        let p = segments[segments.length-1].p;
        com = { type: "L", values: [p.x, p.y] }
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

    return res
}

PathLengthObject.prototype.splitPathAtLength = function (length = 0, getTangent = true, getSegment = true) {
    let pt = getPointAtLengthCore(this, length, getTangent, getSegment);

    let pathData = this.pathData;
    let {x,y, index, commands } = pt;
    let [com1, com2] = commands;
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let pathData1 = [];
    let pathData2 = [];

    pathData.forEach((com, i) => {

        let { type, values } = com;
        if (i < index) {
            pathData1.push(com)
        }

        // get split segment
        else if (i === index) {
            pathData1.push(com1)

            // next path segment
            pathData2.push(
                { type: 'M', values: [x, y] },
                com2
            )
        }

        else if (i > index) {
            if (type.toLowerCase() === 'z') {
                pathData2.push(
                    { type: 'L', values: [M.x, M.y] },
                )

            } else {
                pathData2.push(com)
            }
        }
    })


    // stringified pathData
    let d1 = stringifyPathData(pathData1);
    let d2 = stringifyPathData(pathData2);

    return {pathDataArr: [pathData1, pathData2], dArr:[d1, d2], index };
}




function getPointAtLengthCore(obj, length = 0, getTangent = false, getSegment = false) {

    let { segments, totalLength } = obj;

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

    // tangent angles for Arcs
    let tangentAngle, rx, ry, xAxisRotation, xAxisRotation_deg, sweep, largeArc, deltaAngle, perpendicularAdjust;


    if (getTangent) {
        pt.angle = angle0;

        if (seg0.type === 'A') {

            // update arc properties
            ({ rx, ry, xAxisRotation, xAxisRotation_deg, sweep, largeArc, deltaAngle } = seg0.points[1]);

            if (rx !== ry) {

                // adjust for clockwise or counter clockwise
                perpendicularAdjust = deltaAngle < 0 ? Math.PI * -0.5 : Math.PI * 0.5;

                // calulate tangent angle
                tangentAngle = getTangentAngle(rx, ry, angle0) - xAxisRotation;

                // adjust for axis rotation
                tangentAngle = xAxisRotation ? tangentAngle + perpendicularAdjust : tangentAngle;
                pt.angle = tangentAngle;

            }
        }

    }

    // return segment data
    if (getSegment) {
        pt.index = segments[0].index;
        pt.com = segments[0].com;
    }

    // first or last point on path
    if (length === 0) {
        return pt;
    }

    //return last on-path point when length is larger or equals total length
    else if (length >= totalLength) {
        let ptLast = seglast.points.slice(-1)[0]
        let angleLast = seglast.angles.slice(-1)[0]

        pt.x = ptLast.x;
        pt.y = ptLast.y;

        if (getTangent) {
            pt.angle = angleLast;

            if (seglast.type === 'A') {
                ({ rx, ry, xAxisRotation } = seglast.points[1]);
                if (rx !== ry) {

                    // calulate tangent angle
                    tangentAngle = getTangentAngle(rx, ry, angleLast) - xAxisRotation;

                    // adjust for clockwise or counter clockwise
                    perpendicularAdjust = deltaAngle < 0 ? Math.PI * -0.5 : Math.PI * 0.5;

                    // adjust for axis rotation
                    tangentAngle = xAxisRotation ? tangentAngle + perpendicularAdjust : tangentAngle;
                    pt.angle = tangentAngle;
                }
            }
        }

        if (getSegment) {
            pt.index = segments.length - 1;
            pt.com = segments[segments.length - 1].com;
        }
        return pt;
    }

    //loop through segments

    for (let i = 0, l = segments.length; i < l && !foundSegment; i++) {
        let segment = segments[i];
        let { type, lengths, points, total, angles, com } = segment;
        let end = lengths[lengths.length - 1];
        let tStep = 1 / (lengths.length - 1);
        let p0 = com.p0;

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

                    let { rx, ry, cx, cy, startAngle, endAngle, deltaAngle, sweep, largeArc, xAxisRotation, xAxisRotation_deg } = segment.points[1];

                    // is ellipse
                    if (rx !== ry) {

                        // adjust for clockwise or counter clockwise
                        perpendicularAdjust = deltaAngle < 0 ? Math.PI * -0.5 : Math.PI * 0.5;


                        for (let i = 1, l = lengths.length; i < l && !foundT; i++) {
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

                                // calculate tangent angle
                                tangentAngle = getTangentAngle(rx, ry, angleI) - xAxisRotation;

                                // adjust for axis rotation
                                tangentAngle = xAxisRotation ? tangentAngle + perpendicularAdjust : tangentAngle

                                // return angle
                                pt.angle = tangentAngle;

                                // segment info
                                if (getSegment) {
                                    // final on-path point
                                    let pt1 = segment.points[2]

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
                        }


                    } else {

                        newT = 1 - (1 / total) * diffLength;
                        let newAngle = -deltaAngle * newT;

                        // rotate point
                        p0 = segment.points[0]
                        pt = rotatePoint(p0, cx, cy, newAngle)

                        // angle
                        if (getTangent) {
                            let angleOff = deltaAngle > 0 ? Math.PI / 2 : Math.PI / -2;
                            pt.angle = startAngle + (deltaAngle * newT) + angleOff

                        }
                        //console.log(getTangent, pt.angle);

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
                            // difference between length at t and exact length
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
            pt.index = segment.index;
            pt.com = segment.com;
        }

    }

    return pt;
}