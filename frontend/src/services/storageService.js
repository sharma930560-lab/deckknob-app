import { storage } from '../config/firebase';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';

/**
 * Upload a file to Firebase Storage and return the public download URL.
 * @param {File} file - The file to upload.
 * @param {string} path - Full storage path, e.g. "users/uid123/profile_1234.jpg"
 * @param {function} [onProgress] - Optional callback(percent: number)
 * @returns {Promise<string>} The download URL.
 */
async function uploadToStorage(file, path, onProgress) {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress(percent);
        }
      },
      (error) => {
        console.error('[storageService] Upload error:', error);
        reject(new Error(`Upload failed: ${error.message}`));
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

export const storageService = {
  /**
   * Upload a user profile photo.
   * @param {string} uid
   * @param {File} file
   * @param {function} [onProgress]
   */
  uploadProfilePhoto: async (uid, file, onProgress) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `users/${uid}/profile_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },

  /**
   * Upload a post image or video.
   * @param {string} uid
   * @param {File} file
   * @param {function} [onProgress]
   */
  uploadPostMedia: async (uid, file, onProgress) => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `posts/${uid}/media_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },

  /**
   * Upload a reel video.
   * @param {string} uid
   * @param {File} file
   * @param {function} [onProgress]
   */
  uploadReelVideo: async (uid, file, onProgress) => {
    const ext = file.name.split('.').pop() || 'mp4';
    const path = `reels/${uid}/reel_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },

  /**
   * Upload a story image or video.
   * @param {string} uid
   * @param {File} file
   * @param {function} [onProgress]
   */
  uploadStoryMedia: async (uid, file, onProgress) => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `stories/${uid}/story_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },

  /**
   * Upload an event banner image.
   * @param {string} uid
   * @param {File} file
   * @param {function} [onProgress]
   */
  uploadEventBanner: async (uid, file, onProgress) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `events/${uid}/banner_${Date.now()}.${ext}`;
    return uploadToStorage(file, path, onProgress);
  },
};
