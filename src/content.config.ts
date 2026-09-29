import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const baseSchema = ({ image }: SchemaContext) =>
  z.object({
    title: z.string().max(120),
    description: z.string().max(300),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    heroImage: image().optional(),
    heroAlt: z.string().optional(),
  });

type HeroFields = { heroImage?: unknown; heroAlt?: string };

/*
  A hero with no alt text is a silent accessibility hole, and `?? ''` in the
  layout would paper over it. An empty string is still allowed — that says
  'decorative' deliberately, rather than by forgetting.

  Applied last, after any `.extend()`: `.refine()` returns a ZodEffects, which
  has no `.extend()` on it.
*/
const requireHeroAlt = <T extends z.ZodType<HeroFields>>(schema: T) =>
  schema.refine((data) => data.heroImage === undefined || data.heroAlt !== undefined, {
    message: 'heroAlt is required when heroImage is set (use "" for a decorative image)',
    path: ['heroAlt'],
  });

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: (ctx: SchemaContext) => requireHeroAlt(baseSchema(ctx)),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: (ctx: SchemaContext) =>
    requireHeroAlt(
      baseSchema(ctx).extend({
        status: z.enum(['active', 'shipped', 'archived', 'exploration']).default('active'),
        repo: z.url().optional(),
        url: z.url().optional(),
      })
    ),
});

export const collections = { posts, projects };
