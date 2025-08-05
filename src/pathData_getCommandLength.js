import { lgVals, deg2rad, rad2deg, PI2 } from './constants.js';
import { checkFlatnessByPolygonArea, svgArcToCenterParam, getAngle, getLegendreGaussValues, toParametricAngle, getEllipseLengthLG, pointAtT, getLength, cubicBezierLength2 } from './geometry';


export function getCommandLength({
    type = '',
    p0 = {},
    cp1 = {},
    cp2 = {},
    com = {},
    p = {},
    t = 1,
    precision = 'medium',
    wa = [],
    lg = 24,

    // arc properties
    rx = 0,
    ry = 0,
    startAngle = 0,
    endAngle = 0,
    deltaAngle = 0,
    degrees = false


} = {}) {


    // console.log(p0, com, com.type);
    //p0, com, p, t = 0, wa=[]
    /**
     * auto adjust Legendre-Gauss accuracy
     * precision for arc approximation
    */

    let auto_lg = precision === 'high' ? true : false;
    lg = precision === 'medium' ? 24 : 12;
    let lgArr = [12, 24, 36, 48, 60, 64, 72, 96];
    let tDivisionsQ = precision === 'low' ? 10 : 12;
    let tDivisionsC = precision === 'low' ? 15 : (precision === 'medium' ? 23 : 35);
    let tDivisions = tDivisionsC;

    let len = 0;
    type = !type ? (com.type ? com.type.toLowerCase() : 'l') : type.toLowerCase();

    //type=com.type.toLowerCase();
    //type=type.toLowerCase();

    //console.log('type', type);

    switch (type) {

        case 'z':
        case 'l':
            len = getLength([p0, p], t);
            break;

        case 'a':

            if(rx===ry){
                len = 2 * Math.PI * rx * (1 / 360 * Math.abs(deltaAngle * rad2deg))
                //console.log('len2', len);
            }else{
                len = getEllipseLengthLG(rx, ry, startAngle, endAngle, 0, false, degrees, wa);
            }
            break;

        case 'q':
            //len = getLength([p0, p]);
            len = getLength([p0, cp1, p], t, lg);
            break;


        case 'c':
            //len = getLength([p0, p]);
            len = getLength([p0, cp1, cp2, p], t, lg);
            break;


    }


    return len;
}