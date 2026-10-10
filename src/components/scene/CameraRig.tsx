import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { playerTracker } from '@/game/playerTracker';

/**
 * Side-on 2.5D follow camera. It eases after the player, leads a little in
 * the direction of travel, and pulls back on narrow (portrait) screens so
 * phones still see enough of the level.
 */

interface CameraRigProps {
  minX: number;
  maxX: number;
}

export default function CameraRig({ minX, maxX }: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const look = useMemo(() => new Vector3(), []);
  const lead = useMemo(() => ({ x: 0 }), []);

  const distance = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    return aspect < 1 ? MathUtils.clamp(13 / aspect, 13, 21) : 13;
  }, [size.width, size.height]);

  // Snap into place on mount so the level doesn't open with a swoop.
  useEffect(() => {
    const p = playerTracker.position;
    camera.position.set(MathUtils.clamp(p.x, minX, maxX), p.y + 3.2, distance);
    look.set(camera.position.x, p.y + 1.2, 0);
    camera.lookAt(look);
  }, [camera, distance, look, minX, maxX]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = playerTracker.position;
    lead.x = MathUtils.damp(lead.x, MathUtils.clamp(playerTracker.velocity.x * 0.35, -1.8, 1.8), 2, dt);

    const targetX = MathUtils.clamp(p.x + lead.x, minX, maxX);
    // Follow height loosely, so small hops don't bob the camera.
    const targetY = Math.max(p.y, -2) + 3.2;
    camera.position.x = MathUtils.damp(camera.position.x, targetX, 4, dt);
    camera.position.y = MathUtils.damp(camera.position.y, targetY, playerTracker.respawning ? 3 : 2.2, dt);
    camera.position.z = MathUtils.damp(camera.position.z, distance, 3, dt);

    look.x = MathUtils.damp(look.x, targetX, 5, dt);
    look.y = MathUtils.damp(look.y, Math.max(p.y, -2) + 1.2, 2.6, dt);
    look.z = 0;
    camera.lookAt(look);
  });

  return null;
}
