

async function renderText(font, text='Hamburgefonsle', fontSize='500', fontSizeCanvas=48, id='') {

    let glyphs = font.glyphs.glyphs;
    let glyphArr = [];

    // check available glyphs/character support
    for (let i in glyphs) {
        if (glyphs[i].unicode !== undefined) glyphArr.push(glyphs[i].unicode)
    }

    let uniArr = [...new Set(text.replaceAll(' ', '').split(''))].map(ch => { return ch.charCodeAt(0) }).sort();
    let uniArrUc = [...new Set(text.toUpperCase().replaceAll(' ', '').split(''))].map(ch => { return ch.charCodeAt(0) }).sort();
    let uniArrLc = [...new Set(text.toLowerCase().replaceAll(' ', '').split(''))].map(ch => { return ch.charCodeAt(0) }).sort();


    //let letterArr = String.fromCharCode( ...uniArr);
    //let letterArr2 = String.fromCharCode( ...glyphArr);
    let match = uniArr.every((val) => glyphArr.includes(val)) || uniArrUc.every((val) => glyphArr.includes(val)) || uniArrLc.every((val) => glyphArr.includes(val))

    if(!match){
        //console.log(text, glyphs);
        //console.log(text, font, glyphArr, uniArr, letterArr, letterArr2, glyphs);
        //return false;
    }

    let path, d, tooComplex, markup

    let bb = {
        x: 0,
        y: 0,
        //approximate width for not renderable glyphs
        width: fontSize * text.length * 0.5,
        height: fontSize * 2
    }

    //define y offsets
    let yOffRat = 1.3333
    let yOffset = fontSize * yOffRat;
    let maxComplexity = 1000;

    // if font has glyphs according to text input chars
    //match = true;

    if (match) {
        path = font.getPath(text, 0, yOffset, fontSize);
        let { x1, y1, x2, y2 } = path.getBoundingBox();
        bb = {
            x: x1,
            y: y1,
            width: Math.ceil(x2-x1),
            height: Math.ceil(y2 - y1)
        }

        if (path.commands.length && path.commands.length < maxComplexity) {
            // optimize path data
            let pathData=[]
            try{
                pathData = opentypePath2pathData(path);
            }catch{
                console.log('catch', path, text);
            }

            pathData = pathDataToRelative(pathDataToShorthands(pathData), 0);
            d = stringifyPathData(pathData);

        } else if(path.commands.length && path.commands.length > maxComplexity) {
            tooComplex = true
        }
    }

    // prefer bitmap rendering for too complex geometries
    if (tooComplex) {

        //console.log(bb, font.names.fontFamily.en, path.commands.length);

        let fontSizeC = fontSizeCanvas;
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        let scale = fontSizeCanvas/fontSize;

        let canvasWidth = bb.width*scale;
        canvas.width = canvasWidth;
        canvas.height = fontSizeC * 2;

        ctx = font.draw(ctx, text, 0, fontSizeC * yOffRat,  fontSizeCanvas)
        let dataUrl = canvas.toDataURL('image/webp', 0)
        markup = `<image id="${id}" class="f" x="0" y="0"  height="${fontSize*2}" href="${dataUrl}" />\n`;
        return { markup: markup, bb: bb };

    }

    //render text placeholder: e.g for  icon fonts
    if (!d || !match) {
        markup = `<text id="${id}" class="f" x="0" y="${yOffset}" font-size="${fontSize}" font-family="sans-serif" fill="#999" >[${text}]</text>\n`;
        //console.log(text, 'no match');
    } else {
        markup = `<path id="${id}" class="f" d="${d}" />\n`;
    }
    return { markup: markup, bb: bb };
}