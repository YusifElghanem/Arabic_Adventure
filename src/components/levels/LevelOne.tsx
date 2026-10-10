import { useEffect } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import Player from '@/components/characters/Player';
import FloatingLetterA from '@/components/mechanics/FloatingLetterA';
import GoalGate from '@/components/mechanics/GoalGate';
import LetterB, { LETTER_B_DOT_OFFSET } from '@/components/mechanics/LetterB';
import MysteryBlock from '@/components/mechanics/MysteryBlock';
import Star from '@/components/mechanics/Star';
import CameraRig from '@/components/scene/CameraRig';
import { useGameStore, type LevelGoals } from '@/stores/useGameStore';
import { Cloud, Tree } from './Decorations';
import Island from './Island';

/**
 * Level 1: "أ and ب".
 *
 *   Start ─ star ─ gap ─ [Mystery Block → dot] [ب trampoline] ⤴
 *   high island: star + giant أ with the lion ─ step down ─ star ─ rainbow arch
 *
 * The ب bowl is the only way up to the high island, so every child bounces
 * on it and sees the dot snap into place. Gaps are narrow (a jump covers
 * ~4.5 units) and falling just floats the child back to the start.
 */

export const LEVEL_ONE_GOALS: LevelGoals = { totalStars: 3, letterDotsRequired: 1 };
export const LEVEL_ONE_SPAWN: [number, number, number] = [-1.5, 1.2, 0];

const LETTER_B_POSITION: [number, number, number] = [16.6, 1.08, 0];
const DOT_TARGET: [number, number, number] = [
  LETTER_B_POSITION[0] + LETTER_B_DOT_OFFSET[0],
  LETTER_B_POSITION[1] + LETTER_B_DOT_OFFSET[1],
  LETTER_B_POSITION[2] + LETTER_B_DOT_OFFSET[2],
];

const LEVEL_MIN_X = -4.2;
const LEVEL_MAX_X = 49.4;
const LIGHT_TARGET_X = 22;

export default function LevelOne() {
  const registerLevelGoals = useGameStore((s) => s.registerLevelGoals);
  useEffect(() => registerLevelGoals(LEVEL_ONE_GOALS), [registerLevelGoals]);

  return (
    <>
      <Lighting />
      <color attach="background" args={['#bfe8ff']} />
      <fog attach="fog" args={['#d7f0ff', 28, 70]} />

      <Player spawn={LEVEL_ONE_SPAWN} />
      <CameraRig minX={1} maxX={45} />

      {/* Invisible walls at both ends of the level */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.5, 20, 3]} position={[LEVEL_MIN_X - 0.5, 10, 0]} />
        <CuboidCollider args={[0.5, 20, 3]} position={[LEVEL_MAX_X + 0.5, 10, 0]} />
      </RigidBody>

      {/* The floor: the starting ground and the letter meadow */}
      <Island position={[1, 0, 0]} width={10} seed={1} />
      <Island position={[14.25, 0, 0]} width={11.5} seed={2} trees={false} />
      {/* High island with the letter أ */}
      <Island position={[25.9, 4.5, 0]} width={10.2} seed={3} grass="#86efac" trees={false} />
      {/* Step down towards the goal */}
      <Island position={[35.85, 2.2, 0]} width={7.3} seed={4} />
      <Island position={[45.2, 2.2, 0]} width={8.4} seed={5} grass="#a3e635" />

      <Star position={[3.5, 1.5, 0]} />
      <Star position={[23.6, 6.2, 0]} />
      <Star position={[36.2, 4.0, 0]} />

      <MysteryBlock position={[11, 2.9, 0]} dotTarget={DOT_TARGET} />
      <LetterB position={LETTER_B_POSITION} />
      <FloatingLetterA position={[26.6, 4.5, -1.7]} lionOffset={[2.6, 0, 0.75]} />
      <GoalGate position={[46.8, 2.2, 0]} />

      {/* Trees behind the ب meadow, clear of the bouncing area */}
      <Tree position={[10, 0, -1.1]} scale={1.1} />
      <Tree position={[19.3, 0, -1.1]} scale={0.9} variant={1} />

      <Scenery />
    </>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#e0f2fe', '#86efac', 0.55]} />
      <directionalLight
        position={[LIGHT_TARGET_X + 10, 22, 14]}
        intensity={2.1}
        color="#fff7e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={4}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={16}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={70}
      >
        <object3D attach="target" position={[LIGHT_TARGET_X, 0, 0]} />
      </directionalLight>
    </>
  );
}

/** Background islands and clouds for depth. Decorative only, no physics. */
function Scenery() {
  return (
    <>
      <Island position={[-6, -1, -14]} width={6} depth={5} seed={11} solid={false} />
      <Island position={[12, 3, -18]} width={8} depth={6} seed={12} solid={false} grass="#bbf7d0" />
      <Island position={[30, -2, -16]} width={7} depth={5} seed={13} solid={false} />
      <Island position={[48, 4, -20]} width={9} depth={6} seed={14} solid={false} grass="#d9f99d" />

      <Cloud position={[-2, 9, -8]} scale={1.4} seed={1} />
      <Cloud position={[14, 11, -10]} scale={1.8} seed={2} />
      <Cloud position={[30, 12, -9]} scale={1.5} seed={3} />
      <Cloud position={[44, 10, -11]} scale={1.7} seed={4} />
      {/* A soft sea of clouds below the islands */}
      {Array.from({ length: 9 }, (_, i) => (
        <Cloud key={i} position={[-8 + i * 7.5, -9 - (i % 3), -4 - (i % 2) * 4]} scale={2.6} seed={20 + i} />
      ))}
    </>
  );
}
