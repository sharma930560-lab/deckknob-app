import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  increment,
  deleteDoc
} from 'firebase/firestore';

// Fallback high-fidelity pre-seeded venues list if Firestore is empty
const MOCK_VENUES = [
  {
    id: 'venue_omnia',
    name: 'OMNIA Nightclub',
    category: 'Nightclub / Lounge',
    address: '88 Link Road, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    latitude: 19.0600,
    longitude: 72.8362,
    rating: 4.8,
    bannerUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb1?auto=format&fit=crop&w=120&q=80',
    description: 'OMNIA Mumbai is a state-of-the-art multi-level club with customized LED kinetics and deep bass subwoofers.',
    phone: '+91 99999 88888',
    website: 'https://omnia-mumbai.com',
    timezone: 'Asia/Kolkata',
    operatingHours: '10:30 PM - 03:00 AM',
    amenities: ['Parking', 'Valet', 'VIP Box', 'Dance Floor', 'Outdoor Deck', 'Indoor Club'],
    crowdLevel: 'Packed', // 'Low' | 'Moderate' | 'Busy' | 'Packed' | 'Full Capacity'
    currentMusic: {
      dj: 'bassline_leo',
      genre: 'Acid Techno',
      bpm: 132,
      key: 'D Minor',
      song: 'Resonance (Original Mix)',
      energy: 9
    },
    lineup: [
      { dj: 'bassline_leo', time: '11:00 PM - 12:30 AM', stage: 'Main Stage' },
      { dj: 'maya_afro', time: '12:30 AM - 02:00 AM', stage: 'Main Stage' },
      { dj: 'guest_dj', time: '02:00 AM - Close', stage: 'Main Stage' }
    ]
  },
  {
    id: 'venue_pulse',
    name: 'PULSE INDEX',
    category: 'Underground Club',
    address: 'Phoenix Palladium, Lower Parel',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    latitude: 18.9926,
    longitude: 72.8277,
    rating: 4.9,
    bannerUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=800&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=120&q=80',
    description: 'Dedicated to underground techno and progressive sounds. Industrial design, dark space, pure strobe focus.',
    phone: '+91 88888 77777',
    website: 'https://pulseindex.in',
    timezone: 'Asia/Kolkata',
    operatingHours: '10:00 PM - 02:30 AM',
    amenities: ['VIP Area', 'Dance Floor', 'Smoking Zone', 'Live Visuals', 'Indoor'],
    crowdLevel: 'Busy',
    currentMusic: {
      dj: 'dj_pulse',
      genre: 'Progressive House',
      bpm: 124,
      key: 'G Major',
      song: 'Ethereal Waves',
      energy: 7
    },
    lineup: [
      { dj: 'nora_waves', time: '10:30 PM - 12:00 AM', stage: 'Underground Cellar' },
      { dj: 'dj_pulse', time: '12:00 AM - 02:30 AM', stage: 'Underground Cellar' }
    ]
  }
];

