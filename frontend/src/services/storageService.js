import { storage } from '../config/firebase';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';

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

/**
 * Upload a File, Blob, or DataURL to Firebase Storage and return the download URL.
 * @param {File|Blob|string} fileOrBlobOrDataUrl - The file or base64 string to upload.
 * @param {string} path - Full storage path, e.g. "users/uid123/profile_1234.jpg"
 * @param {function} [onProgress] - Optional callback(percent: number)
 * @returns {Promise<string>} The download URL.
 */
async function uploadToStorage(fileOrBlobOrDataUrl, path, onProgress) {
  let uploadableBlob = fileOrBlobOrDataUrl;
  let contentType = 'application/octet-stream';

  if (typeof fileOrBlobOrDataUrl === 'string' && fileOrBlobOrDataUrl.startsWith('data:')) {
    uploadableBlob = dataURLtoBlob(fileOrBlobOrDataUrl);
    contentType = uploadableBlob.type;
  } else if (fileOrBlobOrDataUrl instanceof Blob || fileOrBlobOrDataUrl instanceof File) {
    uploadableBlob = fileOrBlobOrDataUrl;
    contentType = fileOrBlobOrDataUrl.type || (path.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
  }

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, uploadableBlob, {
    contentType,
  });

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
        console.error('[storageService] Upload error:', error);
        reject(new Error(`Storage upload failed: ${error.message}`));
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

export const storageService = {
  /**
   * Upload a user profile photo.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadProfilePhoto: async (uid, file, onProgress) => {
    const ext = getFileExtension(file, 'jpg');
    const path = `users/${uid}/profile_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },

  /**
   * Upload a post image or video.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadPostMedia: async (uid, file, onProgress) => {
    const defaultExt = file?.type?.startsWith('video') ? 'mp4' : 'jpg';
    const ext = getFileExtension(file, defaultExt);
    const path = `posts/${uid}/media_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },

  /**
   * Upload a reel video.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadReelVideo: async (uid, file, onProgress) => {
    const ext = getFileExtension(file, 'mp4');
    const path = `reels/${uid}/reel_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },

  /**
   * Upload a story image or video.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadStoryMedia: async (uid, file, onProgress) => {
    const defaultExt = file?.type?.startsWith('video') ? 'mp4' : 'jpg';
    const ext = getFileExtension(file, defaultExt);
    const path = `stories/${uid}/story_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },

  /**
   * Upload an event banner image.
   * @param {string} uid
   * @param {File|Blob|string} file
   * @param {function} [onProgress]
   */
  uploadEventBanner: async (uid, file, onProgress) => {
    const ext = getFileExtension(file, 'jpg');
    const path = `events/${uid}/banner_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },
};
