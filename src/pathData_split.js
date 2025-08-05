import { pointAtT, svgArcToCenterParam, getBezierExtremeT  } from "./geometry";
import { renderPoint, renderPath } from "./visualize";


/**
 * split segments into chunks to
 * prevent simplification across 
 * extremes, corners or direction changes
 */

export function getPathDataPlusChunks(pathDataPlus = [], debug = false) {

    // loop sub paths
    for (let s = 0, l = pathDataPlus.length; s < l; s++) {
        let sub = pathDataPlus[s];
        let pathDataSub = sub.pathData;
        pathDataPlus[s].chunks = [[pathDataSub[0]], []];

        let pathDataChunks = [[pathDataSub[0]], []];
        let ind = 1

        let wasExtreme = false
        let wasCorner = false
        let wasClosePath = false;
        let prevType = 'M';
        let typeChange = false;


        for (let i = 1, len = pathDataSub.length; i < len; i++) {
            let com = pathDataSub[i]

            let { extreme, corner, directionChange } = com;
            typeChange = prevType !== com.type;
            let split = directionChange || wasExtreme || wasCorner || wasClosePath || typeChange;
            //let split = wasExtreme


            // new chunk
            if (split) {
                /*
                if(directionChange){
                    renderPoint(svg1, com.p0 , 'red')
                }
                if(wasExtreme){
                    renderPoint(svg1, com.p0 , 'blue')
                }

                if(wasCorner){
                    renderPoint(svg1, com.p0 , 'magenta')
                }
                
                if(wasClosePath){
                    renderPoint(svg1, com.p0 , 'red')
                }

                if(typeChange && com.type==='Q' && prevType==='M'){
                    console.log('typechange', pathDataSub[i], pathDataSub[i-1]);
                    renderPoint(svg1, com.p0 , 'purple')
                }
                    */

                //let orphanedC = pathDataChunks[ind].length===1 && i<len-1 && wasExtreme
                //orphanedC=false
                //console.log('orphanedC', i, len, orphanedC, pathDataChunks[ind].length);

                if (pathDataChunks[ind].length) {
                    pathDataChunks.push([]);
                    ind++
                }
            }

            wasExtreme = extreme
            wasCorner = corner;
            wasClosePath = com.type.toLowerCase() === 'z'
            prevType = com.type
            //pathDataPlus[s].chunks[ind].push(com);
            pathDataChunks[ind].push(com)

        }


        // debug rendering
        if (debug) {

            //console.log('show chunks', pathDataChunks);
            pathDataChunks.forEach((ch, i) => {
                let stroke = i % 2 === 0 ? 'green' : 'orange';
                if(i===pathDataChunks.length-2){
                    stroke = 'magenta'
                }

                let M = ch[0].p0;
                if (M) {
                    //renderPoint(svg1, M, 'green', '1%')
                    let d = `M ${M.x} ${M.y}`

                    ch.forEach(com => {
                        //console.log(com);
                        d += `${com.type} ${com.values.join(' ')}`
                        //let pt = com.p;
                        //renderPoint(svg1, pt, 'cyan')
                    })
                    //console.log(d);
                    renderPath(svg1, d, stroke, '0.5%', '0.5')
                }

            })
        }

        // add to pathdataPlus object
        pathDataPlus[s].chunks = pathDataChunks

    }

    //console.log(pathDataPlus);
    return pathDataPlus

}




/**
 * split compound paths into 
 * sub path data array
 */
export function splitSubpaths(pathData) {

    let subPathArr = [];

    //split segments after M command
    
    try{
        let subPathIndices = pathData.map((com, i) => (com.type.toLowerCase() === 'm' ? i : -1)).filter(i => i !== -1);

    }catch{
        console.log('catch', pathData);
    }


    let subPathIndices = pathData.map((com, i) => (com.type.toLowerCase() === 'm' ? i : -1)).filter(i => i !== -1);
    //let subPathIndices = pathData.map((com, i) => (com.type === 'M' ? i : -1)).filter(i => i !== -1);

    // no compound path
    if (subPathIndices.length === 1) {
        return [pathData]
    }
    subPathIndices.forEach((index, i) => {
        subPathArr.push(pathData.slice(index, subPathIndices[i + 1]));
    });

    return subPathArr;
}



/**
 * calculate split command points
 * for single t value 
 */
export function splitCommand(points, t) {

    let seg1 = [];
    let seg2 = [];

    let p0 = points[0];
    let cp1 = points[1];
    let cp2 = points[points.length - 2];
    let p = points[points.length - 1];
    let m0,m1,m2,m3,m4, p2


    // cubic
    if (points.length === 4) {
        m0 = pointAtT([p0, cp1], t);
        m1 = pointAtT([cp1, cp2], t);
        m2 = pointAtT([cp2, p], t);
        m3 = pointAtT([m0, m1], t);
        m4 = pointAtT([m1, m2], t);

        // split end point
        p2 = pointAtT([m3, m4], t);

        // 1. segment
        seg1.push(
            { x: p0.x, y: p0.y },
            { x: m0.x, y: m0.y },
            { x: m3.x, y: m3.y },
            { x: p2.x, y: p2.y },
        )
        // 2. segment
        seg2.push(
            { x: p2.x, y: p2.y },
            { x: m4.x, y: m4.y },
            { x: m2.x, y: m2.y },
            { x: p.x, y: p.y },
        )
    }

    // quadratic
    else if (points.length === 3) {
        m1 = pointAtT([p0, cp1], t);
        m2 = pointAtT([cp1, p], t);
        p2 = pointAtT([m1, m2], t);

        // 1. segment
        seg1.push(
            { x: p0.x, y: p0.y },
            { x: m1.x, y: m1.y },
            { x: p2.x, y: p2.y },
        )

        // 1. segment
        seg2.push(
            { x: p2.x, y: p2.y },
            { x: m2.x, y: m2.y },
            { x: p.x, y: p.y },
        )
    }

    // lineto
    else if (points.length === 2) {
        m1 = pointAtT([p0, p], t);

        // 1. segment
        seg1.push(
            { x: p0.x, y: p0.y },
            { x: m1.x, y: m1.y },
        )

        // 1. segment
        seg2.push(
            { x: m1.x, y: m1.y },
            { x: p.x, y: p.y },
        )
    }
    return [seg1, seg2];
}


