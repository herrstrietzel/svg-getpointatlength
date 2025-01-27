[![npm version](https://img.shields.io/npm/v/svg-getpointatlength)](https://www.npmjs.com/package/svg-getpointatlength)



# svg-getpointatlength
Calculates a path's **length** or **points** as well as **tangent angles** at length based on raw pathdata strings.  
This library aims to work as a performant workaround to emulate natively supported browser methods `getTotalLength()` and `getPointAtLength()` in a non-rendered environment such as node or virtual DOM applications or canvas.  

**Features:**
This library provides methods to get:
* **path length** from raw SVG path data strings
* **point** coordinates at specified length
* **tangent angles** (handy for SVG motion path emulations)
* **segments** at length

The provided methods calculate points at lengths by measuring all segments lengths and saving them in a **reusable lookup object**.    

This way you can efficiently calculate hundreds of points on a path without sacrificing too much performance – unlike the quite expensive native `getPointAtlength()` method.

* [Usage](#usage)
  + [Browser](#browser)
  + [Node](#node)
* [Methods and options](#methods-and-options)  
  + [Options: get tangent angles or segments at point](#options-get-tangent-angles-or-segments-at-point)  
* [Updates and Versions](#updates-and-versions)
  + [Changelog](#changelog)
  + [Downgrading](#downgrading)
* [How it works](#how-it-works)
  + [Path data input](#path-data-input)
  + [Parsing options](#parsing-options)
* [Accuracy](#accuracy)
* [Performance](#performance)
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

or (unpkg.com version)

``` lang-html
<script src="https://www.unpkg.com/svg-getpointatlength@latest/getPointAtLengthLookup.js"></script>
```

or minified version (~ 12KB/6KB gzipped) 
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
If you only need to retrieve the total length of a path you can use the simplified helper  `getPathLengthFromD()`

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

## Methods and options
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

`lookup.pathLengthLookup.getPointAtLength(length, getTangent = false, getSegment = false)` returns an object like this 

```
{x: 10, y:20, index:segmentIndex, t:tValue}
```

### Options: get tangent angles or segments at point
Optionally you can also include tangent angles and segment indices (as well as self contained path data) from the current point-at-length:  

| method | options/agruments | description | default/values |
|--|--|--|--|
|`getPathLengthLookup(d, precision, onlyLength, getTangent )` |  `d` | A path data string or a already parsed path data array  | *none* |
| | `precision` | Specify accuracy for Bézier length calculations. This parameter sets the amount of length intermediate calculations. Default should work even for highly accurate calcuations. Legendre-Gauss approximation is already adaptive  | **`medium`**, `high`, `low` |
|  | `onlyLength`| skips the lookup creation and returns only the length of a path | `false` |
|  | `getTangent` | include tangent angles in lookup object (can improve performance)  | true   |
| `getPointAtLength()` | `length` | gets point at specified length   | *none* |
|  | `getTangent` | include tangent angles in point object (can improve performance)  | false   |
|  | `getSegment` | include segment info in object | false  |  

```
// select path
let path = document.querySelector('path')

// get path data attribute
let d = path.getAttribute('d')

// measure path, create lookup
let pathLengthLookup = getPathLengthLookup(d)

// get point, tangent and segment
let length = 100;
let getTangent = true;
let getSegment = true;
let pt = pathLengthLookup.getPointAtLength(length, getTangent, getSegment);

let tangentAngle = pt.angle;
let segmentIndex = pt.index;
let segmentCommand = pt.com;

```

The returned data object will look like this:  

```
{
    // tangent angle in radians
    angle: 1.123,

    // original command
    com: {type: 'A', values: Array(7), p0: {…}},

    // original command/segment index
    index: 1,

    // t value for target length
    t: 0.25,

    // point coordinates
    x: 10,
    y: 15,
}

```
See pointAtLength.html example in demos folder.

So you also have info about the current segment the length is in as well as the `t` value used to interpolate the point.  

## Updates and Versions

### Changelog
* Version 1.2.0 calculates elliptic arcs directly – removing arc to cubic conversion
* Version 1.1.0 improved performance for recurring point-at-length calculations, fixed tangent calculation bugs and added flat bezier edge cases
* Version 1.0.15 improved performance for recurring point-at-length calculations
* Version 1.0.13 added support for **tangent angles** at a specified length/point

### Downgrading
In case you encounter any problems with the latest versions you can just load a previous one like so:

``` lang-html
<script src="https://www.unpkg.com/svg-getpointatlength@1.0.12/getPointAtLengthLookup.js"></script>
```  
See npm repo for all [existing versions](https://www.npmjs.com/package/svg-getpointatlength?activeTab=versions)


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

Compared against reproducible/calculable objects/shapes like **circles** the methods provided by this library actually provide a more [accurate result](https://stackoverflow.com/questions/30277646/svg-convert-arcs-to-cubic-bezier/77538979#77538979). 

Cubic bezier length are approximated using [Legendre-Gauss quadrature](https://pomax.github.io/bezierinfo/legendre-gauss.html) integral approximation
Weights and Abscissae values are adjusted for long path segments.  

Elliptical Arc `A` commands are approximated also via Legendre-Gauss quadrature (new in version 1.2). Circular arcs are retained which improves speed and accuracy.

## Performance
Native `getPointAtLength()` browser implementations aren't well optimized for **recurring** point calculations as they start from scratch on each call (parsing, measuring, calculating point at length). To be fair: there is no trivial length calculation algorithm.  

Since this library stores all important length data segment by segment – subsequent point (or tangent angle) calculations are way faster than the native methods.  

| points | native | lookup |
|--|--|--|
|10| 2.1 ms | 2.1 ms |
|100| 21.1 ms | 2.2 ms |
|1000| 210 ms | 3.9 ms |
|10000| 2093.6 ms | 6.7 ms |

The lookup creation will usuall take up ~ 1-2ms (depending on the path).  
As you can see the lookup's setup overhead is already compensated at 10 iteration.
When we're entering a range of 100 or 1000 points the lookup method clearly wins whereas native `getPointAtLength()` severely impacts rendering performance.


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
* [get point, tangent and segment](https://codepen.io/herrstrietzel/pen/VYZXbwE?editors=1000)
* [get point at length – performance/accuracy](https://codepen.io/herrstrietzel/pen/WNWRroO)
* [get point and area](https://codepen.io/herrstrietzel/pen/wBwmdKv)  
* [path to polygon](https://codepen.io/herrstrietzel/pen/XWGddRm)
* [get length at point](https://codepen.io/herrstrietzel/pen/yyBKbNV)
* [point ant tangent angle on motion-path](https://codepen.io/herrstrietzel/pen/zxOmRYX?editors=1010)
* [scroll path](https://codepen.io/herrstrietzel/pen/qEWLaZx)

(See also demos folder)  



## Alternative libraries
* [Kaiido's "path2D-inspection"](https://github.com/Kaiido/path2D-inspection) – interesting if yo're foremost working with canvas   
* [rveciana's "svg-path-properties"](https://github.com/rveciana/svg-path-properties) 

## Credits
* [Mike 'Pomax' Kamermans](https://github.com/pomax) for explaining the theory. See Stackoverflow post ["Finding points on curves in HTML 5 2d Canvas context"](https://stackoverflow.com/questions/3570309/finding-points-on-curves-in-html-5-2d-canvas-context/#76773275)  
* [Vitaly Puzrin](https://github.com/puzrin) for [svgpath library](https://github.com/fontello/svgpath) providing for instance a great and customizable [arc-to-cubic approximation](https://github.com/fontello/svgpath/blob/master/lib/a2c.js) – the base for the more accurate arc-to-cubic approximations
* [Jarek Foksa](https://github.com/jarek-foksa) for developping the great [getPathData() polyfill](https://github.com/jarek-foksa/path-data-polyfill) – probably the most productive contributor to the ["new" W3C SVGPathData interface draft](https://svgwg.org/specs/paths/#InterfaceSVGPathData)
* obviously, [Dmitry Baranovskiy](https://github.com/dmitrybaranovskiy) – a lot of these helper functions originate either from Raphaël or snap.svg – or are at least heavily inspired by some helpers from these libraries


## Related Repositories/projects
* [svg-parse-path-normalized](https://github.com/herrstrietzel/svg-parse-path-normalized) – Parse path data from string including fine-grained normalizing options
* [fix-path-directions](https://github.com/herrstrietzel/fix-path-directions) – Correct sub path directions in compound path for apps that don't support fill-rules or just reverse path directions (e.g for path animations)
* [svg-pathdata-getbbox](https://github.com/herrstrietzel/svg-pathdata-getbbox) – Calculates a path bounding box based on its raw pathdata
* [svg-transform](https://github.com/herrstrietzel/svg-transform) – A library to transform or de-transform/flatten svg paths
