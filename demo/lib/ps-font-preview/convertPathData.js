


function opentypePath2pathData(path) {
    let commands = path.commands;
    let pathData = [];
    let valuesPrev = '';
    let lastMValString = Object.values(commands[0]).slice(1).join('_');

    for(let i=0; i<commands.length; i++){
        let com = commands[i];
        let type = com.type;
        let values = Object.values(com).slice(1);
        let valuesStr = type!=='Z' ? values.slice(-2).join('_') : valuesPrev;

        if(type==='M'){
            lastMValString = valuesStr;
        }

        // skip closepath commands if path is already closed
        if(type==='Z' && lastMValString === valuesStr ){
            continue
        }

        // remove unnecessary linetos
        if ( !valuesPrev || valuesStr !== valuesPrev ) {
            pathData.push({ type: com.type, values: values })
        }
        valuesPrev = valuesStr;
    }
    return pathData;
}



function stringifyPathData(pathData){
    let d='';
    let lastType = 'M';
    pathData.forEach((com,i)=>{

        let {type, values} = com;
        let typeStr= i>1 && type===lastType ? '' : type;
        let separator= !typeStr ? ' ' : '';
        d += `${separator}${typeStr}${values.join(' ')}`;
        lastType = type;
    });

    d = d.replaceAll(" 0.", " .")
    .replaceAll(" -", "-")
    .replaceAll("-0.", "-.")
    .replaceAll("Z", "z");

    return d;

}



// convert to relative commands
function pathDataToRelative(pathData, decimals = -1) {


    // pre round to avoid distortions
    pathData = decimals>-1 ? roundPathData(pathData, decimals) : pathData;

    let M = pathData[0].values;
    let x = M[0],
        y = M[1],
        mx = x,
        my = y;


    // loop through commands
    for (let i = 1; i < pathData.length; i++) {
        let com = pathData[i];

        let { type, values } = com;
        let typeRel = type.toLowerCase();

        // is absolute
        if (type != typeRel) {
            type = typeRel;
            com.type = type;
            // check current command types
            switch (typeRel) {

                case "v":
                    values[0] = +(values[0] - y);
                    break;

                /*
                case "h":
                    values[0] = +(values[0] - x);
                    break;
                    */

                case "m":
                    mx = values[0];
                    my = values[1];
                default:
                    // other commands
                    if (values.length) {
                        for (let v = 0; v < values.length; v++) {
                            // even value indices are y coordinates
                            values[v] = values[v] - (v % 2 ? y : x);
                        }
                    }
            }
        }


        let vLen = values.length;
        switch (type) {
            case "z":
                x = mx;
                y = my;
                break;
            case "h":
                x += values[vLen - 1];
                break;
            case "v":
                y += values[vLen - 1];
                break;
            default:
                x += values[vLen - 2];
                y += values[vLen - 1];
        }        
        // round final relative values
        if (decimals > -1) {
            com.values = com.values.map(val => { return +val.toFixed(decimals) })
        }
    }
    return pathData;
}

function roundPathData(pathData, decimals = -1) {
    pathData.forEach((com, c) => {
        if (decimals >= 0) {
            com.values.forEach((val, v) => {
                pathData[c].values[v] = +val.toFixed(decimals);
            });
        }
    });
    return pathData;
}




    /**
    * apply shorthand commands if possible
    * L, L, C, Q => H, V, S, T
    * reversed method: pathDataToLonghands()
    */
    function pathDataToShorthands(pathData) {

        let comShort = {
            type: "M",
            values: pathData[0].values
        };
        let pathDataShorts = [comShort];

        for (let i = 1; i < pathData.length; i++) {
            let com = pathData[i];
            let { type, values } = com;
            let valuesL = values.length;
            let comPrev = pathData[i - 1];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;
            let [x, y] = [values[valuesL - 2], values[valuesL - 1]];
            let cp1X, cp1Y, cp2X, cp2Y;
            let [prevX, prevY] = [
                valuesPrev[valuesPrevL - 2],
                valuesPrev[valuesPrevL - 1]
            ];
            let val0R, cpN1XR, val1R, cpN1YR, cpN1X, cpN1Y, cpN2X, cpN2Y, prevXR, prevYR;

            switch (type) {
                case "L":
                    // round coordinates for some tolerance
                    [val0R, prevXR, val1R, prevYR] = [
                        values[0],
                        prevX,
                        values[1],
                        prevY
                    ]

                    if (comPrev.type !== 'H' && comPrev.type !== 'V') {
                        [val0R, prevXR, val1R, prevYR] = [val0R, prevXR, val1R, prevYR].map((val) => {
                            return +(val).toFixed(2);
                        });
                    }

                    if (prevYR == val1R && prevXR !== val0R) {
                        comShort = {
                            type: "H",
                            values: [values[0]]
                        };
                    } else if (prevXR == val0R && prevYR !== val1R) {
                        comShort = {
                            type: "V",
                            values: [values[1]]
                        };
                    } else {
                        comShort = com;
                    }
                    break;
                case "Q":
                    [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                    [prevX, prevY] = [
                        valuesPrev[valuesPrevL - 2],
                        valuesPrev[valuesPrevL - 1]
                    ];
                    // Q control point
                    cpN1X = prevX + (prevX - cp1X);
                    cpN1Y = prevY + (prevY - cp1Y);

                    /**
                    * control points can be reflected
                    * use rounded values for better tolerance
                    */
                    [val0R, cpN1XR, val1R, cpN1YR] = [
                        values[0],
                        cpN1X,
                        values[1],
                        cpN1Y
                    ].map((val) => {
                        return +(val).toFixed(1);
                    });

                    if (val0R == cpN1XR && val1R == cpN1YR) {
                        comShort = {
                            type: "T",
                            values: [x, y]
                        };
                    } else {
                        comShort = com;
                    }
                    break;
                case "C":
                    [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                    [cp2X, cp2Y] =
                        valuesPrevL > 2 ?
                            [valuesPrev[2], valuesPrev[3]] :
                            [valuesPrev[0], valuesPrev[1]];
                    [prevX, prevY] = [
                        valuesPrev[valuesPrevL - 2],
                        valuesPrev[valuesPrevL - 1]
                    ];
                    // C control points
                    cpN1X = 2 * prevX - cp2X;
                    cpN1Y = 2 * prevY - cp2Y;
                    cpN2X = values[2];
                    cpN2Y = values[3];

                    /**
                    * control points can be reflected
                    * use rounded values for better tolerance
                    */
                    [val0R, cpN1XR, val1R, cpN1YR] = [
                        values[0],
                        cpN1X,
                        values[1],
                        cpN1Y
                    ].map((val) => {
                        return +(val).toFixed(1);
                    });

                    if (val0R == cpN1XR && val1R == cpN1YR) {
                        comShort = {
                            type: "S",
                            values: [cpN2X, cpN2Y, x, y]
                        };
                    } else {
                        comShort = com;
                    }
                    break;
                default:
                    comShort = {
                        type: type,
                        values: values
                    };
            }

            pathDataShorts.push(comShort);
        }
        return pathDataShorts;
    }