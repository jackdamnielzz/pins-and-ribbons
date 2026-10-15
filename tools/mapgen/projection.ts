/**
 * WGS84 ↔ Dutch RD New (EPSG:28992), PLAN 9 step 1.
 * Uses the published approximation polynomials (Schreutelkamp and Strang van Hees,
 * "Benaderingsformules voor de transformatie tussen RD- en WGS84-kaartcoördinaten"),
 * accurate to about a metre across the Netherlands. That is far finer than the
 * 25 m simplification tolerance and the 1 km hexes, so no projection library is needed.
 */

export interface LonLat {
  lon: number;
  lat: number;
}

export interface RD {
  x: number;
  y: number;
}

// Reference point: the Onze Lieve Vrouwetoren in Amersfoort.
const PHI0 = 52.1551744;
const LAM0 = 5.38720621;
const X0 = 155000;
const Y0 = 463000;

// [p, q, coefficient]: coefficient × dφ^p × dλ^q.
const R: readonly (readonly [number, number, number])[] = [
  [0, 1, 190094.945],
  [1, 1, -11832.228],
  [2, 1, -114.221],
  [0, 3, -32.391],
  [1, 0, -0.705],
  [3, 1, -2.34],
  [1, 3, -0.608],
  [0, 2, -0.008],
  [2, 3, 0.148],
];
const S: readonly (readonly [number, number, number])[] = [
  [1, 0, 309056.544],
  [0, 2, 3638.893],
  [2, 0, 73.077],
  [1, 2, -157.984],
  [3, 0, 59.788],
  [0, 1, 0.433],
  [2, 2, -6.439],
  [1, 1, -0.032],
  [0, 4, 0.092],
  [1, 4, -0.054],
];
// [p, q, coefficient]: coefficient × dX^p × dY^q.
const K: readonly (readonly [number, number, number])[] = [
  [0, 1, 3235.65389],
  [2, 0, -32.58297],
  [0, 2, -0.2475],
  [2, 1, -0.84978],
  [0, 3, -0.0655],
  [2, 2, -0.01709],
  [1, 0, -0.00738],
  [4, 0, 0.0053],
  [2, 3, -0.00039],
  [4, 1, 0.00033],
  [1, 1, -0.00012],
];
const L: readonly (readonly [number, number, number])[] = [
  [1, 0, 5260.52916],
  [1, 1, 105.94684],
  [1, 2, 2.45656],
  [3, 0, -0.81885],
  [1, 3, 0.05594],
  [3, 1, -0.05607],
  [0, 1, 0.01199],
  [3, 2, -0.00256],
  [1, 4, 0.00128],
  [0, 2, 0.00022],
  [2, 0, -0.00022],
  [5, 0, 0.00026],
];

function poly(terms: readonly (readonly [number, number, number])[], a: number, b: number): number {
  let sum = 0;
  for (const [p, q, c] of terms) sum += c * a ** p * b ** q;
  return sum;
}

/** WGS84 longitude/latitude (degrees) to RD New metres. */
export function toRD({ lon, lat }: LonLat): RD {
  const dPhi = 0.36 * (lat - PHI0);
  const dLam = 0.36 * (lon - LAM0);
  return {
    x: X0 + poly(R, dPhi, dLam),
    y: Y0 + poly(S, dPhi, dLam),
  };
}

/** RD New metres to WGS84 longitude/latitude (degrees). */
export function fromRD({ x, y }: RD): LonLat {
  const dX = (x - X0) * 1e-5;
  const dY = (y - Y0) * 1e-5;
  return {
    lat: PHI0 + poly(K, dX, dY) / 3600,
    lon: LAM0 + poly(L, dX, dY) / 3600,
  };
}
