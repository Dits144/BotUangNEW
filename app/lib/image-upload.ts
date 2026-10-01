import { supabase } from "./supabase";

type UploadImageOptions = {
  file: File;
  bucket: "owner-assets" | "rental-proofs";
  groupId?: string;
};

export async function uploadDashboardImage({
  file,
  bucket,
  groupId,
}: UploadImageOptions) {
  const auth = await supabase.auth.getSession();
  const token = auth.data.session?.access_token ?? "";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  if (groupId) formData.append("group_id", groupId);

  return fetch("/api/storage/image-upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }).then(
    (response) =>
      response.json() as Promise<{
        ok?: boolean;
        message?: string;
        storagePath?: string;
        signedUrl?: string;
      }>,
  );
}

export async function resolveDashboardImage(storagePath: string) {
  if (!storagePath || /^https?:\/\//i.test(storagePath) || storagePath.startsWith("data:")) {
    return storagePath;
  }

  const auth = await supabase.auth.getSession();
  const token = auth.data.session?.access_token ?? "";
  const response = await fetch(
    `/api/storage/image-upload?path=${encodeURIComponent(storagePath)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    signedUrl?: string;
  };
  return data.ok ? data.signedUrl ?? "" : "";
}
