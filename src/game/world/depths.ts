/** Draw order, back to front. */
export const Depth = {
  sky: -100,
  sun: -95,
  farClouds: -90,
  hillsFar: -80,
  hillsMid: -70,
  hillsNear: -60,
  nearClouds: -50,
  decorBack: -10,
  platforms: 0,
  decorFront: 5,
  player: 10,
  butterflies: 15,
  cloudSea: 20,
  sparkles: 30,
} as const;
