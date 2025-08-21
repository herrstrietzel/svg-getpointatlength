
/**
 * define ui inputs
 */

let fieldsInput = [

    
    {
        // just a info box
        info: `<p class="txt-cnt mrg-0-5em mrg-btt">
        <img class="icn-svg icn-logo dsp-inl-blc fnt-siz-2em" src="./favicon.svg">
        </p>
        <h1 class="h2">svg-getpointatlength</h1>
        <p>Calculates a path's length or points as well as tangent angles at length based on raw pathdata
            strings.
        </p>
        <div class="input-group input-group-"><button class="btn btn-default input-button" id="btnReset"><svg
                    viewBox="0 0 112 100" class="icn-svg icn-reload ">
                    <use href="#icn-reload"></use>
                </svg> Reset settings</button></div>       
        `,
    
    },

    {
        fields:[

            {
                label: 'Load Samples',
                name: 'selectSamples',
                type: 'select',
                values: [],
                sync: 'inputPath',
                atts: {
                    // get selects from var
                    //'data-source': 'demo/samples.json',
                    //'data-var': 'samples',
                    //readonly:true
                }
            },

            {
                info: 'Enter path data strings, point strings or SVG markup',
            },


            {
                label: 'Input',
                name: 'inputPath',
                type: 'textarea',
                defaults: `M 65.8 65.7 A 50 25 -45 0 0 100 40`,
                atts: {
                    accept: '.txt, .json, .svg',
                    placeholder: 'Enter your input',
                    class: 'input-points code brd-non scrollbar scroll-content fnt-siz-0-75em',
                    'data-tools': 'size copy upload',
                }
            },
        ]
    }, 

    {
        fields: [
            {
                label: 'inputLength',
                name: 'inputLength',
                type: 'range',
                defaults: [25],
                atts: {
                    //'value': 25,
                    'min': 0,
                    'max': 100,
                    'step': 0.1
                }
            },

            {
                label: 'Quality',
                name: 'quality',
                type: 'radio',
                defaults: ['medium'], 
                values: {
                    'low': 'low',
                    'medium': 'medium',
                    'high': 'high',
                }
            }, 

            {
                label: 'Normalization',
                name: 'normalization',
                type: 'checkbox',
                //defaults: ['showMarkers', 'showFill'],
                values: {
                    'arcToCubic': 'arcToCubic',
                    'quadraticToCubic': 'quadraticToCubic',
                }

            },
        ]
    }

];



let fieldsOutput = [
    {
        fields: [



            {
                info: `<h3 class="h4 label-block">Lengths and points</h3>
                <div id="reportLength" class="p-report  reportLength --max-hgh-10em pdd-0-5em brd brd-rad scroll-content scrollbar"></div>`
            },



            {
                info: `<h3 class="h4 label-block">Bounding boxes</h3>
                <div id="reportBB" class="p-report reportBB brd brd-rad pdd-0-5em"></div>`

            },

            {
                //label: 'Bounding boxes',
                name: 'showBoungingBoxes',
                type: 'checkbox',
                //defaults: ['showMarkers', 'showFill'],
                values: {
                    'showBB': 'showBB',
                    'showBBSeg': 'showBBSeg',
                },
            },


            {
                info: `<h3 class="h4 label-block">Segment</h3>
                <div id="reportSegment" class="p-report reportSegment brd brd-rad pdd-0-5em"></div>`

            },


            /*
            {
                label: 'Preview rendering',
                name: 'previewRendering',
                type: 'checkbox',
                defaults: ['showMarkers', 'showFill'],
                values: {
                    'showMarkers': 'showMarkers',
                    'showFill': 'showFill',
                }
            },


            {
                name: 'svgOutput',
                label: 'SVG',
                type: 'textarea',
                readonly: true,
                atts: {
                    readonly: true,
                    id: 'svgOutput',
                    class: 'input-output code brd-non scrollbar scroll-content fnt-siz-0-75em',
                    'data-file': 'poly.svg',
                    'data-tools': 'size copy download'
                }
            },
            */


        ]
    }
];
