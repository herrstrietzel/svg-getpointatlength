
//import { splitSubpaths } from "./convert_segments";
import { pointAtT, svgArcToCenterParam, getBezierExtremeT, getArcExtemes, getDistance, interpolate, getPointOnEllipse, reducePoints, getSquareDistance } from "./geometry";
import { renderPoint } from "./visualize";
//import {arcToBezier} from'./pathData_convert';


/**
 * check whether a polygon is likely 
 * to be closed 
 * or an open polyline 
 */
export function isClosedPolygon(pts, reduce = 24) {

    let ptsR = reducePoints(pts, reduce);
    let { width, height } = getPolyBBox(ptsR);
    //let dimAvg = Math.max(width, height);
    let dimAvg = (width + height) / 2;
    //let closingThresh = (dimAvg / pts.length) ** 2
    let closingThresh = (dimAvg) ** 2
    let closingDist = getSquareDistance(pts[0], pts[pts.length - 1]);

    return closingDist < closingThresh;
}


/**
 * calculate polygon bbox
 */
export function getPolyBBox(vertices, decimals = -1) {
    let xArr = vertices.map(pt => pt.x);
    let yArr = vertices.map(pt => pt.y);
    let left = Math.min(...xArr)
    let right = Math.max(...xArr)
    let top = Math.min(...yArr)
    let bottom = Math.max(...yArr)
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
            bb[prop] = +bb[prop].toFixed(decimals)
        }
    }
    //console.log(bb);
    return bb;
}

export function getSubPathBBoxes(subPaths) {
    let bboxArr = [];
    subPaths.forEach((pathData) => {
        //let bb = getPathDataBBox(pathData)
        let bb = getPathDataBBox_sloppy(pathData);
        bboxArr.push(bb);
    });
    //console.log('bboxArr', bboxArr);
    return bboxArr;
}

export function checkBBoxIntersections(bb, bb1) {
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

export function getPathDataBBox_sloppy(pathData) {
    let pts = getPathDataPoly(pathData);
    let bb = getPolyBBox(pts);
    return bb;
}


/**
 * get path data poly
 * including command points
 * handy for faster/sloppy bbox approximations
 */

export function getPathDataPoly(pathData) {

    let poly = [];
    for (let i = 0; i < pathData.length; i++) {
        let com = pathData[i]
        let prev = i > 0 ? pathData[i - 1] : pathData[i];
        let { type, values } = com;
        let p0 = { x: prev.values[prev.values.length - 2], y: prev.values[prev.values.length - 1] };
        let p = values.length ? { x: values[values.length - 2], y: values[values.length - 1] } : ''
        let cp1 = values.length ? { x: values[0], y: values[1] } : ''

        switch (type) {

            // convert to cubic to get polygon
            case 'A':

                let [rx, ry, xAxisRotation, largeArc, sweep, x1, y1] = values
                let isEllipse = rx!==ry;
                //console.log('isEllipse', isEllipse);

                if(!isEllipse){

                    let dx = p.x-p0.x;
                    let dy = p.y-p0.y;

                    let cx = p0.x + dx/2
                    let cy = p0.y + dy/2

                    let horizontal = dy === 0;
                    let vertical = dx === 0;
                    let isSemiCircle = (horizontal && !vertical) || (!horizontal && vertical) ;

                    //let isSemiCircle = horizontal || vertical;
                    //console.log('!!isSemiCircle', isSemiCircle, horizontal, vertical, 'dx', dx, dy, 'r', rx, ry);
    
                    if(isSemiCircle){

                        let r = horizontal ? dx*0.5 : dy*0.5;
                        r = sweep ? r : -r;
                        let c2 = horizontal ? {x:cx, y:cy-r} : {x:cx-r, y:cy}
                        
                        //renderPoint(svg, c)
                        //renderPoint(markers, c2, 'magenta')
                        poly.push(c2)
                        //console.log('c2', p);
                        //console.log('isSemiCircle', isSemiCircle, dx, dy, horizontal, vertical, 'r', r);
                    }

                }

                //console.log('pt', p, 'c2', p);
                break;


            case 'C':
                let cp2 = { x: values[2], y: values[3] }
                poly.push(cp1, cp2)
                break;
            case 'Q':
                poly.push(cp1)
                break;
        }

        // M and L commands
        if (type.toLowerCase() !== 'z') {
            poly.push(p)
        }
    }

    //console.log('poly', poly);
    return poly;
}


/**
 * get exact path BBox
 * calculating extremes for all command types
 */

export function getPathDataBBox(pathData) {

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
                    let pt = pointAtT(pts, t);
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

