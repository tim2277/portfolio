import type { APIRoute, GetStaticPaths } from 'astro';
import { MOTIF_LAYERS, motifTile, type MotifLayer } from '../lib/motif';

// Files rather than inline SVG: three tiles, cached once, instead of a few
// hundred shapes in every page. Margins.astro points at them by path.
export const getStaticPaths = (() =>
  MOTIF_LAYERS.map((layer) => ({ params: { layer: layer.name } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) =>
  new Response(motifTile(params.layer as MotifLayer), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
