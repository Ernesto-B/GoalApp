declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    colors?: string[];
    shapes?: ('square' | 'circle')[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  type ConfettiFunction = (options?: Options) => Promise<null> | null;

  const confetti: ConfettiFunction & {
    reset: () => void;
    create: (canvas: HTMLCanvasElement, options?: {resize?: boolean, useWorker?: boolean}) => ConfettiFunction;
  };

  export default confetti;
}