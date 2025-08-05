
//import { splitSubpaths } from "./pathData_split";

//import { getPathDataVertices } from "./geometry";
//import { getPolygonArea } from "./geometry_area";

export function renderCommands(pathData, target = 'svg1') {

    const splitSubpaths = (pathData) => {
        let subPathArr = [];

        //split segments after M command
        let subPathIndices = pathData.map((com, i) => (com.type.toLowerCase() === 'm' ? i : -1)).filter(i => i !== -1);

        // no compound path
        if (subPathIndices.length === 1) {
            return [pathData]
        }
        subPathIndices.forEach((index, i) => {
            subPathArr.push(pathData.slice(index, subPathIndices[i + 1]));
        });

        return subPathArr;
    }

    //parent group
    let svg_g_top = `<g class="cpt_g cpt_g_top">`;
    let svg_g = `<g class="cpt_g">`;

    svg_g += `
     
     <style>
     
        .cpt_handle {
            stroke: #ccc;
        }

        .cpt_g {
            stroke-width: 0.3%;
            color: red;
        }

        .cpt_handle {
            stroke: currentColor;
        }

        .cpt_handle_tip {
            r: 1%;
            fill: currentColor;
        }

        .cpt_handle_tip_m {
            r: 1.5%;
            display:none;
            fill: transparent;
            stroke: currentColor;
        }
    </style>
     
     
     <symbol id="ccw_circle" viewBox="-5 -5 110 110" overflow="visible"> 
        <path fill="none" stroke="currentColor" 
    d="M 4 31 c 8 -19 26 -31 46 -31 c 28 0 50 22 50 50 c 0 28 -22 50 -50 50 c -14 0 -36 -6 -46 -31 
    m -2 -76 v 37 h 37
    "/>
    </symbol>

     <symbol id="cw_circle" viewBox="-5 -5 110 110" overflow="visible"> 
        <path fill="none" stroke="currentColor"  transform="scale(-1 1)" transform-origin="center"
    d="M 4 31 c 8 -19 26 -31 46 -31 c 28 0 50 22 50 50 c 0 28 -22 50 -50 50 c -14 0 -36 -6 -46 -31 
    m -2 -76 v 37 h 37
    "/>
    </symbol>

    
    `;



    //split in sub paths
    let pathDataArr = splitSubpaths(pathData);
    let M, cp1, cp2, cp1_0, cp2_0, p0, p;

    pathDataArr.forEach((sub, s) => {

        M = { x: sub[0].values[0], y: sub[0].values[1] }
        p0 = M

        let svg = `<g class="cpt_g">`;
        let svg_cpts_top = ``

        let polyPts =  getPathDataVertices(sub);
        let area = getPolygonArea(polyPts);
        let cw = area<0 ? false : true;


        sub.forEach((com, i) => {
            let { type, values } = com;

            if (type === 'Z') {
                //p = M
                //renderPoint(svg1, p, 'red', '2%')
            } else {

                let valsL = type != 'V' && type != 'H' ? values.slice(-2) :
                    (type === 'V' ? [p0.x, values[0]] : [values[0], p0.y]);
                p = { x: valsL[0], y: valsL[1] };
                //renderPoint(svg1, p, 'green', '3%')

                let transCW = cw ? 'scale(-1 1)' : 'scale(1 1)';

                if (type === 'M') {

                    //<use href="#ccw_circle" stroke-width="4"/>

                    if(cw){
                        svg_g_top += `<use href="#cw_circle" stroke-width="50%" style="color:#fff" x="${M.x}" y="${M.y}" width="2.5%" height="2.5%" transform="translate(-1.25 -1.25)" transform-origin="center" overflow="visible" />
                        <use href="#cw_circle" stroke-width="15%" x="${M.x}" y="${M.y}"  width="2.5%" height="2.5%" data-transform-origin="center" transform="translate(-1.25 -1.25)" overflow="visible" />`
                    }else{
                        svg_g_top += `<use href="#ccw_circle" stroke-width="50%" style="color:#fff" x="${M.x}" y="${M.y}" width="2.5%" height="2.5%" transform="translate(-1.25 -1.25)" transform-origin="center" overflow="visible" />
                        <use href="#ccw_circle" stroke-width="15%" x="${M.x}" y="${M.y}"  width="2.5%" height="2.5%" data-transform-origin="center" transform="translate(-1.25 -1.25)" overflow="visible" />`
                    }
                    //M = p;
                    //renderPoint(svg1, M, 'green', '2%');

                }

                if (type === 'C' || type === 'Q') {
                    cp1 = { x: values[0], y: values[1] }
                    //renderPoint(svg1, cp1, 'cyan');

                    if (type === 'Q') {
                        cp2 = cp1
                        svg += `<polyline fill="none" class="cpt_handle cpt_handle_q cpt_handle_cp1 " points="${p0.x} ${p0.y} ${cp1.x} ${cp1.y} ${p.x} ${p.y}"/>`;
                        svg += `<circle class="cpt_handle_tip cpt_handle_tip_q" cx="${cp1.x}" cy="${cp1.y}" r="1%" >
      <title>${type.toLowerCase()} - x:${cp1.x}, y: ${cp1.y}</title></circle>`
                    }

                    if (type === 'C') {
                        cp2 = { x: values[2], y: values[3] }
                        //renderPoint(svg1, cp2, 'cyan')

                        svg += `<line class="cpt_handle cpt_handle_c cpt_handle_cp1 " x1="${p0.x}" y1="${p0.y}"  x2="${cp1.x}" y2="${cp1.y}"/>`;
                        svg += `<circle class="cpt_handle_tip" cx="${cp1.x}" cy="${cp1.y}" r="1%" >
      <title>${type.toLowerCase()} - x:${cp1.x}, y: ${cp1.y}</title></circle>`


                        svg += `<line class="cpt_handle cpt_handle_c cpt_handle_cp2" x1="${p.x}" y1="${p.y}"  x2="${cp2.x}" y2="${cp2.y}"/>`;
                        svg += `<circle class="cpt_handle_tip" cx="${cp2.x}" cy="${cp2.y}" r="1%" >
      <title>${type.toLowerCase()} - x:${cp2.x}, y: ${cp2.y}</title></circle>`

                    }
                }

                if (type === 'T') {

                    //get reflected cpt
                    // new control points
                    cp1 = { x: 2 * p0.x - cp2_0.x, y: 2 * p0.y - cp2_0.y };
                    cp2 = cp1
                    svg += `<polyline fill="none" class="cpt_handle cpt_handle_t cpt_handle_cp1 " points="${p0.x} ${p0.y} ${cp1.x} ${cp1.y} ${p.x} ${p.y}"/>`;

                }

                if (type === 'S') {

                    //get reflected cpt
                    let cp2_2 = { x: values[0], y: values[1] }
                    // new control points
                    let cp1_2 = { x: 2 * p0.x - cp2_0.x, y: 2 * p0.y - cp2_0.y };

                    svg += `<line class="cpt_handle cpt_handle_s cpt_handle_cp1 " x1="${p0.x}" y1="${p0.y}"  x2="${cp1_2.x}" y2="${cp1_2.y}"/>`;
                    svg += `<line class="cpt_handle cpt_handle_s cpt_handle_cp2" x1="${p.x}" y1="${p.y}"  x2="${cp2_2.x}" y2="${cp2_2.y}"/>`;
                    svg += `<circle class="cpt_handle_tip cpt_handle_tip_s" cx="${cp2_2.x}" cy="${cp2_2.y}" r="1%" >
  <title>${type.toLowerCase()} - x:${cp2_2.x}, y: ${cp2_2.y}</title></circle>`

                }

                if (type !== 'Z') {
                    svg += `<circle class="cpt_handle_tip cpt_handle_tip_${type.toLowerCase()}" cx="${p.x}" cy="${p.y}" r="1%" >
  <title>P x:${p.x}, y: ${p.y}</title></circle>`

                }

            }

            p0 = p
            cp1_0 = cp1
            cp2_0 = cp2

        })

        
        svg_g += svg + '</g>';

    })

    svg_g += `</g>`;
    svg_g += svg_g_top+'</g>';
    //console.log('svg', svg, svg1);
    //svg1.insertAdjacentHTML('beforeend', svg)

    return svg_g

}


