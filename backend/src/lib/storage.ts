import path from 'path';
import fs from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/**
 * Image storage behind a single interface. In production (Supabase configured)
 * images are uploaded to a public Storage bucket and survive redeploys; in
 * local dev they fall back to the on-disk `uploads/` folder. Swapping providers
 * (R2/S3) later means changing only this file.
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

  // Local disk fallback.
  await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return `${env.publicBaseUrl}/uploads/${filename}`;
}
