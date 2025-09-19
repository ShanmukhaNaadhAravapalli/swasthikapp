// lib/uploadToSupabase.ts
import { supabase } from "./supabaseClient";

/**
 * Uploads a file to the `attachments` bucket (public) and returns metadata.
 * Throws an error if upload fails.
 */
export async function uploadFileToSupabase(file: File, folder = "attachments") {
  if (!file) throw new Error("No file provided");

  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.name.replace(/\s+/g, "_")}`;
  const path = `${folder}/${safeName}`;

  const { data, error } = await supabase.storage
    .from("attachments")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error || !data) {
    throw new Error(error?.message ?? "Supabase upload failed");
  }

  const { publicUrl } = supabase.storage.from("attachments").getPublicUrl(data.path).data;
  return {
    publicUrl,
    path: data.path,
    filename: file.name,
    mime: file.type,
    size: file.size,
  };
}
