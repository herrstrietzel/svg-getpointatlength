import { rad2deg } from "./constants";
import { getPointOnEllipse, toNonParametricAngle, toParametricAngle, normalizeAngle } from "./geometry";
import { normalizePathData } from "./pathData_parse";
//import { renderPoint } from "./visualize";

// Ensure Path2D exists in Node or Browser
export function ensurePath2D() {
    if (typeof Path2D !== "undefined") {
        //console.log('Path2D is available');
        return;
    }

    try {
        // Node.js canvas module
        const { Path2D: NodePath2D } = require("canvas");
        global.Path2D = NodePath2D;
        console.log("[Path2D_svg] Using Path2D from 'canvas'");
    } catch (e) {
        // Fallback stub – records, but no drawing
        console.warn("[Path2D_svg] No Path2D found. Using stub (no rendering).");
        global.Path2D = class {
            constructor() { }
            moveTo() { }
            lineTo() { }
            bezierCurveTo() { }
            quadraticCurveTo() { }
            arc() { }
            arcTo() { }
            ellipse() { }
            rect() { }
            roundRect() { }
            closePath() { }
            addPath() { }
        };
    }
}

export const Canvas2SVG = ensurePath2D();

export class Path2D_svg extends Path2D {
    constructor(arg) {
        super(arg);
        this.pathData = [];

        if (arg instanceof Path2D_svg) {
            this.pathData = [...arg.pathData];
        } else if (typeof arg === "string") {
            if (typeof (parsePathDataNormalized) !== 'function') {
                console.warn('parsePathDataNormalized is not defined');
            } else {
                const segments = parsePathDataNormalized(arg);
                this.pathData.push(...segments);
            }
        }
    }

