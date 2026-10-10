/**
 * The candy-pop palette. Every colour in the game art comes from here, so
 * the whole world can be re-themed in one place.
 */
export const PALETTE = {
  ink: '#5b3a29',
  white: '#ffffff',

  skyTop: '#62bdff',
  skyMid: '#a6e0ff',
  skyHorizon: '#ffe0f0',

  sunCore: '#fff07a',
  sunEdge: '#ffc23d',
  sunRay: '#ffd84d',
  sunRayTip: '#ffb22e',
  sunGlow: '#fff6c2',
  cheek: '#ff9ab8',

  cloud: '#ffffff',
  cloudShade: '#dfe6ff',
  cloudShadeWarm: '#ffe3f1',

  farHillA: '#d8b6f7',
  farHillB: '#f8b4d6',
  farHillLight: '#ffd6eb',
  midHill: '#86e0bd',
  midHillLight: '#b9f3da',
  midHillDeep: '#5fcca2',
  nearHill: '#69d872',
  nearHillLight: '#9cef93',
  nearHillDeep: '#47bf59',

  frosting: '#7ee36b',
  frostingLight: '#c0f7a4',
  frostingDeep: '#52c556',
  caramel: '#ffbd70',
  caramelLight: '#ffd59c',
  caramelDeep: '#f08f4c',
  chocolate: '#9a5634',
  chocolateDeep: '#7a3f25',

  candyPink: '#ff6fae',
  candyPinkLight: '#ffa6cf',
  candyBlue: '#5ec8ff',
  candyPurple: '#b07cff',
  candyYellow: '#ffd23f',
  candyMint: '#5fe0b0',
  candyOrange: '#ff9d4d',
  leaf: '#4fc95c',
  leafLight: '#86e57a',
} as const;

export const SPRINKLES = [PALETTE.candyPink, PALETTE.candyYellow, PALETTE.candyBlue, PALETTE.candyPurple, PALETTE.white] as const;
