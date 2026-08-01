import path from 'path';
import fs from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { prisma } from './prisma';

/**
 * Image storage behind a single interface. By default images are stored
 * directly inside MongoDB (as base64) and served back through
 * GET /api/v1/images/:id — this removes any dependency on disk paths, a
 * correctly-set PUBLIC_BASE_URL, or a reverse-proxied /uploads route, so the
 * image rides the same /api origin the frontend already talks to.
 *
 * If Supabase is configured it takes precedence (public bucket, survives
 * redeploys). The on-disk `uploads/` folder is kept only as a last-resort
 * local-dev fallback. Swapping providers (R2/S3) later means changing only
 * this file.
 */

export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (!env.supabase.url || !env.supabase.serviceKey) return null;
  if (!supabase) {
    supabase = createClient(env.supabase.url, env.supabase.serviceKey, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

export const isCloudStorage = () => !!getSupabase();

/**
 * Persist an already-optimised JPEG buffer and return its public URL.
 */
export async function saveImage(filename: string, buffer: Buffer): Promise<string> {
  const client = getSupabase();

  if (client) {
    const { error } = await client.storage
      .from(env.supabase.bucket)
      .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data } = client.storage.from(env.supabase.bucket).getPublicUrl(filename);
    return data.publicUrl;
  }

  // Default: store the image bytes directly in MongoDB as base64 and return
  // an API URL that serves them back. No disk / proxy / base-URL fragility.
  if (env.imageStore !== 'disk') {
    const image = await prisma.image.create({
      data: { data: buffer.toString('base64'), mimeType: 'image/jpeg' },
    });
    return `${env.publicBaseUrl}/api/v1/images/${image.id}`;
  }

  // Last-resort local-disk fallback (opt in with IMAGE_STORE=disk).
  await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return `${env.publicBaseUrl}/uploads/${filename}`;
}
