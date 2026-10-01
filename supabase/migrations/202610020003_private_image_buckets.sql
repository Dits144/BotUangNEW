-- Private image buckets. Upload and signed reads are handled by Next.js API
-- routes with service-role authorization checks.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'owner-assets',
    'owner-assets',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'rental-proofs',
    'rental-proofs',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
