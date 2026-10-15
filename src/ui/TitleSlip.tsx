import { t } from '../i18n';
import styles from './TitleSlip.module.css';

/** Paper slip pinned to the top-left of the table (PLAN 7.2). */
export function TitleSlip() {
  return (
    <div class={styles.slip}>
      <h1 class={styles.title}>{t('app.title')}</h1>
      <p class={styles.sheet}>{t('app.sheet')}</p>
      <p class={styles.hint}>{t('app.controlsHint')}</p>
    </div>
  );
}
