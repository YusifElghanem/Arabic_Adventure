import type Phaser from 'phaser';

/**
 * The asset manifest: every image the game loads, in one place, so an
 * illustrator's artwork can replace any piece by swapping the file at the
 * same key. SVGs are rasterised by Phaser at load time at the given size,
 * so vector art stays crisp at any resolution.
 */

export interface SvgAsset {
  type: 'svg';
  key: string;
  url: string;
  width: number;
  height: number;
}

export type AssetEntry = SvgAsset;

/** Filled in as art is added (Phase 2 onwards). */
export const ASSET_MANIFEST: readonly AssetEntry[] = [];

export function queueAssets(loader: Phaser.Loader.LoaderPlugin, manifest: readonly AssetEntry[]): void {
  for (const asset of manifest) {
    if (asset.type === 'svg') {
      loader.svg(asset.key, asset.url, { width: asset.width, height: asset.height });
    }
  }
}
