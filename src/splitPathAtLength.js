import {getPointAtLength} from './get_point_at_length.js';
import { normalizePathData, parsePathDataString, parsePathDataNormalized, stringifyPathData } from './pathData_parse.js';


export function splitPathAtLength(lookup, length = 0) {
    let pt = getPointAtLength(lookup, length, true, true);

    let pathData = lookup.pathData;
    let { x, y, index, commands=[] } = pt;


    // start
    if(!length){
        return { pathDataArr: [pathData, []], dArr: [stringifyPathData(pathData), ''], index:0 }
    }


    let [com1, com2] = commands;
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let pathData1 = [];
    let pathData2 = [];

    pathData.forEach((com, i) => {

        let { type, values } = com;
        if (i < index) {
            pathData1.push(com)
        }

        // get split segment
        else if (i === index) {
            pathData1.push(com1)

            // next path segment
            pathData2.push(
                { type: 'M', values: [x, y] },
                com2
            )
        }

        else if (i > index) {
            if (type.toLowerCase() === 'z') {
                pathData2.push(
                    { type: 'L', values: [M.x, M.y] },
                )

            } else {
                pathData2.push(com)
            }
        }
    })

    // stringified pathData
    let d1 = stringifyPathData(pathData1);
    let d2 = stringifyPathData(pathData2);

    return { pathDataArr: [pathData1, pathData2], dArr: [d1, d2], index };
}