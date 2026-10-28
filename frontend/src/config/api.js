// DECKKNOB is built on 100% Firebase Serverless (Free Spark Tier).
// Authentication, Firestore Database, and Storage operate directly via Firebase JS SDK.
// No paid/external server is required.
const DEFAULT_API_ORIGIN = 'http://localhost:8000';
const rawApiUrl = import.meta.env.VITE_API_URL || DEFAULT_API_ORIGIN;

export const API_BASE_URL = rawApiUrl.replace(/\/$/, '');
export const API_BASE = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

