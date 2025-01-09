[![npm version](https://img.shields.io/npm/v/svg-getpointatlength)](https://www.npmjs.com/package/svg-getpointatlength)



# svg-getpointatlength
Calculates a path's length or points at length based on raw pathdata.  
This library aims to work as a workaround to emulate natively supported browser methods `getTotalLength()` and `getPointAtLength()` in a non-rendered environment such as node or virtual DOM applications or canvas.  

The provided methods calculate points at lengths by measuring all segments lengths and saving them in a **reusable lookup object**.    

This way you can efficiently calculate hundreds of points on a path without sacrificing too much performance – unlike the quite expensive native `getPointAtlength()` method.

* [Usage](#usage)
  + [Browser](#browser)
  + [Node](#node)
* [How it works](#how-it-works)
  + [Path data input](#path-data-input)
  + [Parsing options](#parsing-options)
* [Accuracy](#accuracy)
* [Addons](#addons)
  + [polygonFromPathData()](#polygonfrompathdata)
* [Demos](#demos)
* [Alternative libraries](#alternative-libraries)
* [Credits](#credits)


## Usage
### Browser

Load JS locally or via cdn
```
<script src="https://cdn.jsdelivr.net/npm/svg-getpointatlength@latest/getPointAtLengthLookup.js"></script>
```

or minified version (~ 9KB/4KB gzipped) 
```
<script src="https://cdn.jsdelivr.net/npm/svg-getpointatlength@latest/getPointAtLengthLookup.min.js"></script>
```

**Example: calculate path length from pathData**  

```

let d = `M3,7 
        L13,7 
        m-20,10 
        l10,0 
        V27 
        H23 
        v10 
        h10
        C 33,43 38,47 43,47 
        c 0,5 5,10 10,10
        S 63,67 63,67       
        s -10,10 10,10
        Q 50,50 73,57
        q 20,-5 0,-10
        T 70,40
        t 0,-15
        A 5, 10 45 1040,20  
        a5,5 20 01 -10,-10
        Z `



// measure path and save metrics in lookup object
let pathLengthLookup = getPathLengthLookup(d)
let totalLength = pathLengthLookup.totalLength

console.log(totalLength)

// point at length
let pt = pathLengthLookup.getPointAtLength(totalLength/2)
console.log(pt)
```

#### Length only
If you only need to retrieve the total lenght of a path you can use the simplified helper  `getPathLengthFromD()`

```
// only length – slightly faster as we don't calculate intermediate lengths
let length = getPathLengthFromD(d)
console.log(length)
```


### Node  

```
npm install svg-getpointatlength
```

```
var pathDataLength = require("svg-getpointatlength");
var { getPathLengthLookup, getPathLengthFromD, getPathDataLength, getLength, parsePathDataNormalized } = pathDataLength;

let d = `M3,7 
        L13,7 
        m-20,10 
        l10,0 
        V27 
        H23 
        v10 
        h10
        C 33,43 38,47 43,47 
        c 0,5 5,10 10,10
        S 63,67 63,67       
        s -10,10 10,10
        Q 50,50 73,57
        q 20,-5 0,-10
        T 70,40
        t 0,-15
        A 5, 10 45 1040,20  
        a5,5 20 01 -10,-10
        Z `

// measure path and save metrics in lookup object
let pathLengthLookup = getPathLengthLookup(d)
let totalLength = pathLengthLookup.totalLength

console.log(totalLength)

// point at length
let pt = pathLengthLookup.getPointAtLength(totalLength/2)
console.log(pt)
```

## Methods
`getPathLengthLookup(d)` returns a lookup objects including reusable data about ech path segment as well as the total length.  

```
{
  "totalLength": path total length,
  "segments": [
   {
    //lengths calculated between t=0  to t=1 in 36 steps
    "lengths": [ length array ],
    "points": [ control point array ],
    "index": segment index,
    "total": segment length,
    "type": segment command type (c, q, l, a etc.),
   },
   //... subsequent segment info
  ]
}
```

`lookup.pathLengthLookup.getPointAtLength(length)` returns an object like this 

```
{x: 10, y:20, index:segmentIndex, t:tValue}
```

So you also have info about the current segment the length is in as well as the `t` value used to interpolate the point.  


## How it works
**Save path/segment metrics as a reusable lookup for further calculations**  

1. path data is parsed from a `d` string to get computable absolute values
2. the lookup stores   
        2.1 segement total lenghts   
        2.2 partial lengths at certain `t` intervals   
3. point at lengths are calculated by finding the closest length in the segment array  
Then we find the closest length in the length interval array. We interpolate a new `t` value based on the length difference to get a close length approximation


### Path data input
`getPathLengthLookup(d)` accepts stringified path data (as used in `d` attributes) or an already parsed path data array.  

This library also includes a quite versatile parsing function that could be used separately.  

`parsePathDataNormalized(d, options)`
As length calculations are based on normalized path data values.  
All values are converted to absolute and longhand commands.  

### Parsing options  

```
let options= {
    toAbsolute: true,         //necessary for most calculations
    toLonghands: true,        //dito
    arcToCubic: false,        //sometimes necessary
    arcAccuracy: 4,           //arc to cubic precision
}
```

| parameter | default | effect |
| -- | -- | -- |
| toAbsolute | true | convert all to absolute |
| toLonghands | true | convert all shorthands to longhands |
| arcToCubic | *false* | convert arcs `A` commands to cubic béziers |
| arcToCubic | 4 | arc to cubic precision – adds more cubic segments to improve length accuracy |


``` 
// get original path data: including relative and shorthand commands
let pathData_notNormalized = parsePathDataNormalized(d, {toAbsolute:false, toLonghands:false})

```


## Accuracy
In fact the native browser methods `getTotalLength()` and `getPointAtlength()` return different results in Firefox, chromium/blink and webkit.   

Compared against reproducible/calculable objects/shapes like circles the methods provided by this library actually provides a more [accurate result](https://stackoverflow.com/questions/30277646/svg-convert-arcs-to-cubic-bezier/77538979#77538979). 

Cubic bezier length are approximated using [Legendre-Gauss quadrature](https://pomax.github.io/bezierinfo/legendre-gauss.html) integral approximation
Weights and Abscissae values are adjusted for long path segments.  

Elliptical Arc `A` commands are converted to cubic approximations. Circular arcs are retained which improves speed and accuracy.


## Addons
### `polygonFromPathData()`
`getPointAtLengthLookup_getPolygon.js` includes a helper to generate polygons from path data retaining segemnt final on-path points  

```
<script src="https://cdn.jsdelivr.net/gh/herrstrietzel/svg-getpointatlength@main/getPointAtLengthLookup_getPolygon.js"></script>

```

```
let options = {
        // target vertice number
        vertices: 16,           
        // round coordinates
        decimals: 3,            
        // retain segment final points: retains shape
        adaptive: true,         
        // return polygon if path has only linetos
        retainPoly: true,       
        // find an adaptive close approximation based on a length difference threshold
        tolerance: 0            
}

let vertices = polygonFromPathData(pathData, options)

```

## Demos
* [getPointAtlength: native vs. lookup](https://codepen.io/herrstrietzel/pen/KKEzdPd)
* [Get point at length – performance/accuracy](https://codepen.io/herrstrietzel/pen/WNWRroO)
* [path to polygon](https://codepen.io/herrstrietzel/pen/XWGddRm)



## Alternative libraries
* [Kaiido's "path2D-inspection"](https://github.com/Kaiido/path2D-inspection) – interesting if yo're foremost working with canvas   
* [rveciana's "svg-path-properties"](https://github.com/rveciana/svg-path-properties) 

## Credits
* Mike 'Pomax' Kamermans for explaining the theory. See Stackoverflow post ["Finding points on curves in HTML 5 2d Canvas context"](https://stackoverflow.com/questions/3570309/finding-points-on-curves-in-html-5-2d-canvas-context/#76773275)  
* obviously, Dmitry Baranovskiy – a lot of these helper functions originate either from Raphaël or snap.svg – or are at least heavily inspired by some helpers from these libraries
* Jarek Foksa for developping the great [getPathData() polyfill](https://github.com/jarek-foksa/path-data-polyfill) – probably the most productive contributor to the ["new" W3C SVGPathData interface draft](https://svgwg.org/specs/paths/#InterfaceSVGPathData).
* puzrin's for [svgpath library](https://github.com/fontello/svgpath) providing for instance a great [arc-to-cubic approximation](https://github.com/fontello/svgpath/blob/master/lib/a2c.js) 
