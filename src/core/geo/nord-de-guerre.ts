/**
 * The Nord de Guerre grid used on Allied 1944 maps of the Netherlands (GSGS 2541 and 4427,
 * docs/history/terminology.md): Lambert conformal conic, EPSG:27500 "ATF (Paris) / Nord de Guerre".
 * Parameters from https://epsg.io/27500. Input is taken as WGS84 latitude/longitude without a
 * datum shift (no standard ATF–WGS84 transformation exists), so references can be off by
 * up to a few hundred metres against the original sheets (decision 0008).
 */

export interface GridPoint {
  /** Metres. */
  easting: number;
  northing: number;
}

const DEG = Math.PI / 180;
/** Plessis 1817 ellipsoid. */
const A = 6376523;
const INV_F = 308.64;
const F_ = 1 / INV_F;
const E2 = 2 * F_ - F_ * F_;
const E = Math.sqrt(E2);
/** 55 grads, and the central meridian 6 grads east of Paris (2.33720833° E of Greenwich). */
const LAT0 = 49.5 * DEG;
const LON0 = (2.33720833333333 + 5.4) * DEG;
const K0 = 0.99950908;
const FALSE_EASTING = 500000;
const FALSE_NORTHING = 300000;

function m(phi: number): number {
  const s = Math.sin(phi);
  return Math.cos(phi) / Math.sqrt(1 - E2 * s * s);
}

function t(phi: number): number {
  const s = Math.sin(phi);
  return Math.tan(Math.PI / 4 - phi / 2) / ((1 - E * s) / (1 + E * s)) ** (E / 2);
}

const N = Math.sin(LAT0);
const BIG_F = m(LAT0) / (N * t(LAT0) ** N);
const R0 = A * BIG_F * t(LAT0) ** N * K0;

/** WGS84 degrees to Nord de Guerre metres. */
export function toNordDeGuerre(lon: number, lat: number): GridPoint {
  const r = A * BIG_F * t(lat * DEG) ** N * K0;
  const theta = N * (lon * DEG - LON0);
  return {
    easting: FALSE_EASTING + r * Math.sin(theta),
    northing: FALSE_NORTHING + R0 - r * Math.cos(theta),
  };
}

/** Nord de Guerre metres to WGS84 degrees. */
export function fromNordDeGuerre(p: GridPoint): { lon: number; lat: number } {
  const dx = p.easting - FALSE_EASTING;
  const dy = R0 - (p.northing - FALSE_NORTHING);
  const r = Math.sign(N) * Math.hypot(dx, dy);
  const tp = (r / (A * K0 * BIG_F)) ** (1 / N);
  const theta = Math.atan2(dx, dy);
  let phi = Math.PI / 2 - 2 * Math.atan(tp);
  for (let i = 0; i < 10; i++) {
    const s = Math.sin(phi);
    phi = Math.PI / 2 - 2 * Math.atan(tp * ((1 - E * s) / (1 + E * s)) ** (E / 2));
  }
  return { lon: (theta / N + LON0) / DEG, lat: phi / DEG };
}

/**
 * Six-figure map reference without grid letters, as in the 1st Airborne Division war diaries
 * (PLAN 6.1): three digits of easting and three of northing, each to the nearest 100 m below
 * (tens of km, km, hundreds of metres within the 100 km square).
 */
export function sixFigureReference(p: GridPoint): string {
  const digits = (v: number): string =>
    String(Math.floor((((v % 100000) + 100000) % 100000) / 100)).padStart(3, '0');
  return `${digits(p.easting)}${digits(p.northing)}`;
}
