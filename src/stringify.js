/**
 * Serialize pathData array to a minified "d" attribute string.
 */
export function pathDataToD(pathData, optimize = 1) {

    let beautify = optimize>1;
    let minify = beautify ? false : true;

    // Convert first "M" to "m" if followed by "l" (when minified)
    if (pathData[1].type === "l" && minify) {
        pathData[0].type = "m";
    }

    let d = '';
    if(beautify) {
        d = `${pathData[0].type} ${pathData[0].values.join(" ")}\n`;
    }else{
        d = `${pathData[0].type}${pathData[0].values.join(" ")}`;
    }


    for (let i = 1, len = pathData.length; i < len; i++) {
        let com0 = pathData[i - 1];
        let com = pathData[i];
        let { type, values } = com;

        // Minify Arc commands (A/a) – actually sucks!
        if (minify && (type === 'A' || type === 'a')) {
            values = [
                values[0], values[1], values[2],
                `${values[3]}${values[4]}${values[5]}`,
                values[6]
            ];
        }

        // Omit type for repeated commands
        type = (com0.type === com.type && com.type.toLowerCase() !== 'm' && minify)
                ? " "
                : (
                    (com0.type === "m" && com.type === "l") ||
                    (com0.type === "M" && com.type === "l") ||
                    (com0.type === "M" && com.type === "L")
                ) && minify
                    ? " "
                    : com.type;


        // concatenate subsequent floating point values
        if (minify) {

            //console.log(optimize, beautify, minify);

            let valsString = '';
            let prevWasFloat = false;

            for (let v = 0, l = values.length; v < l; v++) {
                let val = values[v];
                let valStr = val.toString();
                let isFloat = valStr.includes('.');
                let isSmallFloat = isFloat && Math.abs(val) < 1;


                // Remove leading zero from small floats *only* if the previous was also a float
                if (isSmallFloat && prevWasFloat) {
                    valStr = valStr.replace(/^0\./, '.');
                }

                // Add space unless this is the first value OR previous was a small float
                if (v > 0 && !(prevWasFloat && isSmallFloat)) {
                    valsString += ' ';
                }
                //console.log(isSmallFloat, prevWasFloat, valStr);

                valsString += valStr
                //.replace(/-0./g, '-.').replace(/ -./g, '-.')
                prevWasFloat = isSmallFloat;
            }

            //console.log('minify', valsString);
            d += `${type}${valsString}`;

        }
        // regular non-minified output
        else{
            if(beautify) {
                d += `${type} ${values.join(' ')}\n`;
            }else{
                d += `${type}${values.join(' ')}`;
            }
        }
    }

    if (minify) {
        d = d
            .replace(/ 0\./g, " .") // Space before small decimals
            .replace(/ -/g, "-")     // Remove space before negatives
            .replace(/-0\./g, "-.")  // Remove leading zero from negative decimals
            .replace(/Z/g, "z");     // Convert uppercase 'Z' to lowercase
    }


    return d;
}
