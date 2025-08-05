import { splitSubpaths, addExtemesToCommand } from './pathData_split.js';
import { getComThresh, commandIsFlat, getPathDataVertices } from './geometry.js';
import { getPolyBBox } from './geometry_bbox.js';


import { renderPoint, renderPath } from './visualize.js';



/**
 * shift starting point
 */
export function shiftSvgStartingPoint(pathData, offset) {
    let pathDataL = pathData.length;
    let newStartIndex = 0;
    let lastCommand = pathData[pathDataL - 1]["type"];
    let isClosed = lastCommand.toLowerCase() === "z";

    if (!isClosed || offset < 1 || pathData.length < 3) {
        return pathData;
    }

    //exclude Z/z (closepath) command if present
    let trimRight = isClosed ? 1 : 0;


    // add explicit lineto
    addClosePathLineto(pathData)


    // M start offset
    newStartIndex =
        offset + 1 < pathData.length - 1
            ? offset + 1
            : pathData.length - 1 - trimRight;

    // slice array to reorder
    let pathDataStart = pathData.slice(newStartIndex);
    let pathDataEnd = pathData.slice(0, newStartIndex);

    // remove original M
    pathDataEnd.shift();
    let pathDataEndL = pathDataEnd.length;

    let pathDataEndLastValues, pathDataEndLastXY;
    pathDataEndLastValues = pathDataEnd[pathDataEndL - 1].values || [];
    pathDataEndLastXY = [
        pathDataEndLastValues[pathDataEndLastValues.length - 2],
        pathDataEndLastValues[pathDataEndLastValues.length - 1]
    ];


    //remove z(close path) from original pathdata array
    if (trimRight) {
        pathDataStart.pop();
        pathDataEnd.push({
            type: "Z",
            values: []
        });
    }
    // prepend new M command and concatenate array chunks
    pathData = [
        {
            type: "M",
            values: pathDataEndLastXY
        },
        ...pathDataStart,
        ...pathDataEnd,
    ]


    return pathData;
}



/**
 * Add closing lineto:
 * needed for path reversing or adding points
 */

export function addClosePathLineto(pathData) {
    let pathDataL = pathData.length;
    let closed = pathData[pathDataL - 1]["type"] == "Z" ? true : false;

    let M = pathData[0];
    let [x0, y0] = [M.values[0], M.values[1]].map(val => { return +val.toFixed(8) });
    let lastCom = closed ? pathData[pathDataL - 2] : pathData[pathDataL - 1];
    let lastComL = lastCom.values.length;
    let [xE, yE] = [lastCom.values[lastComL - 2], lastCom.values[lastComL - 1]].map(val => { return +val.toFixed(8) });

    if (closed && (x0 != xE || y0 != yE)) {

        pathData.pop();
        pathData.push(
            {
                type: "L",
                values: [x0, y0]
            },
            {
                type: "Z",
                values: []
            }
        );
    }

    return pathData;
}



/**
 * reorder pathdata by x/y
 */

export function reorderPathData(pathData, sortBy = ["x", "y"]) {


    const fieldSorter = (fields) => {
        return function (a, b) {
            return fields
                .map(function (o) {
                    var dir = 1;
                    if (o[0] === "-") {
                        dir = -1;
                        o = o.substring(1);
                    }
                    if (a[o] > b[o]) return dir;
                    if (a[o] < b[o]) return -dir;
                    return 0;
                })
                .reduce(function firstNonZeroValue(p, n) {
                    return p ? p : n;
                }, 0);
        };
    }

    // split sub paths
    let pathDataArr = splitSubpaths(pathData);

    // has no sub paths - quit
    if (pathDataArr.length === 1) {
        return pathData
    }

    let subPathArr = [];
    pathDataArr.forEach(function (pathData, i) {
        // get verices from path data final points to approximate bbox
        let polyPoints = getPathDataVertices(pathData, true);
        let bb = getPolyBBox(polyPoints);
        let { x, y, width, height } = bb;

        // collect bbox info
        subPathArr.push({
            x: x,
            y: y,
            width: width,
            height: height,
            index: i
        });
    });

    //sort by size
    subPathArr.sort(fieldSorter(sortBy));

    // compile new path data
    let pathDataSorted = [];
    subPathArr.forEach(function (sub, i) {
        let index = sub.index;
        pathDataSorted.push(...pathDataArr[index]);
    });

    console.log('subPathsSorted', pathDataSorted);
    return pathDataSorted;
}
