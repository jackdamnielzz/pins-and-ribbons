import { afterEach, describe, expect, it, vi } from 'vitest';
import { FONT_FACES, loadFonts } from './fonts';

afterEach(() => {
  vi.useRealTimers();
});

describe('loadFonts', () => {
  it('requests every face and resolves when they have loaded', async () => {
    const load = vi.fn((_face: string) => Promise.resolve([] as FontFace[]));
    await loadFonts({ load });
    expect(load.mock.calls.map(([face]) => face)).toEqual([...FONT_FACES]);
  });

  it('resolves even when a face fails to load', async () => {
    const load = vi.fn((face: string) =>
      face.includes('Reenie') ? Promise.reject(new Error('offline')) : Promise.resolve([] as FontFace[]),
    );
    await expect(loadFonts({ load })).resolves.toBeUndefined();
  });

  it('stops waiting after the timeout', async () => {
    vi.useFakeTimers();
    const load = vi.fn(() => new Promise<FontFace[]>(() => {}));
    let done = false;
    const pending = loadFonts({ load }, 1000).then(() => {
      done = true;
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
  });
});
