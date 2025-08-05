import { parse } from './parse';
import { convertPathData } from './convert';
//import { simplifyPathData } from './simplify';
import { pathDataToD } from './stringify';

function SVGiiSimplify_core(d, {
    toAbsolute = false,
    toRelative = true,
    quadraticToCubic = false,
    toLonghands = false,
    toShorthands = true,
    arcToCubic = false,
    simplify = true,
    tolerance = 3,
    keepDetails = true,
    forceCubic=false, 
    cubicToArc= true,
    // maybe ditched
    multipass = false,
    cubicToQuadratic = false,
    cubicToQuadraticPrecision = 0.1,
    decimals = 'auto',
    minify = 1
} = {}) {

    let optionsNorm = {
        toAbsolute: true,
        toLonghands: true,
        arcToCubic: false
    }

    //let tolerance
    let pathData = parse(d).pathData;

    //normalize
    let pathDataNorm = convertPathData(pathData, optionsNorm);

    // clone
    let pathDataSimple = JSON.parse(JSON.stringify(pathDataNorm));

    let optionsSimple = {
        //simplifying
        simplify: simplify,
        tolerance: tolerance,
        keepDetails: keepDetails,
        forceCubic,
        cubicToArc,

        // minifying
        toShorthands: toShorthands,
        toRelative: toRelative,
        decimals: decimals,
        minify: minify,
        multipass
    }
    pathDataSimple = convertPathData(pathData, optionsSimple);

    // stringify
    let dSimple = pathDataToD(pathDataSimple);

    this.pathData = pathData;
    this.pathDataSimple = pathDataSimple;
    this.d = dSimple;
    //console.log('pathDataNorm', pathDataNorm, 'pathDataSimple', pathDataSimple, 'd', dSimple);
}

export { SVGiiSimplify_core as SVGiiSimplify };

// Self-executing function for IIFE
if (typeof window !== 'undefined') {
    window.SVGiiSimplify = SVGiiSimplify_core;
}


// just a convenience copy of "toD"
SVGiiSimplify.prototype.toString = function (optimize = 1) {
    let pathData = this.pathDataSimple.length ? this.pathDataSimple : this.pathData;
    
    //console.log(pathData);
    this.d = pathDataToD(pathData, optimize);
    return this.d;
}

// just a convenience copy of "toD"
SVGiiSimplify.prototype.getPathData = function () {
    let pathData = this.pathDataSimple.length ? this.pathDataSimple : this.pathData;
    return pathData;
}

// just a convenience copy of "toD"
SVGiiSimplify.prototype.getPathDataNorm = function () {
    return this.pathData;;
}


