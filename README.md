[![npm version](https://img.shields.io/npm/v/svg-getpointatlength)](https://www.npmjs.com/package/svg-getpointatlength)
[![license](https://img.shields.io/npm/l/svg-getpointatlength)](https://www.npmjs.com/package/svg-getpointatlength)
[![CDN](https://img.shields.io/badge/CDN-jsDelivr-E84D3D?style=flat)](https://cdn.jsdelivr.net/npm/svg-getpointatlength@latest/dist/svg-getpointatlength.min.js)
[![CDN](https://img.shields.io/badge/CDN-unpkg-blue?style=flat)](https://www.unpkg.com/svg-getpointatlength@latest/dist/svg-getpointatlength.js)


<p align="center" style="text-align:center">
<img width="100" height="100" style="display:inline-block" src="./favicon.svg">
<h1 align="center">svg-getpointatlength</h1>
</p> 

Calculates a path's **length** or **points** as well as **tangent angles** at length based on raw pathdata strings.  
This library aims to work as a performant workaround to emulate natively supported browser methods `getTotalLength()` and `getPointAtLength()` in a non-rendered environment such as node or virtual DOM applications or canvas.  

**Features:**
This library provides methods to get:
* **path length** from raw SVG path data strings
* **point** coordinates at specified length
* **tangent angles** (handy for SVG motion path emulations)
* **segments** at length 
* **split segments at length** into separate path data chunks  
* **shape support**: length/point-at-length from elements  
* **get bounding box** 
* **area calculations**

The provided methods calculate points at lengths by measuring all segments lengths and saving them in a **reusable lookup object**.    

This way you can efficiently calculate hundreds of points on a path without sacrificing too much performance – unlike the quite expensive native `getPointAtlength()` method.

* [Usage](#usage)
  + [Browser](#browser)
    - [Length only](#length-only)
  + [ES module](#es-module)
  + [Node](#node)
* [Path data input](#path-data-input)
* [Canvas helper: Path2D_svg()](#canvas-helper-path2dsvg)
* [Methods and options](#methods-and-options)
  + [Options: get tangent angles or segments at point](#options-get-tangent-angles-or-segments-at-point)
  + [Get segments or split paths at length](#get-segments-or-split-paths-at-length)
    - [Get segment at length](#get-segment-at-length)
* [Get bounding box](#get-bounding-box)
* [Get Area](#get-area)
* [Split paths at length](#split-paths-at-length)
* [Minimal »lite« version](#minimal-lite-version)
  + [paths and shapes as input argument (New in version 1.3.0)](#paths-and-shapes-as-input-argument-new-in-version-130)
    - [Get path data from elements/shapes](#get-path-data-from-elements-shapes)
* [Updates and Versions](#updates-and-versions)
  + [Changelog](#changelog)
  + [Downgrading](#downgrading)
* [Accuracy](#accuracy)
* [Performance](#performance)
* [Addons](#addons)
  + [polygonFromPathData()](#polygonfrompathdata)
* [Report bugs](#report-bugs)
* [Demos](#demos)
* [Alternative libraries](#alternative-libraries)
* [Credits](#credits)
* [Related Repositories/projects](#related-repositories-projects)




## Usage
### Browser

Load JS locally or via cdn



```
// ESM
<script src="https://cdn.jsdelivr.net/npm/svg-getpointatlength@latest/+esm"></script>


// IIFE
<script src="https://cdn.jsdelivr.net/npm/svg-getpointatlength@latest/dist/svg-getpointatlength.min.js"></script>
```

or (unpkg.com version)

``` lang-html
<script src="https://www.unpkg.com/svg-getpointatlength@latest/dist/svg-getpointatlength.js"></script>
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

### ES module

``` 
<script type="module">

  // init
  import { getPathLookup } from 'svg-getpointatlength.esm.min.js';
  let lookup = getPathLookup(d)
  let pt = lookup.getPointAtLength(10)

</script>
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



## Path data input
`getPathLengthLookup(d)` accepts: 
* stringified path data (as used in `d` attributes)  
* an already parsed path data array – also native pathData object retrieved by `path.getPathData()` (natively supported in Firefox or via polyfill)
* SVGGeometry element (including shapes like `<rect>`, `<ellipse>`)
* SVG markup: all geometry elements are converted to path data
* polygon data:    
  + stringified as in `<polygon>` `points` attribute
  + vertex array like `[{x:1, y:2}, {x:3, y:4}]`
* cached lookup JSON: you can store the complete stringified lookup object as a JSON and pass it to the lookup function (handy to skip the complex measure process)


## Canvas helper: `Path2D_svg()`
Version 2 adds a custom class `Path2D_svg()` to retrieve lookup data from a `Path2D` object.  

```
const path = new Path2D_svg();
path.moveTo(350, 50);
path.bezierCurveTo(370, 0, 430, 100, 450, 50);

// get lookup
let lookup = path.getPathLookup();
let pt = lookup.getPointAtLength(10)

// get path data
let pathData = path.getPathData();

// stringified path data
let d = path.getPathDataString();
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
Optionally, you can also include tangent angles and segment indices (as well as self contained path data) from the current point-at-length:  

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


### Get segments or split paths at length

#### Get segment at length
`lookup.getSegmentAtLength(len)` returns the current segment's index as well as the path data:  

``` 
let seg = {
  x: 264.85,
  y: 53.947,
  angle: 1.36,
  d: "M 200 50 A 50 25 20 1 1 275 100",
  pathData: [{…}, {…}],
  t: 0.45,
  index: 3,
};

```

**Usage:**  
``` 
let segment = lookup.getSegmentAtLength(len);
let {pathData, d} = segment

// render current path segment
pathSeg.setAttribute('d', d)

```

## Get bounding box
Version 2 introduces a bounding box method which returns a bbox object similar to native SVG `getBBox()`.  
Once you call it the lookup is complemented with bounding box data for the entire path as well as dimensions for each segment.

```
let {x, y, width, height} = lookup.getBBox()
```


## Get Area
Version 2 adds an area calculation.  
This is also handy to get the drawing direction of a path or segment:  
* area < 0 = counter clockwise
* area > 0 = clockwise

```
let lookup = path.getPathLookup();

/** 
* adds area data to lookup
* for each segment
* total path area
*/
let area = lookup.getArea()
```

Alternatively you can get all area data calling `getSegmentAtLength()` 

```
let segmentData = lookup.getSegmentAtLength(10)
```

By default `getArea` parameter is enabled: 
`getSegmentAtLength(length = 0, getBBox = true, getArea=true, decimals=-1)`




## Split paths at length
`lookup.splitPathAtLength(len)` splits a path at the specified length and returns an object containing:  

* an array of path data chunks (before and after split position)
* an array of stringified pathdata - to be applied to  a `<path>` `d` attribute directly. See example "split.html".
* index of original segment   

``` 
{
 "pathDataArr": [
    [
      {"type": "M","values": [0, 100 ]},
      {"type": "Q","values": [50, 0, 100, 50]}
    ],
    [
      {"type": "M","values": [0, 100 ]},
      {"type": "Q","values": [50, 0, 100, 50]}
    ]
 ],
 "dArr": ["M 0 100 ...", "M 0 100 ..."],
 "index": 3
}

```

**Usage:**  
``` 
let splitPathData = lookup.splitPathAtLength(len)
let [d1, d2] = splitPathData.dArr;
```



## Minimal »lite« version
In case you can live without the fancy features introduced in version 2, you may also load the smaller version from the dist directory.  


```
<script src="../dist/svg-getpointatlength_lite.js"></script>
```

This version doesn't include helpers for:  
* area 
* bounding box 
* canvas 
* segment splitting

Otherwise it supports all features from version 1.3.x and is ~35–40% smaller.





### paths and shapes as input argument (New in version 1.3.0)

`getPathLengthLookup()` now also supports elements these SVGGeometryElements: 
* `<path>`
* `<rect>`
* `<circle>`
* `<ellipse>`
* `<polygon>`
* `<polyline>`
* `<line>`

relative units like `%` are also supported as long as a `viewBox` is provided. Physical units like `in`, `mm`, `pt`, `em` are converted to user units pixel based on a 96 dpi resolution.

```
let path = document.querySelector('path')

// measure path, create lookup
let pathLengthLookup = getPathLengthLookup(path);

// total length
let {totalLength} = pathLengthLookup;

// get point
let pt = pathLengthLookup.getPointAtLength(totalLength/2);
```

#### Get path data from elements/shapes
For usage in node.js you need a DOM parser like JSDOM.  
To retrieve the path data from an element use `getPathDataFromEl(el, stringify)` 

``` 
let ellipse = document.querySelector('ellipse');
let pathData = getPathDataFromEl(ellipse);

// measure path, create lookup
let pathLengthLookup = getPathLengthLookup(pathData);

// total length
let {totalLength} = pathLengthLookup;

// get point
let pt = pathLengthLookup.getPointAtLength(totalLength/2);
```

As of version 2 you can stringify the path data (for usage as a `d` path attribute) via new parameter:   
``` 
let stringify = true;
let pathDataString = getPathDataFromEl(el, stringify)
```





## Updates and Versions

### Changelog
* Version 2: 
  + improved input normalization: accepts SVG DOM elements, native pathData objects (retrieved from `getPathData()`) and point arrays
  + split paths at length: creates 2 separate selfcontained path data according to split position
* Version 1.3.1 fixes a rare parsing issue where 'M' commands were omitted (e.g `z` followed by another drawing command than `M` – unfortunately valid). See updated demo with "path-from-hell3" (... a pretty good stress test for any path data parser=). Thanks to [vboye-foreflight's PR](https://github.com/herrstrietzel/svg-getpointatlength/commit/ee035987b9ac7d5a8925190b59128206199779ae) we now get the point at last length whenever the input length exceeds the total length - compliant with native methods' behavior.
* Version 1.3.0 **support for shapes** (ellipse, circle, rect etc.)
* Version 1.2.4 fixed arc angle errors
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




### Path parser   

This library also includes a quite versatile parsing function that could be used separately.  

`parsePathDataNormalized(d, options)`
As length calculations are based on normalized path data values.  
All values are converted to absolute and longhand commands.  


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

## Report bugs
If you found a bug - feel free to file an issue. 
For debugging you may also test your path with this [**codepen testbed**](https://codepen.io/herrstrietzel/pen/VYZXbwE)


## Demos

You can easily test paths using the [web application](https://herrstrietzel.github.io/svg-getpointatlength): 


* [get point, tangent and segment](https://codepen.io/herrstrietzel/pen/VYZXbwE)
* [getPointAtlength: native vs. lookup](https://codepen.io/herrstrietzel/pen/KKEzdPd)
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
