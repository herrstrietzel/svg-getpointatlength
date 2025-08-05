import terser from '@rollup/plugin-terser';
const libName = 'svg-getpointatlength';

const stripDevComments = () => ({
    name: 'strip-dev-comments',
    renderChunk(code) {
        
    return code
        /* SAFER LINE-BY-LINE PROCESSING */
        // Remove single-line /* comments */ (but keep /** docs */)
        .replace(/^[ \t]*\/\*(?!\*).*?\*\/[ \t]*$/gm, '')
        
        // Remove multi-line /* comments */ (but keep /** docs */)
        .replace(/^[ \t]*\/\*(?!\*)[\s\S]*?\*\/[ \t]*$/gm, '')
        
        // Remove //comments without space (but keep // comments)
        .replace(/^[ \t]*\/\/[^\s].*$/gm, '')
        
        /* FORMATTING */
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
        
    }
});



export default [
    // IIFE Build
    {
        input: 'src/index.js',
        output: [
            {
                file: `dist/${libName}.js`,
                format: 'iife',
                name: libName,
                extend: true,
                exports: 'named',
                plugins: [stripDevComments()]
            },
            {
                file: `dist/${libName}.min.js`,
                format: 'iife',
                name: libName,
                extend: true,
                exports: 'named',
                plugins: [terser()]
            },
        ]
    },
    // ESM Build
    {
        input: 'src/index.js',
        output: [
            {
                file: `dist/${libName}.esm.js`,
                format: 'es',
                exports: 'named',
                plugins: [stripDevComments()]
            },
            {
                file: `dist/${libName}.esm.min.js`,
                format: 'es',
                exports: 'named',
                plugins: [terser()]
            },
        ]
    },

    // Node.js CJS Build
    {
        input: 'src/index.js',
        output: [
            {
                file: `dist/${libName}.node.js`,
                format: 'cjs',
                exports: 'named',
                plugins: [stripDevComments()]
            },
            {
                file: `dist/${libName}.node.min.js`,
                format: 'cjs',
                exports: 'named',
                plugins: [terser()]
            }
        ]
    }
];

