import { pathDataToAbsoluteOrRelative, pathDataToLonghands, cubicToArc } from './pathData_convert.js';
import { parse, parsePathDataNormalized } from './pathData_parse.js';


// retrieve pathdata from svg geometry elements
export function getPathDataFromEl(el) {

    let pathData = [];
    let type = el.nodeName;
    let atts, attNames, d, x, y, width, height, r, rx, ry, cx, cy, x1, x2, y1, y2;

    // convert relative or absolute units 
    const svgElUnitsToPixel = (el, decimals = 9) => {
        //console.log(this);
        const svg = el.nodeName !== "svg" ? el.closest("svg") : el;

        // convert real life units to pixels
        const translateUnitToPixel = (value) => {

            if (value === null) {
                return 0
            }
            //default dpi = 96
            let dpi = 96;
            let unit = value.match(/([a-z]+)/gi);
            unit = unit ? unit[0] : "";
            let val = parseFloat(value);
            let rat;

            // no unit - already pixes/user unit
            if (!unit) {
                return val;
            }

            switch (unit) {
                case "in":
                    rat = dpi;
                    break;
                case "pt":
                    rat = (1 / 72) * 96;
                    break;
                case "cm":
                    rat = (1 / 2.54) * 96;
                    break;
                case "mm":
                    rat = ((1 / 2.54) * 96) / 10;
                    break;
                // just a default approximation
                case "em":
                case "rem":
                    rat = 16;
                    break;
                default:
                    rat = 1;
            }
            let valuePx = val * rat;
            return +valuePx.toFixed(decimals);
        };

        // svg width and height attributes
        let width = svg.getAttribute("width");
        width = width ? translateUnitToPixel(width) : 300;
        let height = svg.getAttribute("height");
        height = width ? translateUnitToPixel(height) : 150;

        //prefer viewBox values
        let vB = svg.getAttribute("viewBox");
        vB = vB
            ? vB
                .replace(/,/g, " ")
                .split(" ")
                .filter(Boolean)
                .map((val) => {
                    return +val;
                })
            : [];

        let w = vB.length ? vB[2] : width;
        let h = vB.length ? vB[3] : height;
        let scaleX = w / 100;
        let scaleY = h / 100;
        let scalRoot = Math.sqrt((Math.pow(scaleX, 2) + Math.pow(scaleY, 2)) / 2);

        let attsH = ["x", "width", "x1", "x2", "rx", "cx", "r"];
        let attsV = ["y", "height", "y1", "y2", "ry", "cy"];


        let atts = el.getAttributeNames();
        atts.forEach((att) => {
            let val = el.getAttribute(att);
            let valAbs = val;
            if (attsH.includes(att) || attsV.includes(att)) {
                let scale = attsH.includes(att) ? scaleX : scaleY;
                scale = att === "r" && w != h ? scalRoot : scale;
                let unit = val.match(/([a-z|%]+)/gi);
                unit = unit ? unit[0] : "";
                if (val.includes("%")) {
                    valAbs = parseFloat(val) * scale;
                }
                //absolute units
                else {
                    valAbs = translateUnitToPixel(val);
                }
                el.setAttribute(att, +valAbs);
            }
        });
    }

    svgElUnitsToPixel(el)

    const getAtts = (attNames) => {
        atts = {}
        attNames.forEach(att => {
            atts[att] = +el.getAttribute(att)
        })
        return atts
    }

    switch (type) {
        case 'path':
            d = el.getAttribute("d");
            pathData = parsePathDataNormalized(d);
            break;

        case 'rect':
            attNames = ['x', 'y', 'width', 'height', 'rx', 'ry'];
            ({ x, y, width, height, rx, ry } = getAtts(attNames));


            if (!rx && !ry) {
                pathData = [
                    { type: "M", values: [x, y] },
                    { type: "L", values: [x + width, y] },
                    { type: "L", values: [x + width, y + height] },
                    { type: "L", values: [x, y + height] },
                    { type: "Z", values: [] }
                ];
            } else {

                if (rx > width / 2) {
                    rx = width / 2;
                }
                if (ry > height / 2) {
                    ry = height / 2;
                }
                pathData = [
                    { type: "M", values: [x + rx, y] },
                    { type: "L", values: [x + width - rx, y] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x + width, y + ry] },
                    { type: "L", values: [x + width, y + height - ry] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x + width - rx, y + height] },
                    { type: "L", values: [x + rx, y + height] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x, y + height - ry] },
                    { type: "L", values: [x, y + ry] },
                    { type: "A", values: [rx, ry, 0, 0, 1, x + rx, y] },
                    { type: "Z", values: [] }
                ];
            }
            break;

        case 'circle':
        case 'ellipse':

            attNames = ['cx', 'cy', 'rx', 'ry', 'r'];
            ({ cx, cy, r, rx, ry } = getAtts(attNames));

            if (type === 'circle') {
                r = r;
                rx = r
                ry = r
            } else {
                rx = rx ? rx : r;
                ry = ry ? ry : r;
            }

            pathData = [
                { type: "M", values: [cx + rx, cy] },
                { type: "A", values: [rx, ry, 0, 1, 1, cx - rx, cy] },
                { type: "A", values: [rx, ry, 0, 1, 1, cx + rx, cy] },
            ];

            break;
        case 'line':
            attNames = ['x1', 'y1', 'x2', 'y2'];
            ({ x1, y1, x2, y2 } = getAtts(attNames));
            pathData = [
                { type: "M", values: [x1, y1] },
                { type: "L", values: [x2, y2] }
            ];
            break;
        case 'polygon':
        case 'polyline':

            let points = el.getAttribute('points').replaceAll(',', ' ').split(' ').filter(Boolean)

            for (let i = 0; i < points.length; i += 2) {
                pathData.push({
                    type: (i === 0 ? "M" : "L"),
                    values: [+points[i], +points[i + 1]]
                });
            }
            if (type === 'polygon') {
                pathData.push({
                    type: "Z",
                    values: []
                });
            }
            break;
    }

    return pathData;
};