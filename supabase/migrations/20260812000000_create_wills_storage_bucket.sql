-- Storage bucket for generated will documents (created via dashboard/tool in whisper)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('wills', 'wills', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']::text[])
ON CONFLICT (id) DO NOTHING;
