
import { lgVals, deg2rad, rad2deg } from './constants.js';


export const {
    abs, acos, asin, atan, atan2, ceil, cos, exp, floor,
    log, max, min, pow, random, round, sin, sqrt, tan, PI
} = Math;


// get angle helper
export function getAngle(p1, p2, normalize = false) {
    //console.log('getAngle', p1, p2);
    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    // normalize negative angles
    if (normalize && angle < 0) angle += Math.PI * 2
    return angle
}


/**
 * based on:  Justin C. Round's 
 * http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
 */

export function checkLineIntersection(p1, p2, p3, p4, exact = true) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    let denominator, a, b, numerator1, numerator2;
    let intersectionPoint = {}

    try {
        denominator = ((p4.y - p3.y) * (p2.x - p1.x)) - ((p4.x - p3.x) * (p2.y - p1.y));
        if (denominator == 0) {
            return false;
        }

    } catch {
        console.log('!catch', p1, p2, 'p3:', p3, p4);
    }

    a = p1.y - p3.y;
    b = p1.x - p3.x;
    numerator1 = ((p4.x - p3.x) * a) - ((p4.y - p3.y) * b);
    numerator2 = ((p2.x - p1.x) * a) - ((p2.y - p1.y) * b);

    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    intersectionPoint = {
        x: p1.x + (a * (p2.x - p1.x)),
        y: p1.y + (a * (p2.y - p1.y))
    }



    let intersection = false;
    // if line1 is a segment and line2 is infinite, they intersect if:
    if ((a > 0 && a < 1) && (b > 0 && b < 1)) {
        intersection = true;
        //console.log('line inters');
    }

    if (exact && !intersection) {
        //console.log('no line inters');
        return false;
    }

    // if line1 and line2 are segments, they intersect if both of the above are true
    //console.log('inter', intersectionPoint)
    return intersectionPoint;
};



/**
 * get distance between 2 points
 * pythagorean theorem
 */
