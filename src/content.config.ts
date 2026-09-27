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

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: baseSchema,
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: (ctx: SchemaContext) =>
    baseSchema(ctx).extend({
      status: z.enum(['active', 'shipped', 'archived', 'exploration']).default('active'),
      repo: z.url().optional(),
      url: z.url().optional(),
    }),
});

export const collections = { posts, projects };
