
import { pointAtT, svgArcToCenterParam, getAngle, checkLineIntersection, normalizeAngle, toParametricAngle, toNonParametricAngle } from "./geometry";
import { getSubPathBBoxes, checkBBoxIntersections } from "./geometry_bbox";
import { getPolygonArea, getBezierArea, getEllipseArea, getEllipseArea_param    } from "./geometry_area";
import { renderPoint } from './visualize.js';
import { splitSubpaths } from './pathData_split';
import { deg2rad } from "./constants";
//import { PathLengthObject } from './point_at_length.js';
//import { PathLengthObject } from './PathLengthObject.js';


export function getAreaData(lookup) {


    let { pathData, segments } = lookup;

    // quit if area data is already present
    if(lookup.hasOwnProperty('area')){
        //console.log('has area', lookup.area);
        return lookup.area
    }

    let totalArea = 0;
    let polyPoints = [];

    //check subpaths
    let subPathsData = splitSubpaths(pathData);
    let isCompoundPath = subPathsData.length > 1 ? true : false;
    let counterShapes = [];

    //console.log(subPathsData);

    // check intersections for compund paths
    //isCompoundPath = false
    if (isCompoundPath) {
        let bboxArr = getSubPathBBoxes(subPathsData);

        bboxArr.forEach(function (bb, b) {

            //let path1 = path;
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
        //reset polygon points for each segment
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
            let segment = segments.find(seg=>seg.index===index) || null
            if(!segment) continue

            let {segIndex} = segment;

            //let segIndex = targetSeg;
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
                    let areaBez = getBezierArea(pts)
                    //areaBez = Math.abs(areaBez)
                    comArea += areaBez;

                    //segments[segIndex].area= areaBez;
                    segment.area= areaBez;

                    //push points to calculate inner/remaining polygon area
                    polyPoints.push(p0, p);
                }


                // A commands
                else if (type === 'A') {

                    let { cx, cy, rx, ry, sweep, startAngle, endAngle, xAxisRotation } = segment.arcData

                    let xAxisRotation_deg = xAxisRotation*deg2rad;
                    let arcArea = getEllipseArea(rx, ry, startAngle, endAngle, xAxisRotation_deg)

                    // adjust for  segment direction
                    let sign = !sweep ? -1 : 1
                    //sign = 1

                    //arcArea = !sweep ? -arcArea : arcArea
                    arcArea *= sign;


                    // subtract remaining polygon between p0, center and p
                    let polyArea = getPolygonArea([p0, { x: cx, y: cy }, p]);
                    arcArea =  arcArea + polyArea;

                    // save to segment item
                    segments[segIndex].area= arcArea;

                    //push points to calculate inner/remaining polygon area
                    polyPoints.push(p0, p);

                    comArea += arcArea;
                }

                // L commands
                else {
                    polyPoints.push(p0, p);
                }
            }

        };


        let areaPoly = getPolygonArea(polyPoints);
        pathArea = (comArea + areaPoly) 


        //console.log('!!!areaPoly:', areaPoly, 'comArea:', comArea);

        //subtract area by negative multiplier
        if (counterShapes.includes(d)) {
            let prevArea = subPathAreas[subPathAreas.length-1];
            let signChange = (prevArea<0 && pathArea>0) || (prevArea>0 && pathArea<0);
            //console.log('sub', subPathAreas, prevArea, pathArea, 'signChange', signChange );
            multiplier = signChange ? 1 : -1;
        }

        //values have the same sign - subtract polygon area
        pathArea *= multiplier;
        totalArea += pathArea;

        subPathAreas.push(pathArea)

    })

    //if(decimals>-1) totalArea = +totalArea.toFixed(decimals)
    //console.log('negative area', totalArea );

    // save to lookup object
    lookup.area = totalArea;

    return totalArea;



}