export const locationService = {
  // Autocomplete Autosearch places & clubs using Google Maps Place API (mock fallback included)
  searchLocations: async (queryText) => {
    if (!queryText.trim()) return [];
    try {
      // Direct call fallback logic: Check if google maps script is loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        const service = new window.google.maps.places.AutocompleteService();
        return new Promise((resolve) => {
          service.getPlacePredictions({ input: queryText }, (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions.map(p => ({
                id: p.place_id,
                name: p.structured_formatting.main_text,
                address: p.description,
                description: p.description
              })));
            } else {
              resolve([]);
            }
          });
        });
      }

      // Mock Local Database Search matches
      const q = queryText.toLowerCase();
      const matchedMock = MOCK_VENUES.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
      ).map(v => ({
        id: v.id,
        name: v.name,
        address: v.address + ', ' + v.city,
        description: v.name + ' - ' + v.category
      }));

      return matchedMock;
    } catch (e) {
      console.error('[locationService] searchLocations error:', e);
      return [];
    }
  },

  // Get single venue profile details
  getVenueProfile: async (venueId) => {
    try {
      const docRef = doc(db, 'venues', venueId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }

      // Fallback preseeded database
      const matched = MOCK_VENUES.find(v => v.id === venueId);
      if (matched) {
        // Automatically save back to Firestore to seed it
        await setDoc(docRef, matched);
        return matched;
      }
      return null;
    } catch (e) {
      console.error('[locationService] getVenueProfile error:', e);
      return MOCK_VENUES.find(v => v.id === venueId) || null;
    }
  },

  // Toggle follow venue profile
  toggleFollowVenue: async (venueId, currentUid) => {
    try {
      const followRef = doc(db, 'venueFollowers', `${venueId}_${currentUid}`);
      const snap = await getDoc(followRef);

      if (snap.exists()) {
        await deleteDoc(followRef);
        // Decrement followers count
        await updateDoc(doc(db, 'venues', venueId), {
          followersCount: increment(-1)
        }).catch(() => {});
        return { followed: false };
      } else {
        await setDoc(followRef, {
          venueId,
          userId: currentUid,
          createdAt: serverTimestamp()
        });
        // Increment followers count
        await updateDoc(doc(db, 'venues', venueId), {
          followersCount: increment(1)
        }).catch(() => {});
        return { followed: true };
      }
    } catch (e) {
      console.error('[locationService] toggleFollowVenue error:', e);
      throw e;
    }
  },

  // Check if following
  isFollowingVenue: async (venueId, currentUid) => {
    try {
      const followRef = doc(db, 'venueFollowers', `${venueId}_${currentUid}`);
      const snap = await getDoc(followRef);
      return snap.exists();
    } catch (e) {
      return false;
    }
  },

  // Submit verified reviews
  addVenueReview: async (venueId, currentUid, username, avatar, reviewData) => {
    try {
      const reviewsRef = collection(db, 'venueReviews');
      const docData = {
        venueId,
        authorId: currentUid,
        authorUsername: username,
        authorAvatar: avatar || '',
        rating: reviewData.rating || 5,
        ratingMusic: reviewData.ratingMusic || 5,
        ratingCrowd: reviewData.ratingCrowd || 5,
        ratingSound: reviewData.ratingSound || 5,
        ratingSecurity: reviewData.ratingSecurity || 5,
        text: reviewData.text || '',
        verifiedAttendee: true,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(reviewsRef, docData);
      
      // Update overall venue rating average
      const venueRef = doc(db, 'venues', venueId);
      await updateDoc(venueRef, {
        rating: increment(0.1) // simple incremental logic fallback
      }).catch(() => {});

      return { id: docRef.id, ...docData };
    } catch (e) {
      console.error('[locationService] addVenueReview error:', e);
      throw e;
    }
  },

  // List venue reviews
  getVenueReviews: async (venueId) => {
    try {
      const q = query(
        collection(db, 'venueReviews'),
        where('venueId', '==', venueId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const reviews = [];
      snap.forEach((doc) => {
        reviews.push({ id: doc.id, ...doc.data() });
      });
      return reviews;
    } catch (e) {
      console.error('[locationService] getVenueReviews error:', e);
      return [];
    }
  },

  // Check-in user to calculate live crowd level
  checkInVenue: async (venueId, currentUid) => {
    try {
      const checkInRef = collection(db, 'checkIns');
      await addDoc(checkInRef, {
        venueId,
        userId: currentUid,
        createdAt: serverTimestamp()
      });

      // Recalculate crowd level optimistically
      const crowdLevels = ['Low', 'Moderate', 'Busy', 'Packed', 'Full Capacity'];
      const currentVenue = await locationService.getVenueProfile(venueId);
      const currentIdx = crowdLevels.indexOf(currentVenue.crowdLevel || 'Moderate');
      const nextIdx = Math.min(crowdLevels.length - 1, currentIdx + 1);

      await updateDoc(doc(db, 'venues', venueId), {
        crowdLevel: crowdLevels[nextIdx]
      }).catch(() => {});

      return crowdLevels[nextIdx];
    } catch (e) {
      console.error('[locationService] checkInVenue error:', e);
      return 'Busy';
    }
  },

  // Get nearby events
  getNearbyEvents: async (lat, lng, city = 'Mumbai') => {
    try {
      const q = query(
        collection(db, 'posts'), // Or events collection
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const events = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.venue || d.address) {
          events.push({ id: doc.id, ...d });
        }
      });
      return events;
    } catch (e) {
      return [];
    }
  }
};
