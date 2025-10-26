import { supabase } from './supabase';

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name ('campaign-media' or 'content-library')
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  file: File,
  bucket: 'campaign-media' | 'content-library' = 'campaign-media'
): Promise<string> {
  // Generate a unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  // Upload the file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Upload a blob URL to Supabase Storage
 * @param blobUrl - The blob URL to convert and upload
 * @param filename - Original filename
 * @param bucket - The storage bucket name
 * @returns The public URL of the uploaded file
 */
export async function uploadBlobUrl(
  blobUrl: string,
  filename: string,
  bucket: 'campaign-media' | 'content-library' = 'campaign-media'
): Promise<string> {
  // Fetch the blob
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  
  // Create a File object from the blob
  const file = new File([blob], filename, { type: blob.type });
  
  // Upload using the regular upload function
  return uploadFile(file, bucket);
}

/**
 * Delete a file from Supabase Storage
 * @param url - The public URL of the file to delete
 * @param bucket - The storage bucket name
 */
export async function deleteFile(
  url: string,
  bucket: 'campaign-media' | 'content-library' = 'campaign-media'
): Promise<void> {
  // Extract the file path from the URL
  const urlParts = url.split('/');
  const filePath = urlParts[urlParts.length - 1];

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Generate a video thumbnail and upload it
 * @param videoFile - The video file
 * @param bucket - The storage bucket name
 * @returns Object with video URL and thumbnail URL
 */
export async function uploadVideoWithThumbnail(
  videoFile: File,
  bucket: 'campaign-media' | 'content-library' = 'campaign-media'
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  // Upload the video first
  const videoUrl = await uploadFile(videoFile, bucket);

  // Generate thumbnail
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoFile);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve({ videoUrl, thumbnailUrl: videoUrl });
            return;
          }

          try {
            // Create thumbnail file
            const thumbnailFile = new File(
              [blob],
              videoFile.name.replace(/\.[^/.]+$/, '.jpg'),
              { type: 'image/jpeg' }
            );

            // Upload thumbnail
            const thumbnailUrl = await uploadFile(thumbnailFile, bucket);
            resolve({ videoUrl, thumbnailUrl });
          } catch (error) {
            console.error('Error uploading thumbnail:', error);
            resolve({ videoUrl, thumbnailUrl: videoUrl });
          }
        }, 'image/jpeg', 0.8);
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        resolve({ videoUrl, thumbnailUrl: videoUrl });
      } finally {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video for thumbnail generation'));
    };
  });
}

