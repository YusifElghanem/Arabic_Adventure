import { PALETTE } from './palette';
import { svgDocument } from './svg';

/** Vertical sky gradient: deep candy blue at the top, a warm pink glow at the horizon. */
export const SKY_SIZE = { width: 16, height: 512 } as const;

export function skySvg(): string {
  const { width, height } = SKY_SIZE;
  const defs =
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
    `<stop offset="0" stop-color="${PALETTE.skyTop}"/>` +
    `<stop offset="0.55" stop-color="${PALETTE.skyMid}"/>` +
    `<stop offset="1" stop-color="${PALETTE.skyHorizon}"/>` +
    '</linearGradient>';
  return svgDocument(width, height, `<rect width="${width}" height="${height}" fill="url(#sky)"/>`, defs);
}
