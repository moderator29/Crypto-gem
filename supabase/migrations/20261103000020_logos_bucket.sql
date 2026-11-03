-- Public bucket for project logos uploaded in the Add Coin flow. Uploads happen only from the
-- server with the secret key, under a folder named after the uploader's user id.
-- Not exercised by the PGlite tests because they have no storage schema.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
