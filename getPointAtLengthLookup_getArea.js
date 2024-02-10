

function getPathArea(pathData) {
    let totalArea = 0;
    let polyPoints = [];

    //check subpaths
    let subPathsData = splitSubpaths(pathData);
    let isCompoundPath = subPathsData.length > 1 ? true : false;
    let counterShapes = [];

    // check intersections for compund paths
    if (isCompoundPath) {
        let bboxArr = getSubPathBBoxes(subPathsData);

        bboxArr.forEach(function (bb, b) {
            //let path1 = path;
            for (let i = 0; i < bboxArr.length; i++) {
                let bb2 = bboxArr[i];
                if (bb != bb2) {
                    let intersects = checkBBoxIntersections(bb, bb2);
                    if (intersects) {
                        counterShapes.push(i);
                    }
                }
            }
        });
    }

    subPathsData.forEach((pathData, d) => {
        //reset polygon points for each segment
        polyPoints = [];
        let bezierArea = 0;
        let pathArea = 0;
        let multiplier = 1;

        pathData.forEach(function (com, i) {
            let [type, values] = [com.type, com.values];
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
                    areaBez = getBezierArea(pts)
                    bezierArea += areaBez;

                    //push points to calculate inner/remaining polygon area
                    polyPoints.push(p0, p);
                }


                // A commands
                else if (type === 'A') {
                    let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], com.values[3], com.values[4], p.x, p.y)
                    let { cx, cy, rx, ry, startAngle, deltaAngle } = arcData

                    let rat = (1 / 360 * Math.abs(deltaAngle * 180 / Math.PI))
                    let areafullCircle = Math.PI * rx ** 2
                    arcarea = areafullCircle * rat

                    //push points to calculate inner/remaining polygon area
                    polyPoints.push(p0, { x: cx, y: cy }, p);
                    bezierArea += arcarea;
                }

                // L commands
                else {
                    polyPoints.push(p0, p);
                }
            }
        });


        let areaPoly = polygonArea(polyPoints);
        //subtract area by negative multiplier
        if (counterShapes.indexOf(d) !== -1) {
            multiplier = -1;
        }
        //values have the same sign - subtract polygon area
        if (
            (areaPoly < 0 && bezierArea < 0) ||
            (areaPoly > 0 && bezierArea > 0)
        ) {
            pathArea = (Math.abs(bezierArea) - Math.abs(areaPoly)) * multiplier;
        } else {
            pathArea = (Math.abs(bezierArea) + Math.abs(areaPoly)) * multiplier;
        }

        totalArea += pathArea;
    })

    return totalArea;
}


/**
 * based on
 */
function getBezierArea(pts) {

    let [p0, cp1, cp2, p] = [pts[0], pts[1], pts[2], pts[pts.length - 1]]
    let area;

    if (pts.length < 3) return 0;

    // quadratic beziers
    if (pts.length === 3) {
        cp1 = {
            x: pts[0].x * 1 / 3 + pts[1].x * 2 / 3,
            y: pts[0].y * 1 / 3 + pts[1].y * 2 / 3
        }

        cp2 = {
            x: pts[2].x * 1 / 3 + pts[1].x * 2 / 3,
            y: pts[2].y * 1 / 3 + pts[1].y * 2 / 3
        }
    }

    area = ((p0.x * (-2 * cp1.y - cp2.y + 3 * p.y) +
        cp1.x * (2 * p0.y - cp2.y - p.y) +
        cp2.x * (p0.y + cp1.y - 2 * p.y) +
        p.x * (-3 * p0.y + cp1.y + 2 * cp2.y)) *
        3) / 20;
    return area;
}


function polygonArea(points, absolute = true) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const addX = points[i].x;
        const addY = points[i === points.length - 1 ? 0 : i + 1].y;
        const subX = points[i === points.length - 1 ? 0 : i + 1].x;
        const subY = points[i].y;
        area += addX * addY * 0.5 - subX * subY * 0.5;
    }
    if (absolute) {
        area = Math.abs(area);
    }
    return area;
}



// split sub paths
function splitSubpaths(pathData) {
    let subPathArr = [];
    let start = 0;
    let end = pathData.length-1;

    // only one path
    let Ms = pathData.map(com=>{return com.type}).filter( type => type==='M')
    if(Ms.length===1){
        return [pathData]
    }

    for(let i = 1; i<pathData.length; i++){
        let com = pathData[i]         
        if (com.type.toLowerCase() === "m") {
            end = i
            let sub = pathData.slice(start, end) 
            subPathArr.push(  sub );
            start = i
        }
    }

    if(end<pathData.length){
        subPathArr.push( pathData.slice(end, pathData.length));
    }
    return subPathArr;
}

function getSubPathBBoxes(subPaths) {
    let bboxArr = [];
    subPaths.forEach((pathData) => {
        let bb = getPathDataBBox(pathData)
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


function getPathDataBBox(pathData) {

    // save extreme values
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;

    const setXYmaxMin = (pt) => {
        if (pt.x < xMin) {
            xMin = pt.x
        }
        if (pt.x > xMax) {
            xMax = pt.x
        }
        if (pt.y < yMin) {
            yMin = pt.y
        }
        if (pt.y > yMax) {
            yMax = pt.y
        }
    }

    for (let i = 0; i < pathData.length; i++) {
        let com = pathData[i]
        let { type, values } = com;
        let valuesL = values.length;
        let comPrev = pathData[i - 1] ? pathData[i - 1] : pathData[i];
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;

        if (valuesL) {
            let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };
            let p = { x: values[valuesL - 2], y: values[valuesL - 1] };
            // add final on path point
            setXYmaxMin(p)

            if (type === 'C' || type === 'Q') {
                let cp1 = { x: values[0], y: values[1] };
                let cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1;
                let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];

                let bezierExtremesT = getBezierExtremeT(pts)
                bezierExtremesT.forEach(t => {
                    let pt = getPointAtBezierT(pts, t);
                    setXYmaxMin(pt)
                })
            }

            else if (type === 'A') {
                let arcExtremes = getArcExtemes(p0, values)
                arcExtremes.forEach(pt => {
                    setXYmaxMin(pt)
                })
            }
        }
    }

    let bbox = { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin }
    return bbox
}


/**
 * based on Nikos M.'s answer
 * how-do-you-calculate-the-axis-aligned-bounding-box-of-an-ellipse
 * https://stackoverflow.com/questions/87734/#75031511
 * See also: https://github.com/foo123/Geometrize
 */
function getArcExtemes(p0, values) {
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



// wrapper functions for quadratic or cubic bezier point calculation
function getPointAtBezierT(pts, t) {
    let pt = pts.length === 4 ? getPointAtCubicSegmentT(pts[0], pts[1], pts[2], pts[3], t) : getPointAtQuadraticSegmentT(pts[0], pts[1], pts[2], t)
    return pt
}

function getBezierExtremeT(pts) {
    let tArr = pts.length === 4 ? cubicBezierExtremeT(pts[0], pts[1], pts[2], pts[3]) : quadraticBezierExtremeT(pts[0], pts[1], pts[2]);
    return tArr;
}


// cubic bezier.
function cubicBezierExtremeT(p0, cp1, cp2, p) {
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
function quadraticBezierExtremeT(p0, cp1, p) {
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