export function getDistance(p1, p2) {


    // check horizontal or vertical
    if (p1.y === p2.y) {
        return Math.abs(p2.x - p1.x)
    }
    if (p1.x === p2.x) {
        return Math.abs(p2.y - p1.y)
    }

    return sqrt(
        (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
    );
}

export function getSquareDistance(p1, p2) {
    return (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
}

export function lineLength(p1, p2) {
    return getDistance(p1, p2)
}


/**
* Linear  interpolation (LERP) helper
*/
export function interpolate(p1, p2, t, getTangent = false) {

    let pt = {
        x: (p2.x - p1.x) * t + p1.x,
        y: (p2.y - p1.y) * t + p1.y,
    };

    if (getTangent) {
        pt.angle = getAngle(p1, p2)

        // normalize negative angles
        if (pt.angle < 0) pt.angle += PI * 2
    }

    return pt
}


/**
 * get point on 
 * quadratic or cubic bezier
 * or line
 */

export function pointAtT(pts, t = 0.5, getTangent = false, getCpts = false) {

    const getPointAtBezierT = (pts, t, getTangent = false) => {

        let isCubic = pts.length === 4;
        let p0 = pts[0];
        let cp1 = pts[1];
        let cp2 = isCubic ? pts[2] : pts[1];
        let p = pts[pts.length - 1];
        let pt = { x: 0, y: 0 };

        if (getTangent || getCpts) {
            let m0, m1, m2, m3, m4;
            let shortCp1 = p0.x === cp1.x && p0.y === cp1.y;
            let shortCp2 = p.x === cp2.x && p.y === cp2.y;

            if (t === 0 && !shortCp1) {
                pt.x = p0.x;
                pt.y = p0.y;
                pt.angle = getAngle(p0, cp1)
            }

            else if (t === 1 && !shortCp2) {
                pt.x = p.x;
                pt.y = p.y;
                pt.angle = getAngle(cp2, p)
            }

            else {
                // adjust if cps are on start or end point
                if (shortCp1) t += 0.0000001;
                if (shortCp2) t -= 0.0000001;

                m0 = interpolate(p0, cp1, t);
                if (isCubic) {
                    m1 = interpolate(cp1, cp2, t);
                    m2 = interpolate(cp2, p, t);
                    m3 = interpolate(m0, m1, t);
                    m4 = interpolate(m1, m2, t);
                    pt = interpolate(m3, m4, t);

                    // add angles
                    pt.angle = getAngle(m3, m4)

                    // add control points
                    if (getCpts) {
                        pt.commands = [
                            { type: 'C', values: [m0.x, m0.y, m3.x, m3.y, pt.x, pt.y] },
                            { type: 'C', values: [m4.x, m4.y, m2.x, m2.y, p.x, p.y] }
                        ];

                        pt.segments = [
                            { p0: p0, cp1: m0, cp2: m3, p: pt },
                            { p0: pt, cp1: m4, cp2: m2, p: p },
                        ];
                    }

                } else {
                    m1 = interpolate(p0, cp1, t);
                    m2 = interpolate(cp1, p, t);
                    pt = interpolate(m1, m2, t);
                    pt.angle = getAngle(m1, m2);

                    // add control points
                    if (getCpts) {

                        pt.commands = [
                            { type: 'Q', values: [m1.x, m1.y, pt.x, pt.y] },
                            { type: 'Q', values: [m2.x, m2.y, p.x, p.y] }
                        ];

                        pt.segments = [
                            { p0: p0, cp1: m1, p: pt },
                            { p0: pt, cp1: m2, p: p },
                        ];
                    }
                }
            }

        }
        // take simplified calculations without tangent angles
        else {
            let t1 = 1 - t;

            // cubic beziers
            if (isCubic) {
                pt = {
                    x:
                        t1 ** 3 * p0.x +
                        3 * t1 ** 2 * t * cp1.x +
                        3 * t1 * t ** 2 * cp2.x +
                        t ** 3 * p.x,
                    y:
                        t1 ** 3 * p0.y +
                        3 * t1 ** 2 * t * cp1.y +
                        3 * t1 * t ** 2 * cp2.y +
                        t ** 3 * p.y,
                };

            }
            // quadratic beziers
            else {
                pt = {
                    x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
                    y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y,
                };
            }

        }

        return pt

    }

    let pt;
    if (pts.length > 2) {
        pt = getPointAtBezierT(pts, t, getTangent);
    }

    else {
        let p0 = pts[0]
        let p = pts[1]
        pt = interpolate(p0, p, t, getTangent)

        if (getCpts) {
            pt.commands = [
                { type: 'L', values: [pt.x, pt.y] },
                { type: 'L', values: [p.x, p.y] }
            ];

            pt.segments = [
                { p0: p0, p: pt },
                { p0: pt, p: p },
            ];
        }


    }

    // normalize negative angles
    if (getTangent && pt.angle < 0) pt.angle += PI * 2

    return pt
}




/*
export function pointAtT(pts, t = 0.5, getTangent = false, getCpts = false) {

    const getPointAtBezierT = (pts, t, getTangent = false) => {

        let isCubic = pts.length === 4;
        let p0 = pts[0];
        let cp1 = pts[1];
        let cp2 = isCubic ? pts[2] : pts[1];
        let p = pts[pts.length - 1];
        let pt = { x: 0, y: 0 };

        if (getTangent || getCpts) {
            let m0, m1, m2, m3, m4;
            let shortCp1 = p0.x === cp1.x && p0.y === cp1.y;
            let shortCp2 = p.x === cp2.x && p.y === cp2.y;

            if (t === 0 && !shortCp1) {
                pt.x = p0.x;
                pt.y = p0.y;
                pt.angle = getAngle(p0, cp1)
            }

            else if (t === 1 && !shortCp2) {
                pt.x = p.x;
                pt.y = p.y;
                pt.angle = getAngle(cp2, p)
            }

            else {
                // adjust if cps are on start or end point
                if (shortCp1) t += 0.0000001;
                if (shortCp2) t -= 0.0000001;

                m0 = interpolate(p0, cp1, t);
                if (isCubic) {
                    m1 = interpolate(cp1, cp2, t);
                    m2 = interpolate(cp2, p, t);
                    m3 = interpolate(m0, m1, t);
                    m4 = interpolate(m1, m2, t);
                    pt = interpolate(m3, m4, t);

                    // add angles
                    pt.angle = getAngle(m3, m4)

                    // add control points
                    if (getCpts) pt.cpts = [m1, m2, m3, m4];
                } else {
                    m1 = interpolate(p0, cp1, t);
                    m2 = interpolate(cp1, p, t);
                    pt = interpolate(m1, m2, t);
                    pt.angle = getAngle(m1, m2);

                    // add control points
                    if (getCpts) pt.cpts = [m1, m2];
                }
            }

        }
        // take simplified calculations without tangent angles
        else {
            let t1 = 1 - t;

            // cubic beziers
            if (isCubic) {
                pt = {
                    x:
                        t1 ** 3 * p0.x +
                        3 * t1 ** 2 * t * cp1.x +
                        3 * t1 * t ** 2 * cp2.x +
                        t ** 3 * p.x,
                    y:
                        t1 ** 3 * p0.y +
                        3 * t1 ** 2 * t * cp1.y +
                        3 * t1 * t ** 2 * cp2.y +
                        t ** 3 * p.y,
                };

            }
            // quadratic beziers
            else {
                pt = {
                    x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
                    y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y,
                };
            }

        }

        return pt

    }

    let pt;
    if (pts.length > 2) {
        pt = getPointAtBezierT(pts, t, getTangent);
    }

    else {
        pt = interpolate(pts[0], pts[1], t, getTangent)
    }

    // normalize negative angles
    if (getTangent && pt.angle < 0) pt.angle += PI * 2

    return pt
}
*/


/**
 * get vertices from path command final on-path points
 */
export function getPathDataVertices(pathData) {
    let polyPoints = [];
    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };

    pathData.forEach((com) => {
        let { type, values } = com;
        // get final on path point from last 2 values
        if (values.length) {
            let pt = values.length > 1 ? { x: values[values.length - 2], y: values[values.length - 1] }
                : (type === 'V' ? { x: p0.x, y: values[0] } : { x: values[0], y: p0.y });
            polyPoints.push(pt);
            p0 = pt;
        }
    });
    return polyPoints;
};



/**
 *  based on @cuixiping;
 *  https://stackoverflow.com/questions/9017100/calculate-center-of-svg-arc/12329083#12329083
 */
export function svgArcToCenterParam(x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2) {

    // helper for angle calculation
    const getAngle = (cx, cy, x, y) => {
        return atan2(y - cy, x - cx);
    };

    // make sure rx, ry are positive
    rx = abs(rx);
    ry = abs(ry);


    // create data object
    let arcData = {
        cx: 0,
        cy: 0,
        // rx/ry values may be deceptive in arc commands
        rx: rx,
        ry: ry,
        startAngle: 0,
        endAngle: 0,
        deltaAngle: 0,
        clockwise: sweep,
        // copy explicit arc properties
        xAxisRotation,
        largeArc,
        sweep
    };


    if (rx == 0 || ry == 0) {
        // invalid arguments
        throw Error("rx and ry can not be 0");
    }

    let shortcut = true
    //console.log('short');

    if (rx === ry && shortcut) {

        // test semicircles
        let diffX = Math.abs(x2 - x1)
        let diffY = Math.abs(y2 - y1)
        let r = diffX;

        let xMin = Math.min(x1, x2),
            yMin = Math.min(y1, y2),
            PIHalf = Math.PI * 0.5


        // semi circles
        if (diffX === 0 && diffY || diffY === 0 && diffX) {
            //console.log('semi');

            r = diffX === 0 && diffY ? diffY / 2 : diffX / 2;
            arcData.rx = r
            arcData.ry = r

            // verical
            if (diffX === 0 && diffY) {
                arcData.cx = x1;
                arcData.cy = yMin + diffY / 2;
                arcData.startAngle = y1 > y2 ? PIHalf : -PIHalf
                arcData.endAngle = y1 > y2 ? -PIHalf : PIHalf
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI

            }
            // horizontal
            else if (diffY === 0 && diffX) {
                arcData.cx = xMin + diffX / 2;
                arcData.cy = y1
                arcData.startAngle = x1 > x2 ? Math.PI : 0
                arcData.endAngle = x1 > x2 ? -Math.PI : Math.PI
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI
            }

            //console.log(arcData);
            return arcData;
        }
    }

    /**
     * if rx===ry x-axis rotation is ignored
     * otherwise convert degrees to radians
     */
    let phi = rx === ry ? 0 : (xAxisRotation * PI) / 180;
    let cx, cy

    let s_phi = !phi ? 0 : sin(phi);
    let c_phi = !phi ? 1 : cos(phi);

    let hd_x = (x1 - x2) / 2;
    let hd_y = (y1 - y2) / 2;
    let hs_x = (x1 + x2) / 2;
    let hs_y = (y1 + y2) / 2;

    // F6.5.1
    let x1_ = !phi ? hd_x : c_phi * hd_x + s_phi * hd_y;
    let y1_ = !phi ? hd_y : c_phi * hd_y - s_phi * hd_x;

    // F.6.6 Correction of out-of-range radii
    //   Step 3: Ensure radii are large enough
    let lambda = (x1_ * x1_) / (rx * rx) + (y1_ * y1_) / (ry * ry);
    if (lambda > 1) {
        rx = rx * sqrt(lambda);
        ry = ry * sqrt(lambda);

        // save real rx/ry
        arcData.rx = rx;
        arcData.ry = ry;
    }

    let rxry = rx * ry;
    let rxy1_ = rx * y1_;
    let ryx1_ = ry * x1_;
    let sum_of_sq = rxy1_ ** 2 + ryx1_ ** 2; // sum of square
    if (!sum_of_sq) {
        //console.log('error:', rx, ry, rxy1_, ryx1_);
        throw Error("start point can not be same as end point");
    }
    let coe = sqrt(abs((rxry * rxry - sum_of_sq) / sum_of_sq));
    if (largeArc == sweep) {
        coe = -coe;
    }

    // F6.5.2
    let cx_ = (coe * rxy1_) / ry;
    let cy_ = (-coe * ryx1_) / rx;

    /** F6.5.3
     * center point of ellipse
     */
    cx = !phi ? hs_x + cx_ : c_phi * cx_ - s_phi * cy_ + hs_x;
    cy = !phi ? hs_y + cy_ : s_phi * cx_ + c_phi * cy_ + hs_y;
    arcData.cy = cy;
    arcData.cx = cx;

    /** F6.5.5
     * calculate angles between center point and
     * commands starting and final on path point
     */
    let startAngle = getAngle(cx, cy, x1, y1);
    let endAngle = getAngle(cx, cy, x2, y2);

    // adjust end angle
    if (!sweep && endAngle > startAngle) {
        //console.log('adj neg');
        endAngle -= Math.PI * 2
    }

    if (sweep && startAngle > endAngle) {
        //console.log('adj pos');
        endAngle = endAngle <= 0 ? endAngle + Math.PI * 2 : endAngle
    }

    let deltaAngle = endAngle - startAngle
    arcData.startAngle = startAngle;
    arcData.endAngle = endAngle;
    arcData.deltaAngle = deltaAngle;

    //console.log('arc', arcData);
    return arcData;
}



export function rotatePoint(pt, cx, cy, rotation = 0, convertToRadians = false) {
    if (!rotation) return pt;
    if (convertToRadians) rotation = (rotation / 180) * Math.PI;

    let cosA = Math.cos(rotation);
    let sinA = Math.sin(rotation);

    return {

        x: (cosA * (pt.x - cx)) + (sinA * (pt.y - cy)) + cx,
        y: (cosA * (pt.y - cy)) - (sinA * (pt.x - cx)) + cy
    };
}




export function reducepts(pts, max = 48) {
    if (!Array.isArray(pts) || pts.length <= max) return pts;

    // Calculate how many pts to skip between kept pts
    let len = pts.length;
    let step = len / max;
    let reduced = [];

    for (let i = 0; i < max; i++) {
        reduced.push(pts[Math.floor(i * step)]);
    }

    let lenR = reduced.length;
    // Always include the last point to maintain path integrity
    if (reduced[lenR - 1] !== pts[len - 1]) {
        reduced[lenR - 1] = pts[len - 1];
    }

    return reduced;
}


export function sortPolygonLeftTopFirst(pts) {
    if (pts.length === 0) return pts.slice();

    let firstIndex = 0;
    for (let i = 1; i < pts.length; i++) {
        const current = pts[i];
        const first = pts[firstIndex];
        if (current.x < first.x || (current.x === first.x && current.y < first.y)) {
            firstIndex = i;
        }
    }

    return pts.slice(firstIndex).concat(pts.slice(0, firstIndex));
}


export function getPointOnEllipse(cx, cy, rx, ry, angle, ellipseRotation = 0, parametricAngle = true, degrees = false) {


    //console.log(cx, cy, rx, ry, angle, ellipseRotation, parametricAngle);

    // Convert degrees to radians
    angle = degrees ? (angle * PI) / 180 : angle;
    ellipseRotation = degrees ? (ellipseRotation * PI) / 180 : ellipseRotation;
    // reset rotation for circles or 360 degree 
    ellipseRotation = rx !== ry ? (ellipseRotation !== PI * 2 ? ellipseRotation : 0) : 0;

    // is ellipse
    if (parametricAngle && rx !== ry) {
        // adjust angle for ellipse rotation
        angle = ellipseRotation ? angle - ellipseRotation : angle;
        // Get the parametric angle for the ellipse
        let angleParametric = atan(tan(angle) * (rx / ry));
        // Ensure the parametric angle is in the correct quadrant
        angle = cos(angle) < 0 ? angleParametric + PI : angleParametric;
    }

    // Calculate the point on the ellipse without rotation
    let x = cx + rx * cos(angle),
        y = cy + ry * sin(angle);
    let pt = {
        x: x,
        y: y
    }

    if (ellipseRotation) {
        pt.x = cx + (x - cx) * cos(ellipseRotation) - (y - cy) * sin(ellipseRotation)
        pt.y = cy + (x - cx) * sin(ellipseRotation) + (y - cy) * cos(ellipseRotation)
    }
    return pt
}


// to parametric angle helper
export function toParametricAngle(angle, rx, ry) {

    if (rx === ry || (angle % PI * 0.5 === 0)) return angle;
    let angleP = atan(tan(angle) * (rx / ry));

    // Ensure the parametric angle is in the correct quadrant
    angleP = cos(angle) < 0 ? angleP + PI : angleP;

    return angleP
}

// From parametric angle to non-parametric angle
export function toNonParametricAngle(angleP, rx, ry) {

    if (rx === ry || (angleP % PI * 0.5 === 0)) return angleP;

    let angle = atan(tan(angleP) * (ry / rx));
    // Ensure the non-parametric angle is in the correct quadrant
    return cos(angleP) < 0 ? angle + PI : angle;
};


/**
 * get tangent angle on ellipse
 * at angle
 */
export function getTangentAngle(rx, ry, parametricAngle) {

    // Derivative components
    let dx = -rx * sin(parametricAngle);
    let dy = ry * cos(parametricAngle);
    let tangentAngle = atan2(dy, dx);

    return tangentAngle;
}

export function bezierhasExtreme(p0, cpts = [], angleThreshold = 0.05) {
    let isCubic = cpts.length === 3 ? true : false;
    let cp1 = cpts[0]
    let cp2 = isCubic ? cpts[1] : null;
    let p = isCubic ? cpts[2] : cpts[1];
    let PIquarter = Math.PI * 0.5;

    let extCp1 = false,
        extCp2 = false;

    let ang1 = getAngle(p, cp1, true);

    extCp1 = Math.abs((ang1 % PIquarter)) < angleThreshold || Math.abs((ang1 % PIquarter) - PIquarter) < angleThreshold;

    if (isCubic) {
        let ang2 = cp2 ? getAngle(cp2, p, true) : 0;
        extCp2 = Math.abs((ang2 % PIquarter)) <= angleThreshold ||
            Math.abs((ang2 % PIquarter) - PIquarter) <= angleThreshold;
    }
    return (extCp1 || extCp2)
}



export function getBezierExtremeT(pts) {
    let tArr = pts.length === 4 ? cubicBezierExtremeT(pts[0], pts[1], pts[2], pts[3]) : quadraticBezierExtremeT(pts[0], pts[1], pts[2]);
    return tArr;
}


/**
 * based on Nikos M.'s answer
 * how-do-you-calculate-the-axis-aligned-bounding-box-of-an-ellipse
 * https://stackoverflow.com/questions/87734/#75031511
 * See also: https://github.com/foo123/Geometrize
 */
export function getArcExtemes(p0, values) {
    // compute point on ellipse from angle around ellipse (theta)
    const arc = (theta, cx, cy, rx, ry, alpha) => {
        // theta is angle in radians around arc
        // alpha is angle of rotation of ellipse in radians
        var cos = Math.cos(alpha),
            sin = Math.sin(alpha),
            x = rx * Math.cos(theta),
            y = ry * Math.sin(theta);

        return {
            x: cx + cos * x - sin * y,
            y: cy + sin * x + cos * y
        };
    }

    //parametrize arcto data
    let arcData = svgArcToCenterParam(p0.x, p0.y, values[0], values[1], values[2], values[3], values[4], values[5], values[6]);
    let { rx, ry, cx, cy, endAngle, deltaAngle } = arcData;

    // arc rotation
    let deg = values[2];

    // final on path point
    let p = { x: values[5], y: values[6] }

    // collect extreme points – add end point
    let extremes = [p]

    // rotation to radians
    let alpha = deg * Math.PI / 180;
    let tan = Math.tan(alpha),
        p1, p2, p3, p4, theta;

    /**
    * find min/max from zeroes of directional derivative along x and y
    * along x axis
    */
    theta = Math.atan2(-ry * tan, rx);

    let angle1 = theta;
    let angle2 = theta + Math.PI;
    let angle3 = Math.atan2(ry, rx * tan);
    let angle4 = angle3 + Math.PI;


    // inner bounding box
    let xArr = [p0.x, p.x]
    let yArr = [p0.y, p.y]
    let xMin = Math.min(...xArr)
    let xMax = Math.max(...xArr)
    let yMin = Math.min(...yArr)
    let yMax = Math.max(...yArr)


    // on path point close after start
    let angleAfterStart = endAngle - deltaAngle * 0.001
    let pP2 = arc(angleAfterStart, cx, cy, rx, ry, alpha);

    // on path point close before end
    let angleBeforeEnd = endAngle - deltaAngle * 0.999
    let pP3 = arc(angleBeforeEnd, cx, cy, rx, ry, alpha);


    /**
     * expected extremes
     * if leaving inner bounding box
     * (between segment start and end point)
     * otherwise exclude elliptic extreme points
    */

    // right
    if (pP2.x > xMax || pP3.x > xMax) {
        // get point for this theta
        p1 = arc(angle1, cx, cy, rx, ry, alpha);
        extremes.push(p1)
    }

    // left
    if (pP2.x < xMin || pP3.x < xMin) {
        // get anti-symmetric point
        p2 = arc(angle2, cx, cy, rx, ry, alpha);
        extremes.push(p2)
    }

    // top
    if (pP2.y < yMin || pP3.y < yMin) {
        // get anti-symmetric point
        p4 = arc(angle4, cx, cy, rx, ry, alpha);
        extremes.push(p4)
    }

    // bottom
    if (pP2.y > yMax || pP3.y > yMax) {
        // get point for this theta
        p3 = arc(angle3, cx, cy, rx, ry, alpha);
        extremes.push(p3)
    }

    return extremes;
}



// cubic bezier.
export function cubicBezierExtremeT(p0, cp1, cp2, p) {
    let [x0, y0, x1, y1, x2, y2, x3, y3] = [p0.x, p0.y, cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];

    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    let top = Math.min(p0.y, p.y)
    let left = Math.min(p0.x, p.x)
    let right = Math.max(p0.x, p.x)
    let bottom = Math.max(p0.y, p.y)

    if (
        cp1.y >= top && cp1.y <= bottom &&
        cp2.y >= top && cp2.y <= bottom &&
        cp1.x >= left && cp1.x <= right &&
        cp2.x >= left && cp2.x <= right
    ) {
        return []
    }

    var tArr = [],
        a, b, c, t, t1, t2, b2ac, sqrt_b2ac;
    for (var i = 0; i < 2; ++i) {
        if (i == 0) {
            b = 6 * x0 - 12 * x1 + 6 * x2;
            a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
            c = 3 * x1 - 3 * x0;
        } else {
            b = 6 * y0 - 12 * y1 + 6 * y2;
            a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
            c = 3 * y1 - 3 * y0;
        }
        if (Math.abs(a) < 1e-12) {
            if (Math.abs(b) < 1e-12) {
                continue;
            }
            t = -c / b;
            if (0 < t && t < 1) {
                tArr.push(t);
            }
            continue;
        }
        b2ac = b * b - 4 * c * a;
        if (b2ac < 0) {
            if (Math.abs(b2ac) < 1e-12) {
                t = -b / (2 * a);
                if (0 < t && t < 1) {
                    tArr.push(t);
                }
            }
            continue;
        }
        sqrt_b2ac = Math.sqrt(b2ac);
        t1 = (-b + sqrt_b2ac) / (2 * a);
        if (0 < t1 && t1 < 1) {
            tArr.push(t1);
        }
        t2 = (-b - sqrt_b2ac) / (2 * a);
        if (0 < t2 && t2 < 1) {
            tArr.push(t2);
        }
    }

    var j = tArr.length;
    while (j--) {
        t = tArr[j];
    }
    return tArr;
}



//For quadratic bezier.
export function quadraticBezierExtremeT(p0, cp1, p) {
    /**
     * if control points are within 
     * bounding box of start and end point 
     * we cant't have extremes
     */
    let top = Math.min(p0.y, p.y)
    let left = Math.min(p0.x, p.x)
    let right = Math.max(p0.x, p.x)
    let bottom = Math.max(p0.y, p.y)
    let a, b, c, t;

    if (
        cp1.y >= top && cp1.y <= bottom &&
        cp1.x >= left && cp1.x <= right
    ) {
        return []
    }


    let [x0, y0, x1, y1, x2, y2] = [p0.x, p0.y, cp1.x, cp1.y, p.x, p.y];
    let extemeT = [];

    for (var i = 0; i < 2; ++i) {
        a = i == 0 ? x0 - 2 * x1 + x2 : y0 - 2 * y1 + y2;
        b = i == 0 ? -2 * x0 + 2 * x1 : -2 * y0 + 2 * y1;
        c = i == 0 ? x0 : y0;
        if (Math.abs(a) > 1e-12) {
            t = -b / (2 * a);
            if (t > 0 && t < 1) {
                extemeT.push(t);
            }
        }
    }
    return extemeT
}



/**
 * check if lines are intersecting
 * returns point and t value (where lines are intersecting)
 */
export function intersectLines(p1, p2, p3, p4) {

    const isOnLine = (x1, y1, x2, y2, px, py, tolerance = 0.001) => {
        var f = function (somex) { return (y2 - y1) / (x2 - x1) * (somex - x1) + y1; };
        return Math.abs(f(px) - py) < tolerance
            && px >= x1 && px <= x2;
    }


    /*
    // flat lines?
    let is_flat1 = p1.y === p2.y || p1.x === p2.x
    let is_flat2 = p3.y === p4.y || p1.y === p2.y
    console.log('flat', is_flat1, is_flat2);
    */


    if (
        Math.max(p1.x, p2.x) < Math.min(p3.x, p4.x) ||
        Math.min(p1.x, p2.x) > Math.max(p3.x, p4.x) ||
        Math.max(p1.y, p2.y) < Math.min(p3.y, p4.y) ||
        Math.min(p1.y, p2.y) > Math.max(p3.y, p4.y)
    ) {
        return false;
    }

    let denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (denominator == 0) {
        return false;
    }

    let a = p1.y - p3.y;
    let b = p1.x - p3.x;
    let numerator1 = ((p4.x - p3.x) * a) - ((p4.y - p3.y) * b);
    let numerator2 = ((p2.x - p1.x) * a) - ((p2.y - p1.y) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;


    let px = p1.x + (a * (p2.x - p1.x)),
        py = p1.y + (a * (p2.y - p1.y));

    let px2 = +px.toFixed(2),
        py2 = +py.toFixed(2);


    // is point in boundaries/actually on line?
    if (
        px2 < +Math.min(p1.x, p2.x).toFixed(2) ||
        px2 > +Math.max(p1.x, p2.x).toFixed(2) ||
        px2 < +Math.min(p3.x, p4.x).toFixed(2) ||
        px2 > +Math.max(p3.x, p4.x).toFixed(2) ||
        py2 < +Math.min(p1.y, p2.y).toFixed(2) ||
        py2 > +Math.max(p1.y, p2.y).toFixed(2) ||
        py2 < +Math.min(p3.y, p4.y).toFixed(2) ||
        py2 > +Math.max(p3.y, p4.y).toFixed(2)
    ) {

        // if final point is on line
        if (isOnLine(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y, 0.1)) {
            return { x: p2.x, y: p2.y };
        }
        return false;
    }
    return { x: px, y: py, t: b };
}




/**
 * check polygon flatness helper  
 * basically a reduced shoelace algorithm
 */
export function commandIsFlat0(points, tolerance = 0.025) {


    let xArr = points.map(pt => { return pt.x })
    let yArr = points.map(pt => { return pt.y })

    let xMin = Math.min(...xArr)
    let xMax = Math.max(...xArr)
    let yMin = Math.min(...yArr)
    let yMax = Math.max(...yArr)
    let w = xMax - xMin
    let h = yMax - yMin


    if (points.length < 3 || (w === 0 || h === 0)) {
        return { area: 0, flat: true, thresh: 0.0001, ratio: 0 };
    }

    tolerance = 0.5;
    let thresh = (w + h) * 0.5 * tolerance;


    //let thresh = tolerance;
    //console.log('w,h', w, h, thresh);

    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let addX = points[i].x;
        let addY = points[i === points.length - 1 ? 0 : i + 1].y;
        let subX = points[i === points.length - 1 ? 0 : i + 1].x;
        let subY = points[i].y;
        area += addX * addY * 0.5 - subX * subY * 0.5;
    }

    //console.log('flatArea', area, points);
    area = +Math.abs(area).toFixed(9);

    let ratio = area / thresh;
    let isFlat = area === 0 ? true : (ratio < 0.15 ? true : false);
    //isFlat= false

    return { area: area, flat: isFlat, thresh: thresh, ratio: ratio };
}


export function commandIsFlat(points, tolerance = 0.025) {

    let p0 = points[0];
    let p = points[points.length - 1];

    let xArr = points.map(pt => { return pt.x })
    let yArr = points.map(pt => { return pt.y })

    let xMin = Math.min(...xArr)
    let xMax = Math.max(...xArr)
    let yMin = Math.min(...yArr)
    let yMax = Math.max(...yArr)
    let w = xMax - xMin
    let h = yMax - yMin


    if (points.length < 3 || (w === 0 || h === 0)) {
        return { area: 0, flat: true, thresh: 0.0001, ratio: 0 };
    }

    let squareDist = getSquareDistance(p0, p)
    let squareDist1 = getSquareDistance(p0, points[0])
    let squareDist2 = points.length > 3 ? getSquareDistance(p, points[1]) : squareDist1;
    let squareDistAvg = (squareDist1 + squareDist2) / 2

    tolerance = 0.5;
    let thresh = (w + h) * 0.5 * tolerance;


    //let thresh = tolerance;
    //console.log('w,h', w, h, thresh);

    let area = 0;
    for (let i = 0, l = points.length; i < l; i++) {
        let addX = points[i].x;
        let addY = points[i === points.length - 1 ? 0 : i + 1].y;
        let subX = points[i === points.length - 1 ? 0 : i + 1].x;
        let subY = points[i].y;
        area += addX * addY * 0.5 - subX * subY * 0.5;
    }

    //console.log('flatArea', area, points);
    area = +Math.abs(area).toFixed(9);

    let diff = Math.abs(area - squareDist);
    let areaDiff = Math.abs(100 - (100 / area * (area + diff)))
    let areaThresh = 1000

    //let ratio = area / (squareDistAvg/areaThresh);
    let ratio = area / (squareDistAvg);


    //let isFlat = area === 0 ? true : (ratio < 0.15 ? true : false);
    //let isFlat = area === 0 ? true : (area < squareDist/areaThresh ? true : false);

    let isFlat = area === 0 ? true : area < squareDistAvg / areaThresh;


    return { area: area, flat: isFlat, thresh: thresh, ratio: ratio, squareDist: squareDist, areaThresh: squareDist / areaThresh };
}




/**
 * sloppy distance calculation
 * based on x/y differences
 */
export function getDistAv(pt1, pt2) {
    let diffX = Math.abs(pt1.x - pt2.x);
    let diffY = Math.abs(pt1.y - pt2.y);
    let diff = (diffX + diffY) / 2;
    return diff;
}

/**
 * get command dimensions 
 * for threshold value
 */

export function getComThresh(pts, tolerance = 0.01) {
    let xArr = pts.map(pt => { return pt.x })
    let yArr = pts.map(pt => { return pt.y })
    let xMin = Math.min(...xArr)
    let xMax = Math.max(...xArr)
    let yMin = Math.min(...yArr)
    let yMax = Math.max(...yArr)

    let w = xMax - xMin
    let h = yMax - yMin

    let dimA = (w + h) / 2

    let thresh = dimA * tolerance
    return thresh
}

export function getComBBTolerance(p1, p2, tolerance = 0.5) {
    let xMin = Math.min(p1.x, p2.x)
    let xMax = Math.max(p1.x, p2.x)
    let yMin = Math.min(p1.y, p2.y)
    let yMax = Math.max(p1.y, p2.y)

    let w = xMax - xMin
    let h = yMax - yMin

    let thresh = (w + h) * 0.5 * tolerance
    if (thresh === 0) {
        //console.log('is zero', w,h, p1, p2);
    }
    return thresh
}


export function checkFlatnessByPolygonArea(points, tolerance = 0.001) {
    let area = 0;
    for (let i = 0, len = points.length; len && i < len; i++) {
        let addX = points[i].x;
        let pt1 = points[i === points.length - 1 ? 0 : i + 1];
        let addY = pt1.y;
        let subX = pt1.x;
        let subY = points[i].y;
        area += addX * addY * 0.5 - subX * subY * 0.5;
    }
    return abs(area) < tolerance;
}

// LG weight/abscissae generator
export function getLegendreGaussValues(n, x1 = -1, x2 = 1) {
    //console.log('add new LG', n);

    let waArr = []
    let z1, z, xm, xl, pp, p3, p2, p1;
    const m = (n + 1) >> 1;
    xm = 0.5 * (x2 + x1);
    xl = 0.5 * (x2 - x1);

    for (let i = m - 1; i >= 0; i--) {
        z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
        do {
            p1 = 1;
            p2 = 0;
            for (let j = 0; j < n; j++) {
                //Loop up the recurrence relation to get the Legendre polynomial evaluated at z.
                p3 = p2;
                p2 = p1;
                p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
            }

            pp = (n * (z * p1 - p2)) / (z * z - 1);
            z1 = z;
            z = z1 - p1 / pp; //Newton’s method

        } while (Math.abs(z - z1) > 1.0e-14);

        let weight = (2 * xl) / ((1 - z * z) * pp * pp);
        let abscissa = xm + xl * z;

        waArr.push(
            [weight, -abscissa],
            [weight, abscissa],
        )
    }

    return waArr;
}



/**
 * ellipse helpers
 * approximate ellipse length 
 * by Legendre-Gauss
 */

export function getEllipseLengthLG(rx, ry, startAngle, endAngle, xAxisRotation = 0, convertParametric = true, degrees = false, wa = []) {

    // convert to radians
    if (degrees) {
        startAngle = (startAngle * PI) / 180;
        endAngle = (endAngle * PI) / 180;
        xAxisRotation = xAxisRotation * PI / 180
    }

    // adjust for axis rotation
    if (xAxisRotation && !convertParametric) {
        startAngle = toParametricAngle(toNonParametricAngle(startAngle, rx, ry) - xAxisRotation, rx, ry)
        endAngle = toParametricAngle(toNonParametricAngle(endAngle, rx, ry) - xAxisRotation, rx, ry);
    }

    else if (xAxisRotation && convertParametric) {
        startAngle -= xAxisRotation
        endAngle -= xAxisRotation
    }

    // convert parametric angles
    if (convertParametric) {
        startAngle = toParametricAngle(startAngle, rx, ry)
        endAngle = toParametricAngle(endAngle, rx, ry)
    }


    // Transform [-1, 1] interval to [startAngle, endAngle]
    let halfInterval = (endAngle - startAngle) * 0.5;
    let midpoint = (endAngle + startAngle) * 0.5;


    // Arc length integral approximation
    let arcLength = 0;
    for (let i = 0; i < wa.length; i++) {
        let [weight, abscissae] = wa[i];
        let theta = midpoint + halfInterval * abscissae;
        let integrand = sqrt(
            pow(rx * sin(theta), 2) + pow(ry * cos(theta), 2)
        );
        arcLength += weight * (integrand);
    }

    return abs(halfInterval * arcLength)
}



/**
 * length calculation wrapper
 * helper for
 * lines, quadratic or cubic béziers
 */

export function base3(t, p1, p2, p3, p4) {
    let t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4,
        t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3;
    return t * t2 - 3 * p1 + 3 * p2;
};



export const cubicBezierLength2 = (x0, y0, cp1x, cp1y, cp2x, cp2y, px, py, t, wa) => {
    if (t === 0) {
        return 0;
    }

    t = t > 1 ? 1 : t < 0 ? 0 : t;
    let t2 = t * 0.5;

    /**
     * set higher legendre gauss weight abscissae values 
     * by more accurate weight/abscissae lookups 
     * https://pomax.github.io/bezierinfo/legendre-gauss.html
     */

    // generate values if not existent

    /*
    let wa_key = `wa${lg}`;
    if (!lgVals[wa_key]) lgVals[wa_key] = getLegendreGaussValues(lg)
    const wa = lgVals[wa_key];
    */

    let sum = 0;

    //let x0 = p0.x, y0 = p0.y, cp1x = cp1.x, cp1y = cp1.y, cp2x = cp2.x, cp2y = cp2.y, px = p.x, py = p.y;
    let len = wa.length;

    for (let i = 0; i < len; i++) {
        // weight and abscissae 
        let [w, a] = [wa[i][0], wa[i][1]];
        let ct1_t = t2 * a;
        let ct0 = -ct1_t + t2;

        /*
        let xbase0 = base3(ct0, p0.x, cp1.x, cp2.x, p.x)
        let ybase0 = base3(ct0, p0.y, cp1.y, cp2.y, p.y)
        */
        let xbase0 = base3(ct0, x0, cp1x, cp2x, px)
        let ybase0 = base3(ct0, y0, cp1y, cp2y, py)

        let comb0 = xbase0 * xbase0 + ybase0 * ybase0;

        sum += w * Math.sqrt(comb0)

    }
    return t2 * sum;
}



export function getLength(pts, t = 1, lg = 0) {


    /**
     * Based on snap.svg bezlen() function
     * https://github.com/adobe-webplatform/Snap.svg/blob/master/dist/snap.svg.js#L5786
     */


    const cubicBezierLength = (p0, cp1, cp2, p, t, lg) => {
        if (t === 0) {
            return 0;
        }


        t = t > 1 ? 1 : t < 0 ? 0 : t;
        let t2 = t / 2;

        /**
         * set higher legendre gauss weight abscissae values 
         * by more accurate weight/abscissae lookups 
         * https://pomax.github.io/bezierinfo/legendre-gauss.html
         */

        // generate values if not existent

        let wa_key = `wa${lg}`;
        if (!lgVals[wa_key]) lgVals[wa_key] = getLegendreGaussValues(lg)

        const wa = lgVals[wa_key];
        let sum = 0;

        let x0 = p0.x, y0 = p0.y, cp1x = cp1.x, cp1y = cp1.y, cp2x = cp2.x, cp2y = cp2.y, px = p.x, py = p.y;

        for (let i = 0, len = wa.length; i < len; i++) {
            // weight and abscissae 
            let [w, a] = [wa[i][0], wa[i][1]];
            let ct1_t = t2 * a;
            let ct0 = -ct1_t + t2;

            /*
            let xbase0 = base3(ct0, p0.x, cp1.x, cp2.x, p.x)
            let ybase0 = base3(ct0, p0.y, cp1.y, cp2.y, p.y)
            */
            let xbase0 = base3(ct0, x0, cp1x, cp2x, px)
            let ybase0 = base3(ct0, y0, cp1y, cp2y, py)

            let comb0 = xbase0 ** 2 + ybase0 ** 2;

            sum += w * Math.sqrt(comb0)

        }
        return t2 * sum;
    }


    const quadraticBezierLength = (p0, cp1, p, t, checkFlat = false) => {
        if (t === 0) {
            return 0;
        }
        // is flat/linear – treat as line
        if (checkFlat) {
            let l1 = getDistance(p0, cp1) + getDistance(cp1, p);
            let l2 = getDistance(p0, p);
            if (l1 === l2) {
                return l2;
            }
        }

        let a, b, c, d, e, e1, d1, v1x, v1y;
        v1x = cp1.x * 2;
        v1y = cp1.y * 2;
        d = p0.x - v1x + p.x;
        d1 = p0.y - v1y + p.y;
        e = v1x - 2 * p0.x;
        e1 = v1y - 2 * p0.y;
        a = 4 * (d * d + d1 * d1);
        b = 4 * (d * e + d1 * e1);
        c = e * e + e1 * e1;

        const bt = b / (2 * a),
            ct = c / a,
            ut = t + bt,
            k = ct - bt ** 2;

        return (
            (sqrt(a) / 2) *
            (ut * sqrt(ut ** 2 + k) -
                bt * sqrt(bt ** 2 + k) +
                k *
                log((ut + sqrt(ut ** 2 + k)) / (bt + sqrt(bt ** 2 + k))))
        );
    }


    let length
    if (pts.length === 4) {
        length = cubicBezierLength(pts[0], pts[1], pts[2], pts[3], t, lg)
    }
    else if (pts.length === 3) {
        length = quadraticBezierLength(pts[0], pts[1], pts[2], t)
    }
    else {
        length = getDistance(pts[0], pts[1])
    }

    return length;
}
