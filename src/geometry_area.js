
//import { splitSubpaths } from "./convert_segments";
import { deg2rad, rad2deg } from "./constants";

import { splitSubpaths } from './pathData_split.js';

import { pointAtT, svgArcToCenterParam, getAngle, checkLineIntersection, toParametricAngle, normalizeAngle } from "./geometry";
import { getSubPathBBoxes, checkBBoxIntersections } from "./geometry_bbox";
import { renderPoint } from './visualize.js';


/**
 * get pathdata area
 */

export function getPathArea(pathData, decimals = 9) {
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
        let comArea = 0;
        let pathArea = 0;
        let multiplier = 1;
        let pts = [];

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
                    let areaBez = Math.abs(getBezierArea(pts))
                    comArea += areaBez;

                    //push points to calculate inner/remaining polygon area
                    polyPoints.push(p0, p);
                }


                // A commands
                else if (type === 'A') {
                    let arcData = svgArcToCenterParam(p0.x, p0.y, com.values[0], com.values[1], com.values[2], com.values[3], com.values[4], p.x, p.y)
                    let { cx, cy, rx, ry, startAngle, endAngle, deltaAngle } = arcData

                    let arcArea = Math.abs(getEllipseArea(rx, ry, startAngle, endAngle));

                    // subtract remaining polygon between p0, center and p
                    let polyArea = Math.abs(getPolygonArea([p0, { x: cx, y: cy }, p]));
                    arcArea -= polyArea;

                    //push points to calculate inner/remaining polygon area
                    polyPoints.push(p0, p);
                    comArea += arcArea;
                }

                // L commands
                else {
                    polyPoints.push(p0, p);
                }
            }
        });


        let areaPoly = getPolygonArea(polyPoints);

        //subtract area by negative multiplier
        if (counterShapes.indexOf(d) !== -1) {
            multiplier = -1;
        }

        //values have the same sign - subtract polygon area
        if (
            (areaPoly < 0 && comArea < 0)
        ) {
            // are negative
            pathArea = (Math.abs(comArea) - Math.abs(areaPoly)) * multiplier;
            //console.log('negative area', pathArea );
        } else {
            pathArea = (Math.abs(comArea) + Math.abs(areaPoly)) * multiplier;
        }

        totalArea += pathArea;
    })

    //if(decimals>-1) totalArea = +totalArea.toFixed(decimals)
    //console.log('negative area', totalArea );

    return totalArea;
}


/**
 * compare bezier area diffs
 */
export function getBezierAreaAccuracy(cpts = [], areaPath = 0, areaPoly = 0, tolerance = 0.75) {

    let type = cpts.length === 4 ? 'C' : 'Q';
    let p0 = cpts.shift();
    let cp1 = cpts[0];
    let p = cpts[cpts.length - 1];
    let cp2 = type === 'C' ? cpts[1] : cp1;

    let res = { accurate: false, areaDiff: Infinity, comArea: null, cpArea: null, signChange: null }

    /**
     * check self intersections
     * won't work for simplifications
     */
    let selfIntersecting = checkLineIntersection(p0, p, cp1, cp2, true);
    let selfIntersecting2 = checkLineIntersection(p0, cp1, p, cp2, true);
    if (selfIntersecting || selfIntersecting2) {
        //renderPoint(svg1, p, 'yellow')
        return res
    }



    /**
     * check sign changes 
     * from cpts poly
     * they indicate a wrong approximation
     */

    //cpArea = getPolygonArea([p0, cp1, p]);
    res.cpArea = getPolygonArea([p0, ...cpts]);
    res.signChange = (res.cpArea < 0 && areaPoly > 0) || (res.cpArea > 0 && areaPoly < 0);

    //console.log('signChange', areaDiff, signChange, cpArea, areaPoly);

    if (res.signChange) {
        //areaDiff = Infinity
        return res
    }

    /**
     * check bézier area
     */
    let com = [
        { type: 'M', values: [p0.x, p0.y] },
        { type: type, values: [...cpts.map(pt => [pt.x, pt.y]).flat()] }
    ];
    res.comArea = getPathArea(com);
    res.areaDiff = getRelativeAreaDiff(areaPath, res.comArea);


    // very accurate - used to skip alternative calculations
    res.accurate = res.areaDiff < tolerance * 0.3;

    return res
}


/**
 * get ellipse area
 * skips to circle calculation if rx===ry
 */


export function getEllipseArea_param(rx, ry, startAngle, endAngle) {
    const totalArea = Math.PI * rx * ry;
    let angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
    // If circle, use simple circular formula
    if (rx === ry) return totalArea * (angleDiff / (2 * Math.PI));

    /*
    // Convert absolute angles to parametric angles
    const absoluteToParametric = (phi)=>{
      return Math.atan2(rx * Math.sin(phi), ry * Math.cos(phi));
    }
    */

    //startAngle = absoluteToParametric(startAngle);
    //endAngle = absoluteToParametric(endAngle);

    angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
    return totalArea * (angleDiff / (2 * Math.PI));
}





