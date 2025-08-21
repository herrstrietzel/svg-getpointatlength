//import { arcToBezier, quadratic2Cubic } from './convert.js';
//import { getAngle, bezierhasExtreme, getDistance  } from "./geometry";
import { pathDataToAbsoluteOrRelative, pathDataToLonghands, pathDataArcsToCubics, pathDataQuadraticToCubic } from './pathData_convert.js';



/**
 * parse normalized
 */

export function normalizePathData(pathData = [],
    {
        toAbsolute = true,
        toLonghands = true,
        quadraticToCubic = false,
        arcToCubic = false,
        arcAccuracy = 4,
    } = {},

    {
        hasRelatives = true, hasShorthands = true, hasQuadratics = true, hasArcs = true, testTypes = false
    } = {}
) {

    // pathdata properties - test= true adds a manual test 
    if (testTypes) {
        //console.log('test for conversions');
        let commands = Array.from(new Set(pathData.map(com => com.type))).join('');
        hasRelatives = /[lcqamts]/gi.test(commands);
        hasQuadratics = /[qt]/gi.test(commands);
        hasArcs = /[a]/gi.test(commands);
        hasShorthands = /[vhst]/gi.test(commands);
        isPoly = /[mlz]/gi.test(commands);
    }


    /**
     * normalize:
     * convert to all absolute
     * all longhands
     */

    if ((hasQuadratics && quadraticToCubic) || (hasArcs && arcToCubic)) {
        toLonghands = true
        toAbsolute = true
    }

    if (hasRelatives && toAbsolute) pathData = pathDataToAbsoluteOrRelative(pathData, false);
    if (hasShorthands && toLonghands) pathData = pathDataToLonghands(pathData, -1, false);
    if (hasArcs && arcToCubic) pathData = pathDataArcsToCubics(pathData, arcAccuracy);
    if (hasQuadratics && quadraticToCubic) pathData = pathDataQuadraticToCubic(pathData);

    return pathData;

}

export function parsePathDataNormalized(d,
    {
        // necessary for most calculations
        toAbsolute = true,
        toLonghands = true,

        // not necessary unless you need cubics only
        quadraticToCubic = false,

        // mostly a fallback if arc calculations fail      
        arcToCubic = false,
        // arc to cubic precision - adds more segments for better precision     
        arcAccuracy = 4,
    } = {}
) {


    let pathDataObj = parsePathDataString(d);
    let { hasRelatives, hasShorthands, hasQuadratics, hasArcs } = pathDataObj;
    let pathData = pathDataObj.pathData;

    // normalize
    pathData = normalizePathData(pathData,
        { toAbsolute, toLonghands, quadraticToCubic, arcToCubic, arcAccuracy },
        //{test:true}
        { hasRelatives, hasShorthands, hasQuadratics, hasArcs }
    )

    return pathData;
}


const commandSet = new Set([
    0x4D, 0x6D, 0x41, 0x61, 0x43, 0x63,
    0x4C, 0x6C, 0x51, 0x71, 0x53, 0x73,
    0x54, 0x74, 0x48, 0x68, 0x56, 0x76,
    0x5A, 0x7A
]);

const paramCountsArr = new Uint8Array(128);
// M starting point
paramCountsArr[0x4D] = 2;
paramCountsArr[0x6D] = 2;

// A Arc
paramCountsArr[0x41] = 7
paramCountsArr[0x61] = 7

// C Cubic Bézier
paramCountsArr[0x43] = 6
paramCountsArr[0x63] = 6

// L Line To
paramCountsArr[0x4C] = 2
paramCountsArr[0x6C] = 2

// Q Quadratic Bézier
paramCountsArr[0x51] = 4
paramCountsArr[0x71] = 4

// S Smooth Cubic Bézier
paramCountsArr[0x53] = 4
paramCountsArr[0x73] = 4

// T Smooth Quadratic Bézier
paramCountsArr[0x54] = 2
paramCountsArr[0x74] = 2

// H Horizontal Line
paramCountsArr[0x48] = 1
paramCountsArr[0x68] = 1

