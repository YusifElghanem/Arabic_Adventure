import { CuboidCollider, RigidBody } from '@react-three/rapier';
import IslandModel, { type IslandModelProps } from './IslandModel';

/**
 * A solid floating island: the visual IslandModel plus a box collider whose
 * top face is the walking surface. `position` is the centre of that top
 * surface, so levels can be laid out by walking height.
 */

interface IslandProps extends IslandModelProps {
  /** Decorative background islands skip physics. */
  solid?: boolean;
}

export default function Island({ solid = true, ...props }: IslandProps) {
  const { position, width, depth = 3, thickness = 1.6 } = props;
  return (
    <>
      {solid && (
        <RigidBody type="fixed" colliders={false} position={position}>
          <CuboidCollider args={[width / 2, thickness / 2, depth / 2]} position={[0, -thickness / 2, 0]} friction={1} />
        </RigidBody>
      )}
      <IslandModel {...props} />
    </>
  );
}
