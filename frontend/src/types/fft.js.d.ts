declare module 'fft.js' {
  export default class FFT {
    constructor(size: number);
    createComplexArray(): Float32Array;
    transform(out: Float32Array, input: Float32Array): void;
    inverseTransform(out: Float32Array, input: Float32Array): void;
  }
}
