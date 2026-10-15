import { Application } from 'pixi.js';
import { h, render } from 'preact';
import { applyFontVariables, loadFonts } from './render/fonts';
import { loadMapData } from './render/map/data';
import { PALETTE } from './render/palette';
import { TableScene } from './render/table';
import { HexTooltip, hover } from './ui/HexTooltip';
import { TitleSlip } from './ui/TitleSlip';
import './fonts.css';
import './style.css';

/** `?view=x,y,zoom` (map km and zoom) opens the table at a given spot, handy for checking details. */
function viewFromUrl(): { view?: { x: number; y: number; zoom: number } } {
  const raw = new URLSearchParams(window.location.search).get('view');
  const parts = raw?.split(',').map(Number) ?? [];
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return {};
  const [x, y, zoom] = parts as [number, number, number];
  return { view: { x, y, zoom } };
}

async function boot(): Promise<void> {
  const host = document.getElementById('app');
  const uiRoot = document.getElementById('ui');
  if (!host || !uiRoot) throw new Error('index.html is missing #app or #ui');

  applyFontVariables();
  const fontsReady = loadFonts();
  const mapReady = loadMapData();

  const app = new Application();
  await app.init({
    resizeTo: host,
    background: PALETTE.tableBackground,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
  });
  host.appendChild(app.canvas);

  // Canvas text is rasterised once, so the scene is built only after the fonts are in.
  await fontsReady;
  const data = await mapReady;

  new TableScene(app, data, {
    onHover: (e) => {
      const rect = app.canvas.getBoundingClientRect();
      hover.value = e && { hex: e.hex, reference: e.reference, x: e.x + rect.left, y: e.y + rect.top };
    },
    ...viewFromUrl(),
  });
  render(h('div', {}, h(TitleSlip, {}), h(HexTooltip, {})), uiRoot);
}

void boot();
