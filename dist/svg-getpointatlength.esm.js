// Legendre Gauss weight and abscissa values
const lgVals = {};

const PI2 = Math.PI * 2;

const deg2rad = 0.017453292519943295;

const rad2deg = 57.29577951308232;

const {
    abs, acos, asin, atan, atan2, ceil, cos, exp, floor,
    log, max, min, pow, random, round, sin, sqrt, tan, PI
} = Math;

// get angle helper
function getAngle(p1, p2, normalize = false) {

    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    // normalize negative angles
    if (normalize && angle < 0) angle += Math.PI * 2;
    return angle
}

/**
 * get distance between 2 points
 * pythagorean theorem
 */
function getDistance(p1, p2) {

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
 *  based on @cuixiping;
 *  https://stackoverflow.com/questions/9017100/calculate-center-of-svg-arc/12329083#12329083
 */
function svgArcToCenterParam(x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2) {

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

    let shortcut = true;

    if (rx === ry && shortcut) {

        // test semicircles
        let diffX = Math.abs(x2 - x1);
        let diffY = Math.abs(y2 - y1);
        let r = diffX;

        let xMin = Math.min(x1, x2),
            yMin = Math.min(y1, y2),
            PIHalf = Math.PI * 0.5;

        // semi circles
        if (diffX === 0 && diffY || diffY === 0 && diffX) {

            r = diffX === 0 && diffY ? diffY / 2 : diffX / 2;
            arcData.rx = r;
            arcData.ry = r;

            // verical
            if (diffX === 0 && diffY) {
                arcData.cx = x1;
                arcData.cy = yMin + diffY / 2;
                arcData.startAngle = y1 > y2 ? PIHalf : -PIHalf;
                arcData.endAngle = y1 > y2 ? -PIHalf : PIHalf;
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI;

            }
            // horizontal
            else if (diffY === 0 && diffX) {
                arcData.cx = xMin + diffX / 2;
                arcData.cy = y1;
                arcData.startAngle = x1 > x2 ? Math.PI : 0;
                arcData.endAngle = x1 > x2 ? -Math.PI : Math.PI;
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI;
            }

            return arcData;
        }
    }

    /**
     * if rx===ry x-axis rotation is ignored
     * otherwise convert degrees to radians
     */
    let phi = rx === ry ? 0 : (xAxisRotation * PI) / 180;
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

        endAngle -= Math.PI * 2;
    }

    if (sweep && startAngle > endAngle) {

        endAngle = endAngle <= 0 ? endAngle + Math.PI * 2 : endAngle;
    }

    let deltaAngle = endAngle - startAngle;
    arcData.startAngle = startAngle;
    arcData.endAngle = endAngle;
    arcData.deltaAngle = deltaAngle;

    return arcData;
}

function rotatePoint(pt, cx, cy, rotation = 0, convertToRadians = false) {
    if (!rotation) return pt;
    if (convertToRadians) rotation = (rotation / 180) * Math.PI;

    let cosA = Math.cos(rotation);
    let sinA = Math.sin(rotation);

    return {

        x: (cosA * (pt.x - cx)) + (sinA * (pt.y - cy)) + cx,
        y: (cosA * (pt.y - cy)) - (sinA * (pt.x - cx)) + cy
    };
}

