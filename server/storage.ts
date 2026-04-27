import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

function getSupabaseStorageClient(): SupabaseClient {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error(
      "Storage config missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

async function ensureBucket(supabase: SupabaseClient) {
  const bucket = ENV.supabaseStorageBucket;
  const { data } = await supabase.storage.getBucket(bucket);
  if (data) return;

  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: "10MB",
  });

  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Failed to create Supabase storage bucket: ${error.message}`);
  }
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const supabase = getSupabaseStorageClient();
  await ensureBucket(supabase);

  const key = appendHashSuffix(normalizeKey(relKey));
  const body = typeof data === "string" ? Buffer.from(data) : data;
  const { error } = await supabase.storage
    .from(ENV.supabaseStorageBucket)
    .upload(key, body, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(ENV.supabaseStorageBucket)
    .getPublicUrl(key);

  return { key, url: publicUrlData.publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const supabase = getSupabaseStorageClient();
  const { data } = supabase.storage.from(ENV.supabaseStorageBucket).getPublicUrl(key);
  return { key, url: data.publicUrl };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  const supabase = getSupabaseStorageClient();
  const { data, error } = await supabase.storage
    .from(ENV.supabaseStorageBucket)
    .createSignedUrl(key, 60 * 60);

  if (error || !data?.signedUrl) {
    throw new Error(`Supabase signed URL failed: ${error?.message ?? "empty URL"}`);
  }

  return data.signedUrl;
}
