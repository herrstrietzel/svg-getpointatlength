/**
* calculate point at Length 
* from length at t lookup
*/

var pathDataLength = {};

(function () {

    //pathLengthLookup
    Object.prototype.getPointAtLengthLookup = function (length = 0) {
        let { segments, totalLength } = this;
        let foundSegment = false;
        let pt = { x: 0, y: 0 };
        let newT = 0;

        //console.log(segments, totalLength);

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
                        pt = interpolatedPoint(points[0], points[1], newT);
                        break;

                    case 'C':
                    case 'Q':
                        /**
                         *  cubic or quadratic beziers
                        */
                        let l1 = getLineLength(points[0], points[1]) + getLineLength(points[1], points[2]);
                        let l2 = type === 'C' ? getLineLength(points[2], points[3]) : 0;
                        let lBase = getLineLength(points[0], points[points.length - 1]);

                        // is flat
                        if (l1 + l2 === lBase) {
                            diffLength = end - length;
                            newT = 1 - (1 / total) * diffLength;
                            pt = newT <= 1 ? interpolatedPoint(points[0], points[2], newT) : points[points.length - 1];
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
                                    pt = type === 'C' ? getPointAtCubicSegmentT(points[0], points[1], points[2], points[3], newT) : getPointAtQuadraticSegmentT(points[0], points[1], points[2], newT);

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

    function getPathLengthLookup(d, precision='medium') {
        // get pathdata
        let pathData = parseDtoPathData(d);

        // needs normalisation?
        let hasRel = /[astvzqmhlc]/g.test(d);
        let hasShorthands = /[hstv]/gi.test(d);
        let hasArcs = /[a]/gi.test(d);

        let tDivisions = 36, arcAccuracy = 1;

        if (hasRel || hasShorthands || hasArcs) {
            let options = {
                convertQuadratic: false,
                convertArc: hasArcs,
                unshort: hasShorthands,
                arcAccuracy: arcAccuracy
            }
            pathData = normalizePathData(pathData, options)
        }

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
                    // line to previous M
                    p = { x: M.values[0], y: M.values[1] };
                    len = getLineLength(p0, p);
                    lengthObj.type = "L";
                    lengthObj.points.push(p0, p);
                    break;

                case "L":
                    len = getLineLength(p0, p);
                    lengthObj.points.push(p0, p);
                    break;

                case "C":
                case "Q":
                    lengthObj.lengths.push(pathLength);
                    cp1 = { x: values[0], y: values[1] };
                    cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
                    len = type === 'C' ? cubicBezierLength(p0, cp1, cp2, p, 1, precision) : quadraticBezierLength(p0, cp1, p, 1);
                    let points = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];

                    for (let d = 1; d < tDivisions; d++) {
                        t = (1 / tDivisions) * d;
                        let bezierLength = type === 'C' ?
                            cubicBezierLength(p0, cp1, cp2, p, t, precision) :
                            quadraticBezierLength(p0, cp1, p, t);
                        lengthObj.lengths.push((bezierLength + pathLength));
                    }
                    lengthObj.points = points;
                    break;
                default:
                    len = 0;
                    break;
            }

            lengthObj.lengths.push(len + pathLength);
            lengthObj.total = len;
            pathLength += len;

            if (type !== "M" && type !== "A") {
                lengthLookup.segments.push(lengthObj);
            }
            lengthLookup.totalLength = pathLength;
        }
        return lengthLookup;
    }


    function getPathLengthFromD(d, precision='medium') {
        let pathData = parseDtoPathData(d);
        let options = {
            convertQuadratic: false,
            convertArc: true,
            unshort: true,
            arcAccuracy: 1
        }
        pathData = normalizePathData(pathData, options)
        let pathDataLength = getPathDataLength(pathData, precision)

        return pathDataLength
    }

    // only total pathlength
    function getPathDataLength(pathData, precision='medium') {
        // get pathdata
        let pathLength = 0;
        let M = pathData[0];

        //let off = 0;
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

            // interpret closePath as lineto
            switch (type) {
                case "M":
                    // new M
                    M = pathData[i];
                    len = 0;
                    break;

                case "Z":
                    // line to previous M
                    p = { x: M.values[0], y: M.values[1] };
                    len = getLineLength(p0, p);
                    break;

                case "L":
                    len = getLineLength(p0, p);
                    break;

                case "C":
                case "Q":
                    cp1 = { x: values[0], y: values[1] };
                    cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
                    len = type === 'C' ? cubicBezierLength(p0, cp1, cp2, p, 1, precision) : quadraticBezierLength(p0, cp1, p, 1);
                    break;
                default:
                    len = 0;
                    break;
            }
            pathLength += len;
        }
        return pathLength;
    }




    /**
     * Based on snap.svg bezlen() function
     * https://github.com/adobe-webplatform/Snap.svg/blob/master/dist/snap.svg.js#L5786
     */
    function cubicBezierLength(p0, cp1, cp2, p, t = 1, precision='medium') {
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


        let Tvalues, Cvalues;

        /**
         * set higher precision 
         * by more accurate weight/abscissa  lookups 
         * https://pomax.github.io/bezierinfo/legendre-gauss.html
         */

        // lower precision
        let Tvalues12 = [-.1252, .1252, -.3678, .3678, -.5873, .5873, -.7699, .7699, -.9041, .9041, -.9816, .9816];
        let Cvalues12 = [0.2491, 0.2491, 0.2335, 0.2335, 0.2032, 0.2032, 0.1601, 0.1601, 0.1069, 0.1069, 0.0472, 0.0472];

        // medium precision
        let Tvalues24 = [
            -0.0640568928626056260850430826247450385909,
            0.0640568928626056260850430826247450385909,
            -0.1911188674736163091586398207570696318404,
            0.1911188674736163091586398207570696318404,
            -0.3150426796961633743867932913198102407864,
            0.3150426796961633743867932913198102407864,
            -0.4337935076260451384870842319133497124524,
            0.4337935076260451384870842319133497124524,
            -0.5454214713888395356583756172183723700107,
            0.5454214713888395356583756172183723700107,
            -0.6480936519369755692524957869107476266696,
            0.6480936519369755692524957869107476266696,
            -0.7401241915785543642438281030999784255232,
            0.7401241915785543642438281030999784255232,
            -0.8200019859739029219539498726697452080761,
            0.8200019859739029219539498726697452080761,
            -0.8864155270044010342131543419821967550873,
            0.8864155270044010342131543419821967550873,
            -0.9382745520027327585236490017087214496548,
            0.9382745520027327585236490017087214496548,
            -0.9747285559713094981983919930081690617411,
            0.9747285559713094981983919930081690617411,
            -0.9951872199970213601799974097007368118745,
            0.9951872199970213601799974097007368118745
        ];

        let Cvalues24 = [
            0.1279381953467521569740561652246953718517,
            0.1279381953467521569740561652246953718517,
            0.1258374563468282961213753825111836887264,
            0.1258374563468282961213753825111836887264,
            0.1216704729278033912044631534762624256070,
            0.1216704729278033912044631534762624256070,
            0.1155056680537256013533444839067835598622,
            0.1155056680537256013533444839067835598622,
            0.1074442701159656347825773424466062227946,
            0.1074442701159656347825773424466062227946,
            0.0976186521041138882698806644642471544279,
            0.0976186521041138882698806644642471544279,
            0.0861901615319532759171852029837426671850,
            0.0861901615319532759171852029837426671850,
            0.0733464814110803057340336152531165181193,
            0.0733464814110803057340336152531165181193,
            0.0592985849154367807463677585001085845412,
            0.0592985849154367807463677585001085845412,
            0.0442774388174198061686027482113382288593,
            0.0442774388174198061686027482113382288593,
            0.0285313886289336631813078159518782864491,
            0.0285313886289336631813078159518782864491,
            0.0123412297999871995468056670700372915759,
            0.0123412297999871995468056670700372915759
        ];



        let Cvalues48 = [
            0.0647376968126839,
            0.0647376968126839,
            0.0644661644359501,
            0.0644661644359501,
            0.0639242385846482,
            0.0639242385846482,
            0.0631141922862540,
            0.0631141922862540,
            0.0620394231598927,
            0.0620394231598927,
            0.0607044391658939,
            0.0607044391658939,
            0.0591148396983956,
            0.0591148396983956,
            0.0572772921004032,
            0.0572772921004032,
            0.0551995036999842,
            0.0551995036999842,
            0.0528901894851937,
            0.0528901894851937,
            0.0503590355538545,
            0.0503590355538545,
            0.0476166584924905,
            0.0476166584924905,
            0.0446745608566943,
            0.0446745608566943,
            0.0415450829434647,
            0.0415450829434647,
            0.0382413510658307,
            0.0382413510658307,
            0.0347772225647704,
            0.0347772225647704,
            0.0311672278327981,
            0.0311672278327981,
            0.0274265097083569,
            0.0274265097083569,
            0.0235707608393244,
            0.0235707608393244,
            0.0196161604573555,
            0.0196161604573555,
            0.0155793157229438,
            0.0155793157229438,
            0.0114772345792345,
            0.0114772345792345,
            0.0073275539012763,
            0.0073275539012763,
            0.0031533460523058,
            0.0031533460523058

        ]

        let Tvalues48 = [
            -0.0323801709628694,
            0.0323801709628694,
            -0.0970046992094627,
            0.0970046992094627,
            -0.1612223560688917,
            0.1612223560688917,
            -0.2247637903946891,
            0.2247637903946891,
            -0.2873624873554556,
            0.2873624873554556,
            -0.3487558862921608,
            0.3487558862921608,
            -0.4086864819907167,
            0.4086864819907167,
            -0.4669029047509584,
            0.4669029047509584,
            -0.5231609747222330,
            0.5231609747222330,
            -0.5772247260839727,
            0.5772247260839727,
            -0.6288673967765136,
            0.6288673967765136,
            -0.6778723796326639,
            0.6778723796326639,
            -0.7240341309238146,
            0.7240341309238146,
            -0.7671590325157404,
            0.7671590325157404,
            -0.8070662040294426,
            0.8070662040294426,
            -0.8435882616243935,
            0.8435882616243935,
            -0.8765720202742479,
            0.8765720202742479,
            -0.9058791367155696,
            0.9058791367155696,
            -0.9313866907065543,
            0.9313866907065543,
            -0.9529877031604309,
            0.9529877031604309,
            -0.9705915925462473,
            0.9705915925462473,
            -0.9841245837228269,
            0.9841245837228269,
            -0.9935301722663508,
            0.9935301722663508,
            -0.9987710072524261,
            0.9987710072524261
        ]

        Tvalues = precision==='high' ? Tvalues48 : (precision==='low' ? Tvalues12 : Tvalues24)
        Cvalues = precision==='high' ? Cvalues48 : (precision==='low' ? Cvalues12 : Cvalues24)


        let n = Tvalues.length;
        let sum = 0;
        for (let i = 0; i < n; i++) {
            let ct = t2 * Tvalues[i] + t2,
                xbase = base3(ct, p0.x, cp1.x, cp2.x, p.x),
                ybase = base3(ct, p0.y, cp1.y, cp2.y, p.y),
                comb = xbase * xbase + ybase * ybase;
            sum += Cvalues[i] * Math.sqrt(comb);
        }
        return t2 * sum;
    }


    function quadraticBezierLength(p0, cp1, p, t = 1) {
        if (t === 0) {
            return 0;
        }

        const interpolate = (p1, p2, t) => {
            let pt = { x: (p2.x - p1.x) * t + p1.x, y: (p2.y - p1.y) * t + p1.y };
            return pt;
        }
        const getLineLength = (p1, p2) => {
            return Math.sqrt(
                (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
            );
        }

        // is flat/linear 
        let l1 = getLineLength(p0, cp1) + getLineLength(cp1, p);
        let l2 = getLineLength(p0, p);
        if (l1 === l2) {
            let m1 = interpolate(p0, cp1, t);
            let m2 = interpolate(cp1, p, t);
            p = interpolate(m1, m2, t);
            let lengthL;
            lengthL = Math.sqrt((p.x - p0.x) * (p.x - p0.x) + (p.y - p0.y) * (p.y - p0.y));
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
            (Math.sqrt(a) / 2) *
            (ut * Math.sqrt(ut ** 2 + k) -
                bt * Math.sqrt(bt ** 2 + k) +
                k *
                Math.log((ut + Math.sqrt(ut ** 2 + k)) / (bt + Math.sqrt(bt ** 2 + k))))
        );
    }

    function getLineLength(p1, p2) {
        return Math.sqrt(
            (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
        );
    }

    /**
     * Linear  interpolation (LERP) helper
     */
    function interpolatedPoint(p1, p2, t = 0.5) {
        return {
            x: (p2.x - p1.x) * t + p1.x,
            y: (p2.y - p1.y) * t + p1.y
        };
    }


    /**
     * calculate single points on segments
     */
    function getPointAtCubicSegmentT(p0, cp1, cp2, p, t = 0.5) {
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

    function getPointAtQuadraticSegmentT(p0, cp1, p, t = 0.5) {
        let t1 = 1 - t;
        return {
            x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
            y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y
        };
    }

    /**
     * parse pathData from d attribute
     * the core function to parse the pathData array from a d string
     **/
    function parseDtoPathData(d) {
        let dClean = d
            // remove new lines and tabs
            .replace(/[\n\r\t]/g, "")
            // replace comma with space
            .replace(/,/g, " ")
            // add space before minus sign
            .replace(/(\d+)(\-)/g, "$1 $2")
            // decompose multiple adjacent decimal delimiters like 0.5.5.5 => 0.5 0.5 0.5
            .replace(/(\.)(?=(\d+\.\d+)+)(\d+)/g, "$1$3 ")
            // add new lines before valid command letters
            .replace(/([mlcsqtahvz])/gi, "\n$1 ")
            // remove duplicate whitespace
            .replace(/\ {2,}/g, " ")
            // remove whitespace from right and left
            .trim();

        // split commands
        let commands = dClean.split("\n").map((val) => {
            return val.trim();
        });

        // compile pathData
        let pathData = [];
        let comLengths = { m: 2, a: 7, c: 6, h: 1, l: 2, q: 4, s: 4, t: 2, v: 1, z: 0 };
        let errors = [];

        // normalize convatenated larceArc and sweep flags
        const unravelArcValues = (values) => {
            let chunksize = 7, n = 0, arcComs = []
            for (let i = 0; i < values.length; i++) {
                let com = values[i]

                // reset counter
                if (n >= chunksize) {
                    n = 0
                }
                // if 3. or 4. parameter longer than 1
                if ((n === 3 || n === 4) && com.length > 1) {

                    let largeArc = n === 3 ? com.substring(0, 1) : ''
                    let sweep = n === 3 ? com.substring(1, 2) : com.substring(0, 1)
                    let finalX = n === 3 ? com.substring(2) : com.substring(1)
                    let comN = [largeArc, sweep, finalX].filter(Boolean)
                    arcComs.push(comN)
                    n += comN.length

                } else {
                    // regular
                    arcComs.push(com)
                    n++
                }
            }
            return arcComs.flat().filter(Boolean);
        }

        for (let i = 0; i < commands.length; i++) {
            let com = commands[i].split(" ");
            let type = com.shift();
            let typeRel = type.toLowerCase();
            let isRel = type === typeRel;

            /**
             * large arc and sweep flags
             * are boolean and can be concatenated like
             * 11 or 01
             * or be concatenated with the final on path points like
             * 1110 10 => 1 1 10 10
             */
            if (typeRel === "a") {
                com = unravelArcValues(com)
            }

            // convert to numbers
            let values = com.map((val) => {
                return parseFloat(val);
            });

            // if string contains repeated shorthand commands - split them
            let chunkSize = comLengths[typeRel];
            let chunk = values.slice(0, chunkSize);
            pathData.push({ type: type, values: chunk });

            // too few values
            if (chunk.length < chunkSize) {
                errors.push(
                    `${i}. command (${type}) has ${chunk.length}/${chunkSize} values - ${chunkSize - chunk.length} too few`
                );
            }

            // has implicit commands
            if (values.length > chunkSize) {
                let typeImplicit = typeRel === "m" ? (isRel ? "l" : "L") : type;
                for (let i = chunkSize; i < values.length; i += chunkSize) {
                    let chunk = values.slice(i, i + chunkSize);
                    pathData.push({ type: typeImplicit, values: chunk });
                    if (chunk.length !== chunkSize) {
                        errors.push(
                            `${i}. command (${type}) has ${chunk.length + chunkSize}/${chunkSize} - ${chunk.length} values too many `
                        );
                    }
                }
            }
        }
        if (errors.length) {
            console.log(errors);
        }

        /**
         * first M is always absolute/uppercase -
         * unless it adds relative linetos
         * (facilitates d concatenating)
         */
        pathData[0].type = 'M'
        return pathData;
    }


    /**
     * converts all commands to absolute
     * optional: convert shorthands; arcs to cubics 
     */

    function normalizePathData(pathData, options) {
        let pathDataAbs = [];
        let lastX = pathData[0].values[0];
        let lastY = pathData[0].values[1];
        let offX = lastX;
        let offY = lastY;

        // merge default options
        options = {
            ...{ unshort: true, convertArc: false, arcAccuracy: 1 },
            ...options
        }
        let { unshort, convertArc, arcAccuracy } = options

        pathData.forEach((com, i) => {
            let { type, values } = com;
            let typeRel = type.toLowerCase();
            let typeAbs = type.toUpperCase();
            let valuesL = values.length;
            let isRelative = type === typeRel;
            let comPrev = i > 0 ? pathData[i - 1] : pathData[0];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;

            if (isRelative) {
                com.type = typeAbs;

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
                        com.values = type === 'h' ? [values[0] + offX] : [values[0] + offY];
                        break;


                    case 'm':
                    case 'l':
                    case 't':
                        com.values = [values[0] + offX, values[1] + offY]
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
                            values[3] + offY,
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
            if (unshort) {
                let cp1X, cp1Y, cpN1X, cpN1Y, cp2X, cp2Y;
                if (com.type === 'H' || com.type === 'V') {
                    com.values = com.type === 'H' ? [com.values[0], lastY] : [lastX, com.values[0]];
                    com.type = 'L';
                }
                else if (com.type === 'T' || com.type === 'S') {

                    [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                    [cp2X, cp2Y] = valuesPrevL > 2 ? [valuesPrev[2], valuesPrev[3]] : [valuesPrev[0], valuesPrev[1]];

                    // new control point
                    cpN1X = com.type === 'T' ? lastX + (lastX - cp1X) : 2 * lastX - cp2X;
                    cpN1Y = com.type === 'T' ? lastY + (lastY - cp1Y) : 2 * lastY - cp2Y;

                    com.values = [cpN1X, cpN1Y, com.values].flat();
                    com.type = com.type === 'T' ? 'Q' : 'C';
                }
            }

            //convert arcs to cubics
            if (convertArc && com.type === 'A') {
                // add all C commands instead of Arc
                let cubicArcs = arcToBezier({ x: lastX, y: lastY }, com.values, arcAccuracy);
                cubicArcs.forEach((cubicArc) => {
                    pathDataAbs.push(cubicArc);
                });

            } else {
                // add command
                pathDataAbs.push(com)
            }

            // update offsets
            lastX = valuesL > 1 ? values[valuesL - 2] + offX : (typeRel === 'h' ? values[0] + offX : lastX);
            lastY = valuesL > 1 ? values[valuesL - 1] + offY : (typeRel === 'v' ? values[0] + offY : lastY);
            offX = lastX;
            offY = lastY;
        });

        return pathDataAbs;
    }


    /** 
     * convert arctocommands to cubic bezier
     * based on a2c.js
     * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
     * returns pathData array
    */

    function arcToBezier(p0, values, splitSegments = 1) {
        const TAU = Math.PI * 2;
        let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

        if (rx === 0 || ry === 0) {
            return []
        }

        let phi = rotation ? rotation * TAU / 360 : 0;
        let sinphi = phi ? Math.sin(phi) : 0
        let cosphi = phi ? Math.cos(phi) : 1
        let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2
        let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2

        if (pxp === 0 && pyp === 0) {
            return []
        }
        rx = Math.abs(rx)
        ry = Math.abs(ry)
        let lambda =
            pxp * pxp / (rx * rx) +
            pyp * pyp / (ry * ry)
        if (lambda > 1) {
            let lambdaRt = Math.sqrt(lambda);
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
            radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1)
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
                return dot === 1 ? 0 : Math.PI
            }
            dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot)
            let sign = (ux * vy - uy * vx < 0) ? -1 : 1
            return sign * Math.acos(dot);
        }

        let ang1 = vectorAngle(1, 0, vx1, vy1),
            ang2 = vectorAngle(vx1, vy1, vx2, vy2)

        if (sweepFlag === 0 && ang2 > 0) {
            ang2 -= Math.PI * 2
        }
        else if (sweepFlag === 1 && ang2 < 0) {
            ang2 += Math.PI * 2
        }

        let ratio = +(Math.abs(ang2) / (TAU / 4)).toFixed(0)

        // increase segments for more accureate length calculations
        let segments = ratio * splitSegments;
        ang2 /= segments
        let pathData = [];


        // If 90 degree circular arc, use a constant
        // https://pomax.github.io/bezierinfo/#circles_cubic
        // k=0.551784777779014
        const angle90 = 1.5707963267948966;
        const k = 0.551785
        let a = ang2 === angle90 ? k :
            (
                ang2 === -angle90 ? -k : 4 / 3 * Math.tan(ang2 / 4)
            );

        let cos2 = ang2 ? Math.cos(ang2) : 1;
        let sin2 = ang2 ? Math.sin(ang2) : 0;
        let type = 'C'

        const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
            let x1 = ang1 != ang2 ? Math.cos(ang1) : cos2;
            let y1 = ang1 != ang2 ? Math.sin(ang1) : sin2;
            let x2 = Math.cos(ang1 + ang2);
            let y2 = Math.sin(ang1 + ang2);

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
            pathData.push(com);
            ang1 += ang2
        }

        return pathData;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getPointAtLengthLookup,
            getPathLengthLookup,
            getPathLengthFromD,
            getPathDataLength,
            cubicBezierLength,
            quadraticBezierLength,
            getLineLength,
            interpolatedPoint,
            getPointAtCubicSegmentT,
            getPointAtQuadraticSegmentT,
            parseDtoPathData,
            normalizePathData,
            arcToBezier
        }
    }
    else {
        pathDataLength.getPointAtLengthLookup = getPointAtLengthLookup
        pathDataLength.getPathLengthLookup = getPathLengthLookup
        pathDataLength.getPathLengthFromD = getPathLengthFromD
        pathDataLength.getPathDataLength = getPathDataLength
        pathDataLength.cubicBezierLength = cubicBezierLength
        pathDataLength.quadraticBezierLength = quadraticBezierLength
        pathDataLength.getLineLength = getLineLength
        pathDataLength.interpolatedPoint = interpolatedPoint
        pathDataLength.getPointAtCubicSegmentT = getPointAtCubicSegmentT
        pathDataLength.getPointAtQuadraticSegmentT = getPointAtQuadraticSegmentT
        pathDataLength.parseDtoPathData = parseDtoPathData
        pathDataLength.normalizePathData = normalizePathData
        pathDataLength.arcToBezier = arcToBezier
    }

})();

