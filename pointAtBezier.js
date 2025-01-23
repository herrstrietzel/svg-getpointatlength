

/**
* calculate single points on segments
*/
const getPointAtBezierT = (pts, t, getTangent = false) => {

    let isCubic = pts.length === 4;
    let p0 = pts[0];
    let cp1 = pts[1];
    let cp2 = isCubic ? pts[2] : pts[1];
    let p = pts[pts.length - 1];
    let pt = { x: 0, y: 0 };

    if (getTangent) {
        let m0, m1, m2, m3, m4;

        if (t === 0) {
            pt.x = p0.x;
            pt.y = p0.y;
            pt.angle = getAngle(p0, cp1)
        }

        else if (t === 1) {
            pt.x = p.x;
            pt.y = p.y;
            pt.angle = getAngle(cp2, p)
        }

        else {
            m0 = interpolate(p0, cp1, t);
            if(isCubic){
                m1 = interpolate(cp1, cp2, t);
                m2 = interpolate(cp2, p, t);
                m3 = interpolate(m0, m1, t);
                m4 = interpolate(m1, m2, t);
                pt = interpolate(m3, m4, t);
                pt.angle = getAngle(m3, m4)
            }else{
                m1 = interpolate(p0, cp1, t);
                m2 = interpolate(cp1, p, t);
                pt = interpolate(m1, m2, t);
                pt.angle = getAngle(m1, m2)

            }
        }
    } 
    // take simplified calculations without tangent angles
    else{
        let t1 = 1 - t;

        // cubic beziers
        if(isCubic){
            pt = {
                x:
                    t1 ** 3 * p0.x +
                    3 * t1 ** 2 * t * cp1.x +
                    3 * t1 * t ** 2 * cp2.x +
                    t ** 3 * p.x,
                y:
                    t1 ** 3 * p0.y +
                    3 * t1 ** 2 * t * cp1.y +
                    3 * t1 * t ** 2 * cp2.y +
                    t ** 3 * p.y,
            };

        } 
        // quadratic beziers
        else{
            pt = {
                x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
                y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y,
            };

        }

    }

    console.log(pt);
    return pt

}