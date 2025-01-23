
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        // CommonJS (Node.js) environment
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD environment
        define([], factory);
    } else {
        // Browser environment
        root.pathDataLength = factory();
    }
})(this, function () {
    var pathDataLength = {};


    const { PI, sin, cos, acos, abs, sqrt, log, tan } = Math;

    // Legendre Gauss weight and abissae values
    const lgVals = {

        wa12: [[0.24914704581340288, 0.12523340851146894], [0.23349253653835458, 0.3678314989981802], [0.20316742672306584, 0.5873179542866175], [0.16007832854334633, 0.7699026741943047], [0.10693932599531818, 0.9041172563704748], [0.04717533638650846, 0.9815606342467192]],

        wa24: [[0.1279381953467522, 0.0640568928626056], [0.1258374563468283, 0.1911188674736163], [0.1216704729278034, 0.3150426796961634], [0.1155056680537256, 0.4337935076260451], [0.1074442701159656, 0.5454214713888396], [0.0976186521041139, 0.6480936519369755], [0.0861901615319533, 0.7401241915785544], [0.0733464814110803, 0.820001985973903], [0.0592985849154368, 0.8864155270044011], [0.0442774388174198, 0.9382745520027328], [0.0285313886289337, 0.9747285559713095], [0.0123412297999872, 0.9951872199970213]]
    }

    // get angle helper
    const getAngle = (p1, p2) => {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }


    function pointAtT(pts, t = 0.5, getTangent = false) {

        /**
        * Linear  interpolation (LERP) helper
        */
        const interpolate = (p1, p2, t, getTangent = false) => {

            let pt = {
                x: (p2.x - p1.x) * t + p1.x,
                y: (p2.y - p1.y) * t + p1.y,
            };

            if (getTangent) {
                pt.angle = getAngle(p1, p2)

                // normalize negative angles
                if (pt.angle < 0) pt.angle += Math.PI * 2
            }

            return pt
        }

        const getPointAtBezierT = (pts, t, getTangent = false) => {

            let isCubic = pts.length === 4;
            let p0 = pts[0];
            let cp1 = pts[1];
            let cp2 = isCubic ? pts[2] : pts[1];
            let p = pts[pts.length - 1];
            let pt = { x: 0, y: 0 };

            if (getTangent) {
                let m0, m1, m2, m3, m4;

                if (t === 0) {
                    pt.x = p0.x;
                    pt.y = p0.y;
                    pt.angle = getAngle(p0, cp1)
                }

                else if (t === 1) {
                    pt.x = p.x;
                    pt.y = p.y;
                    pt.angle = getAngle(cp2, p)
                }

                else {
                    m0 = interpolate(p0, cp1, t);
                    if (isCubic) {
                        m1 = interpolate(cp1, cp2, t);
                        m2 = interpolate(cp2, p, t);
                        m3 = interpolate(m0, m1, t);
                        m4 = interpolate(m1, m2, t);
                        pt = interpolate(m3, m4, t);
                        pt.angle = getAngle(m3, m4)
                    } else {
                        m1 = interpolate(p0, cp1, t);
                        m2 = interpolate(cp1, p, t);
                        pt = interpolate(m1, m2, t);
                        pt.angle = getAngle(m1, m2)

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
        if (getTangent && pt.angle < 0) pt.angle += Math.PI * 2

        return pt
    }



    function PathLengthObject(totalLength, segments) {
        this.totalLength = totalLength || 0;
        this.segments = segments || [];
    }


    //pathLengthLookup
    PathLengthObject.prototype.getPointAtLength = function (length = 0, getTangent = false, getSegment = false) {

        let { segments, totalLength } = this;

        // disable tangents if no angles present in lookup
        if (!segments[0].angles.length) getSegment = false

        // 1st segment
        let M = segments[0].points[0];
        let angle0 = segments[0].angles[0]

        let newT = 0;
        let foundSegment = false;
        let pt = { x: M.x, y: M.y };
        if (getTangent) pt.angle = angle0

        // return segment data
        if (getSegment) {
            pt.index = segments[0].index;
            pt.com = segments[0].com;
        }

        // first or last point on path
        if (length === 0) {
            return pt;
        }
        else if (length === totalLength) {
            let seglast = segments[segments.length - 1]
            let ptLast = seglast.points.slice(-1)[0]
            let angleLast = seglast.angles.slice(-1)[0]

            pt.x = ptLast.x;
            pt.y = ptLast.y;
            if (getTangent) pt.angle = angleLast;

            if (getSegment) {
                pt.index = segments.length - 1;
                pt.com = segments[segments.length - 1].com;
            }
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

                        pt = pointAtT(points, newT)
                        pt.type = 'L'
                        if (getTangent) pt.angle = angles[0];
                        break;

                    case 'A':

                        diffLength = end - length;
                        newT = 1 - (1 / total) * diffLength;
                        let { cx, cy, startAngle, endAngle, deltaAngle } = segment.points[1]
                        let newAngle = -deltaAngle * newT

                        // rotate point
                        let cosA = Math.cos(newAngle);
                        let sinA = Math.sin(newAngle);
                        p0 = segment.points[0]

                        pt = {
                            x: (cosA * (p0.x - cx)) + (sinA * (p0.y - cy)) + cx,
                            y: (cosA * (p0.y - cy)) - (sinA * (p0.x - cx)) + cy
                        }

                        // angle
                        if (getTangent) {
                            let angleOff = deltaAngle > 0 ? Math.PI / 2 : Math.PI / -2;
                            pt.angle = startAngle + (deltaAngle * newT) + angleOff
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

                                let lengthAtTPrev = i > 0 ? lengths[i - 1] : lengths[i];
                                let t = tStep * i;
                                // length between previous and current t
                                let tSegLength = lengthAtT - lengthAtTPrev;
                                // difference between length at t and exact length
                                let diffLength = lengthAtT - length;
                                // ratio between segment length and difference
                                let tScale = (1 / tSegLength) * diffLength || 0;
                                newT = t - tStep * tScale || 0;
                                foundT = true;

                                // return point and optionally angle
                                pt = pointAtT(points, newT, getTangent)

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

    function getPathLengthLookup(d, precision = 'medium', onlyLength = false, getTangent = true) {

        // disable tangent calculation in length-only mode
        if (onlyLength) getTangent = false;

        const checkFlatnessByPolygonArea = (points, tolerance=0.001) => {
            let area = 0;
            for (let i = 0; i < points.length; i++) {
                let addX = points[i].x;
                let addY = points[i === points.length - 1 ? 0 : i + 1].y;
                let subX = points[i === points.length - 1 ? 0 : i + 1].x;
                let subY = points[i].y;
                area += addX * addY * 0.5 - subX * subY * 0.5;
            }
            return Math.abs(area) < tolerance;
        }

        /**
         * auto adjust legendre-gauss accuracy
         * precision for arc approximation
        */
        let arcAccuracy = precision === 'high' ? 4 : (precision === 'medium' ? 2 : 1);
        let auto_lg = precision === 'high' ? true : false;
        let lg = precision === 'medium' ? 24 : 12;
        let lgArr = [12, 24, 36, 48, 60, 64, 72, 96];
        let tDivisionsQ = precision === 'low' ? 10 : 12;
        let tDivisionsC = precision === 'low' ? 15 : (precision === 'medium' ? 23 : 35);
        let tDivisions = tDivisionsC;

        // get pathdata
        let pathData = Array.isArray(d) ? d : parsePathDataNormalized(d, { arcAccuracy: arcAccuracy });

        let pathLength = 0;
        let M = pathData[0];
        let lengthLookup = { totalLength: 0, segments: [] };


        for (let i = 1; i < pathData.length; i++) {
            let comPrev = pathData[i - 1];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;
            let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

            let com = pathData[i];
            let { type, values } = com;
            let valuesL = values.length;
            let p = { x: values[valuesL - 2], y: values[valuesL - 1] };
            let len, cp1, cp2, t, angle;


            // collect segment data in object
            let lengthObj = {
                typeO: type,
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
                    len = getLength([p0, p]);
                    lengthObj.points.push(p0, p);

                    if (getTangent) {
                        angle = Math.atan2(p.y - p0.y, p.x - p0.x)
                        lengthObj.angles.push(angle);
                    }

                    break;

                case "A":
                    p = {
                        x: com.values[5],
                        y: com.values[6]
                    }
                    let largeArc = com.values[3],
                        sweep = com.values[4];

                    // get parametrized arc properties
                    let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], largeArc, sweep, p.x, p.y)
                    let { cx, cy, rx, startAngle, endAngle, deltaAngle } = arcData

                    // get arc length: perfect circle length linearly interpolated according to delta angle
                    len = 2 * Math.PI * rx * (1 / 360 * Math.abs(deltaAngle * 180 / PI))

                    if (getTangent) {
                        let startA = deltaAngle < 0  ? startAngle - Math.PI : startAngle;
                        let endA = deltaAngle < 0 ? endAngle - Math.PI : endAngle;

                        lengthObj.angles = [startA + Math.PI * 0.5, endA + Math.PI * 0.5];
                    }

                    lengthObj.points = [
                        p0,
                        {
                            startAngle: startAngle,
                            deltaAngle: deltaAngle,
                            endAngle: endAngle,
                            cx: cx,
                            cy: cy
                        }, p];
                    break;

                case "C":
                case "Q":
                    cp1 = { x: values[0], y: values[1] };
                    cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
                    let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];
                    tDivisions = (type === 'Q') ? tDivisionsQ : tDivisionsC

                    // length at t=0
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
                        let top = Math.min(p0.y, p.y)
                        let left = Math.min(p0.x, p.x)
                        let right = Math.max(p0.x, p.x)
                        let bottom = Math.max(p0.y, p.y)

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
                        }
                        cp2 = {
                            x: p.x + 2 / 3 * (cp1.x - p.x),
                            y: p.y + 2 / 3 * (cp1.y - p.y)
                        }

                        cp1 = cp1N;
                        type = 'C';
                        lengthObj.type = "C";
                        pts = [p0, cp1, cp2, p];
                    }


                    // treat as lineto
                    if (isFlat) {

                        pts = [p0, p]
                        len = getLength(pts)
                        lengthObj.type = "L";
                        lengthObj.points.push(p0, p);
                        if (getTangent) {
                            angle = Math.atan2(p.y - p0.y, p.x - p0.x)
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
                            let foundAccuracy = false
                            let tol = 0.05
                            let diff = 0;

                            for (let i = 1; i < lgArr.length && !foundAccuracy; i++) {
                                lgNew = lgArr[i];
                                lenNew = getLength(pts, 1, lgNew)

                                //precise enough or last
                                diff = abs(lenNew - len)
                                if (diff < tol || i === lgArr.length - 1) {
                                    lg = lgArr[i - 1]
                                    foundAccuracy = true
                                }
                                // not precise
                                else {
                                    len = lenNew
                                }
                            }
                        }
                    }

                    if (!onlyLength && !isFlat) {

                        // get previous end angle

                        //let angleStart = pointAtT(pts, 0, true).angle;
                        if (getTangent) {
                            let angleStart = lengthLookup.segments[i - 2] ? lengthLookup.segments[i - 2].angles.slice(-1)[0] : pointAtT(pts, 0, true).angle;
                            // add start and end angles
                            lengthObj.angles.push(angleStart, pointAtT(pts, 1, true).angle);
                        }

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
            }
            lengthLookup.totalLength = pathLength;


            // add original command if it was converted for eliptic arcs
            if (com.index) {
                lengthObj.index = com.index;
                lengthObj.typeO = com.com.type;
                lengthObj.com = com.com;
            }

            // interpret z closepaths as linetos
            if (type === 'Z') {
                lengthObj.com.values = [p.x, p.y];
            }
        }


        if (onlyLength) {
            return pathLength;
        } else {
            return new PathLengthObject(lengthLookup.totalLength, lengthLookup.segments);
        }
    }


    function getPathLengthFromD(d, lg = 0) {
        let pathData = parsePathDataNormalized(d);
        return getPathDataLength(pathData, lg)
    }


    // only total pathlength
    function getPathDataLength(pathData, lg = 0) {
        return getPathLengthLookup(pathData, lg, true)
    }

    function getLength(pts, t = 1, lg = 0) {

        const lineLength = (p1, p2) => {
            return sqrt(
                (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
            );
        }

        /**
         * Based on snap.svg bezlen() function
         * https://github.com/adobe-webplatform/Snap.svg/blob/master/dist/snap.svg.js#L5786
         */
        const cubicBezierLength = (p0, cp1, cp2, p, t, lg) => {
            if (t === 0) {
                return 0;
            }

            const getLegendreGaussValues = (n, x1 = -1, x2 = 1) => {
                let waArr = []
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
                            //Loop up the recurrence relation to get the Legendre polynomial evaluated at z.
                            p3 = p2;
                            p2 = p1;
                            p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
                        }

                        pp = (n * (z * p1 - p2)) / (z * z - 1);
                        z1 = z;
                        z = z1 - p1 / pp; //Newton’s method

                    } while (abs(z - z1) > 1.0e-14);
                    waArr.push([(2 * xl) / ((1 - z * z) * pp * pp), xm + xl * z])
                }
                return waArr;
            }


            const base3 = (t, p1, p2, p3, p4) => {
                let t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4,
                    t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3;
                return t * t2 - 3 * p1 + 3 * p2;
            };
            t = t > 1 ? 1 : t < 0 ? 0 : t;
            let t2 = t / 2;

            /**
             * set higher legendre gauss weight abscissae values 
             * by more accurate weight/abscissa  lookups 
             * https://pomax.github.io/bezierinfo/legendre-gauss.html
             */

            // add values if not existent
            if (!lgVals[lg]) {
                lgVals[lg] = getLegendreGaussValues(lg)
            }

            const wa = lgVals[lg];
            let sum = 0;

            for (let i = 0, len = wa.length; i < len; i++) {
                // weight and abscissae 
                let [w, a] = [wa[i][0], wa[i][1]];
                let ct1_t = t2 * a;
                let ct1 = ct1_t + t2;
                let ct0 = -ct1_t + t2;

                let xbase0 = base3(ct0, p0.x, cp1.x, cp2.x, p.x)
                let ybase0 = base3(ct0, p0.y, cp1.y, cp2.y, p.y)
                let comb0 = xbase0 * xbase0 + ybase0 * ybase0;

                let xbase1 = base3(ct1, p0.x, cp1.x, cp2.x, p.x)
                let ybase1 = base3(ct1, p0.y, cp1.y, cp2.y, p.y)
                let comb1 = xbase1 * xbase1 + ybase1 * ybase1;

                sum += w * sqrt(comb0) + w * sqrt(comb1)

            }
            return t2 * sum;
        }


        const quadraticBezierLength = (p0, cp1, p, t, checkFlat = false) => {
            if (t === 0) {
                return 0;
            }
            // is flat/linear – treat as line
            if (checkFlat) {
                let l1 = lineLength(p0, cp1) + lineLength(cp1, p);
                let l2 = lineLength(p0, p);
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
            length = lineLength(pts[0], pts[1])
        }

        return length;
    }



    /**
     * parse pathData from d attribute
     * the core function to parse the pathData array from a d string
     **/

    function parsePathDataNormalized(d, options = {}) {

        d = d
            // remove new lines, tabs an comma with whitespace
            .replace(/[\n\r\t|,]/g, " ")
            // pre trim left and right whitespace
            .trim()
            // add space before minus sign
            .replace(/(\d)-/g, '$1 -')
            // decompose multiple adjacent decimal delimiters like 0.5.5.5 => 0.5 0.5 0.5
            .replace(/(\.)(?=(\d+\.\d+)+)(\d+)/g, "$1$3 ")

        let pathData = [];
        let cmdRegEx = /([mlcqazvhst])([^mlcqazvhst]*)/gi;
        let commands = d.match(cmdRegEx);

        // valid command value lengths
        let comLengths = { m: 2, a: 7, c: 6, h: 1, l: 2, q: 4, s: 4, t: 2, v: 1, z: 0 };

        options = {
            ...{
                toAbsolute: true,
                toLonghands: true,
                arcToCubic: false,
                arcAccuracy: 4,
            },
            ...options
        }

        let { toAbsolute, toLonghands, arcToCubic, arcAccuracy } = options;
        let hasArcs = /[a]/gi.test(d);
        let hasShorthands = toLonghands ? /[vhst]/gi.test(d) : false;
        let hasRelative = toAbsolute ? /[lcqamts]/g.test(d.substring(1, d.length - 1)) : false;

        // offsets for absolute conversion
        let offX, offY, lastX, lastY, M;

        for (let c = 0; c < commands.length; c++) {
            let com = commands[c];
            let type = com.substring(0, 1);
            let typeRel = type.toLowerCase();
            let typeAbs = type.toUpperCase();
            let isRel = type === typeRel;
            let chunkSize = comLengths[typeRel];

            //console.log(typeRel);

            // split values to array
            let values = com.substring(1, com.length)
                .trim()
                .split(" ").filter(Boolean);

            /**
             * A - Arc commands
             * large arc and sweep flags
             * are boolean and can be concatenated like
             * 11 or 01
             * or be concatenated with the final on path points like
             * 1110 10 => 1 1 10 10
             */
            if (typeRel === "a" && values.length != comLengths.a) {

                let n = 0,
                    arcValues = [];
                for (let i = 0; i < values.length; i++) {
                    let value = values[i];

                    // reset counter
                    if (n >= chunkSize) {
                        n = 0;
                    }
                    // if 3. or 4. parameter longer than 1
                    if ((n === 3 || n === 4) && value.length > 1) {
                        let largeArc = n === 3 ? value.substring(0, 1) : "";
                        let sweep = n === 3 ? value.substring(1, 2) : value.substring(0, 1);
                        let finalX = n === 3 ? value.substring(2) : value.substring(1);
                        let comN = [largeArc, sweep, finalX].filter(Boolean);
                        arcValues.push(comN);
                        n += comN.length;


                    } else {
                        // regular
                        arcValues.push(value);
                        n++;
                    }
                }
                values = arcValues.flat().filter(Boolean);
            }

            // string  to number
            values = values.map(Number)

            // if string contains repeated shorthand commands - split them
            let hasMultiple = values.length > chunkSize;
            let chunk = hasMultiple ? values.slice(0, chunkSize) : values;
            let comChunks = [{ type: type, values: chunk }];

            // has implicit or repeated commands – split into chunks
            if (hasMultiple) {
                let typeImplicit = typeRel === "m" ? (isRel ? "l" : "L") : type;
                for (let i = chunkSize; i < values.length; i += chunkSize) {
                    let chunk = values.slice(i, i + chunkSize);
                    comChunks.push({ type: typeImplicit, values: chunk });
                }
            }

            // no relative, shorthand or arc command - return current 
            if (!hasRelative && !hasShorthands && !hasArcs) {

                comChunks.forEach((com) => {
                    pathData.push(com);
                });
            }

            /**
             * convert to absolute 
             * init offset from 1st M
             */
            else {
                if (c === 0) {
                    offX = values[0];
                    offY = values[1];
                    lastX = offX;
                    lastY = offY;
                    M = { x: values[0], y: values[1] };
                }

                let typeFirst = comChunks[0].type;
                typeAbs = typeFirst.toUpperCase()

                // first M is always absolute
                isRel = typeFirst.toLowerCase() === typeFirst && pathData.length ? true : false;

                for (let i = 0; i < comChunks.length; i++) {
                    let com = comChunks[i];
                    let type = com.type;
                    let values = com.values;
                    let valuesL = values.length;
                    let comPrev = comChunks[i - 1]
                        ? comChunks[i - 1]
                        : c > 0 && pathData[pathData.length - 1]
                            ? pathData[pathData.length - 1]
                            : comChunks[i];

                    let valuesPrev = comPrev.values;
                    let valuesPrevL = valuesPrev.length;
                    isRel = comChunks.length > 1 ? type.toLowerCase() === type && pathData.length : isRel;

                    if (isRel) {
                        com.type = comChunks.length > 1 ? type.toUpperCase() : typeAbs;

                        switch (typeRel) {
                            case "a":
                                com.values = [
                                    values[0],
                                    values[1],
                                    values[2],
                                    values[3],
                                    values[4],
                                    values[5] + offX,
                                    values[6] + offY
                                ];
                                break;

                            case "h":
                            case "v":
                                com.values = type === "h" ? [values[0] + offX] : [values[0] + offY];
                                break;

                            case "m":
                            case "l":
                            case "t":

                                //update last M
                                if (type === 'm') {
                                    M = { x: values[0] + offX, y: values[1] + offY };
                                }

                                com.values = [values[0] + offX, values[1] + offY];
                                break;

                            case "c":
                                com.values = [
                                    values[0] + offX,
                                    values[1] + offY,
                                    values[2] + offX,
                                    values[3] + offY,
                                    values[4] + offX,
                                    values[5] + offY
                                ];
                                break;

                            case "q":
                            case "s":
                                com.values = [
                                    values[0] + offX,
                                    values[1] + offY,
                                    values[2] + offX,
                                    values[3] + offY
                                ];
                                break;

                            case 'z':
                            case 'Z':
                                lastX = M.x;
                                lastY = M.y;
                                break;


                        }
                    }
                    // is absolute
                    else {
                        offX = 0;
                        offY = 0;

                        // set new M 
                        if (type === 'M') {
                            M = { x: values[0], y: values[1] };
                        }
                    }

                    /**
                     * convert shorthands
                     */
                    if (hasShorthands) {
                        let cp1X, cp1Y, cpN1X, cpN1Y, cp2X, cp2Y;
                        if (com.type === "H" || com.type === "V") {
                            com.values =
                                com.type === "H" ? [com.values[0], lastY] : [lastX, com.values[0]];
                            com.type = "L";
                        } else if (com.type === "T" || com.type === "S") {
                            [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                            [cp2X, cp2Y] =
                                valuesPrevL > 2
                                    ? [valuesPrev[2], valuesPrev[3]]
                                    : [valuesPrev[0], valuesPrev[1]];

                            // new control point
                            cpN1X = com.type === "T" ? lastX * 2 - cp1X : lastX * 2 - cp2X;
                            cpN1Y = com.type === "T" ? lastY * 2 - cp1Y : lastY * 2 - cp2Y;

                            com.values = [cpN1X, cpN1Y, com.values].flat();
                            com.type = com.type === "T" ? "Q" : "C";

                        }
                    }


                    /**
                     * convert arcs if elliptical
                     */
                    let isElliptic = false;

                    if (hasArcs && com.type === 'A') {

                        p0 = { x: lastX, y: lastY }
                        if (typeRel === 'a') {
                            isElliptic = com.values[0] === com.values[1] ? false : true;

                            if (isElliptic || arcToCubic) {
                                //let originalCom = {type:'A', values: com.values, p0:p0 }
                                let comArc = arcToBezier(p0, com.values, arcAccuracy)
                                comArc.forEach(seg => {
                                    // save original command data
                                    seg.index = c;
                                    seg.com = { type: 'A', values: com.values, p0: p0 };
                                    pathData.push(seg);
                                })

                            } else {
                                pathData.push(com);
                            }
                        }
                    }
                    else {
                        // add to pathData array
                        pathData.push(com);
                    }

                    // update offsets
                    lastX =
                        valuesL > 1
                            ? values[valuesL - 2] + offX
                            : typeRel === "h"
                                ? values[0] + offX
                                : lastX;
                    lastY =
                        valuesL > 1
                            ? values[valuesL - 1] + offY
                            : typeRel === "v"
                                ? values[0] + offY
                                : lastY;
                    offX = lastX;
                    offY = lastY;
                }
            } // end toAbsolute

        }


        /**
         * first M is always absolute/uppercase -
         * unless it adds relative linetos
         * (facilitates d concatenating)
         */
        pathData[0].type = "M";
        return pathData;


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
            let sinphi = phi ? sin(phi) : 0
            let cosphi = phi ? cos(phi) : 1
            let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2
            let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2

            if (pxp === 0 && pyp === 0) {
                return []
            }
            rx = abs(rx)
            ry = abs(ry)
            let lambda =
                pxp * pxp / (rx * rx) +
                pyp * pyp / (ry * ry)
            if (lambda > 1) {
                let lambdaRt = sqrt(lambda);
                rx *= lambdaRt
                ry *= lambdaRt
            }

            /** 
             * parametrize arc to 
             * get center point start and end angles
             */
            let rxsq = rx * rx,
                rysq = rx === ry ? rxsq : ry * ry

            let pxpsq = pxp * pxp,
                pypsq = pyp * pyp
            let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq)

            if (radicant <= 0) {
                radicant = 0
            } else {
                radicant /= (rxsq * pypsq) + (rysq * pxpsq)
                radicant = sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1)
            }

            let centerxp = radicant ? radicant * rx / ry * pyp : 0
            let centeryp = radicant ? radicant * -ry / rx * pxp : 0
            let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2
            let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2

            let vx1 = (pxp - centerxp) / rx
            let vy1 = (pyp - centeryp) / ry
            let vx2 = (-pxp - centerxp) / rx
            let vy2 = (-pyp - centeryp) / ry

            // get start and end angle
            const vectorAngle = (ux, uy, vx, vy) => {
                let dot = +(ux * vx + uy * vy).toFixed(9)
                if (dot === 1 || dot === -1) {
                    return dot === 1 ? 0 : PI
                }
                dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot)
                let sign = (ux * vy - uy * vx < 0) ? -1 : 1
                return sign * acos(dot);
            }

            let ang1 = vectorAngle(1, 0, vx1, vy1),
                ang2 = vectorAngle(vx1, vy1, vx2, vy2)

            if (sweepFlag === 0 && ang2 > 0) {
                ang2 -= PI * 2
            }
            else if (sweepFlag === 1 && ang2 < 0) {
                ang2 += PI * 2
            }

            let ratio = +(abs(ang2) / (TAU / 4)).toFixed(0)

            // increase segments for more accureate length calculations
            let segments = ratio * splitSegments;
            ang2 /= segments
            let pathDataArc = [];


            // If 90 degree circular arc, use a constant
            // https://pomax.github.io/bezierinfo/#circles_cubic
            // k=0.551784777779014
            const angle90 = 1.5707963267948966;
            const k = 0.551785
            let a = ang2 === angle90 ? k :
                (
                    ang2 === -angle90 ? -k : 4 / 3 * tan(ang2 / 4)
                );

            let cos2 = ang2 ? cos(ang2) : 1;
            let sin2 = ang2 ? sin(ang2) : 0;
            let type = 'C'

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
            }

            for (let i = 0; i < segments; i++) {
                let com = { type: type, values: [] }
                let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

                curve.forEach((pt) => {
                    let x = pt.x * rx
                    let y = pt.y * ry
                    com.values.push(cosphi * x - sinphi * y + centerx, sinphi * x + cosphi * y + centery)
                })
                pathDataArc.push(com);
                ang1 += ang2
            }

            return pathDataArc;
        }


    }
    /**
    * based on @cuixiping;
    * https://stackoverflow.com/questions/9017100/calculate-center-of-svg-arc/12329083#12329083
    */
    function svgArcToCenterParam(x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2) {

        let { cos, sin, atan2, sqrt, abs, min, max, PI } = Math;

        // helper for angle calculation
        const getAngle = (cx, cy, x, y) => {
            return atan2(y - cy, x - cx);
        };

        // make sure rx, ry are positive
        rx = abs(rx);
        ry = abs(ry);

        /**
         * if rx===ry x-axis rotation is ignored
         * otherwise convert degrees to radians
         */
        let phi = rx === ry ? 0 : (xAxisRotation * PI) / 180;
        let cx, cy

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
            clockwise: sweep
        };


        if (rx == 0 || ry == 0) {
            // invalid arguments
            throw Error("rx and ry can not be 0");
        }


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
        let sum_of_sq = rxy1_ * rxy1_ + ryx1_ * ryx1_; // sum of square
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
        //console.log('start:', startAngle, 'end:', endAngle)
        endAngle = (!sweep && largeArc) ? endAngle - PI * 2 : ((endAngle < startAngle && largeArc) || (endAngle < 0 && endAngle < startAngle) ? endAngle + PI * 2 : endAngle)

        let deltaAngle = endAngle - startAngle
        arcData.startAngle = startAngle;
        arcData.endAngle = endAngle;
        arcData.deltaAngle = deltaAngle;

        return arcData;
    }

    pathDataLength.getPathLengthLookup = getPathLengthLookup;
    pathDataLength.getPathLengthFromD = getPathLengthFromD;
    pathDataLength.getPathDataLength = getPathDataLength;
    pathDataLength.getLength = getLength;
    pathDataLength.parsePathDataNormalized = parsePathDataNormalized;
    pathDataLength.svgArcToCenterParam = svgArcToCenterParam;
    pathDataLength.getAngle = getAngle;
    pathDataLength.pointAtT = pointAtT;


    return pathDataLength;
});


if (typeof module === 'undefined') {
    var { getPathLengthLookup, getPathLengthFromD, getPathDataLength, getLength, parsePathDataNormalized, svgArcToCenterParam, getAngle, pointAtT } = pathDataLength;
}
