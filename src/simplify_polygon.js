
/**
 * unite self intersecting polygons
 * based on J. Holmes's answer
 * https://stackoverflow.com/a/10673515/15015675
 */

export function unitePolygon(poly) {
    const getSelfIntersections = (pts, pt0, pt1) => {
      const getLineIntersection = (pt0, pt1, pt2, pt3) => {
        let [x1, x2, x3, x4] = [pt0.x, pt1.x, pt2.x, pt3.x];
        let [y1, y2, y3, y4] = [pt0.y, pt1.y, pt2.y, pt3.y];
  
        // get x/y deltas
        let [dx1, dx2] = [x1 - x2, x3 - x4];
        let [dy1, dy2] = [y1 - y2, y3 - y4];
  
        // Calculate the denominator of the intersection point formula (cross product)
        let denominator = dx1 * dy2 - dy1 * dx2;
  
        // denominator === 0: lines are parallel - no intersection
        if (denominator === 0) return null;
  
        // Cross products of the endpoints
        let cross1 = x1 * y2 - y1 * x2;
        let cross2 = x3 * y4 - y3 * x4;
  
        let x = (cross1 * dx2 - dx1 * cross2) / denominator;
        let y = (cross1 * dy2 - dy1 * cross2) / denominator;
  
        // Check if the x and y coordinates are within both lines boundaries
        if (
          x < Math.min(x1, x2) ||
          x > Math.max(x1, x2) ||
          x < Math.min(x3, x4) ||
          x > Math.max(x3, x4) ||
          y < Math.min(y1, y2) ||
          y > Math.max(y1, y2) ||
          y < Math.min(y3, y4) ||
          y > Math.max(y3, y4)
        ) {
          return null;
        }
  
        return { x, y };
      };
  
      const squaredDist = (p1, p2) => {
        return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
      };
  
      const len = pts.length;
  
      // collect intersections
      let intersections = [];
      //let { pt0, pt1 } = segment;
  
      let segLenSq = squaredDist(pt0, pt1);
      let thresh = segLenSq / 1000;
  
      for (let i = 0; i < len; i++) {
        let pt2 = pts[i];
        let pt3 = pts[(i + 1) % len];
  
        // Skip if this is the segment itself
        if (pt3 === pt1) continue;
  
        let intersectionPoint = getLineIntersection(pt0, pt1, pt2, pt3);
  
        if (intersectionPoint) {
          const lengthSq = squaredDist(pt0, intersectionPoint);
  
          if (lengthSq > thresh && lengthSq < segLenSq) {
            intersections.push({
              pt0,
              pt1,
              startPoint: pt2,
              intersectionPoint,
              endPoint: pt3,
              lengthSq
            });
          }
        }
      }
  
      intersections.sort((a, b) => a.lengthSq - b.lengthSq);
      return intersections;
    };
  
    const len = poly.length;
    if (len < 3) return poly;
  
    // Set up next indices once
    for (let i = 0; i < len; i++) {
      poly[i].next = (i + 1) % len;
    }
  
    const newPoly = [];
    let currentPoint = poly[0];
    let nextPoint = poly[currentPoint.next];
    newPoly.push(currentPoint);
  
    for (let i = 0; i < len * 2; i++) {
      const intersections = getSelfIntersections(poly, currentPoint, nextPoint);
  
      if (intersections.length === 0) {
        newPoly.push(nextPoint);
        currentPoint = nextPoint;
        nextPoint = poly[nextPoint.next];
      } else {
        const closest = intersections[0];
        currentPoint = closest.intersectionPoint;
        nextPoint = closest.endPoint;
        newPoly.push(currentPoint);
      }
  
      // Closed loop detection — same position, not necessarily same object
      if (
        newPoly.length > 2 &&
        currentPoint.x === newPoly[0].x &&
        currentPoint.y === newPoly[0].y
      ) {
        break;
      }
    }
  
    // Remove closing duplicate point if present
    const first = newPoly[0];
    const last = newPoly[newPoly.length - 1];
    if (first.x === last.x && first.y === last.y) {
      newPoly.pop();
    }
  
    return newPoly;
  }