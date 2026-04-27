import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function Profile() {
  const { id } = useParams(); // Using ID as username for this demo
  const [user, setUser] = useState(null);

  useEffect(() => {
    // TODO: Fetch from /api/users/<username>/
    setUser({
      id: 1,
      username: id || 'DJ_Neon',
      bio: 'Underground Techno | Berlin -> Tokyo',
      profile_pic: null,
      followers_count: 1450,
      following_count: 320,
      is_followed: false,
    });
  }, [id]);

  if (!user) return <div className="text-neon-pink">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="neo-container glass-panel p-8 mb-8 flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-32 bg-neon-lime rounded-full border-4 border-black flex items-center justify-center text-4xl font-black">
          {user.profile_pic ? (
            <img src={user.profile_pic} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{user.username[0]}</span>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl text-neon-pink mb-2 font-black">{user.username}</h1>
          <p className="text-xl mb-4 font-bold">{user.bio}</p>
          <div className="flex gap-6 justify-center md:justify-start font-mono text-lg mb-4">
            <div><span className="text-neon-lime">{user.followers_count}</span> Followers</div>
            <div><span className="text-neon-lime">{user.following_count}</span> Following</div>
          </div>
          
          <div className="flex gap-4 justify-center md:justify-start">
            {/* Logic: if current_user == user: show Edit Profile, else show Follow */}
            <Link to="/edit-profile" className="neo-button bg-black text-white">
              EDIT PROFILE
            </Link>
            <button className={`neo-button ${user.is_followed ? 'bg-gray-500' : 'bg-neon-pink'} text-white`}>
              {user.is_followed ? 'UNFOLLOW' : 'FOLLOW'}
            </button>
          </div>
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
