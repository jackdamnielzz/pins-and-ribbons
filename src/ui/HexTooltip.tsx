import { signal } from '@preact/signals';
import type { HexRecord } from '../core/map/types.ts';
import { t, type TextKey } from '../i18n';
import styles from './HexTooltip.module.css';

/** What the cursor is over, set by the table scene (PLAN 7.2, cursor tooltip). */
export interface HoverInfo {
  hex: HexRecord;
  reference: string;
  /** Cursor position in CSS pixels. */
  x: number;
  y: number;
}

export const hover = signal<HoverInfo | null>(null);

const OFFSET = 18;

/** Small paper slip next to the cursor: terrain, road, railway, town and map reference. */
export function HexTooltip() {
  const info = hover.value;
  if (!info) return null;
  const { hex } = info;
  const flip = info.x > window.innerWidth - 240;
  const style = {
    left: flip ? undefined : `${info.x + OFFSET}px`,
    right: flip ? `${window.innerWidth - info.x + OFFSET}px` : undefined,
    top: `${info.y + OFFSET}px`,
  };
  return (
    <div class={styles.slip} style={style} role="status">
      {hex.town && <p class={styles.town}>{hex.town}</p>}
      <p class={styles.terrain}>{t(`terrain.${hex.terrain}` as TextKey)}</p>
      <p class={styles.line}>
        {t(hex.road ? 'tooltip.road' : 'tooltip.noRoad')}
        {hex.rail && ` · ${t('tooltip.rail')}`}
      </p>
      <p class={styles.line}>
        {t('tooltip.ref')} {info.reference}
      </p>
    </div>
  );
}
