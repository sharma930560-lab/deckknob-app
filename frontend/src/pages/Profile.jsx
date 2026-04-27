import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // TODO: Fetch profile from API using ID (or 'me' for current user)
    setProfile({
      username: id === 'me' ? 'DJ_Neon' : `User_${id}`,
      bio: 'Control the Beat. Own the Night.',
      profile_pic: null,
    });
  }, [id]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="neo-container p-8 glass-panel flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="w-32 h-32 bg-neon-pink rounded-full border-4 border-black shadow-[4px_4px_0_black] overflow-hidden flex items-center justify-center text-4xl font-black">
          {profile.profile_pic ? (
            <img src={profile.profile_pic} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span>{profile.username[0].toUpperCase()}</span>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl text-neon-lime mb-2">{profile.username}</h1>
          <p className="text-lg mb-4">{profile.bio || 'No bio yet.'}</p>
          
          {id === 'me' && (
            <Link to="/edit-profile" className="neo-button inline-block text-sm">
              EDIT PROFILE
            </Link>
          )}
        </div>
      </div>
      
      <div className="neo-container p-6 glass-panel">
        <h2 className="text-2xl text-neon-pink mb-4">RECENT POSTS</h2>
        <div className="text-center py-8 text-gray-400">
          Posts will appear here
        </div>
      </div>
    </div>
  );
}
