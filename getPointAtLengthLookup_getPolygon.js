/**
 * calculate polygon from
 * pathdata
 */

function polygonFromPathData(d, options = {}) {
  // accepts d string or pathdata array
  let isPathData = Array.isArray(d);
  let pathData = isPathData ? d : parsePathDataNormalized(d);
  let commandTokens = isPathData
    ? pathData
        .map((com) => {
          return com.type;
        })
        .join("")
        .toLowerCase()
    : d;
  let lengthLookup = getPathLengthLookup(pathData);
  let totalLength = lengthLookup.totalLength;

  // merge defaults with options
  options = {
    ...{
      vertices: 16,
      decimals: 3,
      adaptive: true,
      retainPoly: true,
      tolerance: 0
    },
    ...options
  };

  let { vertices, decimals, adaptive, retainPoly, tolerance } = options;

  /**
   * helpers
   */
  const getVerticesFromLookup = (
    lengthLookup,
    vertices,
    decimals = 3,
    adaptive = true
  ) => {
    let polypoints = [];
    let segments = lengthLookup.segments;
    let length = 0;
    let segIndex = 0;
    let currentSeg = segments[segIndex];
    let lastSegLength = currentSeg.total;

    // target side length
    let step = totalLength / vertices;
    let lastLength = 0;

    if (!adaptive) {
      for (let i = 0; i < vertices; i++) {
        let pt = lengthLookup.getPointAtLength(step * i);
        polypoints.push(pt);
      }
    }

    // adaptive
    else {
      // add M starting point
      let M = segments[0].points[0];
      polypoints.push(M);

      //loop segemnts
      for (let i = 0; i < segments.length; i++) {
        let seg = segments[i];
        let segL = seg.total;
        let len;

        // fit to segment length – keep command end points to retain shape
        let segSplits = Math.ceil(segL / step);

        // if lineto: no need to calculate points
        let segPoints = seg.points;
        let segPrevPts =
          i > 0 ? segments[i - 1].points : [polypoints[polypoints.length - 1]];
        let p0 = segPrevPts[segPrevPts.length - 1];
        let p = segPoints[segPoints.length - 1];
        let type = seg.type.toLowerCase();

        // curves
        if (type !== "l")  {
          // points in segment
          for (let s = 1; s < segSplits; s++) {
            len = lastLength + (segL / segSplits) * s;
            let pt = lengthLookup.getPointAtLength(len);
            polypoints.push(pt);
          }
        }

        // skip if end point equals starting point
        if ((p0.x !== p.x || p0.y !== p.y) && (M.x !== p.x || M.y !== p.y)) {
          polypoints.push(p);
        }
        
        lastLength += segL;
      }
    }

    //round
    if (decimals > -1) {
      polypoints = polypoints.map((pt) => {
        return {
          x: +pt.x.toFixed(decimals),
          y: +pt.y.toFixed(decimals)
        };
      });
    }

    return polypoints;
  };

  /**
   * get vertices from path command final on-path points
   */
  const getPathDataVertices = (pathData) => {
    let polyPoints = [];
    pathData.forEach((com) => {
      let values = com.values;
      // get final on path point from last 2 values
      if (values.length) {
        let pt = { x: values[values.length - 2], y: values[values.length - 1] };
        polyPoints.push(pt);
      }
    });
    return polyPoints;
  };

  // get distance between points
  const getDistance = (p1, p2) => {
    if (Array.isArray(p1)) {
      p1.x = p1[0];
      p1.y = p1[1];
    }
    if (Array.isArray(p2)) {
      p2.x = p2[0];
      p2.y = p2[1];
    }

    let [x1, y1, x2, y2] = [p1.x, p1.y, p2.x, p2.y];
    let y = x2 - x1;
    let x = y2 - y1;
    return Math.sqrt(x * x + y * y);
  };

  /**
   * calculate polygon length
   */
  const getPolygonLength = (points, isPolyline = false) => {
    // clone to prevent overwriting
    points = points.map(({ ...el }) => {
      return el;
    });
    let polyLength = 0;
    // repeat first point for closed polygons - not suitable for polylines
    if (!isPolyline) {
      points.push(points[0]);
    }
    for (let i = 0; i < points.length - 1; i++) {
      let p1 = points[i];
      let p2 = points[i + 1];
      let dist = getDistance(p1, p2);
      polyLength += dist;
    }

    return polyLength;
  };

  // collect polygon vertices
  let polypoints = [];
  let pathVertices = getPathDataVertices(pathData);

  // 1. any beziers or arc commands?
  let isPolygon = /[csqta]/gi.test(commandTokens) ? false : true

  if (isPolygon && retainPoly) {
    //console.log('path is polygon');
    polypoints = pathVertices;
    return polypoints;
  }

  polypoints = getVerticesFromLookup(
    lengthLookup,
    vertices,
    decimals,
    adaptive
  );

  /**
   *  get close approx based on tolerance
   */
  if (tolerance) {
    // number of verices
    let verticesLength = lengthLookup.segments.length;
    let verticeDiff = Math.abs(polypoints.length - verticesLength);
    let polyLength = getPolygonLength(polypoints);
    let lengthDiff = Math.abs(totalLength - polyLength);

    // simplify
    if (lengthDiff < tolerance) {
      //console.log('simplify');
      polypoints = getVerticesFromLookup(lengthLookup, 4, decimals, adaptive);
      polyLength = getPolygonLength(polypoints);
      lengthDiff = Math.abs(totalLength - polyLength);
    }

    let checks = 0;
    // check poly lengths against pathlength until diff is < tolerance
    for (
      let v = verticesLength;
      checks < 200 && lengthDiff >= tolerance;
      v += 1
    ) {
      polypoints = getVerticesFromLookup(lengthLookup, v, decimals, adaptive);

      //pathToPolygon(pathLengthLookup, v, precision, true)
      verticeDiff = Math.abs(polypoints.length - verticesLength);
      v += verticeDiff > 1 ? verticeDiff - 1 : 2;
      verticesLength = polypoints.length;
      polyLength = getPolygonLength(polypoints);
      lengthDiff = Math.abs(totalLength - polyLength);
      checks++;
    }
  }

  return polypoints;
}