function getPointOnEllipse(cx, cy, rx, ry, angle, ellipseRotation = 0, parametricAngle = true, degrees = false) {

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

// From parametric angle to non-parametric angle
function toNonParametricAngle(angleP, rx, ry) {

    if (rx === ry || (angleP % PI * 0.5 === 0)) return angleP;

    let angle = atan(tan(angleP) * (ry / rx));
    // Ensure the non-parametric angle is in the correct quadrant
    return cos(angleP) < 0 ? angle + PI : angle;
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
        z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
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

        } while (Math.abs(z - z1) > 1.0e-14);

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

function getEllipseLengthLG(rx, ry, startAngle, endAngle, xAxisRotation = 0, convertParametric = true, degrees = false, wa = []) {

    // convert to radians
    if (degrees) {
        startAngle = (startAngle * PI) / 180;
        endAngle = (endAngle * PI) / 180;
        xAxisRotation = xAxisRotation * PI / 180;
    }

    // adjust for axis rotation
    if (xAxisRotation && !convertParametric) {
        startAngle = toParametricAngle(toNonParametricAngle(startAngle, rx, ry) - xAxisRotation, rx, ry);
        endAngle = toParametricAngle(toNonParametricAngle(endAngle, rx, ry) - xAxisRotation, rx, ry);
    }

    else if (xAxisRotation && convertParametric) {
        startAngle -= xAxisRotation;
        endAngle -= xAxisRotation;
    }

    // convert parametric angles
    if (convertParametric) {
        startAngle = toParametricAngle(startAngle, rx, ry);
        endAngle = toParametricAngle(endAngle, rx, ry);
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

            sum += w * Math.sqrt(comb0);

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
 * parse normalized
 */

function parsePathDataNormalized(d, options = {}) {

    let pathDataObj = parse(d);

    let { hasRelatives, hasShorthands, hasQuadratics, hasArcs } = pathDataObj;
    let pathData = pathDataObj.pathData;

    /**
     * normalize:
     * convert to all absolute
     * all longhands
     */
    if (hasRelatives) pathData = pathDataToAbsoluteOrRelative(pathData, false);
    if (hasShorthands) pathData = pathDataToLonghands(pathData, -1, false);

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

function parse(d, debug = true) {

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
                    feedback = 'Leading zeros not valid: ' + val;
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
    let charCode;

    while (i < len) {

        charCode = d.charCodeAt(i);
        
        let isDigit = (charCode > 47 && charCode < 58);
        if (!isDigit) {
             isE = (charCode === 101 || charCode === 69);
             isMinusorPlus = (charCode === 45 || charCode === 43);
             isDot = charCode === 46;
        }

        /**
         * digit, dot or operator
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
         * New command introduced by
         * alphabetic A-Z character
         */
        if (charCode > 64 && commandSet.has(charCode)) {

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

        /**
         * Separated by White space 
         */
        if ((charCode < 48 || charCode > 5759) && isSpace(charCode)) {

            // push value
            pushVal();

            wasE = false;
            i++;
            continue;
        }

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

// retrieve pathdata from svg geometry elements
function getPathDataFromEl(el) {

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
        let scalRoot = Math.sqrt((Math.pow(scaleX, 2) + Math.pow(scaleY, 2)) / 2);

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
            pathData = parsePathDataNormalized(d);
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

    return pathData;
}

function getCommandLength({
    type = '',
    p0 = {},
    cp1 = {},
    cp2 = {},
    com = {},
    p = {},
    t = 1,
    precision = 'medium',
    wa = [],
    lg = 24,

    // arc properties
    rx = 0,
    ry = 0,
    startAngle = 0,
    endAngle = 0,
    deltaAngle = 0,
    degrees = false

} = {}) {
    lg = precision === 'medium' ? 24 : 12;

    let len = 0;
    type = !type ? (com.type ? com.type.toLowerCase() : 'l') : type.toLowerCase();

    switch (type) {

        case 'z':
        case 'l':
            len = getLength([p0, p], t);
            break;

        case 'a':

            if(rx===ry){
                len = 2 * Math.PI * rx * (1 / 360 * Math.abs(deltaAngle * rad2deg));

            }else {
                len = getEllipseLengthLG(rx, ry, startAngle, endAngle, 0, false, degrees, wa);
            }
            break;

        case 'q':

            len = getLength([p0, cp1, p], t, lg);
            break;

        case 'c':

            len = getLength([p0, cp1, cp2, p], t, lg);
            break;

    }

    return len;
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
    let lgArr = [12, 24, 36, 48, 60, 64, 72, 96];

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
    let p0;
    let options = {};

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
                lengthObj.points.push(p0, p);

                // get length
                options = { type, p0, com, p, t };
                len = getCommandLength(options);

                if (getTangent) {
                    angle = getAngle(p0, p);
                    lengthObj.angles.push(angle);
                }
                break;

            case "A":

                let xAxisRotation = com.values[2],
                    largeArc = com.values[3],
                    sweep = com.values[4];

                let xAxisRotation_deg = xAxisRotation;

                // get parametrized arc properties
                let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], largeArc, sweep, p.x, p.y);
                let { cx, cy, rx, ry, startAngle, endAngle, deltaAngle } = arcData;

                options = { type, p0, p, t, rx, ry, startAngle, endAngle, deltaAngle, wa };

                /** 
                 * if arc is elliptic
                 */
                if (rx !== ry) {

                    /** 
                     * convert angles to parametric
                     * adjusted for xAxisRotation
                     * increases performance
                     */

                    xAxisRotation = xAxisRotation * deg2rad;
                    startAngle = toParametricAngle((startAngle - xAxisRotation), rx, ry);
                    endAngle = toParametricAngle((endAngle - xAxisRotation), rx, ry);

                    // adjust end angle
                    if (sweep && startAngle > endAngle) {
                        endAngle += PI2;
                    }

                    if (!sweep && startAngle < endAngle) {
                        endAngle -= PI2;
                    }

                    // precision
                    let lenNew = 0;

                    // first length and angle
                    lengthObj.lengths.push(pathLength);
                    lengthObj.angles.push(startAngle);
                    options = { type, p0, p, t, rx, ry, startAngle, endAngle, deltaAngle, wa };

                    // last length
                    len = getCommandLength(options);

                    if (!onlyLength) {
                        for (let i = 1; i < tDivisionsC; i++) {
                            let endAngle = startAngle + deltaAngle / tDivisionsC * i;

                            lenNew = getCommandLength({ type, p0, p, t, rx, ry, startAngle, endAngle, wa });

                            lengthObj.lengths.push(lenNew + pathLength);
                            lengthObj.angles.push(endAngle);
                        }
                    }

                    // last angle
                    lengthObj.angles.push(endAngle);

                }
                // circular arc
                else {

                    /** 
                     * get arc length: 
                     * perfect circle length can be linearly interpolated 
                     * according to delta angle
                     */

                    len = getCommandLength(options);

                    if (getTangent) {

                       let startA = startAngle;
                       let endA = endAngle;

                        // save only start and end angle
                        lengthObj.angles = [startA + Math.PI * 0.5, endA + Math.PI * 0.5];

                    }
                }

                lengthObj.points = [
                    p0,
                    {
                        startAngle,
                        deltaAngle,
                        endAngle,
                        xAxisRotation,
                        xAxisRotation_deg,
                        largeArc,
                        sweep,
                        rx,
                        ry,
                        cx,
                        cy
                    }, p];
                break;

            case "C":
            case "Q":
                cp1 = { x: values[0], y: values[1] };
                cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
                let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];
                tDivisions = (type === 'Q') ? tDivisionsQ : tDivisionsC;

                options = { p0, type, com, cp1, cp2, p, t: 1, wa, lg };

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

                    let top = Math.min(p0.y, p.y);
                    let left = Math.min(p0.x, p.x);
                    let right = Math.max(p0.x, p.x);
                    let bottom = Math.max(p0.y, p.y);

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

                    len = getCommandLength(options);

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

                            options.lg = lgNew;
                            lenNew = getCommandLength(options);

                            diff = Math.abs(lenNew - len);
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
                        let angleStart = pointAtT(pts, 0, true).angle;

                        // add only start and end angles for béziers
                        lengthObj.angles.push(angleStart, pointAtT(pts, 1, true).angle);
                    }

                    // calculate lengths at sample t division points

                    let lenN = 0;

                    for (let d = 1; d < tDivisions; d++) {
                        t = (1 / tDivisions) * d;

                        options.t = t;
                        lenN = getCommandLength(options) + pathLength;

                        lengthObj.lengths.push(lenN);

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
        }
        lengthLookup.totalLength = pathLength;

        // add original command if it was converted for eliptic arcs
        if (com.index) {
            lengthObj.index = com.index;
            lengthObj.com = com.com;
        }

        // interpret z closepaths as linetos
        if (type === 'Z') {
            lengthObj.com.values = [p.x, p.y];
        }
    }

    return lengthLookup
}

function PathLengthObject(totalLength = 0, segments = [], pathData = []) {
    this.totalLength = totalLength;
    this.segments = segments;
    this.pathData = pathData;
}

PathLengthObject.prototype.getPointAtLength = function (length = 0, getTangent = false, getSegment = false) {
    return getPointAtLengthCore(this, length, getTangent, getSegment);
};

PathLengthObject.prototype.getSegmentAtLength = function (length = 0, getTangent = true, getSegment = true) {
    let segment = getPointAtLengthCore(this, length, getTangent, getSegment);
    let { com, t, index, angle, x, y, segments } = segment;
    let M = { type: "M", values: [com.p0.x, com.p0.y] };

    // convert closepath to explicit lineto
    if(com.type.toLowerCase()==='z'){
        let p = segments[segments.length-1].p;
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

    return res
};

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

    return {pathDataArr: [pathData1, pathData2], dArr:[d1, d2], index };
};

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
    let angle0 = seg0.angles[0];
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

    else if (length >= totalLength) {
        let ptLast = seglast.points.slice(-1)[0];
        let angleLast = seglast.angles.slice(-1)[0];

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

                    pt = pointAtT(points, newT, getTangent, getCpts);
                    pt.type = 'L';
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

                                // calculate tangent angle
                                tangentAngle = getTangentAngle(rx, ry, angleI) - xAxisRotation;

                                // adjust for axis rotation
                                tangentAngle = xAxisRotation ? tangentAngle + perpendicularAdjust : tangentAngle;

                                // return angle
                                pt.angle = tangentAngle;

                                // segment info
                                if (getSegment) {
                                    // final on-path point
                                    let pt1 = segment.points[2];

                                    // recalculate large arc based on split length and new delta angles
                                    let delta1 = Math.abs(angleI - startAngle);
                                    let delta2 = Math.abs(endAngle - angleI);
                                    let largeArc1 = delta1 >= Math.PI ? 1 : 0;
                                    let largeArc2 = delta2 >= Math.PI ? 1 : 0;
                                    pt.commands = [
                                        { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc1, sweep, pt.x, pt.y] },
                                        { type: 'A', values: [rx, ry, xAxisRotation_deg, largeArc2, sweep, pt1.x, pt1.y] },
                                    ];
                                }
                            }
                        }

                    } else {

                        newT = 1 - (1 / total) * diffLength;
                        let newAngle = -deltaAngle * newT;

                        // rotate point
                        p0 = segment.points[0];
                        pt = rotatePoint(p0, cx, cy, newAngle);

                        // angle
                        if (getTangent) {
                            let angleOff = deltaAngle > 0 ? Math.PI / 2 : Math.PI / -2;
                            pt.angle = startAngle + (deltaAngle * newT) + angleOff;

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
                            // difference between length at t and exact length
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
            pt.com = segment.com;
        }

    }

    return pt;
}

