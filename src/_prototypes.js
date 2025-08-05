
import { parse } from './pathData_parse.js';
import { pathDataToD } from './stringify.js';
import { convertPathData } from './convert.js';
//import { pathDataCubicToArc } from './convert_segments.js';



export function Path(pathDataString = '', options = {}) {

    options = {
        ...{
            normalize: false,
            optimize: 1,
            toAbsolute: true,
            toRelative: false,
            quadraticToCubic: false,
            cubicToQuadratic: false,
            cubicToQuadraticPrecision: 0.1,
            lineToCubic: false,
            toLonghands: true,
            toShorthands: false,
            arcToCubic: false,
            arcParam: false,
            arcAccuracy: 1,
            decimals: -1,
            minify: 1
        },
        ...options
    }

    /**
    * quite aggressive normalization
    * compliant with pathData interface draft
    */
    if (options.normalize === true) {
        options.toAbsolute = true
        options.toLonghands = true
        options.arcToCubic = true
        options.quadraticToCubic = true
        options.toShorthands = false
    }

    /*
    if (options.optimize === 1) {
        options.toRelative = true
        options.toShorthands = true
        options.decimals = 3
    }
    */


    // parse path: check if normalizing is required
    let pathDataOriginal = parse(pathDataString);
    //console.log('pathDataOriginal', pathDataOriginal);

    let { pathData, hasRelatives, hasArcs, hasQuadratics, hasShorthands } = pathDataOriginal;

    /**
     * override normalizing options
     * if pathdata is already absolute and
     * doesn't have shorthands or arcs
     * no need for conversions
     */
    if (options.toAbsolute) options.toAbsolute = hasRelatives;
    if (options.toLonghands) options.toLonghands = hasShorthands
    if (options.quadraticToCubic) options.quadraticToCubic = hasQuadratics
    if (options.arcToCubic) options.arcToCubic = hasArcs

    //console.log('options.toLonghands', options.toLonghands);


    // save original properties
    this.pathDataO = pathData;
    this.hasRelatives = hasRelatives;
    this.hasArcs = hasArcs;
    this.hasQuadratics = hasQuadratics;
    this.hasShorthands = hasShorthands;

    //create normalized path
    let pathDataNormalized = convertPathData(pathData, options);


    this.pathDataN = pathDataNormalized;

    // processed path data - gets updated
    this.pathData = [];
    this.d = pathDataString
}



/** chainable prototype methods  */
Path.prototype.convert = function (options) {

    //console.log(this, options);
    // Clone the original normalized path data
    //let pathDataCon = this.pathDataN.map(cmd => ({ ...cmd }));
    let pathDataCon = JSON.parse(JSON.stringify(this.pathDataN));

    // Convert path data with options
    pathDataCon = convertPathData(pathDataCon, options);

    // Store the converted path separately
    this.pathData = pathDataCon;
    this.d = pathDataToD(this.pathData, options.optimize);

    return this;

}


// wrapper for stringified path data output
Path.prototype.toD = function (optimize = 1) {
    let pathData = this.pathData.length ? this.pathData : this.pathDataN;

    //console.log(pathData);
    this.d = pathDataToD(pathData, optimize);
    return this.d;
}

// just a convenience copy of "toD"
Path.prototype.toString = function (optimize = 1) {
    let pathData = this.pathData.length ? this.pathData : this.pathDataN;
    
    //console.log(pathData);
    this.d = pathDataToD(pathData, optimize);
    return this.d;
}
