import { useEffect, useState } from 'react';
import { CanvasTexture, SRGBColorSpace, TextureLoader, type Texture } from 'three';

export const SKIN_COLOR = '#f3c9a3';

/**
 * Draws the default cartoon face (big eyes, rosy cheeks, smile) used until
 * a parent uploads a photo. It fills the same oval layout as a photo crop,
 * so both sit on the head mesh the same way.
 */
function createDefaultFaceTexture(): Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;
    // Eyes
    for (const dx of [-38, 38]) {
      ctx.fillStyle = '#2b1a12';
      ctx.beginPath();
      ctx.ellipse(c + dx, c - 6, 17, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(c + dx + 6, c - 14, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c + dx - 5, c + 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cheeks
    ctx.fillStyle = 'rgba(244, 114, 182, 0.45)';
    for (const dx of [-62, 62]) {
      ctx.beginPath();
      ctx.ellipse(c + dx, c + 30, 20, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Smile
    ctx.strokeStyle = '#2b1a12';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(c, c + 26, 30, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

let defaultFace: Texture | null = null;
const getDefaultFace = (): Texture => (defaultFace ??= createDefaultFaceTexture());

/**
 * Returns a texture for the given face URL, or the default cartoon face.
 * Photo textures are disposed when the URL changes or the component
 * unmounts. The shared default texture is kept for the whole session.
 */
export function useFaceTexture(url: string | null): Texture {
  const [texture, setTexture] = useState<Texture>(getDefaultFace);

  useEffect(() => {
    if (!url) {
      setTexture(getDefaultFace());
      return;
    }

    let cancelled = false;
    let loaded: Texture | null = null;
    new TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 4;
        if (cancelled) {
          tex.dispose();
          return;
        }
        loaded = tex;
        setTexture(tex);
      },
      undefined,
      () => {
        // A broken image falls back to the friendly default face.
        if (!cancelled) setTexture(getDefaultFace());
      },
    );

    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [url]);

  return texture;
}
