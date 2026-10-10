import { useMemo } from 'react';
import { CHARACTER_ART, CharacterKeys, FACE_SIZE, buildRig, type PartName } from '@/game/art/character';
import { toDataUri } from '@/game/art/svg';
import { useGameStore } from '@/stores/useGameStore';

/**
 * The child's character on the title screen, built from the same cut-out
 * parts as the in-game puppet but drawn with plain <img> layers and CSS
 * animation, so the title screen never has to load the game engine. It
 * breathes, bobs and waves hello.
 */

// Data URIs are built once per page load and shared.
let uriCache: Map<string, string> | null = null;
const partUri = (key: string): string => {
  uriCache ??= new Map(CHARACTER_ART.map((a) => [a.key, toDataUri(a.svg())]));
  return uriCache.get(key) ?? '';
};

/** Logical stage size (feet at the bottom centre). */
const STAGE = { width: 150, height: 170 } as const;

const PART_ANIMATION: Partial<Record<PartName, string>> = {
  armFront: 'avatar-wave 1.6s ease-in-out infinite',
  armBack: 'avatar-sway 2.4s ease-in-out infinite',
  head: 'avatar-nod 3s ease-in-out infinite',
  face: 'avatar-nod 3s ease-in-out infinite',
  hair: 'avatar-nod 3s ease-in-out infinite',
  headwear: 'avatar-nod 3s ease-in-out infinite',
};

export default function AvatarPreview({ className = '' }: { className?: string }) {
  const outfit = useGameStore((s) => s.outfit);
  const face = useGameStore((s) => s.faceTextureUrl);
  const rig = useMemo(() => buildRig(outfit), [outfit]);
  const feetX = STAGE.width / 2;
  const feetY = STAGE.height - 4;

  return (
    <div className={`relative ${className}`} aria-hidden>
      <svg viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} className="absolute inset-0 h-full w-full overflow-visible">
        <ellipse cx={feetX} cy={feetY} rx="40" ry="8" fill="rgba(4,47,46,0.18)" />
      </svg>
      <div className="absolute inset-0 origin-bottom animate-[avatar-breathe_2.6s_ease-in-out_infinite]">
        {rig.map((part) => {
          const isFace = part.name === 'face';
          const width = isFace && face ? FACE_SIZE.height : part.width;
          const height = isFace && face ? FACE_SIZE.height : part.height;
          const left = feetX + part.x - part.originX * width;
          const top = feetY + part.y - part.originY * height;
          const src = isFace ? (face ?? partUri(CharacterKeys.faceDefault)) : partUri(part.key ?? '');
          // The head group nods about the neck, not about each part's own pivot.
          const headPart = part.name === 'head' || isFace || part.name === 'hair' || part.name === 'headwear';
          const origin = headPart
            ? `${((feetX - left) / width) * 100}% ${((feetY - 70 - top) / height) * 100}%`
            : `${part.originX * 100}% ${part.originY * 100}%`;
          return (
            <img
              key={part.name}
              src={src}
              alt=""
              draggable={false}
              className="absolute select-none"
              style={{
                left: `${(left / STAGE.width) * 100}%`,
                top: `${(top / STAGE.height) * 100}%`,
                width: `${(width / STAGE.width) * 100}%`,
                height: `${(height / STAGE.height) * 100}%`,
                // Individual `scale` composes with the `rotate` keyframes (rotate, then flip).
                scale: part.flipX ? '-1 1' : undefined,
                transformOrigin: origin,
                animation: PART_ANIMATION[part.name],
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