/**
 * calculate command extremes
 */

export function addExtemesToCommand(p0, values) {

    let pathDataNew = [];

    let type = values.length === 6 ? 'C' : 'Q'
    let cp1 = { x: values[0], y: values[1] }
    let cp2 = type === 'C' ? { x: values[2], y: values[3] } : cp1
    let p = { x: values[4], y: values[5] }


    // get inner bbox
    let xMax = Math.max(p.x, p0.x)
    let xMin = Math.min(p.x, p0.x)
    let yMax = Math.max(p.y, p0.y)
    let yMin = Math.min(p.y, p0.y)

    let extremeCount = 0;

    //has  extreme - split
    if (
        cp1.x < xMin ||
        cp1.x > xMax ||
        cp1.y < yMin ||
        cp1.y > yMax ||
        cp2.x < xMin ||
        cp2.x > xMax ||
        cp2.y < yMin ||
        cp2.y > yMax

    ) {
        let pts = type === 'C' ? [p0, cp1, cp2, p] : [p0, cp1, p];
        let tArr = getBezierExtremeT(pts).sort();
        if(tArr.length){
            let commandsSplit = splitCommandAtTValues(p0, values, tArr)
            pathDataNew.push(...commandsSplit)
            extremeCount += commandsSplit.length;
        }else{
            console.log('no extreme: ', tArr);
            pathDataNew.push({ type: type, values: values })
        }

    }
    // no extremes
    else {
        pathDataNew.push({ type: type, values: values })
    }

    return { pathData: pathDataNew, count: extremeCount };

}



export function addExtremePoints(pathData) {
    let pathDataNew = [pathData[0]];
    // previous on path point
    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let len = pathData.length;

    for (let c = 1; len && c < len; c++) {
        let com = pathData[c];
        //let comPrev = pathData[c - 1];
        //let comN = pathData[c + 1] ? pathData[c + 1] : '';
        let { type, values } = com;
        let valsL = values.slice(-2);
        let p = { x: valsL[0], y: valsL[1] };

        if (type !== 'C' && type !== 'Q') {
            pathDataNew.push(com)
        }

        else {
            // add extremes
            if (type === 'C' || type === 'Q') {
                pathDataNew.push(...addExtemesToCommand(p0, values))
            }
        }

        p0 = { x: valsL[0], y: valsL[1] };

        if (type.toLowerCase() === "z") {
            p0 = M;
        } else if (type === "M") {
            M = { x: valsL[0], y: valsL[1] };
        }
    }

    //console.log(pathData.length, pathDataNew.length)
    return pathDataNew;
}



/**
 * split commands multiple times
 * based on command points
 * and t array
 */
export function splitCommandAtTValues(p0, values, tArr, returnCommand = true) {
    let segmentPoints = [];

    if (!tArr.length) {
        return false
    }

    let valuesL = values.length;
    let p = { x: values[valuesL - 2], y: values[valuesL - 1] };
    let type, cp1, cp2, points;


    if (values.length === 2) {
        type = 'L'
        points = [p0, p]
    }
    else if (values.length === 4) {
        type = 'Q'
        cp1 = { x: values[0], y: values[1] };
        points = [p0, cp1, p]
    }
    else if (values.length === 6) {
        type = 'C'
        cp1 = { x: values[0], y: values[1] };
        cp2 = { x: values[2], y: values[3] };
        points = [p0, cp1, cp2, p]
    }



    if (tArr.length) {
        // single t
        if (tArr.length === 1) {
            let segs = splitCommand(points, tArr[0]);
            let points1 = segs[0]
            let points2 = segs[1]
            segmentPoints.push(points1, points2)
            //return segmentPoints;
        } else {

            // 1st segment
            let t1 = tArr[0];
            let seg0 = splitCommand(points, t1);
            let points0 = seg0[0];
            segmentPoints.push(points0)
            points = seg0[1];

            //console.log('tarr', tArr);

            for (let i = 1; i < tArr.length; i++) {
                t1 = tArr[i - 1]
                let t2 = tArr[i]

                // new t value for 2nd segment
                let t2_1 = (t2 - t1) / (1 - t1)
                let segs2 = splitCommand(points, t2_1);
                segmentPoints.push(segs2[0])

                if (i === tArr.length - 1) {
                    segmentPoints.push(segs2[segs2.length - 1])
                }
                // take 2nd segment for next splitting
                points = segs2[1];
            }
        }
    }

    if (returnCommand) {

        let pathData = [];
        let com, values;

        segmentPoints.forEach(seg => {
            com = { type: '', values: [] };
            seg.shift();
            values = seg.map(val => { return Object.values(val) }).flat()
            com.values = values;

            // cubic
            if (seg.length === 3) {
                com.type = 'C';
            }

            // quadratic
            else if (seg.length === 2) {
                com.type = 'Q';
            }

            // lineto
            else if (seg.length === 1) {
                com.type = 'L';
            }
            pathData.push(com)
        })
        return pathData;
    }

    return segmentPoints;
}

