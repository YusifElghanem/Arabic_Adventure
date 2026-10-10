import { SunIcon } from './icons';

/** Shown while the physics engine and the level are starting up. */
export default function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-gradient-to-b from-sky-300 to-sky-100" role="status" aria-label="جارٍ التحميل">
      <SunIcon size={120} className="animate-[sun-dance_1.4s_ease-in-out_infinite]" />
    </div>
  );
}
