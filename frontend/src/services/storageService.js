import axios from 'axios';
import { storage, auth } from '../config/firebase';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';

// ── Environment Configuration ───────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const IS_CLOUDINARY_CONFIGURED = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

/**
 * Convert a base64 data URL to a Blob.
 */
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function getMimeTypeFromExtension(path, fallback = 'image/jpeg') {
  const ext = (path || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'webm': return 'video/webm';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'm4a': return 'audio/mp4';
    case 'aac': return 'audio/aac';
    case 'ogg': return 'audio/ogg';
    case 'flac': return 'audio/flac';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    default: return fallback;
  }
}

function getFileExtension(fileOrBlob, defaultExt = 'jpg') {
  if (fileOrBlob?.name) {
    const ext = fileOrBlob.name.split('.').pop()?.toLowerCase();
    if (ext && ext.length < 5) return ext;
  }
  if (fileOrBlob?.type) {
    const ext = fileOrBlob.type.split('/').pop()?.toLowerCase();
    if (ext === 'jpeg') return 'jpg';
    if (ext && ext.length < 5) return ext;
  }
  return defaultExt;
}

function resolveActiveUid(uid) {
  const activeUid = auth.currentUser?.uid || uid;
  if (!activeUid) {
    throw new Error('Authentication required: user must be logged in to upload media.');
  }
  return activeUid;
}

/**
 * Upload to Cloudinary using an Unsigned Upload Preset.
 * Completely free tier, no credit card, no Firebase billing.
 */
