import type { ComponentType } from 'react';
import LevelOne from './LevelOne';

/** Level components by ID. Imported only by the lazily loaded game scene. Keep in sync with levelCatalog.ts. */
export const LEVELS: Record<number, ComponentType> = {
  1: LevelOne,
};
