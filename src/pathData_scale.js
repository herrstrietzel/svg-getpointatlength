/**
 * scale pathData
 */

export function scalePathData(pathData, scaleX, scaleY) {
    pathData.forEach((com, i) => {
        let { type, values } = com;
        let typeRel = type.toLowerCase();

        switch (typeRel) {
            case "a":
                com.values = [
                    values[0] * scaleX,
                    values[1] * scaleY,
                    values[2],
                    values[3],
                    values[4],
                    values[5] * scaleX,
                    values[6] * scaleY
                ];
                break;

            case "h":
                com.values = [values[0] * scaleX];
                break;

            case "v":
                com.values = [values[0] * scaleY];
                break;

            default:
                if (values.length) {
                    for (let i = 0; i < values.length; i += 2) {
                        com.values[i] *=  scaleX;
                        com.values[i + 1] *= scaleY;
                    }
                }
        }

    });
    return pathData;
}