    _record(method, args) {
        let type, values;
        let PI2 = Math.PI * 2;

        switch (method) {
            case "moveTo":
                type = "M"; values = args; break;
            case "lineTo":
                type = "L"; values = args; break;
            case "bezierCurveTo":
                type = "C"; values = args; break;
            case "quadraticCurveTo":
                type = "Q"; values = args; break;
            case "closePath":
                type = "Z"; values = []; break;

            case "rect": {
                const [x, y, w, h] = args;
                this.pathData.push(
                    { type: "M", values: [x, y] },
                    { type: "L", values: [x + w, y] },
                    { type: "L", values: [x + w, y + h] },
                    { type: "L", values: [x, y + h] },
                    { type: "Z", values: [] }
                );

                return;
            }

            case "arc":
            case "ellipse":
                {
                    //let [cx, cy, r, start, end, ccw = false] = args;
                    let [cx, cy, rx] = args;
                    let [start, end, ccw] = args.slice(-3);
                    let isEllipse = method === 'ellipse'
                    let rotation = isEllipse ? args[4] : 0;
                    let ry = isEllipse ? args[3] : rx;
                    let delta = end - start;
                    delta = delta === 0 ? PI2 : (delta >= PI2 ? PI2 : delta)

                    if (ccw && delta > 0) delta -= PI2;
                    if (!ccw && delta < 0) delta += PI2;

                    // Handle full circle: split into two arcs
                    let full = Math.abs(delta) >= 2 * Math.PI || delta === 0;
                    //console.log('start', start, 'end', end, 'delta', delta , delta *rad2deg, 'full', full);

                    //let [prevX, prevY] = [p0.x, p0.y]
                    let p0 = getPointOnEllipse(cx, cy, rx, ry, start, rotation, false)
                    let p = getPointOnEllipse(cx, cy, rx, ry, end, rotation, false)


                    if (!this._currentPoint) {
                        this.pathData.push({ type: "M", values: [p0.x, p0.y] });
                    } else {
                        this.pathData.push({ type: "L", values: [p0.x, p0.y] });
                    }

                    let xAxisRotation = rotation ? (rotation * 180) / Math.PI : 0;
                    let largeArc = delta > Math.PI ? 1 : 0;
                    let sweep = ccw ? 0 : 1;
                    let pM = p;

                    // add mid point for full circles
                    if (full) {
                        //largeArc = 1;
                        let angleMid = normalizeAngle(start + Math.PI);
                        pM = getPointOnEllipse(cx, cy, rx, ry, angleMid, rotation, false)

                    }

                    let segLen = full ? 2 : 1;

                    for (let i = 0; i < segLen; i++) {
                        pM = full && i == 0 ? pM : p
                        //console.log('seg', i, segLen, largeArc, full);

                        this.pathData.push({
                            type: "A",
                            values: [
                                rx,
                                ry,
                                xAxisRotation,
                                largeArc,
                                sweep,
                                pM.x,
                                pM.y,
                            ],
                        });
                    }

                    this._currentPoint = [p.x, p.y];
                    return;
                }



            case "arcTo": {
                let [x1, y1, x2, y2, r] = args;
                let [x0, y0] = this._currentPoint || [x1, y1];

                let v1 = { x: x0 - x1, y: y0 - y1 };
                let v2 = { x: x2 - x1, y: y2 - y1 };

                let mag1 = Math.hypot(v1.x, v1.y);
                let mag2 = Math.hypot(v2.x, v2.y);

                if (mag1 === 0 || mag2 === 0 || r === 0) {
                    this.pathData.push({ type: "L", values: [x1, y1] });
                    return;
                }

                v1.x /= mag1; v1.y /= mag1;
                v2.x /= mag2; v2.y /= mag2;

                let dot = v1.x * v2.x + v1.y * v2.y;
                dot = Math.min(Math.max(dot, -1), 1);
                let theta = Math.acos(dot);

                if (theta === 0) {
                    this.pathData.push({ type: "L", values: [x1, y1] });
                    return;
                }

                let dist = r / Math.tan(theta / 2);
                let t1 = { x: x1 + v1.x * dist, y: y1 + v1.y * dist };
                let t2 = { x: x1 + v2.x * dist, y: y1 + v2.y * dist };

                let cross = v1.x * v2.y - v1.y * v2.x;
                let sweep = cross < 0 ? 1 : 0;
                let largeArc = 0;

                this.pathData.push({ type: "L", values: [t1.x, t1.y] });
                this.pathData.push({
                    type: "A",
                    values: [r, r, 0, largeArc, sweep, t2.x, t2.y],
                });
                return;
            }

            case "roundRect": {
                let [x, y, w, h, radii] = args;

                // Normalize radii → array of 4 {rx, ry}
                if (!Array.isArray(radii)) {
                    radii = [radii, radii, radii, radii];
                }
                if (radii.length === 2) {
                    radii = [radii[0], radii[1], radii[0], radii[1]];
                }
                if (radii.length === 4) {
                    radii = radii.map(r => (typeof r === "number" ? { rx: r, ry: r } : r));
                }

                let [r1, r2, r3, r4] = radii;

                // Clamp radii so they never exceed box size
                r1.rx = Math.min(r1.rx, w / 2);
                r1.ry = Math.min(r1.ry, h / 2);
                r2.rx = Math.min(r2.rx, w / 2);
                r2.ry = Math.min(r2.ry, h / 2);
                r3.rx = Math.min(r3.rx, w / 2);
                r3.ry = Math.min(r3.ry, h / 2);
                r4.rx = Math.min(r4.rx, w / 2);
                r4.ry = Math.min(r4.ry, h / 2);

                // Start top-left corner
                this.pathData.push({ type: "M", values: [x + r1.rx, y] });

                // Top edge → top-right corner
                this.pathData.push({ type: "L", values: [x + w - r2.rx, y] });
                this.pathData.push({
                    type: "A",
                    values: [r2.rx, r2.ry, 0, 0, 1, x + w, y + r2.ry]
                });

                // Right edge → bottom-right corner
                this.pathData.push({ type: "L", values: [x + w, y + h - r3.ry] });
                this.pathData.push({
                    type: "A",
                    values: [r3.rx, r3.ry, 0, 0, 1, x + w - r3.rx, y + h]
                });

                // Bottom edge → bottom-left corner
                this.pathData.push({ type: "L", values: [x + r4.rx, y + h] });
                this.pathData.push({
                    type: "A",
                    values: [r4.rx, r4.ry, 0, 0, 1, x, y + h - r4.ry]
                });

                // Left edge → close with top-left arc
                this.pathData.push({ type: "L", values: [x, y + r1.ry] });
                this.pathData.push({
                    type: "A",
                    values: [r1.rx, r1.ry, 0, 0, 1, x + r1.rx, y]
                });

                this.pathData.push({ type: "Z", values: [] });

                this._currentPoint = [x + r1.rx, y];
                return;
            }

            default: return;
        }

        this.pathData.push({ type, values });
        this._currentPoint = values.slice(-2); // track last point
    }

