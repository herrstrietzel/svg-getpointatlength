
  
function canvasArcto2SVG(p0, cp1, cp2, r) {

    let pathData = [
        { type: 'M', values: [p0.x, p0.y] },
        { type: "L", values: [cp1.x, cp1.y] }
    ];


    let v1 = { x: p0.x - cp1.x, y: p0.y - cp1.y };
    let v2 = { x: cp2.x - cp1.x, y: cp2.y - cp1.y };
  
    let mag1 = Math.hypot(v1.x, v1.y);
    let mag2 = Math.hypot(v2.x, v2.y);


    // degenerate, just lineTo
    if (mag1 === 0 || mag2 === 0 || r === 0) return pathData;

    v1.x /= mag1; v1.y /= mag1;
    v2.x /= mag2; v2.y /= mag2;
  
    let dot = v1.x * v2.x + v1.y * v2.y;
    dot = Math.min(Math.max(dot, -1), 1);
    let theta = Math.acos(dot);
  
    // if lines are collinear, fallback to line
    if (theta === 0) return pathData;

    // distance from corner to tangents
    let dist = r / Math.tan(theta / 2);
  
    let pt1 = { x: cp1.x + v1.x * dist, y: cp1.y + v1.y * dist };
    let pt2 = { x: cp1.x + v2.x * dist, y: cp1.y + v2.y * dist };
  
    // center lies on angle bisector
    let bis = { x: v1.x + v2.x, y: v1.y + v2.y };
    let bisMag = Math.hypot(bis.x, bis.y);
    bis.x /= bisMag; bis.y /= bisMag;
      
    // sweep direction matches cross product
    let cross = v1.x * v2.y - v1.y * v2.x;
    let sweep = cross < 0 ? 1 : 0;
    let largeArc = 0

    pathData= [
        { type: 'M', values: [p0.x, p0.y] },
        { type: "L", values: [pt1.x, pt1.y] },
        { type: "A", values: [r, r, 0, largeArc, sweep, pt2.x, pt2.y] },
        //{ type: 'L', values: [cp2.x, cp2.y] },
    ]


    //let d = stringifyPathData(pathData);
    return { d, pathData }

  }
  


function canvasArcto2SVG0(p0, ccp1, ccp2, r) {

    let tangentL1 = getDistance(p0, ccp1);
    let t1 = (tangentL1 - r) / tangentL1;
    let pt1 = interpolate(p0, ccp1, t1)

    let tangentL2 = getDistance(ccp2, ccp1);
    let t2 = (tangentL2 - r) / tangentL2;
    let pt2 = interpolate(ccp2, ccp1, t2)




    let ang1 = getAngle(ccp1, pt1)
    let ang2 = getAngle(ccp1, pt2)
    let delta = (ang2 - ang1) * 1
    //let delta = Math.PI*2 - (normalizeAngle(ang2) - normalizeAngle(ang1));

    //let largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
    let largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
    let sweep = ang2 > ang1 ? 0 : 1;

    largeArc=0
    sweep=1

    let arcdata = { largeArc, sweep, r }
    console.log('arcdata', arcdata, ang1, ang2, delta*180/Math.PI);


    renderPoint(svg, pt1, 'green');
    renderPoint(svg, pt2, 'green');


    let dist2 = getDistance(pt1, pt2);
    //dist2 = Math.sqrt(dist2**2)



    //let diffr = Math.abs(r-dist2)
    //let diffr = (r+dist2)
    //let diffr = Math.sqrt( (r+dist2)**2 )
    let diffr =  (r+dist2)*0.5

    let rat2 = Math.sqrt(dist2*0.5) 

    let ratA= Math.PI / Math.abs(delta)*2

    console.log('ratA', ratA, 'rat2', rat2);

    //let r2 = Math.sqrt((r+diffr)**2)
    //let r2 = (r+diffr)

    let r2 = r* 1.75
    // tangentL1 = getDistance(p0, ccp1);
     t1 = (tangentL1 - r2) / tangentL1;


     t2 = (tangentL2 - r2) / tangentL2;

     pt1 = interpolate(p0, ccp1, t1)
     pt2 = interpolate(ccp2, ccp1, t2)

     renderPoint(svg, pt1, 'orange');
     renderPoint(svg, pt2, 'orange');
 


     /*
    let tangentL2 = getDistance(ccp2, ccp1);
    */



    /*

    rect.setAttribute('x', pt1.x)
    rect.setAttribute('y', pt1.y)
    rect.setAttribute('width', r)
    rect.setAttribute('height', r)


    circle.setAttribute('cx', ccp1.x-r - dist2)
    circle.setAttribute('cy', ccp1.y+r)
    circle.setAttribute('r', r)
    */



    let pathData = [
        { type: 'M', values: [p0.x, p0.y] },
        { type: 'L', values: [pt1.x, pt1.y] },
        { type: 'A', values: [r, r, 0, largeArc, sweep, pt2.x, pt2.y] },
        { type: 'L', values: [ccp2.x, ccp2.y] },

    ]

    let d = stringifyPathData(pathData);

    renderPoint(svg, ccp1, 'cyan');
    renderPoint(svg, ccp2, 'magenta');

    //console.log('t1', t1, 'delta', delta, ang1, ang2);
    //console.log('arcData', arcData);

    return { d, pathData }

}







function getDistance(cp1, cp2) {

    // check horizontal or vertical
    if (cp1.y === cp2.y) {
      return Math.abs(cp2.x - cp1.x)
    }
    if (cp1.x === cp2.x) {
      return Math.abs(cp2.y - cp1.y)
    }

    return Math.sqrt(
      (cp2.x - cp1.x) ** 2 + (cp2.y - cp1.y) ** 2
    );
  }

  function interpolate(cp1, cp2, t, getTangent = false) {

    let pt = {
      x: (cp2.x - cp1.x) * t + cp1.x,
      y: (cp2.y - cp1.y) * t + cp1.y,
    };

    if (getTangent) {
      pt.angle = getAngle(cp1, cp2)

      // normalize negative angles
      if (pt.angle < 0) pt.angle += Math.PI * 2
    }

    return pt
  }

  function getAngle(cp1, cp2, normalize = false) {
    //console.log('getAngle', cp1, cp2);
    let angle = Math.atan2(cp2.y - cp1.y, cp2.x - cp1.x);
    // normalize negative angles
    if (normalize && angle < 0) angle += Math.PI * 2
    return angle
  }


  function normalizeAngle(angle) {
    let PI2 = Math.PI * 2;
    // Normalize to 0-2π range
    angle = angle % PI2;
    return angle < 0 ? angle + PI2 : angle;
  }

  function renderPoint(
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
