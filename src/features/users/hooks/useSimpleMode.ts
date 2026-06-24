import type { JsonValue } from '../../../shared/api/canplanTypes';
import { useMyProfile } from './useMyProfile';

/**
 * Reads `simpleMode` out of a profile's free-form accessibilitySettings object.
 * Anything that isn't a plain object with `simpleMode === true` is treated as
 * "off", so a missing/guest profile safely defaults to the regular UI.
 */
export function readSimpleMode(
  settings: JsonValue | null | undefined,
): boolean {
  return Boolean(
    settings &&
      typeof settings === 'object' &&
      !Array.isArray(settings) &&
      (settings as Record<string, JsonValue>).simpleMode === true,
  );
}

/**
 * Whether the signed-in user has Simple Mode enabled. Reads from the shared
 * `myProfile` cache (no extra fetch), so screens can branch their layout on it.
 */
export function useSimpleMode(): boolean {
  const { data: profile } = useMyProfile();
  return readSimpleMode(profile?.accessibilitySettings);
}