function getPathLengthLookup_core(d, precision = 'medium', onlyLength = false, getTangent = true) {

    
    // exit
    if (!d) throw Error("No path data defined");

    let pathData = parsePathDataNormalized(d);

    // exit
    if (!pathData) throw Error("No valid path data to parse");

    /**
     * create lookup
     * object
     */
    let lengthLookup = getPathLengthLookupFromPathData(pathData, precision, onlyLength, getTangent);

    if (onlyLength) {
        return lengthLookup.pathLength;
    } else {
        return new PathLengthObject(lengthLookup.totalLength, lengthLookup.segments, pathData);
    }
}

function getPathLengthFromD(d, precision = 'medium', onlyLength = true) {
    let pathData = parsePathDataNormalized(d);
    return getPathDataLength(pathData, precision, onlyLength);
}

// only total pathlength
function getPathDataLength(pathData, precision = 'medium', onlyLength = true) {
    return getPathLengthLookupFromPathData(pathData, precision, onlyLength)
}

function stringifyPathData$1(pathData) {
    return pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
}

/**
 * normalize input
 * path data string
 * path data array
 * native getPathData object
 */
function normalizePathInput(d, stringify = false) {

    let type = Array.isArray(d) && d.length ? 'array' : (d.length ? typeof d : null);
    if (!type) return null;

    /**
     * convert native path data object
     * to decoupled object array
     */
    const nativePathDataToArr = (pathData) => {
        let pathDataArr = [];
        pathData.forEach(com => {
            pathDataArr.push({ type: com.type, values: com.values });
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

    // new path data
    let pathData = [];

    // is already path data array
    if (type === 'array') {

        let isPathData = d[0].type ? true : false;

        // 1. is pathdata array
        if (isPathData) {
            // is native pathdata object 
            let isNative = typeof d[0] === 'object' && typeof d[0].constructor !== 'object';
            if (isNative) {
                d = nativePathDataToArr(d);
            }

            /**
             * normalize pathdata 
             * check if relative or shorthand commands are present
             */
            let commands = Array.from(new Set(d.map(com => com.type))).join('');
            let hasRelative = /[lcqamts]/gi.test(commands);
            let hasShorthands = /[vhst]/gi.test(commands);
            if (hasRelative) d = pathDataToAbsoluteOrRelative(d, false);
            if (hasShorthands) d = pathDataToLonghands(d);

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
                if (isFlatArr) {
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
            let children = [...svg.children].filter(node => { return allowed.includes(node.nodeName.toLowerCase()) });

            children.forEach(child => {
                let pathDataEl = getPathDataFromEl(child);
                pathData.push(...pathDataEl);
            });
        }

        // regular d pathdata string - parse and normalize
        else {
            let isPathDataString = d.startsWith('M') || d.startsWith('m');
            if (isPathDataString) {
                pathData = parsePathDataNormalized(d);

            } else {
                let isPolyString = !isNaN(d.trim()[0]);
                if (isPolyString) {
                    d = d.split(/,| /).map(Number);
                    pathData = coordinatePairsToPathData(d);
                }
            }
        }
    }

    return stringify ? pathData.length && stringifyPathData$1(pathData) : pathData;

}

// Browser global
if (typeof window !== 'undefined') {
    window.getPathLengthLookup = getPathLengthLookup_core;
    window.getPathLengthFromD = getPathLengthFromD;
    window.getPathDataFromEl = getPathDataFromEl;
    window.normalizePathInput = normalizePathInput;
    window.stringifyPathData = stringifyPathData$1;
    window.parse = parse;

}

export { getPathDataFromEl, getPathDataLength, getPathLengthFromD, getPathLengthLookup_core as getPathLengthLookup, normalizePathInput, parse, stringifyPathData$1 as stringifyPathData };
