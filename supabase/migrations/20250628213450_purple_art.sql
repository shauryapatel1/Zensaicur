/*
  # Storage Buckets Setup

  1. New Buckets
    - `journal-photos` - For storing user-uploaded journal photos
    - `affirmation-audio` - For storing generated audio files

  2. Security
    - Set up RLS policies for secure access
    - Allow users to access only their own files
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('journal-photos', 'Journal Photos', false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('affirmation-audio', 'Affirmation Audio', false, false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for journal photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'journal-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Set up RLS policies for affirmation audio
CREATE POLICY "Users can upload their own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'affirmation-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'affirmation-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'affirmation-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'affirmation-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);