async function uploadToCloudinary(fileOrBlobOrDataUrl, folder, resourceType = 'auto', onProgress) {
  if (!IS_CLOUDINARY_CONFIGURED) {
    throw new Error('Cloudinary is not configured. Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const formData = new FormData();
  formData.append('file', fileOrBlobOrDataUrl);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  try {
    const response = await axios.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    if (response.data && response.data.secure_url) {
      return response.data.secure_url;
    }
    throw new Error('Cloudinary response did not contain a secure_url.');
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('[storageService] Cloudinary upload error:', msg);
    throw new Error(`Media upload failed: ${msg}`, { cause: error });
  }
}

/**
 * Upload to Firebase Storage (Fallback when Cloudinary is not active).
 */
async function uploadToFirebaseStorage(fileOrBlobOrDataUrl, path, onProgress) {
  if (!fileOrBlobOrDataUrl) {
    throw new Error('No media file provided for upload.');
  }

  let uploadableBlob = fileOrBlobOrDataUrl;
  let contentType = 'image/jpeg';

  if (typeof fileOrBlobOrDataUrl === 'string' && fileOrBlobOrDataUrl.startsWith('data:')) {
    uploadableBlob = dataURLtoBlob(fileOrBlobOrDataUrl);
    contentType = uploadableBlob.type || getMimeTypeFromExtension(path, 'image/jpeg');
  } else if (fileOrBlobOrDataUrl instanceof Blob || fileOrBlobOrDataUrl instanceof File) {
    uploadableBlob = fileOrBlobOrDataUrl;
    contentType = fileOrBlobOrDataUrl.type || getMimeTypeFromExtension(path, 'image/jpeg');
  }

  if (!contentType || contentType === 'application/octet-stream') {
    contentType = getMimeTypeFromExtension(path, 'image/jpeg');
  }

  const storageRef = ref(storage, path);
  const metadata = {
    contentType,
    customMetadata: {
      uploadedAt: new Date().toISOString()
    }
  };

  const uploadTask = uploadBytesResumable(storageRef, uploadableBlob, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress(percent);
        }
      },
      (error) => {
        console.error('[storageService] Firebase Storage error:', error);
        if (error.code === 'storage/unknown' || error.status_ === 404) {
          reject(new Error(
            'Media storage is unprovisioned. To enable free media persistence without Firebase billing, configure Cloudinary (VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET) in your .env file, or activate Cloud Storage in the Firebase Console.'
          ));
        } else {
          reject(new Error(`Storage upload failed: ${error.message}`));
        }
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Primary Media Dispatcher.
 * Routes to Cloudinary if configured; otherwise routes to Firebase Storage.
 */
async function uploadMedia({ file, path, folder, resourceType = 'auto', onProgress }) {
  if (IS_CLOUDINARY_CONFIGURED) {
    return uploadToCloudinary(file, folder, resourceType, onProgress);
  }
  return uploadToFirebaseStorage(file, path, onProgress);
}

export const storageService = {
  /**
   * Status of configured storage providers.
   */
  getProviderStatus: () => ({
    provider: IS_CLOUDINARY_CONFIGURED ? 'cloudinary' : 'firebase',
    cloudinaryConfigured: IS_CLOUDINARY_CONFIGURED,
    cloudName: CLOUDINARY_CLOUD_NAME || null,
  }),

  /**
   * Upload a user profile photo.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadProfilePhoto: async (uid, file, onProgress) => {
    const activeUid = resolveActiveUid(uid);
    const ext = getFileExtension(file, 'jpg');
    return uploadMedia({
      file,
      path: `users/${activeUid}/profile_${Date.now()}.${ext}`,
      folder: `deckknob/users/${activeUid}`,
      resourceType: 'image',
      onProgress,
    });
  },

  /**
   * Upload a post image or video.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadPostMedia: async (uid, file, onProgress) => {
    const activeUid = resolveActiveUid(uid);
    const isVideo = file?.type?.startsWith('video');
    const defaultExt = isVideo ? 'mp4' : 'jpg';
    const ext = getFileExtension(file, defaultExt);
    return uploadMedia({
      file,
      path: `posts/${activeUid}/media_${Date.now()}.${ext}`,
      folder: `deckknob/posts/${activeUid}`,
      resourceType: isVideo ? 'video' : 'image',
      onProgress,
    });
  },

  /**
   * Upload a reel video.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadReelVideo: async (uid, file, onProgress) => {
    const activeUid = resolveActiveUid(uid);
    const ext = getFileExtension(file, 'mp4');
    return uploadMedia({
      file,
      path: `reels/${activeUid}/reel_${Date.now()}.${ext}`,
      folder: `deckknob/reels/${activeUid}`,
      resourceType: 'video',
      onProgress,
    });
  },

  /**
   * Upload a story image or video.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadStoryMedia: async (uid, file, onProgress) => {
    const activeUid = resolveActiveUid(uid);
    const isVideo = file?.type?.startsWith('video');
    const defaultExt = isVideo ? 'mp4' : 'jpg';
    const ext = getFileExtension(file, defaultExt);
    return uploadMedia({
      file,
      path: `stories/${activeUid}/story_${Date.now()}.${ext}`,
      folder: `deckknob/stories/${activeUid}`,
      resourceType: isVideo ? 'video' : 'image',
      onProgress,
    });
  },

  /**
   * Upload an event banner image.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadEventBanner: async (uid, file, onProgress) => {
    const activeUid = resolveActiveUid(uid);
    const ext = getFileExtension(file, 'jpg');
    return uploadMedia({
      file,
      path: `events/${activeUid}/banner_${Date.now()}.${ext}`,
      folder: `deckknob/events/${activeUid}`,
      resourceType: 'image',
      onProgress,
    });
  },

  /**
   * Upload a DJ audio demo track.
   * Supports MP3, WAV, M4A, OGG, AAC up to 25MB.
   * Cloudinary accepts audio files via the 'video' resource type.
   */
  uploadAudioDemo: async (uid, file, onProgress) => {
    const activeUid = resolveActiveUid(uid);
    if (!file) throw new Error('No audio file provided.');

    const MAX_SIZE = 25 * 1024 * 1024; // 25MB limit
    if (file.size && file.size > MAX_SIZE) {
      throw new Error(`Audio file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 25MB limit.`);
    }

    const ext = getFileExtension(file, 'mp3');
    const validAudioExts = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'];
    if (!validAudioExts.includes(ext.toLowerCase())) {
      throw new Error(`Unsupported audio format: .${ext}. Supported formats: MP3, WAV, M4A, OGG, AAC.`);
    }

    return uploadMedia({
      file,
      path: `demos/${activeUid}/demo_${Date.now()}.${ext}`,
      folder: `deckknob/demos/${activeUid}`,
      resourceType: 'video', // Cloudinary video endpoint processes audio
      onProgress,
    });
  },

  /**
   * Upload playlist cover artwork.
   */
  uploadPlaylistCover: async (uid, file, onProgress) => {
    const activeUid = resolveActiveUid(uid);
    const ext = getFileExtension(file, 'jpg');
    return uploadMedia({
      file,
      path: `playlists/${activeUid}/cover_${Date.now()}.${ext}`,
      folder: `deckknob/playlists/${activeUid}`,
      resourceType: 'image',
      onProgress,
    });
  },
};
