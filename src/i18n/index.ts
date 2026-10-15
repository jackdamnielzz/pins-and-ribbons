import en from './en.json';

export type TextKey = keyof typeof en;

/** Looks up a player-facing string. Only English ships at launch (PLAN 3). */
export function t(key: TextKey): string {
  return en[key];
}
