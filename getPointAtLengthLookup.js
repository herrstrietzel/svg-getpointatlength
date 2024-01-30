
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

    /** function defs **/

    const { PI, sin, cos, acos, abs, sqrt, log } = Math;

    //pathLengthLookup
    Object.prototype.getPointAtLengthLookup = function (length = 0) {

        let { segments, totalLength } = this;
        let foundSegment = false;
        let pt = { x: 0, y: 0 };
        let newT = 0;

        // first point
        if (length === 0) {
            return segments[0].points[0];
        }

        // last point on path
        if (length.toFixed(3) == totalLength.toFixed(3)) {
            let { points } = segments[segments.length - 1];
            pt = points[points.length - 1];
            return pt;
        }

        //loop through segments
        for (let i = 0; i < segments.length && !foundSegment; i++) {
            let segment = segments[i];
            let { type, lengths, points, total } = segment;
            let end = lengths[lengths.length - 1];
            let tStep = 1 / (lengths.length - 1);

            // find path segment
            if (end > length) {
                foundSegment = true;
                let foundT = false;
                let diffLength;

                switch (type) {
                    case 'L':
                        diffLength = end - length;
                        newT = 1 - (1 / total) * diffLength;
                        pt = pointAtT(points, newT);
                        break;

                    case 'C':
                    case 'Q':
                        /**
                         *  cubic or quadratic beziers
                        */
                        let l1 = getLength([points[0], points[1]]) + getLength([points[1], points[2]]);
                        let l2 = type === 'C' ? getLength([points[2], points[3]]) : 0;
                        let lBase = getLength([points[0], points[points.length - 1]]);

                        // is flat
                        if (l1 + l2 === lBase) {
                            diffLength = end - length;
                            newT = 1 - (1 / total) * diffLength;
                            pt = newT <= 1 ? interpolate(points[0], points[2], newT) : points[points.length - 1];
                        }

                        // is curve
                        else {
                            for (let i = 0; i < lengths.length && !foundT; i++) {
                                let lengthAtT = lengths[i];
                                let lengthAtTPrev = i > 0 ? lengths[i - 1] : lengths[i];
                                // found length at t range
                                if (lengthAtT > length) {
                                    let t = tStep * i;
                                    // length between previous and current t
                                    let tSegLength = lengthAtT - lengthAtTPrev;
                                    // difference between length at t and exact length
                                    let diffLength = lengthAtT - length;
                                    // ratio between segment length and difference
                                    let tScale = (1 / tSegLength) * diffLength;
                                    newT = t - tStep * tScale;
                                    foundT = true;

                                    // calculate point
                                    pt = pointAtT(points, newT)

                                }
                            }
                        }
                        break;
                }
                pt.index = segment.index;
                pt.t = newT;
            }
        }
        return pt;
    }

    function getPathLengthLookup(d, hq = true, onlyLength = false) {

        // get pathdata
        let pathData = Array.isArray(d) ? d : parsepathDataNormalized(d);
        let tDivisions = 36;
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
            let len, cp1, cp2, t;

            // collect segment data in object
            let lengthObj = {
                lengths: [],
                points: [],
                index: i,
                total: 0,
                type: type
            };

            // interpret closePath as lineto
            switch (type) {
                case "M":
                    // new M
                    M = pathData[i];
                    len = 0;
                    break;

                case "Z":
                case "L":
                    if (type === 'Z') {
                        // line to previous M
                        p = { x: M.values[0], y: M.values[1] };
                        lengthObj.type = "L";
                    }
                    len = getLength([p0, p]);
                    lengthObj.points.push(p0, p);
                    break;

                case "C":
                case "Q":
                    lengthObj.lengths.push(pathLength);
                    cp1 = { x: values[0], y: values[1] };
                    cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;

                    let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];
                    len = getLength(pts, 1, hq)

                    if (!onlyLength) {
                        for (let d = 1; d < tDivisions; d++) {
                            t = (1 / tDivisions) * d;
                            lengthObj.lengths.push(getLength(pts, t, hq) + pathLength);
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

            if (type !== "M") {
                lengthLookup.segments.push(lengthObj);
            }
            lengthLookup.totalLength = pathLength;
        }

        return onlyLength ? pathLength : lengthLookup;
    }


    function getPathLengthFromD(d, hq = true) {
        let pathData = parsepathDataNormalized(d);
        return getPathDataLength(pathData, hq)
    }


    // only total pathlength
    function getPathDataLength(pathData, hq = true) {
        return getPathLengthLookup(pathData, hq, true)
    }

    function getLength(pts, t = 1, hq = true) {

        const lineLength = (p1, p2) => {
            return sqrt(
                (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
            );
        }

        /**
         * Based on snap.svg bezlen() function
         * https://github.com/adobe-webplatform/Snap.svg/blob/master/dist/snap.svg.js#L5786
         */
        const cubicBezierLength = (p0, cp1, cp2, p, t, hq) => {
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
             * set higher hq 
             * by more accurate weight/abscissa  lookups 
             * https://pomax.github.io/bezierinfo/legendre-gauss.html
             */


            let wa24 = [[0.1279381953467522, 0.0640568928626056], [0.1258374563468283, 0.1911188674736163], [0.1216704729278034, 0.3150426796961634], [0.1155056680537256, 0.4337935076260451], [0.1074442701159656, 0.5454214713888396], [0.0976186521041139, 0.6480936519369755], [0.0861901615319533, 0.7401241915785544], [0.0733464814110803, 0.820001985973903], [0.0592985849154368, 0.8864155270044011], [0.0442774388174198, 0.9382745520027328], [0.0285313886289337, 0.9747285559713095], [0.0123412297999872, 0.9951872199970213]];


            let wa48 = [[0.0647376968126839, 0.0323801709628694], [0.0644661644359501, 0.0970046992094627], [0.0639242385846482, 0.1612223560688917], [0.063114192286254, 0.2247637903946891], [0.0620394231598927, 0.2873624873554556], [0.0607044391658939, 0.3487558862921608], [0.0591148396983956, 0.4086864819907167], [0.0572772921004032, 0.4669029047509584], [0.0551995036999842, 0.523160974722233], [0.0528901894851937, 0.5772247260839727], [0.0503590355538545, 0.6288673967765136], [0.0476166584924905, 0.6778723796326639], [0.0446745608566943, 0.7240341309238146], [0.0415450829434647, 0.7671590325157404], [0.0382413510658307, 0.8070662040294426], [0.0347772225647704, 0.8435882616243935], [0.0311672278327981, 0.8765720202742479], [0.0274265097083569, 0.9058791367155696], [0.0235707608393244, 0.9313866907065543], [0.0196161604573555, 0.9529877031604309], [0.0155793157229438, 0.9705915925462473], [0.0114772345792345, 0.9841245837228269], [0.0073275539012763, 0.9935301722663508], [0.0031533460523058, 0.9987710072524261]];


            let wa = hq ? wa48 : wa24
            let sum = 0;


            for (let i = 0, len = wa.length; i < len; i++) {
                let item = wa[i]
                // weight and abscissa 
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


        const quadraticBezierLength = (p0, cp1, p, t) => {
            if (t === 0) {
                return 0;
            }

            // is flat/linear 
            let l1 = lineLength(p0, cp1) + lineLength(cp1, p);
            let l2 = lineLength(p0, p);
            if (l1 === l2) {
                let m1 = interpolate(p0, cp1, t);
                let m2 = interpolate(cp1, p, t);
                p = interpolate(m1, m2, t);
                let lengthL;
                lengthL = sqrt((p.x - p0.x) * (p.x - p0.x) + (p.y - p0.y) * (p.y - p0.y));
                return lengthL;
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
            length = cubicBezierLength(pts[0], pts[1], pts[2], pts[3], t, hq)
        }
        else if (pts.length === 3) {
            length = quadraticBezierLength(pts[0], pts[1], pts[2], t, hq)
        }
        else {
            length = lineLength(pts[0], pts[1])
        }

        return length;
    }


    function pointAtT(pts, t = 0.5) {

        /**
         * Linear  interpolation (LERP) helper
         */
        const interpolate = (p1, p2, t) => {
            return {
                x: (p2.x - p1.x) * t + p1.x,
                y: (p2.y - p1.y) * t + p1.y
            };
        }

        /**
            * calculate single points on segments
            */
        const getPointAtCubicSegmentT = (p0, cp1, cp2, p, t) => {
            let t1 = 1 - t;
            return {
                x:
                    t1 ** 3 * p0.x +
                    3 * t1 ** 2 * t * cp1.x +
                    3 * t1 * t ** 2 * cp2.x +
                    t ** 3 * p.x,
                y:
                    t1 ** 3 * p0.y +
                    3 * t1 ** 2 * t * cp1.y +
                    3 * t1 * t ** 2 * cp2.y +
                    t ** 3 * p.y
            };
        }

        const getPointAtQuadraticSegmentT = (p0, cp1, p, t) => {
            let t1 = 1 - t;
            return {
                x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
                y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y
            };
        }

        let pt
        if (pts.length === 4) {
            pt = getPointAtCubicSegmentT(pts[0], pts[1], pts[2], pts[3], t)
        }
        else if (pts.length === 3) {
            pt = getPointAtQuadraticSegmentT(pts[0], pts[1], pts[2], t)
        }
        else {
            pt = interpolate(pts[0], pts[1], t)
        }
        return pt
    }




    /**
     * parse pathData from d attribute
     * the core function to parse the pathData array from a d string
     **/

    function parsepathDataNormalized(d, options = {}) {

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
                arcToCubic: true
            },
            ...options
        }

        let { toAbsolute, toLonghands, arcToCubic } = options;
        let hasArcs = arcToCubic ? /[a]/gi.test(d) : false;
        let hasShorthands = toLonghands ? /[vhst]/gi.test(d) : false;
        let hasRelative = toAbsolute ? /[lcqamts]/g.test(d.substring(1, d.length - 1)) : false;

        // offsets for absolute conversion
        let offX, offY, lastX, lastY;

        for (let c = 0; c < commands.length; c++) {
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
                        }
                    }
                    // is absolute
                    else {
                        offX = 0;
                        offY = 0;
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
                     * convert arcs 
                     */
                    if (hasArcs && com.type === 'A') {
                        p0 = { x: lastX, y: lastY }
                        if (typeRel === 'a') {
                            let comArc = arcToBezier(p0, com.values)
                            comArc.forEach(seg => {
                                pathData.push(seg);
                            })
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
            }
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

    pathDataLength.getPathLengthLookup = getPathLengthLookup;
    pathDataLength.getPathLengthFromD = getPathLengthFromD;
    pathDataLength.getPathDataLength = getPathDataLength;
    pathDataLength.getLength = getLength;
    pathDataLength.pointAtT = pointAtT;
    pathDataLength.parsepathDataNormalized = parsepathDataNormalized;

    return pathDataLength;
});
