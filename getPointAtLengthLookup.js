/* v 1.2.4 */
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

    const { abs, acos, atan, atan2, cos, sin, log, max, min, sqrt, tan, PI, pow } = Math;

    // Legendre Gauss weight and abscissa values
    const lgVals = {
    }

    // LG weight/abscissae generator
    const getLegendreGaussValues = (n, x1 = -1, x2 = 1) => {
        //console.log('add new LG', n);
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

            let weight = (2 * xl) / ((1 - z * z) * pp * pp);
            let abscissa = xm + xl * z;

            waArr.push(
                [weight, -abscissa],
                [weight, abscissa],
            )
        }

        return waArr;
    }



    // get angle helper
    const getAngle = (p1, p2) => {
        return atan2(p2.y - p1.y, p2.x - p1.x);
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
                if (pt.angle < 0) pt.angle += PI * 2
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
        if (getTangent && pt.angle < 0) pt.angle += PI * 2

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
        let seg0 = segments[0];
        let seglast = segments[segments.length - 1];
        let M = seg0.points[0];
        let angle0 = seg0.angles[0]
        angle0 = angle0 < 0 ? angle0 + PI * 2 : angle0;

        let newT = 0;
        let foundSegment = false;
        let pt = { x: M.x, y: M.y };

        // tangent angles for Arcs
        let tangentAngle, rx, ry, xAxisRotation, deltaAngle, perpendicularAdjust;


        if (getTangent) {
            pt.angle = angle0;

            if (seg0.type === 'A') {

                ({ rx, ry, xAxisRotation, deltaAngle } = seg0.points[1]);

                if (rx !== ry) {

                    // adjust for clockwise or counter clockwise
                    perpendicularAdjust = deltaAngle < 0 ? PI * -0.5 : PI * 0.5;

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
        else if (length === totalLength) {
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
                        perpendicularAdjust = deltaAngle < 0 ? PI * -0.5 : PI * 0.5;

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

                        let { rx, ry, cx, cy, startAngle, endAngle, deltaAngle, xAxisRotation } = segment.points[1];

                        // is ellipse
                        if (rx !== ry) {

                            // adjust for clockwise or counter clockwise
                            perpendicularAdjust = deltaAngle < 0 ? PI * -0.5 : PI * 0.5;


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
                                    tangentAngle = getTangentAngle(rx, ry, angleI) - xAxisRotation;

                                    // adjust for axis rotation
                                    tangentAngle = xAxisRotation ? tangentAngle + perpendicularAdjust : tangentAngle

                                    // return angle
                                    pt.angle = tangentAngle;

                                }
                            }


                        } else {

                            newT = 1 - (1 / total) * diffLength;
                            let newAngle = -deltaAngle * newT;

                            // rotate point
                            let cosA = cos(newAngle);
                            let sinA = sin(newAngle);
                            p0 = segment.points[0]

                            pt = {
                                x: (cosA * (p0.x - cx)) + (sinA * (p0.y - cy)) + cx,
                                y: (cosA * (p0.y - cy)) - (sinA * (p0.x - cx)) + cy
                            }

                            // angle
                            if (getTangent) {
                                let angleOff = deltaAngle > 0 ? PI / 2 : PI / -2;
                                pt.angle = startAngle + (deltaAngle * newT) + angleOff
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
                                // difference between length at t and exact length
                                let diffLength = lengthAtT - length;


                                // ratio between segment length and difference
                                let tScale = (1 / tSegLength) * diffLength || 0;
                                newT = t - tStep * tScale || 0;

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

        const checkFlatnessByPolygonArea = (points, tolerance = 0.001) => {
            let area = 0;
            for (let i = 0, len = points.length; len && i < len; i++) {
                let addX = points[i].x;
                let addY = points[i === points.length - 1 ? 0 : i + 1].y;
                let subX = points[i === points.length - 1 ? 0 : i + 1].x;
                let subY = points[i].y;
                area += addX * addY * 0.5 - subX * subY * 0.5;
            }
            return abs(area) < tolerance;
        }

        /**
         * auto adjust legendre-gauss accuracy
         * precision for arc approximation
        */
        let auto_lg = precision === 'high' ? true : false;
        let lg = precision === 'medium' ? 24 : 12;
        let lgArr = [12, 24, 36, 48, 60, 64, 72, 96];
        let tDivisionsQ = precision === 'low' ? 10 : 12;
        let tDivisionsC = precision === 'low' ? 15 : (precision === 'medium' ? 23 : 35);
        let tDivisions = tDivisionsC;

        // get pathdata
        let type = Array.isArray(d) ? 'array' : typeof d;

        // if string is SVG - take first geometry element
        if(type==='string' && d.startsWith('<svg')){
            let svg = new DOMParser().parseFromString(d, 'text/html').querySelector('svg');
            let allowed = ['path', 'polygon', 'polyline', 'line', 'rect', 'circle', 'ellipse'];
            let children = [...svg.children].filter(node=>{return allowed.includes(node.nodeName.toLowerCase())  })
            d = children.length ? children[0] : null;
            if(d) type='element'
        }

        if(!d) throw Error("No path data defined");

        let pathData = type === 'array' ? d : (type === 'string' ? parsePathDataNormalized(d) : getPathDataFromEl(d));

        let pathLength = 0;
        let M = pathData[0];
        let lengthLookup = { totalLength: 0, segments: [] };
        let wa;


        for (let i = 1; i < pathData.length; i++) {
            let comPrev = pathData[i - 1];
            let valuesPrevL = comPrev.values.slice(-2)
            let p0 = { x: valuesPrevL[0], y: valuesPrevL[1] };

            let com = pathData[i];
            let { type, values } = com;
            let valuesL = values.slice(-2);
            let p = { x: valuesL[0], y: valuesL[1] };
            let cp1, cp2, t, angle;
            let len = 0;


            // collect segment data in object
            let lengthObj = {
                type: type,
                index: i,
                com: { type: type, values: values, p0: p0 },
                lengths: [],
                points: [],
                angles: [],
                total: 0,
                lastSeg: 0,
                lastSub: 0,
                lastLength: 0
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
                        angle = getAngle(p0, p)
                        lengthObj.angles.push(angle);
                    }
                    break;

                case "A":
                    p = {
                        x: com.values[5],
                        y: com.values[6]
                    }
                    let xAxisRotation = com.values[2],
                        largeArc = com.values[3],
                        sweep = com.values[4];

                    // get parametrized arc properties
                    let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], largeArc, sweep, p.x, p.y)
                    let { cx, cy, rx, ry, startAngle, endAngle, deltaAngle } = arcData


                    /** 
                     * if arc is elliptic
                     */
                    if (rx !== ry) {

                        // values are alredy in radians
                        let degrees = false;

                        // add weight/abscissa values if not existent
                        let wa_key = `wa${lg}`;
                        if (!lgVals[wa_key]) {
                            lgVals[wa_key] = getLegendreGaussValues(lg)
                        }

                        wa = lgVals[wa_key];

                        /** 
                         * convert angles to parametric
                         * adjusted for xAxisRotation
                         * increases performance
                         */

                        // convert x-axis-rotation to radians
                        xAxisRotation = xAxisRotation * PI / 180;
                        startAngle = toParametricAngle((startAngle - xAxisRotation), rx, ry)
                        endAngle = toParametricAngle((endAngle - xAxisRotation), rx, ry)

                        // adjust end angle
                        if (sweep && startAngle > endAngle) {
                            endAngle += PI * 2
                        }

                        if (!sweep && startAngle < endAngle) {
                            endAngle -= PI * 2
                        }

                        // precision
                        let lenNew = 0;

                        // first length and angle
                        lengthObj.lengths.push(pathLength);
                        lengthObj.angles.push(startAngle);

                        for (let i = 1; i < tDivisionsC; i++) {
                            let endAngle = startAngle + deltaAngle / tDivisionsC * i;
                            lenNew = getEllipseLengthLG(rx, ry, startAngle, endAngle, 0, false, degrees, wa);

                            len += lenNew;
                            lengthObj.lengths.push(lenNew + pathLength)
                            lengthObj.angles.push(endAngle)
                        }

                        // last angle
                        lengthObj.angles.push(endAngle);

                        // last length
                        len = getEllipseLengthLG(rx, ry, startAngle, endAngle, 0, false, degrees, wa);

                    }
                    // circular arc
                    else {

                        /** 
                         * get arc length: 
                         * perfect circle length can be linearly interpolated 
                         * according to delta angle
                         */
                        len = 2 * PI * rx * (1 / 360 * abs(deltaAngle * 180 / PI))

                        if (getTangent) {
                            let startA = deltaAngle < 0 ? startAngle - PI : startAngle;
                            let endA = deltaAngle < 0 ? endAngle - PI : endAngle;

                            // save only start and end angle
                            lengthObj.angles = [startA + PI * 0.5, endA + PI * 0.5];
                        }
                    }


                    lengthObj.points = [
                        p0,
                        {
                            startAngle: startAngle,
                            deltaAngle: deltaAngle,
                            endAngle: endAngle,
                            xAxisRotation: xAxisRotation,
                            rx: rx,
                            ry: ry,
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
                        let top = min(p0.y, p.y)
                        let left = min(p0.x, p.x)
                        let right = max(p0.x, p.x)
                        let bottom = max(p0.y, p.y)

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


                    // treat flat bézier as  lineto
                    if (isFlat) {

                        pts = [p0, p]
                        len = getLength(pts)
                        lengthObj.type = "L";
                        lengthObj.points.push(p0, p);
                        if (getTangent) {
                            angle = atan2(p.y - p0.y, p.x - p0.x)
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
                            let tol = 0.001
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

                        if (getTangent) {
                            let angleStart = pointAtT(pts, 0, true).angle

                            // add only start and end angles for béziers
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

    /**
     * lenght calculation
     * helper for
     * lines, quadratic or cubic béziers
     */
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

            const base3 = (t, p1, p2, p3, p4) => {
                let t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4,
                    t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3;
                return t * t2 - 3 * p1 + 3 * p2;
            };
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

            for (let i = 0, len = wa.length; i < len; i++) {
                // weight and abscissae 
                let [w, a] = [wa[i][0], wa[i][1]];
                let ct1_t = t2 * a;
                let ct0 = -ct1_t + t2;

                let xbase0 = base3(ct0, p0.x, cp1.x, cp2.x, p.x)
                let ybase0 = base3(ct0, p0.y, cp1.y, cp2.y, p.y)
                let comb0 = xbase0 * xbase0 + ybase0 * ybase0;

                sum += w * sqrt(comb0)

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

    function parsePathDataNormalized(d, { toAbsolute = true, toLonghands = true } = {}) {

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

        let hasShorthands = toLonghands ? /[vhst]/gi.test(d) : false;
        let hasRelative = toAbsolute ? /[lcqamts]/g.test(d.substring(1, d.length - 1)) : false;

        // offsets for absolute conversion
        let offX, offY, lastX, lastY, M;

        for (let c = 0, len = commands.length; c < len; c++) {
            let com = commands[c];
            let type = com.substring(0, 1);
            let typeRel = type.toLowerCase();
            let typeAbs = type.toUpperCase();
            let isRel = type === typeRel;
            let chunkSize = comLengths[typeRel];


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
            if (!hasRelative && !hasShorthands) {

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

                    // add to pathData array
                    pathData.push(com);


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

    }


    /**
    * based on @cuixiping;
    * https://stackoverflow.com/questions/9017100/calculate-center-of-svg-arc/12329083#12329083
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
            clockwise: sweep
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


    /**
     * ellipse helpers
     */

    function getEllipseLengthLG(rx, ry, startAngle, endAngle, xAxisRotation = 0, convertParametric = true, degrees = false, wa = []) {

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


    function getPointOnEllipse(cx, cy, rx, ry, angle, ellipseRotation = 0, parametricAngle = true, degrees = true) {

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
    };


    function getTangentAngle(rx, ry, parametricAngle) {

        // Derivative components
        let dx = -rx * sin(parametricAngle);
        let dy = ry * cos(parametricAngle);
        let tangentAngle = atan2(dy, dx);

        return tangentAngle;
    }


    // retrieve pathdata from svg geometry elements
    function getPathDataFromEl(el) {

        let pathData = [];
        let type = el.nodeName;
        let atts, attNames, d, x, y, width, height, r, rx, ry, cx, cy, x1, x2, y1, y2;

        // convert relative or absolute units 
        const svgElUnitsToPixel = (el, decimals = 9) => {
            //console.log(this);
            const svg = el.nodeName !== "svg" ? el.closest("svg") : el;

            // convert real life units to pixels
            const translateUnitToPixel = (value) => {

                if (value === null) {
                    return 0
                }
                //default dpi = 96
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

            //prefer viewBox values
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
                    //absolute units
                    else {
                        valAbs = translateUnitToPixel(val);
                    }
                    el.setAttribute(att, +valAbs);
                }
            });
        }

        svgElUnitsToPixel(el)

        const getAtts = (attNames) => {
            atts = {}
            attNames.forEach(att => {
                atts[att] = +el.getAttribute(att)
            })
            return atts
        }

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
                    rx = r
                    ry = r
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

                let points = el.getAttribute('points').replaceAll(',', ' ').split(' ').filter(Boolean)

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
    };


    pathDataLength.getPathLengthLookup = getPathLengthLookup;
    pathDataLength.getPathLengthFromD = getPathLengthFromD;
    pathDataLength.getPathDataLength = getPathDataLength;
    pathDataLength.getPathDataFromEl = getPathDataFromEl;
    pathDataLength.getLength = getLength;
    pathDataLength.parsePathDataNormalized = parsePathDataNormalized;
    pathDataLength.svgArcToCenterParam = svgArcToCenterParam;
    pathDataLength.getAngle = getAngle;
    pathDataLength.pointAtT = pointAtT;

    return pathDataLength;
});


if (typeof module === 'undefined') {
    var { getPathLengthLookup, getPathLengthFromD, getPathDataLength, getLength, parsePathDataNormalized, svgArcToCenterParam, getAngle, pointAtT, getPathDataFromEl } = pathDataLength;
}