    // Override all Path2D methods
    moveTo(...args) { this._record("moveTo", args); return super.moveTo(...args); }
    lineTo(...args) { this._record("lineTo", args); return super.lineTo(...args); }
    bezierCurveTo(...args) { this._record("bezierCurveTo", args); return super.bezierCurveTo(...args); }
    quadraticCurveTo(...args) { this._record("quadraticCurveTo", args); return super.quadraticCurveTo(...args); }
    arc(...args) { this._record("arc", args); return super.arc(...args); }
    arcTo(...args) { this._record("arcTo", args); return super.arcTo(...args); }
    ellipse(...args) { this._record("ellipse", args); return super.ellipse(...args); }
    rect(...args) { this._record("rect", args); return super.rect(...args); }
    roundRect(...args) { this._record("roundRect", args); return super.roundRect(...args); }
    closePath(...args) { this._record("closePath", args); return super.closePath(...args); }

    // get pathData array
    getPathData(options = {}) {
        // normalize if required
        if (Object.keys(options).length && typeof normalizePathData === 'function') {
            this.pathData = normalizePathData(this.pathData, options)
        }
        return this.pathData
    }


    addPath(path2, transform) {
        let cmds = [];
        super.addPath(path2, transform);

        if (path2 instanceof Path2D_svg) {
            cmds = path2.getPathData();
        } else if (typeof path2 === "string") {
            cmds = parsePathDataNormalized(path2);
        } else {
            throw new Error("Unsupported path type for addPath");
        }

        // Apply transform if provided
        if (transform) {
            let { a = 1, b = 0, c = 0, d = 1, e = 0, f = 0 } = transform;

            // convert arcs to cubics
            if (typeof normalizePathData === 'function') {
                cmds = normalizePathData(cmds, { arcToCubic: true })
            }

            for (let j = 0, len = cmds.length; j < len; j++) {
                let { type, values } = cmds[j];
                if (values.length) {
                    for (let i = 0, l = values.length; i < l; i += 2) {
                        let pt = { x: values[i], y: values[i + 1] }
                        //let pt = new DOMPoint(x, y);
                        //pt = pt.matrixTransform(transform);
                        //vals[i] = pt.x;
                        //vals[i + 1] = pt.y;
                        values[i] = a * pt.x + c * pt.y + e;
                        values[i + 1] = b * pt.x + d * pt.y + f;
                    }
                }
            }
        }

        this.pathData.push(...cmds);
    }



    // stringified pathData
    getPathDataString(options = {}) {

        // normalize if required
        if (Object.keys(options).length && typeof normalizePathData === 'function') {
            this.pathData = normalizePathData(this.pathData, options)
        }
        //return pathData
        return this.pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
    }

    getD(options = {}) {

        // normalize if required
        if (Object.keys(options).length && typeof normalizePathData === 'function') {
            this.pathData = normalizePathData(this.pathData, options)
        }
        //return pathData
        return this.pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
    }


    // get lookup
    getPathLengthLookup(options = {}) {
        if (typeof (getPathLengthLookup) !== 'function') {
            console.warn('getPathLengthLookup is not defined');
            return this.pathData;
        }
        return getPathLengthLookup(this.pathData, options = {});
    }


    // get lookup
    getPathLookup(options = {}) {
        if (typeof (getPathLengthLookup) !== 'function') {
            console.warn('getPathLengthLookup is not defined');
            return this.pathData;
        }
        console.log('lookup conv', options);
        return getPathLengthLookup(this.pathData, options);
    }

}
