export type UserRole = 'Admin' | 'DJ' | 'Venue' | 'Event Organizer' | 'Party User';

export interface UserProfile {
  uid: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  profilePic: string | null;
  role: UserRole;
  createdAt: number;
  isVerified?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}