export function renderPoint(
    svg,
    coords,
    fill = "red",
    r = "1%",
    opacity = "1",
    title = '',
    render = true,
    id = "",
    className = ""
) {
    if (Array.isArray(coords)) {
        coords = {
            x: coords[0],
            y: coords[1]
        };
    }
    let marker = `<circle class="${className}" opacity="${opacity}" id="${id}" cx="${coords.x}" cy="${coords.y}" r="${r}" fill="${fill}">
  <title>${title}</title></circle>`;

    if (render) {
        svg.insertAdjacentHTML("beforeend", marker);
    } else {
        return marker;
    }
}


export function renderPath(svg, d = '', stroke = 'green', strokeWidth = '1%', render = true) {

    let path = `<path d="${d}" fill="none" stroke="${stroke}"  stroke-width="${strokeWidth}" /> `;

    if (render) {
        svg.insertAdjacentHTML("beforeend", path);
    } else {
        return path;
    }


}




// debug helper: render lines
export function renderPoly(svg, pts, strokeWidth = "1%", stroke = "purple", render = true) {
    pts = pts.map(pt => { return [pt.x, pt.y] }).flat().join(' ');

    let poly =
        `<polyline  stroke-width="${strokeWidth}" points="${pts}" stroke="${stroke}" />`;

    if (render) {
        svg.insertAdjacentHTML("beforeend", poly);

    } else {
        return poly
    }
}


//!!! delete- rename
export function renderPerpendicularLine(pt, len = 10, angle) {
    let ptA = {
        x: pt.x + len * Math.cos(angle),
        y: pt.y + len * Math.sin(angle)
    };
    return ptA;
}



export function addMarkers() {


    let markerMarkup =
        `<svg id="svgMarkers" style="width:0; height:0; position:absolute; z-index:-1;float:left;">
    <defs>
        <marker id="markerStart" overflow="visible" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="strokeWidth"
            markerWidth="10" markerHeight="10" orient="auto-start-reverse">
            <circle cx="5" cy="5" r="3" fill="green" fill-opacity="1" />>

            <marker id="markerEnd" overflow="visible" viewBox="0 0 10 10" refX="5" refY="5"
                markerUnits="strokeWidth" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
                <circle cx="5" cy="5" r="2" fill="red" fill-opacity="0.5" />
            </marker>
    </defs>
</svg>`

    let style = `
<style>
.showMarkers {
    marker-start: url(#markerStart);
    marker-mid: url(#markerEnd);
    stroke-width: 0.33%;
}
</style>
`
    document.body.insertAdjacentHTML('afterbegin', style + markerMarkup)

}


/**
 * adjust viewBox
 */
export function adjustViewBox(svg) {
    let bb = svg.getBBox();
    let [x, y, width, height] = [bb.x, bb.y, bb.width, bb.height];
    svg.setAttribute("viewBox", [x, y, width, height].join(" "));
}