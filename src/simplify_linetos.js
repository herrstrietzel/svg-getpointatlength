import { getAngle, bezierhasExtreme, getPathDataVertices, svgArcToCenterParam, getSquareDistance, commandIsFlat } from "./geometry";
import { renderPoint } from "./visualize";
//import { renderPoint, renderPath } from "./visualize";




export function simplifyLinetoSequence(chunk, thresh = 0.1) {


    let valuesL = chunk[0].values.slice(-2).map(val => +val.toFixed(8))
    let p0 = chunk[0].p0
    //let p0 = { x: valuesL[0], y: valuesL[1] }
    let p = p0;
    let simplified = [];

    //console.log('chunk lineto', chunk);
    //renderPoint(svg1, p0, 'orange')


    for (let i = 1, len = chunk.length; i < len; i++) {
        let com = chunk[i - 1];
        valuesL = com.values.slice(-2).map(val => +val.toFixed(8))
        p = { x: valuesL[0], y: valuesL[1] }


        // zero length
        if ((p.x === p0.x && p.y === p0.y)) {
            console.log('zero length', com);
            p0 = p
            continue
        }

        // check flatness
        let comN = chunk[i];
        let valuesNL = comN.values.slice(-2)
        let pN = { x: valuesNL[0], y: valuesNL[1] }



        // check if adjacent linetos are flat
        let flatness = commandIsFlat([p0, p, pN])
        let isFlatN = flatness.flat;

        //renderPoint(svg1, pN, 'blue', '0.5%')

        /*
        if (!isFlatN) {
            renderPoint(svg1, p, 'orange', '0.75%')
            console.log( flatness,  thresh);
            renderPoint(svg1, p0, 'cyan', '1%', '0.5')
            renderPoint(svg1, pN, 'magenta', '0.5%')
        }
            */

        // next lineto is flat – don't add command
        if (isFlatN) {

            // check angles
            let ang1 = getAngle(p0, p, true)
            let ang2 = getAngle(p, pN, true)
            let angDiff = Math.abs(ang1 - ang2)
            //*180/Math.PI
            //console.log(angDiff, flatness,  thresh);

            if (angDiff < Math.PI / 4) {
                //renderPoint(svg1, p0, 'cyan', '1%', '0.5')
                //renderPoint(svg1, p, 'magenta', '0.5%')
                //p0 = p
                continue

            }


            //console.log('flat', flatness, 'thresh', thresh, dist, p0, p);
            // update p0
        }


        p0 = p

        simplified.push(com)
    }


    // always add last command in chunk
    simplified.push(chunk[chunk.length - 1])

    //simplified.push(...chunk)

    return simplified;

}