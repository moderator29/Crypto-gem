-- Public bucket for approved ad creatives. Uploads happen only from the server with the secret key.
-- Not exercised by the PGlite tests because they have no storage schema.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creatives', 'creatives', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
