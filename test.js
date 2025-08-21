
import { getPathLengthLookup  } from 'svg-getpointatlength';

let d = `m 50,0 .00001.0001.001 10e-10 Q 36.4 0 24.8 6.8t-18 18  t-6.8 25.2 C 0 63.8 5.6 76.3 14.65 85.35 s 21.55 14.65 35.35 14.65 a 50 25-45 0115.8-34.3 50 25 -45 0134.2 -25.7h -20-.5 v -12.5-12.5 H 75 50 V 0 z M 40 60 h-20 V 20h 18 .5.5.5.5z   m-5-35 c0 10 0 15 0 30 q-5 0 -10 0v-30zh-10 v20 h 5`;

let lookup = getPathLengthLookup(d);
let length = lookup.totalLength;
let pt = lookup.getPointAtLength(length*0.5)

console.log('pt at length:', pt, 'length:', length);


