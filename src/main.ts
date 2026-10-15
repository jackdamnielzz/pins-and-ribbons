import { Application } from 'pixi.js';
import { h, render } from 'preact';
import { applyFontVariables, loadFonts } from './render/fonts';
import { PALETTE } from './render/palette';
import { TableScene } from './render/table';
import { TitleSlip } from './ui/TitleSlip';
import './style.css';

async function boot(): Promise<void> {
  const host = document.getElementById('app');
  const uiRoot = document.getElementById('ui');
  if (!host || !uiRoot) throw new Error('index.html is missing #app or #ui');

  applyFontVariables();
  const fontsReady = loadFonts();

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

  new TableScene(app);
  render(h(TitleSlip, {}), uiRoot);
}

void boot();
