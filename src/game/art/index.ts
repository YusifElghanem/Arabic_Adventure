import { CHARACTER_ART } from './character';
import { MECHANIC_ART } from './mechanics';
import { CLOUD_SEA_SIZE, CLOUDS, cloudSeaSvg, cloudSvg } from './clouds';
import {
  BUTTERFLY_SIZE,
  FLOWER_SIZE,
  GRASS_TUFT_SIZE,
  GUMDROP_SIZE,
  LOLLIPOP_TREE_SIZE,
  MUSHROOM_SIZE,
  SPARKLE_SIZE,
  butterflySvg,
  candyMushroomSvg,
  flowerSvg,
  grassTuftSvg,
  gumdropBushSvg,
  lollipopTreeSvg,
  sparkleSvg,
} from './flora';
import { HILL_TILE, farHillsSvg, midHillsSvg, nearHillsSvg } from './hills';
import { PALETTE } from './palette';
import {
  PLATFORM_CAP_WIDTH,
  PLATFORM_MID_WIDTH,
  PLATFORM_TILE_HEIGHT,
  platformLeftSvg,
  platformMidASvg,
  platformMidBSvg,
  platformRightSvg,
} from './platforms';
import { SKY_SIZE, skySvg } from './sky';
import { SUN_FACE_SIZE, SUN_RAYS_SIZE, sunFaceSvg, sunRaysSvg } from './sun';

/** Texture keys for all generated art. */
export const ArtKeys = {
  sky: 'sky',
  sunRays: 'sun-rays',
  sunFace: 'sun-face',
  sunFaceBlink: 'sun-face-blink',
  cloudSmall: 'cloud-small',
  cloudMedium: 'cloud-medium',
  cloudLarge: 'cloud-large',
  cloudHappy: 'cloud-happy',
  cloudSea: 'cloud-sea',
  hillsFar: 'hills-far',
  hillsMid: 'hills-mid',
  hillsNear: 'hills-near',
  platformLeft: 'platform-left',
  platformMidA: 'platform-mid-a',
  platformMidB: 'platform-mid-b',
  platformRight: 'platform-right',
  flowerPink: 'flower-pink',
  flowerPurple: 'flower-purple',
  flowerBlue: 'flower-blue',
  flowerWhite: 'flower-white',
  lollipopPink: 'lollipop-pink',
  lollipopBlue: 'lollipop-blue',
  gumdropPurple: 'gumdrop-purple',
  gumdropOrange: 'gumdrop-orange',
  grassTuft: 'grass-tuft',
  mushroom: 'mushroom',
  sparkle: 'sparkle',
  butterflyPink: 'butterfly-pink',
  butterflyBlue: 'butterfly-blue',
} as const;

export type ArtKey = (typeof ArtKeys)[keyof typeof ArtKeys];

export interface ArtPiece {
  key: string;
  /** Logical (world-pixel) size; textures are rasterised at this × resolution. */
  width: number;
  height: number;
  svg: () => string;
  /**
   * Some textures are stretched rather than shown 1:1 (the sky). They never
   * need more than 1× resolution.
   */
  fixedResolution?: number;
}

export const ART: readonly ArtPiece[] = [
  { key: ArtKeys.sky, ...SKY_SIZE, svg: skySvg, fixedResolution: 1 },
  { key: ArtKeys.sunRays, ...SUN_RAYS_SIZE, svg: sunRaysSvg },
  { key: ArtKeys.sunFace, ...SUN_FACE_SIZE, svg: () => sunFaceSvg(false) },
  { key: ArtKeys.sunFaceBlink, ...SUN_FACE_SIZE, svg: () => sunFaceSvg(true) },
  { key: ArtKeys.cloudSmall, width: CLOUDS.cloudSmall.width, height: CLOUDS.cloudSmall.height, svg: () => cloudSvg(CLOUDS.cloudSmall) },
  { key: ArtKeys.cloudMedium, width: CLOUDS.cloudMedium.width, height: CLOUDS.cloudMedium.height, svg: () => cloudSvg(CLOUDS.cloudMedium) },
  { key: ArtKeys.cloudLarge, width: CLOUDS.cloudLarge.width, height: CLOUDS.cloudLarge.height, svg: () => cloudSvg(CLOUDS.cloudLarge) },
  { key: ArtKeys.cloudHappy, width: CLOUDS.cloudHappy.width, height: CLOUDS.cloudHappy.height, svg: () => cloudSvg(CLOUDS.cloudHappy) },
  { key: ArtKeys.cloudSea, ...CLOUD_SEA_SIZE, svg: cloudSeaSvg },
  { key: ArtKeys.hillsFar, ...HILL_TILE, svg: farHillsSvg },
  { key: ArtKeys.hillsMid, ...HILL_TILE, svg: midHillsSvg },
  { key: ArtKeys.hillsNear, ...HILL_TILE, svg: nearHillsSvg },
  { key: ArtKeys.platformLeft, width: PLATFORM_CAP_WIDTH, height: PLATFORM_TILE_HEIGHT, svg: platformLeftSvg },
  { key: ArtKeys.platformMidA, width: PLATFORM_MID_WIDTH, height: PLATFORM_TILE_HEIGHT, svg: platformMidASvg },
  { key: ArtKeys.platformMidB, width: PLATFORM_MID_WIDTH, height: PLATFORM_TILE_HEIGHT, svg: platformMidBSvg },
  { key: ArtKeys.platformRight, width: PLATFORM_CAP_WIDTH, height: PLATFORM_TILE_HEIGHT, svg: platformRightSvg },
  { key: ArtKeys.flowerPink, ...FLOWER_SIZE, svg: () => flowerSvg(PALETTE.candyPink) },
  { key: ArtKeys.flowerPurple, ...FLOWER_SIZE, svg: () => flowerSvg(PALETTE.candyPurple) },
  { key: ArtKeys.flowerBlue, ...FLOWER_SIZE, svg: () => flowerSvg(PALETTE.candyBlue) },
  { key: ArtKeys.flowerWhite, ...FLOWER_SIZE, svg: () => flowerSvg(PALETTE.white) },
  { key: ArtKeys.lollipopPink, ...LOLLIPOP_TREE_SIZE, svg: () => lollipopTreeSvg(PALETTE.candyPink) },
  { key: ArtKeys.lollipopBlue, ...LOLLIPOP_TREE_SIZE, svg: () => lollipopTreeSvg(PALETTE.candyBlue) },
  { key: ArtKeys.gumdropPurple, ...GUMDROP_SIZE, svg: () => gumdropBushSvg(PALETTE.candyPurple) },
  { key: ArtKeys.gumdropOrange, ...GUMDROP_SIZE, svg: () => gumdropBushSvg(PALETTE.candyOrange) },
  { key: ArtKeys.grassTuft, ...GRASS_TUFT_SIZE, svg: grassTuftSvg },
  { key: ArtKeys.mushroom, ...MUSHROOM_SIZE, svg: candyMushroomSvg },
  { key: ArtKeys.sparkle, ...SPARKLE_SIZE, svg: sparkleSvg },
  { key: ArtKeys.butterflyPink, ...BUTTERFLY_SIZE, svg: () => butterflySvg(PALETTE.candyPink, PALETTE.candyYellow) },
  { key: ArtKeys.butterflyBlue, ...BUTTERFLY_SIZE, svg: () => butterflySvg(PALETTE.candyBlue, PALETTE.white) },
  ...CHARACTER_ART,
  ...MECHANIC_ART,
];
