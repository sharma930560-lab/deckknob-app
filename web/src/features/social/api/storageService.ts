import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/core/firebase/config';

export const storageService = {
  uploadMedia: (
    uid: string,
    file: File,
    folder: string,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop();
      const storageRef = ref(storage, `${folder}/${uid}/${Date.now()}.${ext}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('[storageService] upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  },

  uploadPostMedia: (uid: string, file: File, onProgress?: (p: number) => void) =>
    storageService.uploadMedia(uid, file, 'posts', onProgress),

  uploadReelVideo: (uid: string, file: File, onProgress?: (p: number) => void) =>
    storageService.uploadMedia(uid, file, 'reels', onProgress),

  uploadStoryMedia: (uid: string, file: File, onProgress?: (p: number) => void) =>
    storageService.uploadMedia(uid, file, 'stories', onProgress),

  uploadEventBanner: (uid: string, file: File, onProgress?: (p: number) => void) =>
    storageService.uploadMedia(uid, file, 'events', onProgress),
};
