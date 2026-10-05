// Tiles for the margin decoration: small matrices and a few symbols, scattered.
// Each layer is its own tile at its own size, so the three never line up and
// the repeat is hard to spot.

export const MOTIF_LAYERS = [
  { name: 'far', seed: 1948, tile: 240, unit: 5 },
  { name: 'mid', seed: 1950, tile: 330, unit: 7 },
  { name: 'near', seed: 2017, tile: 440, unit: 9.5 },
] as const;

export type MotifLayer = (typeof MOTIF_LAYERS)[number]['name'];

const CELLS = 3;
const SYMBOLS = ['Δ', '∇', 'Σ', 'λ', '∂', '∫', 'π', '→', '≠', '∈', '{ }', '&lt;/&gt;'];

// Seeded, so every build draws the same tiles. Math.random() would reshuffle
// them on each deploy, and a cached tile would sit beside a fresh page.
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const n = (value: number) => Math.round(value * 10) / 10;

interface Glyph {
  width: number;
  height: number;
  draw: (x: number, y: number) => string;
}

/** Brackets round a grid of dots: filled for a one, hollow for a zero. */
const matrix = (rows: number, cols: number, unit: number, isOne: (r: number, c: number) => boolean): Glyph => {
  const width = cols * unit + unit;
  const height = rows * unit + unit * 0.6;
  const serif = unit * 0.35;
  return {
    width,
    height,
    draw: (x, y) => {
      const dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = n(x + unit * (c + 1));
          const cy = n(y + unit * (r + 0.8));
          dots.push(
            isOne(r, c)
              ? `<circle cx="${cx}" cy="${cy}" r="${n(unit * 0.24)}" fill="#000" stroke="none"/>`
              : `<circle cx="${cx}" cy="${cy}" r="${n(unit * 0.19)}" stroke-width="${n(unit * 0.13)}"/>`,
          );
        }
      }
      return (
        `<path d="M${n(x + serif)} ${n(y)}H${n(x)}V${n(y + height)}H${n(x + serif)}"/>` +
        `<path d="M${n(x + width - serif)} ${n(y)}H${n(x + width)}V${n(y + height)}H${n(x + width - serif)}"/>` +
        dots.join('')
      );
    },
  };
};

const symbol = (text: string, unit: number): Glyph => {
  const size = unit * 2.4;
  // Monospace, so the width can be worked out without measuring anything.
  const chars = text.replace(/&\w+;/g, 'x').length;
  return {
    width: chars * size * 0.62,
    height: size,
    draw: (x, y) =>
      `<text x="${n(x)}" y="${n(y + size * 0.8)}" font-size="${n(size)}" fill="#000" stroke="none">${text}</text>`,
  };
};

export const motifTile = (name: MotifLayer): string => {
  const layer = MOTIF_LAYERS.find((l) => l.name === name)!;
  const rand = mulberry32(layer.seed);
  const cell = layer.tile / CELLS;
  // One cell per tile always holds the 2×2 identity, the site's own mark.
  const home = layer.seed % (CELLS * CELLS);

  const glyphs: string[] = [];
  for (let i = 0; i < CELLS * CELLS; i++) {
    const roll = rand();
    let glyph: Glyph | undefined;
    if (i === home) glyph = matrix(2, 2, layer.unit, (r, c) => r === c);
    else if (roll < 0.2) glyph = undefined;
    else if (roll < 0.45) glyph = matrix(2, 2, layer.unit, () => rand() < 0.5);
    else if (roll < 0.62) glyph = matrix(3, 3, layer.unit, () => rand() < 0.45);
    else if (roll < 0.72) glyph = matrix(rand() < 0.5 ? 1 : 3, rand() < 0.5 ? 3 : 1, layer.unit, () => rand() < 0.5);
    else glyph = symbol(SYMBOLS[Math.floor(rand() * SYMBOLS.length)]!, layer.unit);

    // Both rolls are taken even for an empty cell, so removing a glyph kind
    // above doesn't reshuffle every position after it.
    const jx = rand();
    const jy = rand();
    if (!glyph) continue;

    // Kept a unit clear of the cell's edge: a glyph cut by the tile boundary
    // would show the seam on every repeat.
    const pad = layer.unit;
    const x = (i % CELLS) * cell + pad + jx * Math.max(0, cell - glyph.width - pad * 2);
    const y = Math.floor(i / CELLS) * cell + pad + jy * Math.max(0, cell - glyph.height - pad * 2);
    glyphs.push(glyph.draw(x, y));
  }

  // Used as a CSS mask, so only the alpha matters and the page supplies the
  // colour. That's what lets a separate file follow the theme toggle.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layer.tile}" height="${layer.tile}" viewBox="0 0 ${layer.tile} ${layer.tile}">` +
    `<g fill="none" stroke="#000" stroke-width="${n(layer.unit * 0.2)}" stroke-linecap="round" stroke-linejoin="round" font-family="ui-monospace, Consolas, Menlo, monospace">` +
    glyphs.join('') +
    `</g></svg>\n`
  );
};
