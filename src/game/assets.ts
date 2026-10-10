import type Phaser from 'phaser';
import { ART, type ArtPiece } from './art';
import { toDataUri } from './art/svg';

/**
 * The asset manifest: every texture the game loads, keyed, so a piece can be
 * replaced (for example by an illustrator's SVG file URL) without touching
 * game code.
 *
 * Textures are rasterised at `resolution` × their logical size and the game
 * draws them scaled by 1 / resolution. Vector art stays crisp when the camera
 * zooms in on large screens, and small screens don't pay for pixels they
 * can't show.
 */

export interface SvgAsset {
  type: 'svg';
  key: string;
  /** A file URL or data: URI. */
  url: string;
  width: number;
  height: number;
  fixedResolution?: number;
}

export type AssetEntry = SvgAsset;

const fromArt = (piece: ArtPiece): SvgAsset => ({
  type: 'svg',
  key: piece.key,
  url: toDataUri(piece.svg()),
  width: piece.width,
  height: piece.height,
  fixedResolution: piece.fixedResolution,
});

/** Built on first use: generating the SVG markup costs a few milliseconds. */
let manifest: AssetEntry[] | null = null;
export const getAssetManifest = (): readonly AssetEntry[] => (manifest ??= ART.map(fromArt));

/** Registry key under which the chosen art resolution is stored. */
export const ART_RESOLUTION_KEY = 'artResolution';

/** 2× textures on screens that zoom in noticeably, 1× otherwise. */
export const chooseArtResolution = (cameraZoom: number): 1 | 2 => (cameraZoom > 1.15 ? 2 : 1);

export function queueAssets(loader: Phaser.Loader.LoaderPlugin, entries: readonly AssetEntry[], resolution: number): void {
  for (const asset of entries) {
    const scale = asset.fixedResolution ?? resolution;
    loader.svg(asset.key, asset.url, { width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) });
  }
}
