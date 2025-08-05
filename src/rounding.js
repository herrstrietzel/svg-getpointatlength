
/**
 * detect suitable floating point accuracy
 * for further rounding/optimizations
 */

export function detectAccuracy(pathData) {

    // Reference first MoveTo command (M)
    let M = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p0 = { ...M };
    pathData[0].decimals = 0
    let lastDec = 0;
    let maxDecimals = 0

    for (let i = 1, len = pathData.length; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;

        let lastVals = values.length ? values.slice(-2) : [M.x, M.y];
        let lastX = lastVals[0];
        let lastY = lastVals[1];

        if (type === 'Z' || type === 'z') {
            lastX = M.x;
            lastY = M.y;
        }

        let w = Math.abs(p0.x - lastX);
        let h = Math.abs(p0.y - lastY);
        let dimA = (w + h) / 2 || 0;


        // Determine decimal places dynamically
        let decimals = (type !== 'Z' && type !== 'z') ? Math.ceil((1 / dimA)).toString().length + 1 : 0;

        //console.log(type, dimA, decimals);


        if (dimA === 0) {
            //console.log('zero length');
            decimals = lastDec;
        }

        else if (decimals && dimA < 0.5) {
            decimals++
        }

        //console.log('dimA', type, dimA, decimals);


        // Update previous coordinates
        p0 = { x: lastX, y: lastY };

        // Track MoveTo for closing paths
        if (type === 'M') {
            M = { x: values[0], y: values[1] };
            com.decimals = decimals;
        } else {

            // Store ideal precision for next pass
            com.decimals = decimals;

        }

        maxDecimals = decimals > maxDecimals ? decimals : maxDecimals;
        lastDec = decimals;
    }

    // set max decimal for M
    pathData[0].decimals = maxDecimals
    return pathData
}


/**
 * round path data
 * either by explicit decimal value or
 * based on suggested accuracy in path data
 */
export function roundPathData(pathData, decimals = -1) {
    // has recommended decimals
    let hasDecimal = decimals == 'auto' && pathData[0].hasOwnProperty('decimals') ? true : false;
    //console.log('decimals', decimals, hasDecimal);

    for(let c=0, len=pathData.length; c<len; c++){
        let com=pathData[c];
        let {type, values} = com

        if (decimals >-1 || hasDecimal) {
            decimals = hasDecimal ? com.decimals : decimals;


            //console.log('decimals', type, decimals);
            pathData[c].values = com.values.map(val=>{return val ? +val.toFixed(decimals) : val });

        }
    };
    return pathData;
}
