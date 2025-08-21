import { lgVals, deg2rad, rad2deg, PI, PI2, PI_half } from './constants.js';
import { checkFlatnessByPolygonArea, svgArcToCenterParam, getAngle, getLegendreGaussValues, toParametricAngle, getEllipseLengthLG, pointAtT, getLength, normalizeAngle } from './geometry.js';
//import { getPathDataFromEl } from './pathData_parse_els.js';
//import {PathLengthObject} from './point_at_length.js';
//import { getCommandLength } from './pathData_getCommandLength.js'
//import { parsePathDataNormalized_old } from './pathData_parse.js';


//import { PathLengthObject } from './get_PathLengthObject.js';
import { normalizePathInput } from './normalizeInput.js';
//import { parse, parsePathDataNormalized, stringifyPathData } from './pathData_parse.js';


export function PathLengthObject(props = {}) {
    Object.assign(this, props);
}


// just a convenience wrapper
export function getPathLookup(d, precision = 'medium', onlyLength = false, getTangent = true, {
    arcToCubic=false,
    arcAccuracy= 2,
    quadraticToCubic= false
}={}){
    return getPathLengthLookup(d, precision, onlyLength, getTangent, {arcToCubic, arcAccuracy, quadraticToCubic})
}


export function getPathLengthLookup(d, precision = 'medium', onlyLength = false, getTangent = true, 
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
            //console.log('lookup from cache', lookup);
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
    let lengthLookup = getPathLengthLookupFromPathData(pathData, precision, onlyLength, getTangent)
    lengthLookup.pathData = pathData;

    if (onlyLength) {
        return lengthLookup.pathLength;
    } else {
        return new PathLengthObject(lengthLookup);
    }
}



// simple length calculation
export function getPathLength(d, precision = 'medium', onlyLength = true) {
    let pathData = normalizePathInput(d);
    return getPathDataLength(pathData, precision, onlyLength);
}


// only total pathlength
export function getPathDataLength(pathData, precision = 'medium', onlyLength = true) {
    return getPathLengthLookupFromPathData(pathData, precision, onlyLength)
}