export function getEllipseArea(rx, ry, startAngle, endAngle, xAxisRotation=0) {

    // Convert absolute angles to parametric angles
    let isEllipse = rx!==ry;
    if(!isEllipse) xAxisRotation = 0;


    // adjust angles for xAxis rotation
    if(isEllipse){
        startAngle = toParametricAngle(startAngle - xAxisRotation, rx, ry);
        endAngle = toParametricAngle(endAngle - xAxisRotation, rx, ry);
    }


    let totalArea = Math.PI * rx * ry;
    let delta = endAngle - startAngle;
    let belowQuarter = Math.abs(delta)<Math.PI*0.5;

    let PI2 = Math.PI*2
    let angleDiff = (delta + PI2) % (PI2);

    // If circle, use simple circular formula
    if (!isEllipse) {
        let rat = Math.abs(delta) / PI2
        return totalArea*rat ;
    }


    delta = !xAxisRotation || (xAxisRotation<0 && belowQuarter)  ? Math.abs(delta) : delta;
    angleDiff = (delta + PI2) % (PI2);

    return totalArea * (angleDiff / PI2);
}



export function getEllipseArea_working(rx, ry, startAngle, endAngle, xAxisRotation=0) {

    // Convert absolute angles to parametric angles
    let isEllipse = rx!==ry;
    if(!isEllipse) xAxisRotation = 0;

    // adjust angles for xAxis rotation
    if(isEllipse){
        startAngle = toParametricAngle(startAngle - xAxisRotation, rx, ry);
        endAngle = toParametricAngle(endAngle - xAxisRotation, rx, ry);
        //startAngle = normalizeAngle(startAngle)
        //endAngle = normalizeAngle(endAngle)
    }



    let totalArea = Math.PI * rx * ry;
    let delta = endAngle - startAngle;
    let belowQuarter = Math.abs(delta)<Math.PI*0.5;

    //console.log('startAngle', startAngle, xAxisRotation, 'delta', delta, delta*rad2deg, 'belowQuarter', belowQuarter);


    //delta = endAngle<startAngle ?  Math.abs(delta) : delta;
    //delta = !xAxisRotation || xAxisRotation<0  ? Math.abs(delta) : delta;


    let PI2 = Math.PI*2

    let angleDiff = (delta + PI2) % (PI2);

    // If circle, use simple circular formula
    if (!isEllipse) {
        let rat = Math.abs(delta) / PI2
        return totalArea*rat ;
    }


    delta = !xAxisRotation || (xAxisRotation<0 && belowQuarter)  ? Math.abs(delta) : delta;
    //delta =  xAxisRotation<0 && belowQuarter ? Math.abs(delta) : delta;

    //console.log('delta', delta, 'notRotated', notRotated, 'startAngle', startAngle, 'belowQuarter', belowQuarter  );


    //delta = !xAxisRotation || xAxisRotation<0  ? Math.abs(delta) : delta;
    //if(xAxisRotation && delta<0) delta *= -1

    angleDiff = (delta + PI2) % (PI2);

    return totalArea * (angleDiff / PI2);
}

/*
export function getEllipseArea(rx, ry, startAngle, endAngle) {
    const totalArea = Math.PI * rx * ry;
    let angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
    // If circle, use simple circular formula
    if (rx === ry) return totalArea * (angleDiff / (2 * Math.PI));

    // Convert absolute angles to parametric angles
    const absoluteToParametric = (phi)=>{
      return Math.atan2(rx * Math.sin(phi), ry * Math.cos(phi));
    }

    startAngle = absoluteToParametric(startAngle);
    endAngle = absoluteToParametric(endAngle);

    angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
    return totalArea * (angleDiff / (2 * Math.PI));
}
*/


/*
export function getEllipseArea(rx, ry, startAngle, endAngle) {
    const totalArea = Math.PI * rx * ry;
    let angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
    // If circle, use simple circular formula
    if (rx === ry) return totalArea * (angleDiff / (2 * Math.PI));

    // Convert absolute angles to parametric angles
    const absoluteToParametric = (phi)=>{
      return Math.atan2(rx * Math.sin(phi), ry * Math.cos(phi));
    }
    startAngle = absoluteToParametric(startAngle);
    endAngle = absoluteToParametric(endAngle);
    angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
    return totalArea * (angleDiff / (2 * Math.PI));
}
*/



/**
 * compare areas 
 * for thresholds
 * returns a percentage value
 */

export function getRelativeAreaDiff(area0, area1) {
    let diff = Math.abs(area0 - area1);
    return Math.abs(100 - (100 / area0 * (area0 + diff)))
}




/**
 * get bezier area
 */
export function getBezierArea(pts) {

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

    return -area;
}

export function getPolygonArea(points, tolerance = 0.001) {
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