// V Vertical Line
paramCountsArr[0x56] = 1
paramCountsArr[0x76] = 1

// Z Close Path
paramCountsArr[0x5A] = 0
paramCountsArr[0x7A] = 0



export function parsePathDataString(d, debug = true) {

    d = d.trim();

    const SPECIAL_SPACES = new Set([
        0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
        0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF
    ]);


    const isSpace = (ch) => {
        return (ch === 0x20) || (ch === 0x002C) || // White spaces or comma
            (ch === 0x0A) || (ch === 0x0D) ||   // nl cr
            (ch === 0x2028) || (ch === 0x2029) || // Line terminators
            (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
            (ch >= 0x1680 && SPECIAL_SPACES.has(ch));
    }


    let i = 0, len = d.length;
    let lastCommand = "";
    let pathData = [];
    let itemCount = -1;
    let val = '';
    let wasE = false;
    let floatCount = 0;
    let valueIndex = 0;
    let maxParams = 0;
    let needsNewSegment = false;
    let foundCommands = new Set([]);


    // collect errors 
    let log = [];
    let feedback;

    const addSeg = () => {
        // Create new segment if needed before adding the minus sign
        if (needsNewSegment) {

            // sanitize implicit linetos
            if (lastCommand === 'M') lastCommand = 'L';
            else if (lastCommand === 'm') lastCommand = 'l';

            pathData.push({ type: lastCommand, values: [] });

            itemCount++;
            valueIndex = 0;
            needsNewSegment = false;
        }
    }

    const pushVal = (checkFloats = false) => {

        // regular value or float
        if (!checkFloats ? val !== '' : floatCount > 0) {

            // error: no first command
            if (debug && itemCount === -1) {

                feedback = 'Pathdata must start with M command'
                log.push(feedback)

                // add M command to collect subsequent errors
                lastCommand = 'M'
                pathData.push({ type: lastCommand, values: [] });
                maxParams = 2;
                valueIndex = 0
                itemCount++

            }

            if (lastCommand === 'A' || lastCommand === 'a') {
                val = sanitizeArc()
                //console.log('arc', val);
                pathData[itemCount].values.push(...val);

            } else {
                // error: leading zeroes
                if (debug && val[1] && val[1] !== '.' && val[0] === '0') {
                    feedback = `${itemCount}. command: Leading zeros not valid: ${val}`
                    log.push(feedback)
                }
                pathData[itemCount].values.push(+val);
            }

            valueIndex++;
            val = '';
            floatCount = 0;

            // Mark that a new segment is needed if maxParams is reached
            needsNewSegment = valueIndex >= maxParams;

        }
    }

    const sanitizeArc = () => {

        let valLen = val.length;
        let arcSucks = false;

        // large arc and sweep
        if (valueIndex === 3 && valLen === 2) {
            //console.log('large arc sweep combined', val, +val[0], +val[1]);
            val = [+val[0], +val[1]];
            arcSucks = true
            valueIndex++
        }

        // sweep and final
        else if (valueIndex === 4 && valLen > 1) {
            //console.log('sweep and final', val, val[0], val[1]);
            val = [+val[0], +val[1]];
            arcSucks = true
            valueIndex++
        }

        // large arc, sweep and final pt combined
        else if (valueIndex === 3 && valLen >= 3) {
            //console.log('large arc, sweep and final pt combined', val);
            val = [+val[0], +val[1], +val.substring(2)];
            arcSucks = true
            valueIndex += 2
        }

        //console.log('val arc', val);
        return !arcSucks ? [+val] : val;

    }

    const validateCommand = () => {

        if (itemCount > 0) {
            let lastCom = pathData[itemCount];
            let valLen = lastCom.values.length;

            if ((valLen && valLen < maxParams) || (valLen && valLen > maxParams) || ((lastCommand === 'z' || lastCommand === 'Z') && valLen > 0)) {
                let diff = maxParams - valLen;
                feedback = `${itemCount}. command of type "${lastCommand}": ${diff} values too few - ${maxParams} expected`;

                let prevFeedback = log[log.length - 1];

                if (prevFeedback !== feedback) {
                    log.push(feedback)
                }
            }
        }
    }


    let isE = false;
    let isMinusorPlus = false;
    let isDot = false;


    while (i < len) {

        let charCode = d.charCodeAt(i);

        let isDigit = (charCode > 47 && charCode < 58);
        if (!isDigit) {
            isE = (charCode === 101 || charCode === 69);
            isMinusorPlus = (charCode === 45 || charCode === 43);
            isDot = charCode === 46;
        }

        /**
         * number related:
         * digit, e-notation, dot or -/+ operator
         */

        if (
            isDigit ||
            isMinusorPlus ||
            isDot ||
            isE
        ) {


            // minus or float/dot separated: 0x2D=hyphen; 0x2E=dot
            if (!wasE && (charCode === 0x2D || charCode === 0x2E)) {

                // checkFloats changes condition for value adding
                let checkFloats = charCode === 0x2E;

                // new val
                pushVal(checkFloats);

                // new segment
                addSeg()

                // concatenated floats
                if (checkFloats) {
                    floatCount++;
                }
            }


            // regular splitting
            else {
                //console.log('reg', d[i]);
                addSeg()
            }

            //isNumber
            val += d[i];

            // e/scientific notation in value
            wasE = isE;
            i++;
            continue;
        }


        /**
         * Separated by white space 
         */
        if ((charCode < 48 || charCode > 5759) && isSpace(charCode)) {

            // push value
            pushVal()

            i++;
            continue;
        }


        /**
         * New command introduced by
         * alphabetic A-Z character
         */
        if (charCode > 64) {

            // is valid command
            let isValid = commandSet.has(charCode);

            if (!isValid) {
                feedback = `${itemCount}. command "${d[i]}" is not a valid type`;
                log.push(feedback);
                i++
                continue
            }


            // command is concatenated without whitespace
            if (val !== '') {
                pathData[itemCount].values.push(+val);
                valueIndex++;
                val = '';
            }

            // check if previous command was correctly closed
            if (debug) validateCommand()


            lastCommand = d[i];
            maxParams = paramCountsArr[charCode];
            let isM = lastCommand === 'M' || lastCommand === 'm'
            let wasClosePath = itemCount > 0 && (pathData[itemCount].type === 'z' || pathData[itemCount].type === 'Z')

            foundCommands.add(lastCommand);

            // add omitted M command after Z
            if (wasClosePath && !isM) {
                pathData.push({ type: 'm', values: [0, 0] });
                itemCount++;
            }

            // init new command
            pathData.push({ type: lastCommand, values: [] });
            itemCount++;

            // reset counters
            floatCount = 0;
            valueIndex = 0;
            needsNewSegment = false;

            i++;
            continue;
        }


        // exceptions - prevent infinite loop
        if (!isDigit) {
            feedback = `${itemCount}. ${d[i]} is not a valid separarator or token`;
            log.push(feedback);
            val = '';
        }

        i++;

    }

    // final value
    pushVal()
    if (debug) validateCommand()


    // return error log
    if (debug && log.length) {
        feedback = 'Invalid path data:\n' + log.join('\n')
        if (debug === 'log') {
            console.log(feedback);
        } else {
            throw new Error(feedback)
        }
    }

    pathData[0].type = 'M'

    /**
     * check if absolute/relative or 
     * shorthands are present
     * to specify if normalization is required
     */
    //check types relative arcs or quadratics
    let commands = Array.from(foundCommands).join('');
    let hasRelatives = /[lcqamts]/g.test(commands);
    let hasShorthands = /[vhst]/gi.test(commands);
    let hasArcs = /[a]/gi.test(commands);
    let hasQuadratics = /[qt]/gi.test(commands);


    return {
        pathData,
        hasRelatives,
        hasShorthands,
        hasQuadratics,
        hasArcs
    }

}



export function stringifyPathData(pathData) {
    return pathData.map(com => { return `${com.type} ${com.values.join(' ')}` }).join(' ');
}

