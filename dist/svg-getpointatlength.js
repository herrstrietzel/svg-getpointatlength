(function (exports) {
    'use strict';

    const {
        abs, acos, asin, atan, atan2, ceil, cos, exp, floor,
        log, hypot, max, min, pow, random, round, sin, sqrt, tan, PI
    } = Math;

    // Legendre Gauss weight and abscissa values
    const lgVals = {};
    const PI_half = PI * 0.5;

    const deg2rad = 0.017453292519943295;

    const rad2deg = 57.29577951308232;

    function roundPoint(pt={}, decimals=3){
        return {x:+pt.x.toFixed(decimals), y:+pt.y.toFixed(decimals)}
    }

    // get angle helper
    function getAngle(p1, p2, normalize = false) {

        let angle = atan2(p2.y - p1.y, p2.x - p1.x);
        // normalize negative angles
        if (normalize && angle < 0) angle += PI * 2;
        return angle
    }

    function normalizeAngle(angle) {
        let PI2 = PI * 2;
        // Normalize to 0-2π range
        angle = angle % PI2;
        return angle < 0 ? angle + PI2 : angle;
    }

    /**
     * get distance between 2 points
     * pythagorean theorem
     */
    function getDistance(p1, p2) {

        // check horizontal or vertical
        if (p1.y === p2.y) {
            return abs(p2.x - p1.x)
        }
        if (p1.x === p2.x) {
            return abs(p2.y - p1.y)
        }

        return sqrt(
            (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
        );
    }

    function getSquareDistance(p1, p2) {
        return (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
    }

    /**
    * Linear  interpolation (LERP) helper
    */
    function interpolate(p1, p2, t, getTangent = false) {

        let pt = {
            x: (p2.x - p1.x) * t + p1.x,
            y: (p2.y - p1.y) * t + p1.y,
        };

        if (getTangent) {
            pt.angle = getAngle(p1, p2);

            // normalize negative angles
            if (pt.angle < 0) pt.angle += PI * 2;
        }

        return pt
    }

    /**
     * get point on 
     * quadratic or cubic bezier
     * or line
     */

    function pointAtT(pts, t = 0.5, getTangent = false, getCpts = false) {

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
                    pt.angle = getAngle(p0, cp1);
                }

                else if (t === 1 && !shortCp2) {
                    pt.x = p.x;
                    pt.y = p.y;
                    pt.angle = getAngle(cp2, p);
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
                        pt.angle = getAngle(m3, m4);

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

        };

        let pt;
        if (pts.length > 2) {
            pt = getPointAtBezierT(pts, t, getTangent);
        }

        else {
            let p0 = pts[0];
            let p = pts[1];
            pt = interpolate(p0, p, t, getTangent);

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
        if (getTangent && pt.angle < 0) pt.angle += PI * 2;

        return pt
    }

    /**
     * get vertices from path command final on-path points
     */
    function getPathDataVertices(pathData, decimals = -1) {
        let polyPoints = [];
        let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };

        pathData.forEach((com) => {
            let { type, values } = com;
            // get final on path point from last 2 values
            if (values.length) {
                let pt = values.length > 1 ? { x: values[values.length - 2], y: values[values.length - 1] }
                    : (type === 'V' ? { x: p0.x, y: values[0] } : { x: values[0], y: p0.y });

                if (decimals > -1) pt = roundPoint(pt);
                polyPoints.push(pt);
                p0 = pt;
            }
        });
        return polyPoints;
    }

    function svgArcToCenterParam(x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2, normalize = true
    ) {

        // helper for angle calculation
        const getAngle = (cx, cy, x, y, normalize = true) => {
            let angle = atan2(y - cy, x - cx);
            if (normalize && angle < 0) angle += PI * 2;
            return angle
        };

        // make sure rx, ry are positive
        rx = abs(rx);
        ry = abs(ry);

        // normalize xAxis rotation
        xAxisRotation = rx === ry ? 0 : (xAxisRotation < 0 && normalize ? xAxisRotation + 360 : xAxisRotation);

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

        /**
         * if rx===ry x-axis rotation is ignored
         * otherwise convert degrees to radians
         */
        let phi = rx === ry ? 0 : xAxisRotation * deg2rad;
        let cx, cy;

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
            let lambdaRoot = sqrt(lambda);
            rx = rx * lambdaRoot;
            ry = ry * lambdaRoot;

            // save real rx/ry
            arcData.rx = rx;
            arcData.ry = ry;
        }

        let rxry = rx * ry;
        let rxy1_ = rx * y1_;
        let ryx1_ = ry * x1_;
        let sum_of_sq = rxy1_ ** 2 + ryx1_ ** 2; // sum of square
        if (!sum_of_sq) {

            throw Error("start point can not be same as end point");
        }
        let coe = sqrt(abs((rxry * rxry - sum_of_sq) / sum_of_sq));
        if (largeArc === sweep) {
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
        let startAngle = getAngle(cx, cy, x1, y1, normalize);
        let endAngle = getAngle(cx, cy, x2, y2, normalize);

        // adjust end angle

        // Adjust angles based on sweep direction
        if (sweep) {
            // Clockwise
            if (endAngle < startAngle) {
                endAngle += PI * 2;
            }
        } else {
            // Counterclockwise
            if (endAngle > startAngle) {
                endAngle -= PI * 2;
            }
        }

        let deltaAngle = endAngle - startAngle;

        // The rest of your code remains the same
        arcData.startAngle = startAngle;
        arcData.startAngle_deg = startAngle * rad2deg;
        arcData.endAngle = endAngle;
        arcData.endAngle_deg = endAngle * rad2deg;
        arcData.deltaAngle = deltaAngle;
        arcData.deltaAngle_deg = deltaAngle * rad2deg;

        return arcData;
    }

    /**
     * reduce polypoints
     * for sloppy dimension approximations
     */
    function reducePoints(points, maxPoints = 48) {
        if (!Array.isArray(points) || points.length <= maxPoints) return points;

        // Calculate how many points to skip between kept points
        let len = points.length;
        let step = len / maxPoints;
        let reduced = [points[0]];

        for (let i = 0; i < maxPoints; i++) {
            reduced.push(points[floor(i * step)]);
        }

        let lenR = reduced.length;
        // Always include the last point to maintain path integrity
        if (reduced[lenR - 1] !== points[len - 1]) {
            reduced[lenR - 1] = points[len - 1];
        }

        return reduced;
    }

    function getPointOnEllipse(cx, cy, rx, ry, angle, ellipseRotation = 0, parametricAngle = true, degrees = false) {

        // Convert degrees to radians
        angle = degrees ? angle * deg2rad : angle;
        ellipseRotation = degrees ? ellipseRotation * deg2rad : ellipseRotation;
        // reset rotation for circles or 360 degree 
        ellipseRotation = rx !== ry ? (ellipseRotation !== PI * 2 ? ellipseRotation : 0) : 0;

        // is ellipse
        if (parametricAngle && rx !== ry) {
            // adjust angle for ellipse rotation
            angle = ellipseRotation ? angle - ellipseRotation : angle;
            // Get the parametric angle for the ellipse

            let angleParametric = toParametricAngle(angle);
            // Ensure the parametric angle is in the correct quadrant
            angle = cos(angle) < 0 ? angleParametric + PI : angleParametric;
        }

        // Calculate the point on the ellipse without rotation
        let x = cx + rx * cos(angle),
            y = cy + ry * sin(angle);
        let pt = {
            x: x,
            y: y
        };

        if (ellipseRotation) {
            pt.x = cx + (x - cx) * cos(ellipseRotation) - (y - cy) * sin(ellipseRotation);
            pt.y = cy + (x - cx) * sin(ellipseRotation) + (y - cy) * cos(ellipseRotation);
        }
        return pt
    }

    // to parametric angle helper
    function toParametricAngle(angle, rx, ry) {

        if (rx === ry || (angle % PI * 0.5 === 0)) return angle;
        let angleP = atan(tan(angle) * (rx / ry));

        // Ensure the parametric angle is in the correct quadrant
        angleP = cos(angle) < 0 ? angleP + PI : angleP;

        return angleP
    }

    /**
     * get tangent angle on ellipse
     * at angle
     */
    function getTangentAngle(rx, ry, parametricAngle) {

        // Derivative components
        let dx = -rx * sin(parametricAngle);
        let dy = ry * cos(parametricAngle);
        let tangentAngle = atan2(dy, dx);

        return tangentAngle;
    }

    /**
     * get bezier extremes
     */

    function getBezierExtremes(cpts = []) {

        let extremes = [];

        // check if extremes are plausible at all
        let hasExtremes = checkBezierExtremes(cpts);

        if (!hasExtremes) return extremes;

        let tArr = getBezierExtremeT(cpts);
        tArr.forEach(t => {
            let pt = pointAtT(cpts, t);
            extremes.push(pt);
        });

        return extremes;
    }

    /**
     * if control points are within
     * bounding box of start and end point
     * we cant't have extremes
     */
    function checkBezierExtremes(cpts = []) {

        let len = cpts.length;
        let isCubic = len === 4;
        let p0 = cpts[0];
        let cp1 = cpts[1];
        let cp2 = isCubic ? cpts[2] : cp1;
        let p = isCubic ? cpts[3] : cpts[2];

        let y = min(p0.y, p.y);
        let x = min(p0.x, p.x);
        let right = max(p0.x, p.x);
        let bottom = max(p0.y, p.y);
        let hasExtremes = false;

        if (
            cp1.y < y ||
            cp1.y > bottom ||
            cp2.y < y ||
            cp2.y > bottom ||
            cp1.x < x ||
            cp1.x > right ||
            cp2.x < x ||
            cp2.x > right
        ) {
            hasExtremes = true;
        }

        return hasExtremes;
    }

    function getBezierExtremeT(pts) {
        let tArr = pts.length === 4 ? cubicBezierExtremeT(pts[0], pts[1], pts[2], pts[3]) : quadraticBezierExtremeT(pts[0], pts[1], pts[2]);
        return tArr;
    }

    /**
     * based on Nikos M.'s answer
     * how-do-you-calculate-the-axis-aligned-bounding-box-of-an-ellipse
     * https://stackoverflow.com/questions/87734/#75031511
     * See also: https://github.com/foo123/Geometrize
     */

    function getArcExtemes_fromParametrized(p0, p, arcParams = {}) {

        // all angles are already in radians
        // start and end angles are parametrized
        let { rx, ry, cx, cy, xAxisRotation, startAngle, endAngle, deltaAngle, sweep, deltaAngle_param } = arcParams;

        // collect extreme points – add end point
        let extremes = [];

        if (rx === ry) {

            // check if delta is right angle
            let startAngle_right = abs(startAngle % PI_half) === 0;
            let endAngle_right = startAngle_right ? abs(endAngle % PI_half) === 0 : false;

            if (startAngle_right && endAngle_right) {

                let isQuarterCircle = abs(deltaAngle % PI_half) === 0;
                let isSemiCircle = isQuarterCircle ? abs(deltaAngle % PI) === 0 : false;

                if (isSemiCircle) {
                    let isVertical = p0.x === p.x;
                    let isHorizontal = p0.y === p.y;

                    let r = sweep ? rx : -rx;

                    if (isHorizontal) {
                        let ltr = p0.x < p.x;
                        r = ltr ? -r : r;
                        extremes = [{ x: cx, y: cy + r }];
                        // console.log('isHorizontal', extremes, ltr);
                    }
                    if (isVertical) {
                        let ttb = p0.y < p.y;
                        r = ttb ? r : -r;
                        extremes = [{ x: cx + r, y: cy }];
                        // console.log('isVertical', ttb);
                    }

                    return extremes;
                }

            }

        }

        // adjust to parametrized delta
        deltaAngle = endAngle - startAngle;

        // compute point on ellipse from angle around ellipse (theta)
        const arc = (theta, cx, cy, rx, ry, alpha) => {

            // theta is angle in radians around arc
            // alpha is angle of rotation of ellipse in radians
            let cosA = alpha ? cos(alpha) : 1;
            let sinA = alpha ? sin(alpha) : 0;

            let x = rx * cos(theta),
                y = ry * sin(theta);

            return {
                x: cx + cosA * x - sinA * y,
                y: cy + sinA * x + cosA * y
            };
        };

        let tanA = tan(xAxisRotation),
            p1, p2, p3, p4, theta;

        /**
        * find min/max from zeroes of directional derivative along x and y
        * along x axis
        */
        theta = atan2(-ry * tanA, rx);

        let angle1 = theta;
        let angle2 = theta + PI;
        let angle3 = atan2(ry, rx * tanA);
        let angle4 = angle3 + PI;

        // inner bounding box
        let xArr = [p0.x, p.x];
        let yArr = [p0.y, p.y];
        let xMin = min(...xArr);
        let xMax = max(...xArr);
        let yMin = min(...yArr);
        let yMax = max(...yArr);

        // on path point close after start
        let angleAfterStart = (endAngle) - deltaAngle * 0.999;

        let pP2 = arc(angleAfterStart, cx, cy, rx, ry, xAxisRotation);

        // on path point close before end
        let angleBeforeEnd = endAngle - deltaAngle * 0.001;

        let pP3 = arc(angleBeforeEnd, cx, cy, rx, ry, xAxisRotation);

        // renderPoint(svg, pP2, 'blue', '5%')
        // renderPoint(svg, pP3, 'orange')

        /**
         * expected extremes
         * if leaving inner bounding box
         * (between segment start and end point)
         * otherwise exclude elliptic extreme points
        */

        // right
        if (pP2.x > xMax || pP3.x > xMax) {
            // get point for this theta
            p1 = arc(angle1, cx, cy, rx, ry, xAxisRotation);
            extremes.push(p1);
        }

        // left
        if (pP2.x < xMin || pP3.x < xMin) {
            // get anti-symmetric point
            p2 = arc(angle2, cx, cy, rx, ry, xAxisRotation);
            extremes.push(p2);
        }

        // top
        if (pP2.y < yMin || pP3.y < yMin) {
            // get anti-symmetric point
            p4 = arc(angle4, cx, cy, rx, ry, xAxisRotation);
            extremes.push(p4);
        }

        // bottom
        if (pP2.y > yMax || pP3.y > yMax) {
            // get point for this theta
            p3 = arc(angle3, cx, cy, rx, ry, xAxisRotation);
            extremes.push(p3);

        }

        return extremes;
    }

    // cubic bezier.
    function cubicBezierExtremeT(p0, cp1, cp2, p) {
        let [x0, y0, x1, y1, x2, y2, x3, y3] = [p0.x, p0.y, cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y];

        /**
         * if control points are within 
         * bounding box of start and end point 
         * we cant't have extremes
         */
        let top = min(p0.y, p.y);
        let left = min(p0.x, p.x);
        let right = max(p0.x, p.x);
        let bottom = max(p0.y, p.y);

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
            if (abs(a) < 1e-12) {
                if (abs(b) < 1e-12) {
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
                if (abs(b2ac) < 1e-12) {
                    t = -b / (2 * a);
                    if (0 < t && t < 1) {
                        tArr.push(t);
                    }
                }
                continue;
            }
            sqrt_b2ac = sqrt(b2ac);
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

    function quadraticBezierExtremeT(p0, cp1, p) {
        /**
         * if control points are within 
         * bounding box of start and end point 
         * we cant't have extremes
         */
        let top = min(p0.y, p.y);
        let left = min(p0.x, p.x);
        let right = max(p0.x, p.x);
        let bottom = max(p0.y, p.y);
        let a, b, t;

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
            if (abs(a) > 1e-12) {
                t = -b / (2 * a);
                if (t > 0 && t < 1) {
                    extemeT.push(t);
                }
            }
        }
        return extemeT
    }

    function checkFlatnessByPolygonArea(points, tolerance = 0.001) {
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
    function getLegendreGaussValues(n, x1 = -1, x2 = 1) {

        let waArr = [];
        let z1, z, xm, xl, pp, p3, p2, p1;
        const m = (n + 1) >> 1;
        xm = 0.5 * (x2 + x1);
        xl = 0.5 * (x2 - x1);

        for (let i = m - 1; i >= 0; i--) {
            z = cos((PI * (i + 0.75)) / (n + 0.5));
            do {
                p1 = 1;
                p2 = 0;
                for (let j = 0; j < n; j++) {

                    p3 = p2;
                    p2 = p1;
                    p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
                }

                pp = (n * (z * p1 - p2)) / (z * z - 1);
                z1 = z;
                z = z1 - p1 / pp; //Newton’s method

            } while (abs(z - z1) > 1.0e-14);

            let weight = (2 * xl) / ((1 - z * z) * pp * pp);
            let abscissa = xm + xl * z;

            waArr.push(
                [weight, -abscissa],
                [weight, abscissa],
            );
        }

        return waArr;
    }

    /**
     * ellipse helpers
     * approximate ellipse length 
     * by Legendre-Gauss
     */

    function getEllipseLengthLG(rx, ry, startAngle, endAngle, wa = []) {

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

    function base3(t, p1, p2, p3, p4) {
        let t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4,
            t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3;
        return t * t2 - 3 * p1 + 3 * p2;
    }

    function getLength(pts, t = 1, lg = 0) {

        /**
         * Based on snap.svg bezlen() function
         * https://github.com/adobe-webplatform/Snap.svg/blob/master/dist/snap.svg.js#L5786
         */

        const cubicBezierLength = (p0, cp1, cp2, p, t = 0, lg) => {
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
            if (!lgVals[wa_key]) lgVals[wa_key] = getLegendreGaussValues(lg);

            const wa = lgVals[wa_key];
            let sum = 0;

            let x0 = p0.x, y0 = p0.y, cp1x = cp1.x, cp1y = cp1.y, cp2x = cp2.x, cp2y = cp2.y, px = p.x, py = p.y;

            for (let i = 0, len = wa.length; i < len; i++) {
                // weight and abscissae 
                let [w, a] = [wa[i][0], wa[i][1]];
                let ct1_t = t2 * a;
                let ct0 = -ct1_t + t2;

                let xbase0 = base3(ct0, x0, cp1x, cp2x, px);
                let ybase0 = base3(ct0, y0, cp1y, cp2y, py);

                let comb0 = xbase0 ** 2 + ybase0 ** 2;

                sum += w * sqrt(comb0);

            }
            return t2 * sum;
        };

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
        };

        let length;
        if (pts.length === 4) {
            length = cubicBezierLength(pts[0], pts[1], pts[2], pts[3], t, lg);

        }
        else if (pts.length === 3) {
            length = quadraticBezierLength(pts[0], pts[1], pts[2], t);
        }
        else {
            length = getDistance(pts[0], pts[1]);
        }

        return length;
    }

    /**
     * split compound paths into 
     * sub path data array
     */
    function splitSubpaths(pathData) {

        let subPathArr = [];

        
        try{
            let subPathIndices = pathData.map((com, i) => (com.type.toLowerCase() === 'm' ? i : -1)).filter(i => i !== -1);

        }catch{
            console.log('catch', pathData);
        }

        let subPathIndices = pathData.map((com, i) => (com.type.toLowerCase() === 'm' ? i : -1)).filter(i => i !== -1);

        // no compound path
        if (subPathIndices.length === 1) {
            return [pathData]
        }
        subPathIndices.forEach((index, i) => {
            subPathArr.push(pathData.slice(index, subPathIndices[i + 1]));
        });

        // add indices from path data
        let ind = 0;

        subPathArr.forEach((sub,s)=>{
            sub.forEach((com,i)=>{
                subPathArr[s][i].index = ind;
                ind++;
            });
        });

        return subPathArr;
    }

    /**
     * check whether a polygon is likely 
     * to be closed 
     * or an open polyline 
     */
    function isClosedPolygon(pts, reduce = 24) {

        let ptsR = reducePoints(pts, reduce);
        let { width, height } = getPolyBBox(ptsR);

        let dimAvg = (width + height) / 2;

        let closingThresh = (dimAvg) ** 2;
        let closingDist = getSquareDistance(pts[0], pts[pts.length - 1]);

        return closingDist < closingThresh;
    }

    /**
     * calculate polygon bbox
     */
    function getPolyBBox(vertices, decimals = -1) {
        let xArr = vertices.map(pt => pt.x);
        let yArr = vertices.map(pt => pt.y);
        let left = min(...xArr);
        let right = max(...xArr);
        let top = min(...yArr);
        let bottom = max(...yArr);
        let bb = {
            x: left,
            left: left,
            right: right,
            y: top,
            top: top,
            bottom: bottom,
            width: right - left,
            height: bottom - top
        };

        // round

        if (decimals > -1) {
            for (let prop in bb) {
                bb[prop] = +bb[prop].toFixed(decimals);
            }
        }

        return bb;
    }

    function getSubPathBBoxes(subPaths) {
        let bboxArr = [];
        subPaths.forEach((pathData) => {

            let bb = getPathDataBBox_sloppy(pathData);
            bboxArr.push(bb);
        });

        return bboxArr;
    }

    function checkBBoxIntersections(bb, bb1) {
        let [x, y, width, height, right, bottom] = [
            bb.x,
            bb.y,
            bb.width,
            bb.height,
            bb.x + bb.width,
            bb.y + bb.height
        ];
        let [x1, y1, width1, height1, right1, bottom1] = [
            bb1.x,
            bb1.y,
            bb1.width,
            bb1.height,
            bb1.x + bb1.width,
            bb1.y + bb1.height
        ];
        let intersects = false;
        if (width * height != width1 * height1) {
            if (width * height > width1 * height1) {
                if (x < x1 && right > right1 && y < y1 && bottom > bottom1) {
                    intersects = true;
                }
            }
        }
        return intersects;
    }

    /**
     * sloppy path bbox aaproximation
     */

    function getPathDataBBox_sloppy(pathData) {
        let pts = getPathDataPoly(pathData);
        let bb = getPolyBBox(pts);
        return bb;
    }

    /**
     * get path data poly
     * including command points
     * handy for faster/sloppy bbox approximations
     */

    function getPathDataPoly(pathData) {

        let poly = [];
        for (let i = 0; i < pathData.length; i++) {
            let com = pathData[i];
            let prev = i > 0 ? pathData[i - 1] : pathData[i];
            let { type, values } = com;
            let p0 = { x: prev.values[prev.values.length - 2], y: prev.values[prev.values.length - 1] };
            let p = values.length ? { x: values[values.length - 2], y: values[values.length - 1] } : '';
            let cp1 = values.length ? { x: values[0], y: values[1] } : '';

            switch (type) {

                // convert to cubic to get polygon
                case 'A':

                    let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = values;
                    let isEllipse = rx!==ry;

                    if(!isEllipse){

                        let dx = p.x-p0.x;
                        let dy = p.y-p0.y;

                        let cx = p0.x + dx/2;
                        let cy = p0.y + dy/2;

                        let horizontal = dy === 0;
                        let vertical = dx === 0;
                        let isSemiCircle = (horizontal && !vertical) || (!horizontal && vertical) ;

        
                        if(isSemiCircle){

                            let r = horizontal ? dx*0.5 : dy*0.5;
                            r = sweep ? r : -r;
                            let c2 = horizontal ? {x:cx, y:cy-r} : {x:cx-r, y:cy};
                            

                            poly.push(c2);

                        }

                    }

                    break;

                case 'C':
                    let cp2 = { x: values[2], y: values[3] };
                    poly.push(cp1, cp2);
                    break;
                case 'Q':
                    poly.push(cp1);
                    break;
            }

            // M and L commands
            if (type.toLowerCase() !== 'z') {
                poly.push(p);
            }
        }

        return poly;
    }

    function getEllipseArea(rx, ry, startAngle, endAngle, xAxisRotation=0) {

        // Convert absolute angles to parametric angles
        let isEllipse = rx!==ry;
        if(!isEllipse) xAxisRotation = 0;

        // adjust angles for xAxis rotation
        if(isEllipse){
            startAngle = toParametricAngle(startAngle - xAxisRotation, rx, ry);
            endAngle = toParametricAngle(endAngle - xAxisRotation, rx, ry);
        }

        let totalArea = PI * rx * ry;
        let delta = endAngle - startAngle;
        let belowQuarter = abs(delta)<PI*0.5;

        let PI2 = PI*2;
        let angleDiff = (delta + PI2) % (PI2);

        // If circle, use simple circular formula
        if (!isEllipse) {
            let rat = abs(delta) / PI2;
            return totalArea*rat ;
        }

        delta = !xAxisRotation || (xAxisRotation<0 && belowQuarter)  ? abs(delta) : delta;
        angleDiff = (delta + PI2) % (PI2);

        return totalArea * (angleDiff / PI2);
    }

    /**
     * get bezier area
     */
    function getBezierArea(pts) {

        let [p0, cp1, cp2, p] = [pts[0], pts[1], pts[2], pts[pts.length - 1]];
        let area;

        if (pts.length < 3) return 0;

        // quadratic beziers
        if (pts.length === 3) {
            cp1 = {
                x: pts[0].x * 1 / 3 + pts[1].x * 2 / 3,
                y: pts[0].y * 1 / 3 + pts[1].y * 2 / 3
            };

            cp2 = {
                x: pts[2].x * 1 / 3 + pts[1].x * 2 / 3,
                y: pts[2].y * 1 / 3 + pts[1].y * 2 / 3
            };
        }

        area = ((p0.x * (-2 * cp1.y - cp2.y + 3 * p.y) +
            cp1.x * (2 * p0.y - cp2.y - p.y) +
            cp2.x * (p0.y + cp1.y - 2 * p.y) +
            p.x * (-3 * p0.y + cp1.y + 2 * cp2.y)) *
            3) / 20;

        return -area;
    }

    function getPolygonArea(points, tolerance = 0.001) {
        let area = 0;
        for (let i = 0, len = points.length; len && i < len; i++) {
            let addX = points[i].x;
            let addY = points[i === points.length - 1 ? 0 : i + 1].y;
            let subX = points[i === points.length - 1 ? 0 : i + 1].x;
            let subY = points[i].y;
            area += addX * addY * 0.5 - subX * subY * 0.5;
        }
        return area;
    }

    /**
     * convert cubic circle approximations
     * to more compact arcs
     */

    function pathDataArcsToCubics(pathData, {
        arcAccuracy = 1
    } = {}) {

        let pathDataCubic = [pathData[0]];
        for (let i = 1, len = pathData.length; i < len; i++) {

            let com = pathData[i];
            let comPrev = pathData[i - 1];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;
            let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

            if (com.type === 'A') {
                // add all C commands instead of Arc
                let cubicArcs = arcToBezier(p0, com.values, arcAccuracy);
                cubicArcs.forEach((cubicArc) => {
                    pathDataCubic.push(cubicArc);
                });
            }

            else {
                // add command
                pathDataCubic.push(com);
            }
        }

        return pathDataCubic

    }

    function pathDataQuadraticToCubic(pathData) {

        let pathDataQuadratic = [pathData[0]];
        for (let i = 1, len = pathData.length; i < len; i++) {

            let com = pathData[i];
            let comPrev = pathData[i - 1];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;
            let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

            if (com.type === 'Q') {
                pathDataQuadratic.push(quadratic2Cubic(p0, com.values));
            }

            else {
                // add command
                pathDataQuadratic.push(com);
            }
        }

        return pathDataQuadratic
    }

    /**
     * convert quadratic commands to cubic
     */
    function quadratic2Cubic(p0, values) {
        if (Array.isArray(p0)) {
            p0 = {
                x: p0[0],
                y: p0[1]
            };
        }
        let cp1 = {
            x: p0.x + 2 / 3 * (values[0] - p0.x),
            y: p0.y + 2 / 3 * (values[1] - p0.y)
        };
        let cp2 = {
            x: values[2] + 2 / 3 * (values[0] - values[2]),
            y: values[3] + 2 / 3 * (values[1] - values[3])
        };
        return ({ type: "C", values: [cp1.x, cp1.y, cp2.x, cp2.y, values[2], values[3]] });
    }

    /**
     * convert pathData to 
     * This is just a port of Dmitry Baranovskiy's 
     * pathToRelative/Absolute methods used in snap.svg
     * https://github.com/adobe-webplatform/Snap.svg/
     */

    function pathDataToAbsoluteOrRelative(pathData, toRelative = false, decimals = -1) {
        if (decimals >= 0) {
            pathData[0].values = pathData[0].values.map(val => +val.toFixed(decimals));
        }

        let M = pathData[0].values;
        let x = M[0],
            y = M[1],
            mx = x,
            my = y;

        for (let i = 1, len = pathData.length; i < len; i++) {
            let com = pathData[i];
            let { type, values } = com;
            let newType = toRelative ? type.toLowerCase() : type.toUpperCase();

            if (type !== newType) {
                type = newType;
                com.type = type;

                switch (type) {
                    case "a":
                    case "A":
                        values[5] = toRelative ? values[5] - x : values[5] + x;
                        values[6] = toRelative ? values[6] - y : values[6] + y;
                        break;
                    case "v":
                    case "V":
                        values[0] = toRelative ? values[0] - y : values[0] + y;
                        break;
                    case "h":
                    case "H":
                        values[0] = toRelative ? values[0] - x : values[0] + x;
                        break;
                    case "m":
                    case "M":
                        if (toRelative) {
                            values[0] -= x;
                            values[1] -= y;
                        } else {
                            values[0] += x;
                            values[1] += y;
                        }
                        mx = toRelative ? values[0] + x : values[0];
                        my = toRelative ? values[1] + y : values[1];
                        break;
                    default:
                        if (values.length) {
                            for (let v = 0; v < values.length; v++) {
                                values[v] = toRelative
                                    ? values[v] - (v % 2 ? y : x)
                                    : values[v] + (v % 2 ? y : x);
                            }
                        }
                }
            }

            let vLen = values.length;
            switch (type) {
                case "z":
                case "Z":
                    x = mx;
                    y = my;
                    break;
                case "h":
                case "H":
                    x = toRelative ? x + values[0] : values[0];
                    break;
                case "v":
                case "V":
                    y = toRelative ? y + values[0] : values[0];
                    break;
                case "m":
                case "M":
                    mx = values[vLen - 2] + (toRelative ? x : 0);
                    my = values[vLen - 1] + (toRelative ? y : 0);
                default:
                    x = values[vLen - 2] + (toRelative ? x : 0);
                    y = values[vLen - 1] + (toRelative ? y : 0);
            }

            if (decimals >= 0) {
                com.values = com.values.map(val => +val.toFixed(decimals));
            }
        }
        return pathData;
    }

    function pathDataToAbsolute(pathData, decimals = -1) {
        return pathDataToAbsoluteOrRelative(pathData, false, decimals)
    }

    /**
     * decompose/convert shorthands to "longhand" commands:
     * H, V, S, T => L, L, C, Q
     * reversed method: pathDataToShorthands()
     */

    function pathDataToLonghands(pathData, decimals = -1, test = true) {

        // analyze pathdata – if you're sure your data is already absolute skip it via test=false
        let hasRel=false;

        if (test) {
            let commandTokens = pathData.map(com => { return com.type }).join('');
            let hasShorthands = /[hstv]/gi.test(commandTokens);
            hasRel = /[astvqmhlc]/g.test(commandTokens);

            if (!hasShorthands) {
                return pathData;
            }
        }

        pathData = test && hasRel ? pathDataToAbsolute(pathData, decimals) : pathData;

        let pathDataLonghand = [];
        let comPrev = {
            type: "M",
            values: pathData[0].values
        };
        pathDataLonghand.push(comPrev);

        for (let i = 1, len = pathData.length; i < len; i++) {
            let com = pathData[i];
            let { type, values } = com;
            let valuesL = values.length;
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;
            let [x, y] = [values[valuesL - 2], values[valuesL - 1]];
            let cp1X, cp1Y, cpN1X, cpN1Y, cpN2X, cpN2Y, cp2X, cp2Y;
            let [prevX, prevY] = [
                valuesPrev[valuesPrevL - 2],
                valuesPrev[valuesPrevL - 1]
            ];
            switch (type) {
                case "H":
                    comPrev = {
                        type: "L",
                        values: [values[0], prevY]
                    };
                    break;
                case "V":
                    comPrev = {
                        type: "L",
                        values: [prevX, values[0]]
                    };
                    break;
                case "T":
                    [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                    [prevX, prevY] = [
                        valuesPrev[valuesPrevL - 2],
                        valuesPrev[valuesPrevL - 1]
                    ];
                    // new control point
                    cpN1X = prevX + (prevX - cp1X);
                    cpN1Y = prevY + (prevY - cp1Y);
                    comPrev = {
                        type: "Q",
                        values: [cpN1X, cpN1Y, x, y]
                    };
                    break;
                case "S":

                    [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                    [prevX, prevY] = [
                        valuesPrev[valuesPrevL - 2],
                        valuesPrev[valuesPrevL - 1]
                    ];

                    [cp2X, cp2Y] =
                        valuesPrevL > 2 && comPrev.type!=='A' ?
                            [valuesPrev[2], valuesPrev[3]] :
                            [prevX, prevY];

                    // new control points
                    cpN1X = 2 * prevX - cp2X;
                    cpN1Y = 2 * prevY - cp2Y;
                    cpN2X = values[0];
                    cpN2Y = values[1];
                    comPrev = {
                        type: "C",
                        values: [cpN1X, cpN1Y, cpN2X, cpN2Y, x, y]
                    };

                    break;
                default:
                    comPrev = {
                        type: type,
                        values: values
                    };
            }
            // round final longhand values
            if (decimals > -1) {
                comPrev.values = comPrev.values.map(val => { return +val.toFixed(decimals) });
            }

            pathDataLonghand.push(comPrev);
        }
        return pathDataLonghand;
    }

    /** 
     * convert arctocommands to cubic bezier
     * based on puzrin's a2c.js
     * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
     * returns pathData array
    */

    function arcToBezier(p0, values, splitSegments = 1) {
        const TAU = PI * 2;
        let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

        if (rx === 0 || ry === 0) {
            return []
        }

        let phi = rotation ? rotation * TAU / 360 : 0;
        let sinphi = phi ? sin(phi) : 0;
        let cosphi = phi ? cos(phi) : 1;
        let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2;
        let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2;

        if (pxp === 0 && pyp === 0) {
            return []
        }
        rx = abs(rx);
        ry = abs(ry);
        let lambda =
            pxp * pxp / (rx * rx) +
            pyp * pyp / (ry * ry);
        if (lambda > 1) {
            let lambdaRt = sqrt(lambda);
            rx *= lambdaRt;
            ry *= lambdaRt;
        }

        /** 
         * parametrize arc to 
         * get center point start and end angles
         */
        let rxsq = rx * rx,
            rysq = rx === ry ? rxsq : ry * ry;

        let pxpsq = pxp * pxp,
            pypsq = pyp * pyp;
        let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq);

        if (radicant <= 0) {
            radicant = 0;
        } else {
            radicant /= (rxsq * pypsq) + (rysq * pxpsq);
            radicant = sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);
        }

        let centerxp = radicant ? radicant * rx / ry * pyp : 0;
        let centeryp = radicant ? radicant * -ry / rx * pxp : 0;
        let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2;
        let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2;

        let vx1 = (pxp - centerxp) / rx;
        let vy1 = (pyp - centeryp) / ry;
        let vx2 = (-pxp - centerxp) / rx;
        let vy2 = (-pyp - centeryp) / ry;

        // get start and end angle
        const vectorAngle = (ux, uy, vx, vy) => {
            let dot = +(ux * vx + uy * vy).toFixed(9);
            if (dot === 1 || dot === -1) {
                return dot === 1 ? 0 : PI
            }
            dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot);
            let sign = (ux * vy - uy * vx < 0) ? -1 : 1;
            return sign * acos(dot);
        };

        let ang1 = vectorAngle(1, 0, vx1, vy1),
            ang2 = vectorAngle(vx1, vy1, vx2, vy2);

        if (sweepFlag === 0 && ang2 > 0) {
            ang2 -= PI * 2;
        }
        else if (sweepFlag === 1 && ang2 < 0) {
            ang2 += PI * 2;
        }

        let ratio = +(abs(ang2) / (TAU / 4)).toFixed(0) || 1;

        // increase segments for more accureate length calculations
        let segments = ratio * splitSegments;
        ang2 /= segments;
        let pathDataArc = [];

        // If 90 degree circular arc, use a constant
        // https://pomax.github.io/bezierinfo/#circles_cubic
        // k=0.551784777779014
        const angle90 = 1.5707963267948966;
        const k = 0.551785;
        let a = ang2 === angle90 ? k :
            (
                ang2 === -angle90 ? -k : 4 / 3 * tan(ang2 / 4)
            );

        let cos2 = ang2 ? cos(ang2) : 1;
        let sin2 = ang2 ? sin(ang2) : 0;
        let type = 'C';

        const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
            let x1 = ang1 != ang2 ? cos(ang1) : cos2;
            let y1 = ang1 != ang2 ? sin(ang1) : sin2;
            let x2 = cos(ang1 + ang2);
            let y2 = sin(ang1 + ang2);

            return [
                { x: x1 - y1 * a, y: y1 + x1 * a },
                { x: x2 + y2 * a, y: y2 - x2 * a },
                { x: x2, y: y2 }
            ];
        };

        for (let i = 0; i < segments; i++) {
            let com = { type: type, values: [] };
            let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

            curve.forEach((pt) => {
                let x = pt.x * rx;
                let y = pt.y * ry;
                com.values.push(cosphi * x - sinphi * y + centerx, sinphi * x + cosphi * y + centery);
            });
            pathDataArc.push(com);
            ang1 += ang2;
        }

        return pathDataArc;
    }

    /**
     * parse normalized
     */

    function normalizePathData(pathData = [],
        {
            toAbsolute = true,
            toLonghands = true,
            quadraticToCubic = false,
            arcToCubic = false,
            arcAccuracy = 4,
        } = {},

        {
            hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true, testTypes = false
        } = {}
    ) {

        // pathdata properties - test= true adds a manual test 
        if (testTypes) {

            let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
            hasRelatives = /[lcqamts]/gi.test(commands);
            hasQuadratics = /[qt]/gi.test(commands);
            hasArcs = /[a]/gi.test(commands);
            hasShorthands = /[vhst]/gi.test(commands);
            isPoly = /[mlz]/gi.test(commands);
        }

        /**
         * normalize:
         * convert to all absolute
         * all longhands
         */

        if ((hasQuadratics && quadraticToCubic) || (hasArcs && arcToCubic)) {
            toLonghands = true;
            toAbsolute = true;
        }

        if (hasRelatives && toAbsolute) pathData = pathDataToAbsoluteOrRelative(pathData, false);
        if (hasShorthands && toLonghands) pathData = pathDataToLonghands(pathData, -1, false);
        if (hasArcs && arcToCubic) pathData = pathDataArcsToCubics(pathData, arcAccuracy);
        if (hasQuadratics && quadraticToCubic) pathData = pathDataQuadraticToCubic(pathData);

        return pathData;

    }

    function parsePathDataNormalized$1(d,
        {
            // necessary for most calculations
            toAbsolute = true,
            toLonghands = true,

            // not necessary unless you need cubics only
            quadraticToCubic = false,

            // mostly a fallback if arc calculations fail      
            arcToCubic = false,
            // arc to cubic precision - adds more segments for better precision     
            arcAccuracy = 4,
        } = {}
    ) {

        let pathDataObj = parsePathDataString(d);
        let { hasRelatives, hasShorthands, hasQuadratics, hasArcs } = pathDataObj;
        let pathData = pathDataObj.pathData;

        // normalize
        pathData = normalizePathData(pathData,
            { toAbsolute, toLonghands, quadraticToCubic, arcToCubic, arcAccuracy },

            { hasRelatives, hasShorthands, hasQuadratics, hasArcs }
        );

        return pathData;
    }

    const commandSet = new Set([
        0x4D, 0x6D, 0x41, 0x61, 0x43, 0x63,
        0x4C, 0x6C, 0x51, 0x71, 0x53, 0x73,
        0x54, 0x74, 0x48, 0x68, 0x56, 0x76,
        0x5A, 0x7A
    ]);

    const paramCountsArr = new Uint8Array(128);
    // M starting point
    paramCountsArr[0x4D] = 2;
    paramCountsArr[0x6D] = 2;

    // A Arc
    paramCountsArr[0x41] = 7;
    paramCountsArr[0x61] = 7;

    // C Cubic Bézier
    paramCountsArr[0x43] = 6;
    paramCountsArr[0x63] = 6;

    // L Line To
    paramCountsArr[0x4C] = 2;
    paramCountsArr[0x6C] = 2;

    // Q Quadratic Bézier
    paramCountsArr[0x51] = 4;
    paramCountsArr[0x71] = 4;

    // S Smooth Cubic Bézier
    paramCountsArr[0x53] = 4;
    paramCountsArr[0x73] = 4;

    // T Smooth Quadratic Bézier
    paramCountsArr[0x54] = 2;
    paramCountsArr[0x74] = 2;

    // H Horizontal Line
    paramCountsArr[0x48] = 1;
    paramCountsArr[0x68] = 1;

    // V Vertical Line
    paramCountsArr[0x56] = 1;
    paramCountsArr[0x76] = 1;

    // Z Close Path
    paramCountsArr[0x5A] = 0;
    paramCountsArr[0x7A] = 0;

    function parsePathDataString(d, debug = true) {

        d = d.trim();

        const SPECIAL_SPACES = new Set([
            0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
            0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF
        ]);

        const isSpace = (ch) => {
            return (ch === 0x20) || (ch === 0x002C) || // White spaces or comma
                (ch === 0x0A) || (ch === 0x0D) ||   // nl cr
                (ch === 0x2028) || (ch === 0x2029) || // Line terminators
                (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
                (ch >= 0x1680 && SPECIAL_SPACES.has(ch));
        };

        let i = 0, len = d.length;
        let lastCommand = "";
        let pathData = [];
        let itemCount = -1;
        let val = '';
        let wasE = false;
        let floatCount = 0;
        let valueIndex = 0;
        let maxParams = 0;
        let needsNewSegment = false;
        let foundCommands = new Set([]);

        // collect errors 
        let log = [];
        let feedback;

        const addSeg = () => {
            // Create new segment if needed before adding the minus sign
            if (needsNewSegment) {

                // sanitize implicit linetos
                if (lastCommand === 'M') lastCommand = 'L';
                else if (lastCommand === 'm') lastCommand = 'l';

                pathData.push({ type: lastCommand, values: [] });

                itemCount++;
                valueIndex = 0;
                needsNewSegment = false;
            }
        };

        const pushVal = (checkFloats = false) => {

            // regular value or float
            if (!checkFloats ? val !== '' : floatCount > 0) {

                // error: no first command
                if (debug && itemCount === -1) {

                    feedback = 'Pathdata must start with M command';
                    log.push(feedback);

                    // add M command to collect subsequent errors
                    lastCommand = 'M';
                    pathData.push({ type: lastCommand, values: [] });
                    maxParams = 2;
                    valueIndex = 0;
                    itemCount++;

                }

                if (lastCommand === 'A' || lastCommand === 'a') {
                    val = sanitizeArc();

                    pathData[itemCount].values.push(...val);

                } else {
                    // error: leading zeroes
                    if (debug && val[1] && val[1] !== '.' && val[0] === '0') {
                        feedback = `${itemCount}. command: Leading zeros not valid: ${val}`;
                        log.push(feedback);
                    }
                    pathData[itemCount].values.push(+val);
                }

                valueIndex++;
                val = '';
                floatCount = 0;

                // Mark that a new segment is needed if maxParams is reached
                needsNewSegment = valueIndex >= maxParams;

            }
        };

        const sanitizeArc = () => {

            let valLen = val.length;
            let arcSucks = false;

            // large arc and sweep
            if (valueIndex === 3 && valLen === 2) {

                val = [+val[0], +val[1]];
                arcSucks = true;
                valueIndex++;
            }

            // sweep and final
            else if (valueIndex === 4 && valLen > 1) {

                val = [+val[0], +val[1]];
                arcSucks = true;
                valueIndex++;
            }

            // large arc, sweep and final pt combined
            else if (valueIndex === 3 && valLen >= 3) {

                val = [+val[0], +val[1], +val.substring(2)];
                arcSucks = true;
                valueIndex += 2;
            }

            return !arcSucks ? [+val] : val;

        };

        const validateCommand = () => {

            if (itemCount > 0) {
                let lastCom = pathData[itemCount];
                let valLen = lastCom.values.length;

                if ((valLen && valLen < maxParams) || (valLen && valLen > maxParams) || ((lastCommand === 'z' || lastCommand === 'Z') && valLen > 0)) {
                    let diff = maxParams - valLen;
                    feedback = `${itemCount}. command of type "${lastCommand}": ${diff} values too few - ${maxParams} expected`;

                    let prevFeedback = log[log.length - 1];

                    if (prevFeedback !== feedback) {
                        log.push(feedback);
                    }
                }
            }
        };

        let isE = false;
        let isMinusorPlus = false;
        let isDot = false;

        while (i < len) {

            let charCode = d.charCodeAt(i);

            let isDigit = (charCode > 47 && charCode < 58);
            if (!isDigit) {
                isE = (charCode === 101 || charCode === 69);
                isMinusorPlus = (charCode === 45 || charCode === 43);
                isDot = charCode === 46;
            }

            /**
             * number related:
             * digit, e-notation, dot or -/+ operator
             */

            if (
                isDigit ||
                isMinusorPlus ||
                isDot ||
                isE
            ) {

                // minus or float/dot separated: 0x2D=hyphen; 0x2E=dot
                if (!wasE && (charCode === 0x2D || charCode === 0x2E)) {

                    // checkFloats changes condition for value adding
                    let checkFloats = charCode === 0x2E;

                    // new val
                    pushVal(checkFloats);

                    // new segment
                    addSeg();

                    // concatenated floats
                    if (checkFloats) {
                        floatCount++;
                    }
                }

                // regular splitting
                else {

                    addSeg();
                }

                val += d[i];

                // e/scientific notation in value
                wasE = isE;
                i++;
                continue;
            }

            /**
             * Separated by white space 
             */
            if ((charCode < 48 || charCode > 5759) && isSpace(charCode)) {

                // push value
                pushVal();

                i++;
                continue;
            }

            /**
             * New command introduced by
             * alphabetic A-Z character
             */
            if (charCode > 64) {

                // is valid command
                let isValid = commandSet.has(charCode);

                if (!isValid) {
                    feedback = `${itemCount}. command "${d[i]}" is not a valid type`;
                    log.push(feedback);
                    i++;
                    continue
                }

                // command is concatenated without whitespace
                if (val !== '') {
                    pathData[itemCount].values.push(+val);
                    valueIndex++;
                    val = '';
                }

                // check if previous command was correctly closed
                if (debug) validateCommand();

                lastCommand = d[i];
                maxParams = paramCountsArr[charCode];
                let isM = lastCommand === 'M' || lastCommand === 'm';
                let wasClosePath = itemCount > 0 && (pathData[itemCount].type === 'z' || pathData[itemCount].type === 'Z');

                foundCommands.add(lastCommand);

                // add omitted M command after Z
                if (wasClosePath && !isM) {
                    pathData.push({ type: 'm', values: [0, 0] });
                    itemCount++;
                }

                // init new command
                pathData.push({ type: lastCommand, values: [] });
                itemCount++;

                // reset counters
                floatCount = 0;
                valueIndex = 0;
                needsNewSegment = false;

                i++;
                continue;
            }

            // exceptions - prevent infinite loop
            if (!isDigit) {
                feedback = `${itemCount}. ${d[i]} is not a valid separarator or token`;
                log.push(feedback);
                val = '';
            }

            i++;

        }

        // final value
        pushVal();
        if (debug) validateCommand();

        // return error log
        if (debug && log.length) {
            feedback = 'Invalid path data:\n' + log.join('\n');
            if (debug === 'log') {
                console.log(feedback);
            } else {
                throw new Error(feedback)
            }
        }

        pathData[0].type = 'M';

        /**
         * check if absolute/relative or 
         * shorthands are present
         * to specify if normalization is required
         */

        let commands = Array.from(foundCommands).join('');
        let hasRelatives = /[lcqamts]/g.test(commands);
        let hasShorthands = /[vhst]/gi.test(commands);
        let hasArcs = /[a]/gi.test(commands);
        let hasQuadratics = /[qt]/gi.test(commands);

        return {
            pathData,
            hasRelatives,
            hasShorthands,
            hasQuadratics,
            hasArcs
        }

    }

    function stringifyPathData(pathData) {
        return pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
    }

    // retrieve pathdata from svg geometry elements
    function getPathDataFromEl(el, stringify=false) {

        let pathData = [];
        let type = el.nodeName;
        let atts, attNames, d, x, y, width, height, r, rx, ry, cx, cy, x1, x2, y1, y2;

        // convert relative or absolute units 
        const svgElUnitsToPixel = (el, decimals = 9) => {

            const svg = el.nodeName !== "svg" ? el.closest("svg") : el;

            // convert real life units to pixels
            const translateUnitToPixel = (value) => {

                if (value === null) {
                    return 0
                }

                let dpi = 96;
                let unit = value.match(/([a-z]+)/gi);
                unit = unit ? unit[0] : "";
                let val = parseFloat(value);
                let rat;

                // no unit - already pixes/user unit
                if (!unit) {
                    return val;
                }

                switch (unit) {
                    case "in":
                        rat = dpi;
                        break;
                    case "pt":
                        rat = (1 / 72) * 96;
                        break;
                    case "cm":
                        rat = (1 / 2.54) * 96;
                        break;
                    case "mm":
                        rat = ((1 / 2.54) * 96) / 10;
                        break;
                    // just a default approximation
                    case "em":
                    case "rem":
                        rat = 16;
                        break;
                    default:
                        rat = 1;
                }
                let valuePx = val * rat;
                return +valuePx.toFixed(decimals);
            };

            // svg width and height attributes
            let width = svg.getAttribute("width");
            width = width ? translateUnitToPixel(width) : 300;
            let height = svg.getAttribute("height");
            height = width ? translateUnitToPixel(height) : 150;

            let vB = svg.getAttribute("viewBox");
            vB = vB
                ? vB
                    .replace(/,/g, " ")
                    .split(" ")
                    .filter(Boolean)
                    .map((val) => {
                        return +val;
                    })
                : [];

            let w = vB.length ? vB[2] : width;
            let h = vB.length ? vB[3] : height;
            let scaleX = w / 100;
            let scaleY = h / 100;
            let scalRoot = sqrt((pow(scaleX, 2) + pow(scaleY, 2)) / 2);

            let attsH = ["x", "width", "x1", "x2", "rx", "cx", "r"];
            let attsV = ["y", "height", "y1", "y2", "ry", "cy"];

            let atts = el.getAttributeNames();
            atts.forEach((att) => {
                let val = el.getAttribute(att);
                let valAbs = val;
                if (attsH.includes(att) || attsV.includes(att)) {
                    let scale = attsH.includes(att) ? scaleX : scaleY;
                    scale = att === "r" && w != h ? scalRoot : scale;
                    let unit = val.match(/([a-z|%]+)/gi);
                    unit = unit ? unit[0] : "";
                    if (val.includes("%")) {
                        valAbs = parseFloat(val) * scale;
                    }

                    else {
                        valAbs = translateUnitToPixel(val);
                    }
                    el.setAttribute(att, +valAbs);
                }
            });
        };

        svgElUnitsToPixel(el);

        const getAtts = (attNames) => {
            atts = {};
            attNames.forEach(att => {
                atts[att] = +el.getAttribute(att);
            });
            return atts
        };

        switch (type) {
            case 'path':
                d = el.getAttribute("d");
                pathData = parsePathDataNormalized$1(d);
                break;

            case 'rect':
                attNames = ['x', 'y', 'width', 'height', 'rx', 'ry'];
                ({ x, y, width, height, rx, ry } = getAtts(attNames));

                if (!rx && !ry) {
                    pathData = [
                        { type: "M", values: [x, y] },
                        { type: "L", values: [x + width, y] },
                        { type: "L", values: [x + width, y + height] },
                        { type: "L", values: [x, y + height] },
                        { type: "Z", values: [] }
                    ];
                } else {

                    if (rx > width / 2) {
                        rx = width / 2;
                    }
                    if (ry > height / 2) {
                        ry = height / 2;
                    }
                    pathData = [
                        { type: "M", values: [x + rx, y] },
                        { type: "L", values: [x + width - rx, y] },
                        { type: "A", values: [rx, ry, 0, 0, 1, x + width, y + ry] },
                        { type: "L", values: [x + width, y + height - ry] },
                        { type: "A", values: [rx, ry, 0, 0, 1, x + width - rx, y + height] },
                        { type: "L", values: [x + rx, y + height] },
                        { type: "A", values: [rx, ry, 0, 0, 1, x, y + height - ry] },
                        { type: "L", values: [x, y + ry] },
                        { type: "A", values: [rx, ry, 0, 0, 1, x + rx, y] },
                        { type: "Z", values: [] }
                    ];
                }
                break;

            case 'circle':
            case 'ellipse':

                attNames = ['cx', 'cy', 'rx', 'ry', 'r'];
                ({ cx, cy, r, rx, ry } = getAtts(attNames));

                if (type === 'circle') {
                    r = r;
                    rx = r;
                    ry = r;
                } else {
                    rx = rx ? rx : r;
                    ry = ry ? ry : r;
                }

                pathData = [
                    { type: "M", values: [cx + rx, cy] },
                    { type: "A", values: [rx, ry, 0, 1, 1, cx - rx, cy] },
                    { type: "A", values: [rx, ry, 0, 1, 1, cx + rx, cy] },
                ];

                break;
            case 'line':
                attNames = ['x1', 'y1', 'x2', 'y2'];
                ({ x1, y1, x2, y2 } = getAtts(attNames));
                pathData = [
                    { type: "M", values: [x1, y1] },
                    { type: "L", values: [x2, y2] }
                ];
                break;
            case 'polygon':
            case 'polyline':

                let points = el.getAttribute('points').replaceAll(',', ' ').split(' ').filter(Boolean);

                for (let i = 0; i < points.length; i += 2) {
                    pathData.push({
                        type: (i === 0 ? "M" : "L"),
                        values: [+points[i], +points[i + 1]]
                    });
                }
                if (type === 'polygon') {
                    pathData.push({
                        type: "Z",
                        values: []
                    });
                }
                break;
        }

        return stringify ? stringifyPathData(pathData): pathData;

    }

    /**
     * normalize input
     * path data string
     * path data array
     * native getPathData object
     */
    function normalizePathInput(d, { arcToCubic = false, arcAccuracy = 4, quadraticToCubic = false } = {}, validate=false) {

        let report = {isValid:false, dummyPath: `M40 10h20v50h-20zm0 60h20v20h-20z`};

        const cleanSvg = (svgString) => {
            return svgString
                // Remove XML prologues like <?xml ... ?>
                .replace(/<\?xml[\s\S]*?\?>/gi, "")
                // Remove DOCTYPE declarations
                .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
                // Remove comments <!-- ... -->
                .replace(/<!--[\s\S]*?-->/g, "")
                // Trim extra whitespace
                .trim();
        };

        // no input
        if (!d) return;

        // check type: string, array or element
        let type = Array.isArray(d) && d.length ? 'array' : (d ? typeof d : null);

        /**
        * if cached JSON
        */
        if (d && type === 'string') {

            let isSVGMarkup = d.includes('<svg') && d.includes('</svg');
            let isLengthObject = d.includes('totalLength') && d.includes('segments');
            let isPointObject = !isLengthObject ? d.includes('{') && d.includes('"x"') && d.includes('"y"') : false;

            if (isSVGMarkup) {
                d = cleanSvg(d);

            }

            if (!isSVGMarkup && (isLengthObject || isPointObject)) {
                try {
                    let obj = JSON.parse(d);
                    if (isLengthObject) {
                        d = obj.pathData;
                    }
                    else if (isPointObject) {
                        d = obj;

                    }
                    type = 'array';

                } catch {
                    throw Error("No valid JSON");
                }
            }

        }

        // new path data
        let pathData = [];

        // conversions
        let options = { arcToCubic, arcAccuracy, quadraticToCubic };
        let needNormalization = true;

        // is SVG parent or child element
        if (type === 'object' && d.nodeName) {

            let svgEls = ['path', 'polygon', 'polyline', 'line', 'circle', 'ellipse', 'rect'];

            // is parent SVG
            if (d.nodeName === 'svg') {
                let els = d.querySelectorAll(`${svgEls.join(', ')}`);
                els.forEach(el => {
                    pathData.push(...getPathDataFromEl(el));
                });
            }

            // is SVG child element
            else if (d.closest('svg') && svgEls.includes(d.nodeName)) {
                type = 'element';
                pathData = getPathDataFromEl(d);

            }

            if (pathData.length) {
                d = pathData;
                type = 'array';
            }
        }

        // exit
        if (!type) return null;

        /**
         * convert native path data object
         * to decoupled object array
         * for better editability
         * Firefox has native support fr getPathData
         */
        const nativePathDataToArr = (pathData) => {
            let pathDataArr = [];
            let lastType = 'M';
            pathData.forEach(com => {
                let { type, values } = com;

                // add explicit M subpath start when omitted
                if (lastType.toLocaleLowerCase() === 'z' && type.toLocaleLowerCase() !== 'm') {

                    pathDataArr.push({ type: 'm', values: [0, 0] });
                }
                pathDataArr.push({ type: type, values: values });
                lastType = type;
            });
            return pathDataArr;
        };

        /**
         * group point pairs
         * and convert to pathData
         */
        const coordinatePairsToPathData = (d) => {
            let pathData = [{ type: 'M', values: [d[0], d[1]] }];
            for (let i = 3, l = d.length; i < l; i += 2) {
                let [x, y] = [d[i - 1], d[i]];
                pathData.push({ type: 'L', values: [x, y] });
            }
            return pathData
        };

        // poly string to point data array
        const coordinatePairsToPoly = (d) => {
            let poly = [{ x: d[0], y: d[1] }];
            for (let i = 3, l = d.length; i < l; i += 2) {
                let [x, y] = [d[i - 1], d[i]];
                poly.push({ x, y });
            }
            return poly
        };

        // is already path data array
        if (type === 'array') {

            let isPathData = d[0].type ? true : false;

            // 1. is pathdata array
            if (isPathData) {
                // is native pathdata object (Firefox supports getpathData() natively)
                let isNative = typeof d[0] === 'object' && typeof d[0].constructor !== 'object';
                if (isNative) {
                    d = nativePathDataToArr(d);
                }

                pathData = d;

            } else {

                // multi poly point array
                let isMulti = Array.isArray(d[0]);

                if (isMulti) {

                    let isNestedPointArray = typeof d[0][0] === 'object' && d[0][0].x && !isNaN(d[0][0].x) ? true : false;
                    let isNestedPairs = d[0][0].length === 2 && !isNaN(d[0][0][0]) ? true : false;

                    if (isNestedPointArray || isNestedPairs) {

                        for (let i = 0, l = d.length; i < l; i++) {
                            let subPath = d[i];
                            for (let j = 0, k = subPath.length; j < k; j++) {
                                let line = subPath[j];
                                let type = j === 0 ? 'M' : 'L';
                                let pts = isNestedPointArray ? [line.x, line.y] : [line[0], line[1]];
                                pathData.push({ type: type, values: pts });
                            }
                        }
                    } else {
                        let isSinglePairArr = d[0].length === 2 && !isNaN(d[0][0]) ? true : false;
                        if (isSinglePairArr) {
                            pathData = [{ type: 'M', values: [d[0][0], d[0][1]] }];
                            for (let i = 1, l = d.length; i < l; i++) {
                                let pt = d[i];
                                pathData.push({ type: 'L', values: [pt[0], pt[1]] });
                            }
                        }
                    }
                }

                // flat
                else {
                    let isFlatArr = !isNaN(d[0]) ? true : false;
                    let isPointObject = d[0].hasOwnProperty('x') && d[0].hasOwnProperty('y');

                    if (isPointObject) {

                        pathData = [{ type: 'M', values: [d[0].x, d[0].y] }];
                        for (let i = 1, l = d.length; i < l; i++) {
                            let pt = d[i];
                            pathData.push({ type: 'L', values: [pt.x, pt.y] });
                        }
                        let isclosed = isClosedPolygon(d);

                        if (isclosed) pathData.push({ type: 'Z', values: [] });
                    }

                    else if (isFlatArr) {
                        pathData = coordinatePairsToPathData(d);
                    }
                }
            }
        }

        // is string
        else {

            d = d.trim();
            let isSVG = d.startsWith('<svg');

            /**
             * if svg parse
             * and combine elements pathData
             */
            if (isSVG) {

                let svg = new DOMParser().parseFromString(d, 'text/html').querySelector('svg');
                let allowed = ['path', 'polygon', 'polyline', 'line', 'rect', 'circle', 'ellipse'];
                let children = svg.querySelectorAll(`${allowed.join(', ')}`);

                for (let i = 0, l = children.length; i < l; i++) {
                    let child = children[i];
                    let isDef = child.closest('defs') || child.closest('symbol') || child.closest('pattern') || child.closest('mask') || child.closest('clipPath');

                    // ignore defs, masks, clip-paths etc
                    if (isDef) continue;

                    // check hidden layers - commonly hidden via attribute by graphic apps
                    let parentGroup = child.closest('g');
                    if (parentGroup) {
                        let isHidden = (parentGroup.getAttribute('display') === 'none') || parentGroup.style.display === 'none' ? true : false;
                        if (isHidden) continue
                    }

                    let pathDataEl = getPathDataFromEl(child);
                    pathData.push(...pathDataEl);

                }

            }

            // regular d pathdata string - parse and normalize
            else {
                let isPathDataString = d.startsWith('M') || d.startsWith('m');
                let hasCommands = /[lcqamtsvhs]/gi.test(d);

                if (isPathDataString) {
                    pathData = parsePathDataNormalized$1(d, options);

                    // no normalization needed when parsed from string
                    needNormalization = false;
                } else {
                    let isPolyString = !isNaN(d.trim()[0]) && !hasCommands;

                    if (isPolyString ) {

                        try {

                            d = d.split(/,| /).map(Number);
                            pathData = coordinatePairsToPathData(d);

                            let pts = coordinatePairsToPoly(d);
                            let isclosed = isClosedPolygon(pts);

                            if (isclosed) pathData.push({ type: 'Z', values: [] });
                            needNormalization = false;
                        } catch {
                            console.warn('not a valid poly string');
                        }
                    } 

                }
            }
        }

        if(!pathData.length){
            console.warn('No valid input  - could not create lookup');
            if(validate){
                pathData =  parsePathDataNormalized$1(report.dummyPath);
                return report
            }
            return [];
        }

        // is valid return result
        if(validate){
            report.isValid=true;

            return report
        }

        if (needNormalization) pathData = normalizePathData(pathData, options);

        return pathData;

    }

    function PathLengthObject(props = {}) {
        Object.assign(this, props);
    }

    // just a convenience wrapper
    function getPathLookup(d, precision = 'medium', onlyLength = false, getTangent = true, {
        arcToCubic=false,
        arcAccuracy= 2,
        quadraticToCubic= false
    }={}){
        return getPathLengthLookup$1(d, precision, onlyLength, getTangent, {arcToCubic, arcAccuracy, quadraticToCubic})
    }

    function getPathLengthLookup$1(d, precision = 'medium', onlyLength = false, getTangent = true, 
    {
        // command conversions: disabled by default
        arcToCubic=false,
        arcAccuracy= 2,
        quadraticToCubic= false
    }={}

    ) {

        /**
         * if cached JSON
         */

        if(d && typeof d==='string' && d.includes('totalLength') && d.includes('segments') ){
            try{
                let lengthLookup = JSON.parse(d);    
                let lookup = new PathLengthObject(lengthLookup);

                return lookup;
            }catch{
                throw Error("No valid JSON");
            }
        }

        // exit
        if (!d) throw Error("No path data defined");

        // increase arc to cubic precision for high quality settings
        if(arcToCubic && precision==='high') arcAccuracy=4;
        let conversions = {arcToCubic, arcAccuracy, quadraticToCubic};
        let pathData = normalizePathInput(d,  conversions);

        // exit
        if (!pathData.length) throw Error("No valid path data to parse");

        /**
         * create lookup
         * object
         */
        let lengthLookup = getPathLengthLookupFromPathData(pathData, precision, onlyLength, getTangent);
        lengthLookup.pathData = pathData;

        if (onlyLength) {
            return lengthLookup.pathLength;
        } else {
            return new PathLengthObject(lengthLookup);
        }
    }

    // simple length calculation
    function getPathLength(d, precision = 'medium', onlyLength = true) {
        let pathData = normalizePathInput(d);
        return getPathDataLength(pathData, precision, onlyLength);
    }

    // only total pathlength
    function getPathDataLength(pathData, precision = 'medium', onlyLength = true) {
        return getPathLengthLookupFromPathData(pathData, precision, onlyLength)
    }

    function getPathLengthLookupFromPathData(pathData, precision = 'medium', onlyLength = false, getTangent = true) {

        // disable tangent calculation in length-only mode
        if (onlyLength) getTangent = false;

        /**
         * auto adjust Legendre-Gauss accuracy
         * precision for arc approximation
        */

        let auto_lg = precision === 'high' ? true : false;
        let lg = precision === 'medium' ? 24 : 12;
        let lgArr = [12, 24, 36, 48, 60, 64, 72];

        // add weight/abscissa values if not existent
        let wa_key = `wa${lg}`;
        if (!lgVals[wa_key]) {
            lgVals[wa_key] = getLegendreGaussValues(lg);
        }

        let wa = lgVals[wa_key];

        let tDivisionsQ = precision === 'low' ? 10 : 12;
        let tDivisionsC = precision === 'low' ? 15 : (precision === 'medium' ? 23 : 35);
        let tDivisions = tDivisionsC;

        let l = pathData.length;

        let pathLength = 0;
        let M = pathData[0];
        let lengthLookup = { totalLength: 0, segments: [] };
        let p0={x:M.values[0], y:M.values[0]};
        let tangentAdjust = 0;

        

        let segIndex =0;
        for (let i = 1; i < l; i++) {
            let comPrev = pathData[i - 1];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;
            p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

            let com = pathData[i];
            let { type, values } = com;
            let valuesL = values.length;
            let p = { x: values[valuesL - 2], y: values[valuesL - 1] };
            let cp1, cp2, angle;
            let len = 0;
            let t = 1;

            // collect segment data in object
            let lengthObj = {
                type: type,
                index: i,
                segIndex,
                com: { type: type, values: values, p0: p0 },
                lengths: [],
                points: [],
                angles: [],
                total: 0,
            };

            // interpret closePath as lineto
            switch (type) {
                case "M":
                    // new M
                    M = pathData[i];
                    len = 0;
                    break;

                case "Z":
                case "z":
                case "L":
                    if (type.toLowerCase() === 'z') {
                        // line to previous M
                        p = { x: M.values[0], y: M.values[1] };
                        lengthObj.type = "L";
                    }
                    len = getLength([p0, p]);
                    lengthObj.points.push(p0, p);

                    if (getTangent) {
                        angle = getAngle(p0, p);
                        lengthObj.angles.push(angle);
                    }
                    break;

                case "A":
                    p = {
                        x: com.values[5],
                        y: com.values[6]
                    };

                    // we take xAxis rotation from parametrisation to adjust for circular arcs
                    let [largeArc, sweep] = [com.values[3], com.values[4]];

                    // get parametrized arc properties
                    let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], largeArc, sweep, p.x, p.y, false);
                    let { cx, cy, rx, ry, startAngle, endAngle, deltaAngle, xAxisRotation } = arcData;

                    tangentAdjust = !xAxisRotation ? (!sweep ? -PI : 0) : (!sweep ? -PI_half : PI_half);
                    tangentAdjust = xAxisRotation < 0 ? tangentAdjust * -1 : tangentAdjust;

                    arcData.tangentAdjust = tangentAdjust;
                    arcData.isEllipse = rx!==ry;

                    // original path data for area calculations
                    lengthObj.arcData = arcData;
                    

                    let deltaAngle_param = deltaAngle;

                    /** 
                     * if arc is elliptic
                     */
                    if (rx !== ry) {

                        // convert x-axis-rotation to radians
                        xAxisRotation = xAxisRotation * deg2rad;

                        // values are alredy in radians

                        // add weight/abscissa values if not existent
                        let wa_key = `wa${lg}`;
                        if (!lgVals[wa_key]) {
                            lgVals[wa_key] = getLegendreGaussValues(lg);
                        }

                        if (!lgVals['wa48']) {
                            lgVals['wa48'] = getLegendreGaussValues(48);
                        }

                        wa = lgVals[wa_key];
                        let wa48 = lgVals['wa48'];

                        /** 
                         * convert angles to parametric
                         * adjusted for xAxisRotation
                         * increases performance
                         */

                        startAngle = toParametricAngle((startAngle - xAxisRotation), rx, ry);
                        endAngle = toParametricAngle((endAngle - xAxisRotation), rx, ry);

                        // recalculate parametrized delta
                        deltaAngle_param = endAngle - startAngle;

                        let signChange = deltaAngle > 0 && deltaAngle_param < 0 || deltaAngle < 0 && deltaAngle_param > 0;

                        deltaAngle = signChange ? deltaAngle : deltaAngle_param;

                        // adjust end angle
                        if (sweep && startAngle > endAngle) {
                            endAngle += PI * 2;
                        }

                        if (!sweep && startAngle < endAngle) {
                            endAngle -= PI * 2;
                        }

                        // precision
                        let lenNew = 0;

                        // first length and angle
                        lengthObj.lengths.push(pathLength);
                        lengthObj.angles.push(startAngle);

                        for (let i = 1; i < tDivisionsC; i++) {
                            let endAngle = startAngle + deltaAngle / tDivisionsC * i;

                            lenNew = getEllipseLengthLG(rx, ry, startAngle, endAngle, wa);

                            len += lenNew;
                            lengthObj.lengths.push(lenNew + pathLength);
                            lengthObj.angles.push(endAngle);
                        }

                        // last angle
                        lengthObj.angles.push(endAngle);

                        // last length - use higher precision
                        len = getEllipseLengthLG(rx, ry, startAngle, endAngle, wa48);

                        // parametrized arc data for tangent calculations
                        lengthObj.arcData_param = {
                            cx,
                            cy,
                            rx,
                            ry,
                            deltaAngle,
                            deltaAngle_param,
                            startAngle,
                            endAngle,
                            largeArc,
                            sweep,
                            xAxisRotation,

                            tangentAdjust,
                            isEllipse: rx!==ry
                        };

                    }
                    // circular arc
                    else {

                        /** 
                         * get arc length: 
                         * perfect circle length can be linearly interpolated 
                         * according to delta angle
                         */
                        len = 2 * PI * rx * (1 / 360 * abs(deltaAngle * 180 / PI));

                        if (getTangent) {
                            let startA = deltaAngle < 0 ? startAngle - PI : startAngle;
                            let endA = deltaAngle < 0 ? endAngle - PI : endAngle;

                            // save only start and end angle
                            lengthObj.angles = [startA + PI_half, endA + PI_half];
                        }
                    }

                    lengthObj.points = [p0, p];
                    break;

                case "C":
                case "Q":
                    cp1 = { x: values[0], y: values[1] };
                    cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
                    let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];
                    tDivisions = (type === 'Q') ? tDivisionsQ : tDivisionsC;

                    lengthObj.lengths.push(pathLength);

                    // is flat/linear – treat as lineto
                    let isFlat = checkFlatnessByPolygonArea(pts);

                    /** 
                    * check if controlpoints are outside 
                    * command bounding box
                    * to calculate lengths - won't work for quadratic
                    */
                    let cpsOutside = false;

                    if (isFlat) {

                        let top = min(p0.y, p.y);
                        let left = min(p0.x, p.x);
                        let right = max(p0.x, p.x);
                        let bottom = max(p0.y, p.y);

                        if (
                            cp1.y < top || cp1.y > bottom ||
                            cp2.y < top || cp2.y > bottom ||
                            cp1.x < left || cp1.x > right ||
                            cp2.x < left && cp2.x > right
                        ) {
                            cpsOutside = true;
                            isFlat = false;
                        }
                    }

                    // convert quadratic to cubic
                    if (cpsOutside && type === 'Q') {

                        let cp1N = {
                            x: p0.x + 2 / 3 * (cp1.x - p0.x),
                            y: p0.y + 2 / 3 * (cp1.y - p0.y)
                        };
                        cp2 = {
                            x: p.x + 2 / 3 * (cp1.x - p.x),
                            y: p.y + 2 / 3 * (cp1.y - p.y)
                        };

                        cp1 = cp1N;
                        type = 'C';
                        lengthObj.type = "C";
                        pts = [p0, cp1, cp2, p];
                    }

                    // treat flat bézier as  lineto
                    if (isFlat) {

                        pts = [p0, p];
                        len = getLength(pts);
                        lengthObj.type = "L";
                        lengthObj.points.push(p0, p);
                        if (getTangent) {

                            angle = getAngle(p0, p);
                            lengthObj.angles.push(angle);
                        }
                        break;

                    } else {

                        // no adaptive lg accuracy - take 24n
                        len = !auto_lg ? getLength(pts, 1, lg) : getLength(pts, 1, lgArr[0]);

                        /**
                         * auto adjust accuracy for cubic bezier approximation 
                         * up to n72
                         */

                        if (type === 'C' && auto_lg) {

                            let lenNew;
                            let foundAccuracy = false;
                            let tol = 0.001;
                            let diff = 0;

                            for (let i = 1; i < lgArr.length && !foundAccuracy; i++) {
                                let lgNew = lgArr[i];

                                lenNew = getLength(pts, 1, lgNew);

                                diff = abs(lenNew - len);
                                if (diff < tol || i === lgArr.length - 1) {
                                    lg = lgArr[i - 1];
                                    foundAccuracy = true;
                                }
                                // not precise
                                else {
                                    len = lenNew;
                                }
                            }
                        }
                    }

                    if (!onlyLength && !isFlat) {

                        if (getTangent) {
                            let startAngle = pointAtT(pts, 0, true).angle;

                            // add only start and end angles for béziers
                            lengthObj.angles.push(startAngle, pointAtT(pts, 1, true).angle);
                        }

                        // calculate lengths at sample t division points
                        for (let d = 1; d < tDivisions; d++) {
                            t = (1 / tDivisions) * d;

                            lengthObj.lengths.push(getLength(pts, t, lg) + pathLength);
                        }

                        lengthObj.points = pts;
                    }

                    break;
                default:
                    len = 0;
                    break;
            }

            if (!onlyLength) {
                lengthObj.lengths.push(len + pathLength);
                lengthObj.total = len;
            }
            pathLength += len;

            // ignore M starting point commands
            if (type !== "M") {
                lengthLookup.segments.push(lengthObj);
                segIndex++;
            }
            lengthLookup.totalLength = pathLength;

            // interpret z closepaths as linetos
            if (type === 'Z') {
                lengthObj.com.values = [p.x, p.y];
            }
        }

        return lengthLookup
    }

    function getPointAtLength(lookup, length = 0, getTangent = true, getSegment = true, decimals=-1) {

        let { segments, pathData, totalLength } = lookup;

        // disable tangents if no angles present in lookup
        if (!segments[0].angles.length) getSegment = false;

        // get control points for path splitting
        let getCpts = getSegment;

        // 1st segment
        let seg0 = segments[0];
        let seglast = segments[segments.length - 1];
        let M = seg0.points[0];
        let angle0 = seg0.angles[0];
        angle0 = angle0 < 0 ? angle0 + PI * 2 : angle0;

        let newT = 0;
        let foundSegment = false;
        let pt = { x: M.x, y: M.y };

        // round - opional
        if(decimals>-1) pt = roundPoint(pt);

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

        else if (length >= totalLength) {

            let ptLast = seglast.points[seglast.points.length - 1];
            let angleLast = seglast.angles[seglast.angles.length - 1];

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

                pt.index = pathData.length-1;
                pt.segIndex = segments.length-1;
                pt.com = segments[segments.length - 1].com;
            }

            if(decimals>-1) pt = roundPoint(pt);
            return pt;
        }

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

                        pt = pointAtT(points, newT, getTangent, getCpts);
                        pt.type = 'L';
                        if (getTangent) pt.angle = angles[0];
                        break;

                    case 'A':

                        diffLength = end - length;
                        let { arcData } = segment;

                        let { rx, ry, cx, cy, startAngle, endAngle, deltaAngle, xAxisRotation, tangentAdjust, sweep } = !arcData.isEllipse ? arcData : segment.arcData_param;

                        // final on-path point
                        let pt1 = segment.points[1];
                        let xAxisRotation_deg = xAxisRotation * rad2deg;

                        // is ellipse
                        if (rx !== ry) {

                            for (let i = 1; i < lengths.length && !foundT; i++) {
                                let lengthN = lengths[i];

                                if (length < lengthN) {
                                    // length is in this range
                                    foundT = true;
                                    let lengthPrev = lengths[i - 1];
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
                                    tangentAngle = normalizeAngle(getTangentAngle(rx, ry, angleI) - xAxisRotation + tangentAdjust);

                                    // return angle
                                    pt.angle = tangentAngle;

                                    // segment info
                                    if (getSegment) {

                                        // recalculate large arc based on split length and new delta angles
                                        let delta1 = abs(angleI - startAngle);
                                        let delta2 = abs(endAngle - angleI);
                                        let largeArc1 = delta1 >= PI ? 1 : 0;
                                        let largeArc2 = delta2 >= PI ? 1 : 0;

                                        pt.commands = [
                                            { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc1, sweep, pt.x, pt.y] },
                                            { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc2, sweep, pt1.x, pt1.y] },
                                        ];

                                    }

                                } 
                                // is at end of segment
                                else if(length === lengthN){
                                    pt = pt1;
                                    tangentAngle = normalizeAngle( getTangentAngle(rx, ry, endAngle) - xAxisRotation + tangentAdjust);
                                    pt.angle = tangentAngle;

                                    foundT = true;
                                }
                            }

                        } else {

                            newT = 1 - (1 / total) * diffLength;
                            let newAngle = -deltaAngle * newT;

                            // rotate point
                            let cosA = cos(newAngle);
                            let sinA = sin(newAngle);
                            let p0 = segment.points[0];

                            pt = {
                                x: (cosA * (p0.x - cx)) + (sinA * (p0.y - cy)) + cx,
                                y: (cosA * (p0.y - cy)) - (sinA * (p0.x - cx)) + cy
                            };

                            // angle
                            if (getTangent) {
                                let angleOff = deltaAngle > 0 ? PI_half : -PI_half;
                                pt.angle = normalizeAngle(startAngle + (deltaAngle * newT) + angleOff);
                            }

                            // segment info
                            if (getSegment) {
                                let angleI = abs(deltaAngle * newT);

                                let delta1 = abs(deltaAngle - angleI);
                                let delta2 = abs(deltaAngle - delta1);
                                let largeArc1 = delta1 >= PI ? 1 : 0;
                                let largeArc2 = delta2 >= PI ? 1 : 0;

                                pt.commands = [
                                    { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc1, sweep, pt.x, pt.y] },
                                    { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc2, sweep, pt1.x, pt1.y] },
                                ];
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
                                pt.x = com.p0.x;
                                pt.y = com.p0.y;
                            }
                            else if (lengthAtT === length) {
                                pt.x = points[points.length - 1].x;
                                pt.y = points[points.length - 1].y;
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
                                pt = pointAtT(points, newT, getTangent, getCpts);

                            }
                        }
                        break;
                }

                pt.t = newT;
            }

            if (getSegment) {

                pt.index = segment.index;

                pt.segIndex = segment.segIndex;
                pt.com = segment.com;
            }

        }

        return pt;

    }

    function getSegmentExtremes(lookup, decimals=9) {

        let { segments } = lookup;

        /**
         * check if extremes are 
         * already calculated
         */

        if (lookup.hasOwnProperty('extremes') && lookup.segments[0].hasOwnProperty('extremes')) {

            return lookup.extremes
        }

        // global path extremes - for total bounding box
        let extremes = [segments[0].com.p0];
        let isSingleSeg = segments.length === 1;

        for (let i = 0, l = segments.length; i < l; i++) {

            let seg = segments[i];
            let { type, points, com } = seg;
            let { p0, values } = com;

            // final on-path point
            let p = points[points.length - 1];

            // segment extremes for bounding box calculation
            let segExtremes = [p0];

            switch (type) {
                // ignore starting commands
                case 'M':
                    continue;

                case 'A':
                    let { arcData } = seg;

                    // ellipse or circle
                    let arcParams = !arcData.isEllipse ? arcData : seg.arcData_param;
                    let ptsExt = getArcExtemes_fromParametrized(p0, p, arcParams);

                    

                    ptsExt.forEach(pt => {
                        extremes.push(pt);
                        segExtremes.push(pt);
                    });

                    break;
                case 'C':
                case 'Q':

                    let bezierExtremes = getBezierExtremes(points);
                    if (bezierExtremes.length) {
                        segExtremes.push(...bezierExtremes);
                        extremes.push(...bezierExtremes);
                    }

                    break;

            }

            // add final on-path point
            segExtremes.push(p);

            // global extremes
            extremes.push(p);

            lookup.segments[i].extremes = segExtremes;
            lookup.segments[i].bbox = getPolyBBox(segExtremes, decimals);
        }

        // global bbox
        // copy bbox for 1 segment paths
        let bb = segments[0].bbox;

        if (!isSingleSeg) {
            bb = getPolyBBox(extremes, decimals);
        }

       
        lookup.bbox = bb;
        lookup.extremes = extremes;
        return extremes

    }

    function getAreaData(lookup) {

        let { pathData, segments } = lookup;

        // quit if area data is already present
        if(lookup.hasOwnProperty('area')){

            return lookup.area
        }

        let totalArea = 0;
        let polyPoints = [];

        let subPathsData = splitSubpaths(pathData);
        let isCompoundPath = subPathsData.length > 1 ? true : false;
        let counterShapes = [];

        // check intersections for compund paths

        if (isCompoundPath) {
            let bboxArr = getSubPathBBoxes(subPathsData);

            bboxArr.forEach(function (bb, b) {

                for (let i = 0; i < bboxArr.length; i++) {
                    let bb2 = bboxArr[i];

                    if(b===i) continue;

                    let intersects = checkBBoxIntersections(bb, bb2);

                    if (intersects) {
                        counterShapes.push(i);
                    }

                }
            });
        }

        let subPathAreas = [];
        subPathsData.forEach((pathData, d) => {

            polyPoints = [];
            let comArea = 0;
            let pathArea = 0;
            let multiplier = 1;
            let pts = [];

            for(let i=0,l=pathData.length; i<l; i++){
                let com = pathData[i];
                let {type, values} = com;

                // sync with segment indices
                let index = com.hasOwnProperty('index') ? com.index : i;
                let segment = segments.find(seg=>seg.index===index) || null;
                if(!segment) continue

                let {segIndex} = segment;

                let valuesL = values.length;

                if (values.length) {
                    let prevC = i > 0 ? pathData[i - 1] : pathData[0];
                    let prevCVals = prevC.values;
                    let prevCValsL = prevCVals.length;
                    let p0 = { x: prevCVals[prevCValsL - 2], y: prevCVals[prevCValsL - 1] };
                    let p = { x: values[valuesL - 2], y: values[valuesL - 1] };

                    // C commands
                    if (type === 'C' || type === 'Q') {
                        let cp1 = { x: values[0], y: values[1] };
                        pts = type === 'C' ? [p0, cp1, { x: values[2], y: values[3] }, p] : [p0, cp1, p];
                        let areaBez = getBezierArea(pts);

                        comArea += areaBez;

                        segment.area= areaBez;

                        polyPoints.push(p0, p);
                    }

                    // A commands
                    else if (type === 'A') {

                        let { cx, cy, rx, ry, sweep, startAngle, endAngle, xAxisRotation } = segment.arcData;

                        let xAxisRotation_deg = xAxisRotation*deg2rad;
                        let arcArea = getEllipseArea(rx, ry, startAngle, endAngle, xAxisRotation_deg);

                        // adjust for  segment direction
                        let sign = !sweep ? -1 : 1;

                        arcArea *= sign;

                        // subtract remaining polygon between p0, center and p
                        let polyArea = getPolygonArea([p0, { x: cx, y: cy }, p]);
                        arcArea =  arcArea + polyArea;

                        // save to segment item
                        segments[segIndex].area= arcArea;

                        polyPoints.push(p0, p);

                        comArea += arcArea;
                    }

                    // L commands
                    else {
                        polyPoints.push(p0, p);
                    }
                }

            }

            let areaPoly = getPolygonArea(polyPoints);
            pathArea = (comArea + areaPoly); 

            if (counterShapes.includes(d)) {
                let prevArea = subPathAreas[subPathAreas.length-1];
                let signChange = (prevArea<0 && pathArea>0) || (prevArea>0 && pathArea<0);

                multiplier = signChange ? 1 : -1;
            }

            pathArea *= multiplier;
            totalArea += pathArea;

            subPathAreas.push(pathArea);

        });

        // save to lookup object
        lookup.area = totalArea;

        return totalArea;

    }

    function getSegmentAtLength( lookup, length = 0, getBBox = true, getArea=true, decimals=-1) {

        if (getBBox) {
            // add bbox data if not present
            getSegmentExtremes(lookup);
        }

        if(getArea){
            getAreaData(lookup);
        }

        let segments = lookup.segments;
        let segment = getPointAtLength(lookup, length, true, true, decimals);
        let { com, t, index, segIndex, angle, x, y } = segment;
        let M =  { type: "M", values: [com.p0.x, com.p0.y] };

        // convert closepath to explicit lineto
        if (com.type.toLowerCase() === 'z') {

            let { points } = segments[segIndex];
            let p = points[points.length - 1];
            com = { type: "L", values: [p.x, p.y] };

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

            res.bbox = segments[segIndex]?.bbox;
            if(!segments[segIndex]){
                console.log('no bb', segIndex);
            }
        }

        if(getArea){

            res.area = segments[segIndex]?.area || 0;
        }

        return res
    }

    function splitPathAtLength(lookup, length = 0) {
        let pt = getPointAtLength(lookup, length, true, true);

        let pathData = lookup.pathData;
        let { x, y, index, commands=[] } = pt;

        // start
        if(!length){
            return { pathDataArr: [pathData, []], dArr: [stringifyPathData(pathData), ''], index:0 }
        }

        let [com1, com2] = commands;
        let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
        let pathData1 = [];
        let pathData2 = [];

        pathData.forEach((com, i) => {

            let { type, values } = com;
            if (i < index) {
                pathData1.push(com);
            }

            // get split segment
            else if (i === index) {
                pathData1.push(com1);

                // next path segment
                pathData2.push(
                    { type: 'M', values: [x, y] },
                    com2
                );
            }

            else if (i > index) {
                if (type.toLowerCase() === 'z') {
                    pathData2.push(
                        { type: 'L', values: [M.x, M.y] },
                    );

                } else {
                    pathData2.push(com);
                }
            }
        });

        // stringified pathData
        let d1 = stringifyPathData(pathData1);
        let d2 = stringifyPathData(pathData2);

        return { pathDataArr: [pathData1, pathData2], dArr: [d1, d2], index };
    }

    /**
     * check if path is closed 
     * either by explicit Z commands
     * or coinciding start and end points
     */

    function checkClosePath(pathData){

        let pathDataL = pathData.length;
        let closed = pathData[pathDataL - 1]["type"] == "Z" ? true : false;

        if(closed){

            return true
        }

        let M = pathData[0];
        let [x0, y0] = [M.values[0], M.values[1]].map(val => { return +val.toFixed(8) });
        let lastCom = pathData[pathDataL - 1];
        let lastComL = lastCom.values.length;

        let [xE, yE] = [lastCom.values[lastComL - 2], lastCom.values[lastComL - 1]].map(val => { return +val.toFixed(8) });

        let closedByCoords = x0 === xE && y0 === yE;

        if(closedByCoords) return true
        return false

    }

    function getPolygonFromLookup(lookup, {
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

        /**
         * ensure area Data is addded
         * needed for adaptive accuracy
         */
        getAreaData(lookup);

        // basic data from lookup
        let { pathData, segments, totalLength } = lookup;
        let step = totalLength / vertices;

        /**
         * collect subpath data for 
         * compound paths e.g sub path starting indices
         * or if sub paths are closed or open
         */
        let subPathIndices = pathData
            .filter(com => com.type === 'M')
            .map(com => com.index);
        let subLen = subPathIndices.length;
        let hasSubPaths = subLen > 1;

        let polyArr = [[]];
        let s = 0;
        let nextSubInd = hasSubPaths ? subPathIndices[1] : Infinity;

        // check if paths are closed
        let closedPaths = [];
        let subPaths = [pathData];
        let done = false;

        if (subLen) {
            subPaths = splitSubpaths(pathData);
        }

        // check if pathdata is already polygon
        let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
        let isPoly = /[acsqt]/gi.test(commands) ? false : true;

        subPaths.forEach((sub, i) => {
            // closed or open
            let isClosed = checkClosePath(sub);
            if (isClosed) closedPaths.push(i);

            if (keepCorners && isPoly) {

                let vertices = getPathDataVertices(sub, decimals);
                if (vertices.length) {
                    // new sub path
                    polyArr[i] = vertices;

                    // polyArr[i] = vertices
                    if (isClosed) {
                        // copy starting point to make it explicitely closed
                        polyArr[i].push(vertices[0]);
                    }
                }
            }
        });

        polyArr = polyArr.filter(Boolean);

        if (keepCorners && isPoly) {
            done = true;
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
                let lenN = step * i;
                let pt = lookup.getPointAtLength(lenN, false, true, decimals);
                let { x, y } = pt;

                let { index } = pt;
                if (hasSubPaths && s < subLen - 1 && index > nextSubInd) {
                    polyArr.push([]);
                    s++;
                    nextSubInd = subPathIndices[s + 1];
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

        }

        if (!done && keepCorners) {

            let subPoly = polyArr[0];
            let lastLength = 0;

            for (let i = 0, l = pathData.length; i < l; i++) {

                let com = pathData[i];
                let { type, values, index } = com;

                if (type === 'M') {
                    if (i > 0 && s < subLen - 1) {
                        s++;
                        polyArr.push([]);
                        subPoly = polyArr[s];
                    }

                    continue;
                }

                // sync with segment indices
                let indexCom = com.hasOwnProperty('index') ? index : i;
                let segment = segments.find(seg => seg.index === indexCom) || null;

                if (segment) {

                    subPoly = polyArr[s];
                    let { total, points } = segment;

                    // first point
                    let M = points[0];

                    // last point
                    let p = points[points.length - 1];

                    subPoly.push(M);

                    // adjust step length
                    let segSplits = ceil(total / step);
                    let stepA = (total / segSplits);

                    if ( !keepLines || type !== 'L' ) {

                        let len = 0;
                        for (let i = 1; i < segSplits; i++) {
                            len = lastLength + stepA * i;
                            let pt = lookup.getPointAtLength(len, false, true, decimals);
        
                            // drop additional info
                            pt = { x: pt.x, y: pt.y };
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

            points += pointStr;
            d += `M ${pointStr}`;
            if (closedPaths.includes(i)) d += 'Z ';
        });

        let outputData = { poly, d, points };
        console.log('outputData', outputData);
        return outputData

    }

    // Ensure Path2D exists in Node or Browser
    function ensurePath2D() {
        if (typeof Path2D !== "undefined") {

            return;
        }

        try {
            // Node.js canvas module
            const { Path2D: NodePath2D } = require("canvas");
            global.Path2D = NodePath2D;
            console.log("[Path2D_svg] Using Path2D from 'canvas'");
        } catch (e) {
            // Fallback stub – records, but no drawing
            console.warn("[Path2D_svg] No Path2D found. Using stub (no rendering).");
            global.Path2D = class {
                constructor() { }
                moveTo() { }
                lineTo() { }
                bezierCurveTo() { }
                quadraticCurveTo() { }
                arc() { }
                arcTo() { }
                ellipse() { }
                rect() { }
                roundRect() { }
                closePath() { }
                addPath() { }
            };
        }
    }

    ensurePath2D();

    class Path2D_svg extends Path2D {
        constructor(arg) {
            super(arg);
            this.pathData = [];

            if (arg instanceof Path2D_svg) {
                this.pathData = [...arg.pathData];
            } else if (typeof arg === "string") {
                if (typeof (parsePathDataNormalized) !== 'function') {
                    console.warn('parsePathDataNormalized is not defined');
                } else {
                    const segments = parsePathDataNormalized(arg);
                    this.pathData.push(...segments);
                }
            }
        }

        _record(method, args) {
            let type, values;
            let PI2 = PI * 2;

            switch (method) {
                case "moveTo":
                    type = "M"; values = args; break;
                case "lineTo":
                    type = "L"; values = args; break;
                case "bezierCurveTo":
                    type = "C"; values = args; break;
                case "quadraticCurveTo":
                    type = "Q"; values = args; break;
                case "closePath":
                    type = "Z"; values = []; break;

                case "rect": {
                    const [x, y, w, h] = args;
                    this.pathData.push(
                        { type: "M", values: [x, y] },
                        { type: "L", values: [x + w, y] },
                        { type: "L", values: [x + w, y + h] },
                        { type: "L", values: [x, y + h] },
                        { type: "Z", values: [] }
                    );

                    return;
                }

                case "arc":
                case "ellipse":
                    {

                        let [cx, cy, rx] = args;
                        let [start, end, ccw] = args.slice(-3);
                        let isEllipse = method === 'ellipse';
                        let rotation = isEllipse ? args[4] : 0;
                        let ry = isEllipse ? args[3] : rx;
                        let delta = end - start;
                        delta = delta === 0 ? PI2 : (delta >= PI2 ? PI2 : delta);

                        if (ccw && delta > 0) delta -= PI2;
                        if (!ccw && delta < 0) delta += PI2;

                        // Handle full circle: split into two arcs
                        let full = abs(delta) >= 2 * PI || delta === 0;

                        let p0 = getPointOnEllipse(cx, cy, rx, ry, start, rotation, false);
                        let p = getPointOnEllipse(cx, cy, rx, ry, end, rotation, false);

                        if (!this._currentPoint) {
                            this.pathData.push({ type: "M", values: [p0.x, p0.y] });
                        } else {
                            this.pathData.push({ type: "L", values: [p0.x, p0.y] });
                        }

                        let xAxisRotation = rotation ? (rotation * 180) / PI : 0;
                        let largeArc = delta > PI ? 1 : 0;
                        let sweep = ccw ? 0 : 1;
                        let pM = p;

                        // add mid point for full circles
                        if (full) {

                            let angleMid = normalizeAngle(start + PI);
                            pM = getPointOnEllipse(cx, cy, rx, ry, angleMid, rotation, false);

                        }

                        let segLen = full ? 2 : 1;

                        for (let i = 0; i < segLen; i++) {
                            pM = full && i == 0 ? pM : p;

                            this.pathData.push({
                                type: "A",
                                values: [
                                    rx,
                                    ry,
                                    xAxisRotation,
                                    largeArc,
                                    sweep,
                                    pM.x,
                                    pM.y,
                                ],
                            });
                        }

                        this._currentPoint = [p.x, p.y];
                        return;
                    }

                case "arcTo": {
                    let [x1, y1, x2, y2, r] = args;
                    let [x0, y0] = this._currentPoint || [x1, y1];

                    let v1 = { x: x0 - x1, y: y0 - y1 };
                    let v2 = { x: x2 - x1, y: y2 - y1 };

                    let mag1 = hypot(v1.x, v1.y);
                    let mag2 = hypot(v2.x, v2.y);

                    if (mag1 === 0 || mag2 === 0 || r === 0) {
                        this.pathData.push({ type: "L", values: [x1, y1] });
                        return;
                    }

                    v1.x /= mag1; v1.y /= mag1;
                    v2.x /= mag2; v2.y /= mag2;

                    let dot = v1.x * v2.x + v1.y * v2.y;
                    dot = min(max(dot, -1), 1);
                    let theta = acos(dot);

                    if (theta === 0) {
                        this.pathData.push({ type: "L", values: [x1, y1] });
                        return;
                    }

                    let dist = r / tan(theta / 2);
                    let t1 = { x: x1 + v1.x * dist, y: y1 + v1.y * dist };
                    let t2 = { x: x1 + v2.x * dist, y: y1 + v2.y * dist };

                    let cross = v1.x * v2.y - v1.y * v2.x;
                    let sweep = cross < 0 ? 1 : 0;
                    let largeArc = 0;

                    this.pathData.push({ type: "L", values: [t1.x, t1.y] });
                    this.pathData.push({
                        type: "A",
                        values: [r, r, 0, largeArc, sweep, t2.x, t2.y],
                    });
                    return;
                }

                case "roundRect": {
                    let [x, y, w, h, radii] = args;

                    // Normalize radii → array of 4 {rx, ry}
                    if (!Array.isArray(radii)) {
                        radii = [radii, radii, radii, radii];
                    }
                    if (radii.length === 2) {
                        radii = [radii[0], radii[1], radii[0], radii[1]];
                    }
                    if (radii.length === 4) {
                        radii = radii.map(r => (typeof r === "number" ? { rx: r, ry: r } : r));
                    }

                    let [r1, r2, r3, r4] = radii;

                    // Clamp radii so they never exceed box size
                    r1.rx = min(r1.rx, w / 2);
                    r1.ry = min(r1.ry, h / 2);
                    r2.rx = min(r2.rx, w / 2);
                    r2.ry = min(r2.ry, h / 2);
                    r3.rx = min(r3.rx, w / 2);
                    r3.ry = min(r3.ry, h / 2);
                    r4.rx = min(r4.rx, w / 2);
                    r4.ry = min(r4.ry, h / 2);

                    // Start top-left corner
                    this.pathData.push({ type: "M", values: [x + r1.rx, y] });

                    // Top edge → top-right corner
                    this.pathData.push({ type: "L", values: [x + w - r2.rx, y] });
                    this.pathData.push({
                        type: "A",
                        values: [r2.rx, r2.ry, 0, 0, 1, x + w, y + r2.ry]
                    });

                    // Right edge → bottom-right corner
                    this.pathData.push({ type: "L", values: [x + w, y + h - r3.ry] });
                    this.pathData.push({
                        type: "A",
                        values: [r3.rx, r3.ry, 0, 0, 1, x + w - r3.rx, y + h]
                    });

                    // Bottom edge → bottom-left corner
                    this.pathData.push({ type: "L", values: [x + r4.rx, y + h] });
                    this.pathData.push({
                        type: "A",
                        values: [r4.rx, r4.ry, 0, 0, 1, x, y + h - r4.ry]
                    });

                    // Left edge → close with top-left arc
                    this.pathData.push({ type: "L", values: [x, y + r1.ry] });
                    this.pathData.push({
                        type: "A",
                        values: [r1.rx, r1.ry, 0, 0, 1, x + r1.rx, y]
                    });

                    this.pathData.push({ type: "Z", values: [] });

                    this._currentPoint = [x + r1.rx, y];
                    return;
                }

                default: return;
            }

            this.pathData.push({ type, values });
            this._currentPoint = values.slice(-2); // track last point
        }

        // Override all Path2D methods
        moveTo(...args) { this._record("moveTo", args); return super.moveTo(...args); }
        lineTo(...args) { this._record("lineTo", args); return super.lineTo(...args); }
        bezierCurveTo(...args) { this._record("bezierCurveTo", args); return super.bezierCurveTo(...args); }
        quadraticCurveTo(...args) { this._record("quadraticCurveTo", args); return super.quadraticCurveTo(...args); }
        arc(...args) { this._record("arc", args); return super.arc(...args); }
        arcTo(...args) { this._record("arcTo", args); return super.arcTo(...args); }
        ellipse(...args) { this._record("ellipse", args); return super.ellipse(...args); }
        rect(...args) { this._record("rect", args); return super.rect(...args); }
        roundRect(...args) { this._record("roundRect", args); return super.roundRect(...args); }
        closePath(...args) { this._record("closePath", args); return super.closePath(...args); }

        // get pathData array
        getPathData(options = {}) {
            // normalize if required
            if (Object.keys(options).length && typeof normalizePathData === 'function') {
                this.pathData = normalizePathData(this.pathData, options);
            }
            return this.pathData
        }

        addPath(path2, transform) {
            let cmds = [];
            super.addPath(path2, transform);

            if (path2 instanceof Path2D_svg) {
                cmds = path2.getPathData();
            } else if (typeof path2 === "string") {
                cmds = parsePathDataNormalized(path2);
            } else {
                throw new Error("Unsupported path type for addPath");
            }

            // Apply transform if provided
            if (transform) {
                let { a = 1, b = 0, c = 0, d = 1, e = 0, f = 0 } = transform;

                // convert arcs to cubics
                if (typeof normalizePathData === 'function') {
                    cmds = normalizePathData(cmds, { arcToCubic: true });
                }

                for (let j = 0, len = cmds.length; j < len; j++) {
                    let { type, values } = cmds[j];
                    if (values.length) {
                        for (let i = 0, l = values.length; i < l; i += 2) {
                            let pt = { x: values[i], y: values[i + 1] };

                            values[i] = a * pt.x + c * pt.y + e;
                            values[i + 1] = b * pt.x + d * pt.y + f;
                        }
                    }
                }
            }

            this.pathData.push(...cmds);
        }

        // stringified pathData
        getPathDataString(options = {}) {

            // normalize if required
            if (Object.keys(options).length && typeof normalizePathData === 'function') {
                this.pathData = normalizePathData(this.pathData, options);
            }

            return this.pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
        }

        getD(options = {}) {

            // normalize if required
            if (Object.keys(options).length && typeof normalizePathData === 'function') {
                this.pathData = normalizePathData(this.pathData, options);
            }

            return this.pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
        }

        // get lookup
        getPathLengthLookup(options = {}) {
            if (typeof (getPathLengthLookup) !== 'function') {
                console.warn('getPathLengthLookup is not defined');
                return this.pathData;
            }
            return getPathLengthLookup(this.pathData, options = {});
        }

        // get lookup
        getPathLookup(options = {}) {
            if (typeof (getPathLengthLookup) !== 'function') {
                console.warn('getPathLengthLookup is not defined');
                return this.pathData;
            }
            console.log('lookup conv', options);
            return getPathLengthLookup(this.pathData, options);
        }

    }

    SVGGeometryElement.prototype.getPathLookup = function (precision = 'medium', onlyLength = false, getTangent = true){
        return getPathLengthLookup$1(this,precision, onlyLength, getTangent )
    };

    SVGGeometryElement.prototype.getPathLengthLookup = function (precision = 'medium', onlyLength = false, getTangent = true){
        return getPathLengthLookup$1(this,precision, onlyLength, getTangent )
    };

    PathLengthObject.prototype.getPointAtLength = function (length = 0, getTangent = false, getSegment = false, decimals=-1) {
        return getPointAtLength(this, length, getTangent, getSegment, decimals);
    };

    // get all segment extrema for bbox calculation
    PathLengthObject.prototype.getExtremes = function () {
        return getSegmentExtremes(this);
    };

    // get bbox data
    PathLengthObject.prototype.getBBox = function () {
        // add bbox data if not present
        if (this.hasOwnProperty('bbox')) {

            return this.bbox
        }

        getSegmentExtremes(this);
        let bb = this.bbox;
        return bb;
    };

    // pathLengthLookup
    PathLengthObject.prototype.getArea = function () {
        return getAreaData(this);
    };

    // get polygon
    PathLengthObject.prototype.getPolygon = function ({
        keepCorners = true,
        keepLines = true,
        threshold = 1,
        vertices = 16,
        decimals = 3
    } = {}) {
        return getPolygonFromLookup(this, {keepCorners, keepLines, threshold, vertices, decimals});
    };

    PathLengthObject.prototype.getSegmentAtLength = function (length = 0, getBBox = true, getArea=true, decimals=-1) {
        return getSegmentAtLength(this, length, getBBox, getArea, decimals);
    };

    PathLengthObject.prototype.splitPathAtLength = function (length = 0) {
        return splitPathAtLength(this, length)
    };

    // Browser global
    if (typeof window !== 'undefined') {
        window.getPathLengthLookup = getPathLengthLookup$1;
        window.getPathLookup = getPathLookup;
        window.getPathLength = getPathLength;
        window.parsePathDataString = parsePathDataString;
        window.normalizePathInput = normalizePathInput;
        window.parsePathDataNormalized = parsePathDataNormalized$1;
        window.getPathDataFromEl = getPathDataFromEl;
        window.normalizePathData = normalizePathData;
        window.stringifyPathData = stringifyPathData;
        window.getPolygonFromLookup = getPolygonFromLookup;

        window.Path2D_svg = Path2D_svg;

    }

    exports.PI = PI;
    exports.Path2D_svg = Path2D_svg;
    exports.abs = abs;
    exports.acos = acos;
    exports.asin = asin;
    exports.atan = atan;
    exports.atan2 = atan2;
    exports.ceil = ceil;
    exports.cos = cos;
    exports.exp = exp;
    exports.floor = floor;
    exports.getPathDataFromEl = getPathDataFromEl;
    exports.getPathLength = getPathLength;
    exports.getPathLengthLookup = getPathLengthLookup$1;
    exports.getPathLookup = getPathLookup;
    exports.getPolygonFromLookup = getPolygonFromLookup;
    exports.hypot = hypot;
    exports.log = log;
    exports.max = max;
    exports.min = min;
    exports.normalizePathData = normalizePathData;
    exports.normalizePathInput = normalizePathInput;
    exports.parsePathDataNormalized = parsePathDataNormalized$1;
    exports.parsePathDataString = parsePathDataString;
    exports.pow = pow;
    exports.random = random;
    exports.round = round;
    exports.sin = sin;
    exports.sqrt = sqrt;
    exports.stringifyPathData = stringifyPathData;
    exports.tan = tan;

})(this["svg-getpointatlength"] = this["svg-getpointatlength"] || {});
