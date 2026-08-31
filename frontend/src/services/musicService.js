import { db, storage } from '../config/firebase';
import { collection, doc, setDoc, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Pre-seeded high-quality royalty-free electronic music tracks
const STATIC_LIBRARY = [
  {
    id: 'track_1',
    title: 'Techno Pulse',
    artist: 'Leon Bassline',
    album: 'Underground Beats',
    genre: 'Techno',
    mood: 'Dark / Energetic',
    duration: 180,
    bpm: 128,
    key: 'A minor',
    energy: 9,
    danceability: 8,
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=120&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    licenseType: 'Creative Commons BY',
    attribution: 'SoundHelix / CC BY 4.0'
  },
  {
    id: 'track_2',
    title: 'Summer House Breeze',
    artist: 'Nora Waves',
    album: 'Ibiza Sunsets',
    genre: 'House',
    mood: 'Uplifting / Chill',
    duration: 210,
    bpm: 122,
    key: 'C major',
    energy: 7,
    danceability: 9,
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=120&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    licenseType: 'Creative Commons BY',
    attribution: 'SoundHelix / CC BY 4.0'
  },
  {
    id: 'track_3',
    title: 'Neon Horizon',
    artist: 'Synth Ranger',
    album: 'Retro Nights',
    genre: 'Synthwave',
    mood: 'Vibrant / Retro',
    duration: 195,
    bpm: 115,
    key: 'F major',
    energy: 6,
    danceability: 7,
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=120&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    licenseType: 'Creative Commons BY',
    attribution: 'SoundHelix / CC BY 4.0'
  },
  {
    id: 'track_4',
    title: 'Drum & Bass Catalyst',
    artist: 'Frequency Loop',
    album: 'Breakneck Speeds',
    genre: 'Drum & Bass',
    mood: 'Hyper / Intense',
    duration: 160,
    bpm: 172,
    key: 'G minor',
    energy: 10,
    danceability: 8,
    artwork: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?auto=format&fit=crop&w=120&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    licenseType: 'Creative Commons BY',
    attribution: 'SoundHelix / CC BY 4.0'
  },
  {
    id: 'track_5',
    title: 'Ambient Zen Space',
    artist: 'Kitaro Sky',
    album: 'Inner Peace',
    genre: 'Ambient',
    mood: 'Relaxing / Flowing',
    duration: 300,
    bpm: 90,
    key: 'E minor',
    energy: 2,
    danceability: 2,
    artwork: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=120&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    licenseType: 'Creative Commons BY',
    attribution: 'SoundHelix / CC BY 4.0'
  }
];

export const musicService = {
  // Search library
  searchLibrary: async (queryStr = '', filters = {}) => {
    try {
      let results = [...STATIC_LIBRARY];

      // Custom user uploads from Firestore (optional addition to library)
      const userUploadsSnap = await getDocs(collection(db, 'music'));
      userUploadsSnap.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });

      // Filter by string query
      if (queryStr.trim()) {
        const q = queryStr.toLowerCase();
        results = results.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            t.genre.toLowerCase().includes(q)
        );
      }

      // Filter by genre
      if (filters.genre && filters.genre !== 'All') {
        results = results.filter((t) => t.genre.toLowerCase() === filters.genre.toLowerCase());
      }

      // Filter by BPM range
      if (filters.bpmMin) {
        results = results.filter((t) => t.bpm >= filters.bpmMin);
      }
      if (filters.bpmMax) {
        results = results.filter((t) => t.bpm <= filters.bpmMax);
      }

      // Filter by mood
      if (filters.mood) {
        results = results.filter((t) => t.mood.toLowerCase().includes(filters.mood.toLowerCase()));
      }

      return results;
    } catch (e) {
      console.error('[musicService] searchLibrary error:', e);
      return STATIC_LIBRARY;
    }
  },

  // Upload original user sound/music file
  uploadOriginalSound: async (userId, file, title, metadata = {}, onProgress = null) => {
    try {
      const storageRef = ref(storage, `music/${userId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          },
          (error) => reject(error),
          async () => {
            const audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save metadata to Firestore 'music' collection
            const trackData = {
              title: title || file.name.split('.')[0],
              artist: metadata.artist || 'Original Mix',
              album: metadata.album || 'Single',
              genre: metadata.genre || 'Electronic',
              duration: metadata.duration || 60,
              bpm: metadata.bpm || 120,
              key: metadata.key || 'C minor',
              artwork: metadata.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=120&q=80',
              audioUrl,
              licenseType: 'Original Creator Sound',
              attribution: 'Uploaded by user ' + userId,
              createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'music'), trackData);
            resolve({ id: docRef.id, ...trackData });
          }
        );
      });
    } catch (e) {
      console.error('[musicService] uploadOriginalSound error:', e);
      throw e;
    }
  }
};
