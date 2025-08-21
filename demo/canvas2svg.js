// Ensure Path2D exists in Node or Browser
(function initPath2DGlobal() {
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
      constructor() {}
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      arcTo() {}
      ellipse() {}
      rect() {}
      roundRect() {}
      closePath() {}
      addPath() {}
    };
  }
})();



class Path2D_svg extends Path2D {
  constructor(arg) {
    super(arg);
    this._commands = [];

    if (arg instanceof Path2D_svg) {
      this._commands = [...arg._commands];
    } else if (typeof arg === "string") {
      if (typeof(parsePathDataNormalized) !== 'function'){
        console.warn('parsePathDataNormalized is not defined');
      }else{
        const segments = parsePathDataNormalized(arg);
        this._commands.push(...segments);
      }
    }
  }

  _record(method, args) {
    let type, values;

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
        this._commands.push({ type: "M", values: [x, y] });
        this._commands.push({ type: "L", values: [x + w, y] });
        this._commands.push({ type: "L", values: [x + w, y + h] });
        this._commands.push({ type: "L", values: [x, y + h] });
        this._commands.push({ type: "Z", values: [] });
        return;
      }

      case "arc": {
        const [cx, cy, r, start, end, ccw = false] = args;
        const x0 = cx + r * Math.cos(start);
        const y0 = cy + r * Math.sin(start);
        const x1 = cx + r * Math.cos(end);
        const y1 = cy + r * Math.sin(end);

        const largeArcFlag = Math.abs(end - start) > Math.PI ? 1 : 0;
        const sweepFlag = ccw ? 0 : 1;

        this._commands.push({ type: "M", values: [x0, y0] });
        this._commands.push({
          type: "A",
          values: [r, r, 0, largeArcFlag, sweepFlag, x1, y1],
        });
        return;
      }

      case "ellipse": {
        const [cx, cy, rx, ry, rotation, start, end, ccw = false] = args;
        const x0 = cx + rx * Math.cos(start);
        const y0 = cy + ry * Math.sin(start);
        const x1 = cx + rx * Math.cos(end);
        const y1 = cy + ry * Math.sin(end);

        const largeArcFlag = Math.abs(end - start) > Math.PI ? 1 : 0;
        const sweepFlag = ccw ? 0 : 1;

        this._commands.push({ type: "M", values: [x0, y0] });
        this._commands.push({
          type: "A",
          values: [
            rx,
            ry,
            (rotation * 180) / Math.PI,
            largeArcFlag,
            sweepFlag,
            x1,
            y1,
          ],
        });
        return;
      }

      case "arcTo": {
        const [x1, y1, x2, y2, r] = args;
        const [x0, y0] = this._currentPoint || [x1, y1];

        const v1 = { x: x0 - x1, y: y0 - y1 };
        const v2 = { x: x2 - x1, y: y2 - y1 };

        const mag1 = Math.hypot(v1.x, v1.y);
        const mag2 = Math.hypot(v2.x, v2.y);

        if (mag1 === 0 || mag2 === 0 || r === 0) {
          this._commands.push({ type: "L", values: [x1, y1] });
          return;
        }

        v1.x /= mag1; v1.y /= mag1;
        v2.x /= mag2; v2.y /= mag2;

        let dot = v1.x * v2.x + v1.y * v2.y;
        dot = Math.min(Math.max(dot, -1), 1);
        let theta = Math.acos(dot);

        if (theta === 0) {
          this._commands.push({ type: "L", values: [x1, y1] });
          return;
        }

        const dist = r / Math.tan(theta / 2);
        const t1 = { x: x1 + v1.x * dist, y: y1 + v1.y * dist };
        const t2 = { x: x1 + v2.x * dist, y: y1 + v2.y * dist };

        const cross = v1.x * v2.y - v1.y * v2.x;
        const sweep = cross < 0 ? 1 : 0;
        const largeArc = 0;

        this._commands.push({ type: "L", values: [t1.x, t1.y] });
        this._commands.push({
          type: "A",
          values: [r, r, 0, largeArc, sweep, t2.x, t2.y],
        });
        return;
      }

      case "roundRect": {
        let [x, y, w, h, radii] = args;
        if (!Array.isArray(radii)) radii = [radii];
        if (radii.length === 0) radii = [0];
        if (radii.length === 1) radii = [radii[0], radii[0], radii[0], radii[0]];
        if (radii.length === 2) radii = [radii[0], radii[1], radii[0], radii[1]];
        if (radii.length === 3) radii = [radii[0], radii[1], radii[2], radii[1]];
        if (radii.length > 4) radii = radii.slice(0, 4);

        const [tl, tr, br, bl] = radii;

        this._commands.push({ type: "M", values: [x + tl, y] });
        this._commands.push({ type: "L", values: [x + w - tr, y] });
        if (tr) this._commands.push({ type: "A", values: [tr, tr, 0, 0, 1, x + w, y + tr] });

        this._commands.push({ type: "L", values: [x + w, y + h - br] });
        if (br) this._commands.push({ type: "A", values: [br, br, 0, 0, 1, x + w - br, y + h] });

        this._commands.push({ type: "L", values: [x + bl, y + h] });
        if (bl) this._commands.push({ type: "A", values: [bl, bl, 0, 0, 1, x, y + h - bl] });

        this._commands.push({ type: "L", values: [x, y + tl] });
        if (tl) this._commands.push({ type: "A", values: [tl, tl, 0, 0, 1, x + tl, y] });

        this._commands.push({ type: "Z", values: [] });
        return;
      }

      default: return;
    }

    this._commands.push({ type, values });
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
  getPathData() {
    return this._commands;
  }

  // stringified pathData
  getPathDataString() {
    return this._commands.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
  }

  getD() {
    return this._commands.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
  }


  // get lookup
  getPathLengthLookup(){
    if (typeof(getPathLengthLookup) !== 'function'){
      console.warn('getPathLengthLookup is not defined');
      return this._commands;
    }
    return getPathLengthLookup(this._commands);
  }
  
  // get lookup
  getPathLookup(){
    if (typeof(getPathLengthLookup) !== 'function'){
      console.warn('getPathLengthLookup is not defined');
      return this._commands;
    }
    return getPathLengthLookup(this._commands);
  }

}