export function getPathLengthLookupFromPathData(pathData, precision = 'medium', onlyLength = false, getTangent = true) {


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
        lgVals[wa_key] = getLegendreGaussValues(lg)
    }

    let wa = lgVals[wa_key];

    let tDivisionsQ = precision === 'low' ? 10 : 12;
    let tDivisionsC = precision === 'low' ? 15 : (precision === 'medium' ? 23 : 35);
    let tDivisions = tDivisionsC;

    let l = pathData.length;
    //console.log(l);

    let pathLength = 0;
    let M = pathData[0];
    let lengthLookup = { totalLength: 0, segments: [] };
    let p0={x:M.values[0], y:M.values[0]}
    let tangentAdjust = 0;

    

    let segIndex =0
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
                    angle = getAngle(p0, p)
                    lengthObj.angles.push(angle);
                }
                break;


            case "A":
                p = {
                    x: com.values[5],
                    y: com.values[6]
                }

                // we take xAxis rotation from parametrisation to adjust for circular arcs
                let [largeArc, sweep] = [com.values[3], com.values[4]];

                // get parametrized arc properties
                let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], largeArc, sweep, p.x, p.y, false)
                let { cx, cy, rx, ry, startAngle, endAngle, deltaAngle, xAxisRotation } = arcData


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
                    //let xAxisRotation_rad = xAxisRotation * deg2rad;


                    // values are alredy in radians
                    //let degrees = false;

                    // add weight/abscissa values if not existent
                    let wa_key = `wa${lg}`;
                    if (!lgVals[wa_key]) {
                        lgVals[wa_key] = getLegendreGaussValues(lg)
                    }

                    if (!lgVals['wa48']) {
                        lgVals['wa48'] = getLegendreGaussValues(48)
                    }


                    wa = lgVals[wa_key];
                    let wa48 = lgVals['wa48'];

                    /** 
                     * convert angles to parametric
                     * adjusted for xAxisRotation
                     * increases performance
                     */


                    startAngle = toParametricAngle((startAngle - xAxisRotation), rx, ry)
                    endAngle = toParametricAngle((endAngle - xAxisRotation), rx, ry)

                    // recalculate parametrized delta
                    deltaAngle_param = endAngle - startAngle;

                    let signChange = deltaAngle > 0 && deltaAngle_param < 0 || deltaAngle < 0 && deltaAngle_param > 0;

                    //deltaAngle = xAxisRotation>0 ? endAngle- startAngle: deltaAngle;
                    deltaAngle = signChange ? deltaAngle : deltaAngle_param;


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

                        lenNew = getEllipseLengthLG(rx, ry, startAngle, endAngle, wa)

                        len += lenNew;
                        lengthObj.lengths.push(lenNew + pathLength)
                        lengthObj.angles.push(endAngle)
                    }

                    // last angle
                    lengthObj.angles.push(endAngle);

                    // last length - use higher precision
                    len = getEllipseLengthLG(rx, ry, startAngle, endAngle, wa48)


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
                        //xAxisRotation_rad,
                        tangentAdjust,
                        isEllipse: rx!==ry
                    }

                }
                // circular arc
                else {

                    /** 
                     * get arc length: 
                     * perfect circle length can be linearly interpolated 
                     * according to delta angle
                     */
                    len = 2 * PI * rx * (1 / 360 * Math.abs(deltaAngle * 180 / PI))
                    //len = PI2 * rx * Math.abs(deltaAngle)/PI2

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
                tDivisions = (type === 'Q') ? tDivisionsQ : tDivisionsC


                lengthObj.lengths.push(pathLength);

                // is flat/linear – treat as lineto
                let isFlat = checkFlatnessByPolygonArea(pts);
                //isFlat = false;


                /** 
                * check if controlpoints are outside 
                * command bounding box
                * to calculate lengths - won't work for quadratic
                */
                let cpsOutside = false;

                if (isFlat) {

                    //console.log('flat');
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


                // treat flat bézier as  lineto
                if (isFlat) {

                    pts = [p0, p]
                    len = getLength(pts)
                    lengthObj.type = "L";
                    lengthObj.points.push(p0, p);
                    if (getTangent) {
                        //angle = atan2(p.y - p0.y, p.x - p0.x)
                        angle = getAngle(p0, p)
                        lengthObj.angles.push(angle);
                    }
                    break;

                } else {


                    //len = getCommandLength(options);
                    // no adaptive lg accuracy - take 24n
                    len = !auto_lg ? getLength(pts, 1, lg) : getLength(pts, 1, lgArr[0]);

                    /**
                     * auto adjust accuracy for cubic bezier approximation 
                     * up to n72
                     */

                    if (type === 'C' && auto_lg) {

                        //console.log('auto lg');

                        let lenNew;
                        let foundAccuracy = false
                        let tol = 0.001
                        let diff = 0;

                        for (let i = 1; i < lgArr.length && !foundAccuracy; i++) {
                            let lgNew = lgArr[i];

                            //options.lg = lgNew;
                            //lenNew = getCommandLength(options);
                            lenNew = getLength(pts, 1, lgNew)


                            //precise enough or last
                            diff = Math.abs(lenNew - len)
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
                        let startAngle = pointAtT(pts, 0, true).angle
                        //console.log('angleStart', angleStart*rad2deg);

                        // add only start and end angles for béziers
                        lengthObj.angles.push(startAngle, pointAtT(pts, 1, true).angle);
                    }


                    // calculate lengths at sample t division points
                    for (let d = 1; d < tDivisions; d++) {
                        t = (1 / tDivisions) * d;

                        //lenN = getCommandLength(options) + pathLength;
                        //lengthObj.lengths.push(lenN);

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
            segIndex++
        }
        lengthLookup.totalLength = pathLength;


        /*
        lengthLookup.segments.push(lengthObj);
        lengthLookup.totalLength = pathLength;
        */



        // interpret z closepaths as linetos
        if (type === 'Z') {
            lengthObj.com.values = [p.x, p.y];
        }
    }

    //lengthLookup.pathData = pathData;
    //console.log(lgVals);
    //console.log(lengthLookup);

    return lengthLookup
}


