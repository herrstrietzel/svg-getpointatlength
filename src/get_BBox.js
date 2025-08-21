import { checkFlatnessByPolygonArea, svgArcToCenterParam, getAngle, getLegendreGaussValues, toParametricAngle, getEllipseLengthLG, pointAtT, getLength, getPointOnEllipse, getTangentAngle, rotatePoint, normalizeAngle, getArcExtemes_fromParametrized, getBezierExtremes } from './geometry';

import{getPolyBBox} from './geometry_bbox'


export function getSegmentExtremes(lookup, decimals=9) {

    let { segments } = lookup;

    /**
     * check if extremes are 
     * already calculated
     */

    if (lookup.hasOwnProperty('extremes') && lookup.segments[0].hasOwnProperty('extremes')) {
        //console.log('has extremes!!!');
        return lookup.extremes
    }

    //console.log('calc bbox');

    // global path extremes - for total bounding box
    let extremes = [segments[0].com.p0]
    let isSingleSeg = segments.length === 1;

    for (let i = 0, l = segments.length; i < l; i++) {

        let seg = segments[i];
        let { type, points, com } = seg;
        let { p0, values } = com;


        // final on-path point
        let p = points[points.length - 1];

        // segment extremes for bounding box calculation
        let segExtremes = [p0];

        switch (type) {
            // ignore starting commands
            case 'M':
                continue;

            case 'A':
                let { arcData } = seg;
                //console.log('arcData', arcData, com);

                // ellipse or circle
                let arcParams = !arcData.isEllipse ? arcData : seg.arcData_param;
                let ptsExt = getArcExtemes_fromParametrized(p0, p, arcParams)

                

                ptsExt.forEach(pt => {
                    extremes.push(pt)
                    segExtremes.push(pt);
                })

                break;
            case 'C':
            case 'Q':

                let bezierExtremes = getBezierExtremes(points)
                if (bezierExtremes.length) {
                    segExtremes.push(...bezierExtremes);
                    extremes.push(...bezierExtremes);
                }

                break;

            default:
                //console.log('type', type, points);
                break;

        }

        // add final on-path point
        segExtremes.push(p);

        // global extremes
        extremes.push(p)

        lookup.segments[i].extremes = segExtremes;
        lookup.segments[i].bbox = getPolyBBox(segExtremes, decimals);
    }
    //console.log('segments', segments);

    // global bbox
    // copy bbox for 1 segment paths
    let bb = segments[0].bbox;

    if (!isSingleSeg) {
        bb = getPolyBBox(extremes, decimals)
    }

   
    lookup.bbox = bb;
    lookup.extremes = extremes;
    return extremes

}