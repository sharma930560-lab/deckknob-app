import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EditProfile() {
  const navigate = useNavigate();
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState('');

  useEffect(() => {
    // TODO: Fetch existing profile data
    setBio('Control the Beat. Own the Night.');
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Submit updated profile to API
    navigate('/profile/me');
  };

  return (
    <div className="neo-container p-8 glass-panel max-w-2xl mx-auto">
      <h1 className="text-3xl text-neon-lime mb-6">EDIT PROFILE</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-heading mb-2">Profile Picture URL (Cloudinary)</label>
          <input 
            type="url" 
            className="w-full bg-base-dark border-2 border-black p-3 text-white outline-none focus:border-neon-lime"
            value={profilePic}
            onChange={(e) => setProfilePic(e.target.value)}
            placeholder="https://res.cloudinary.com/..."
          />
        </div>
        
        <div>
          <label className="block font-heading mb-2">Bio</label>
          <textarea 
            className="w-full bg-base-dark border-2 border-black p-3 text-white outline-none focus:border-neon-lime h-32"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
          />
        </div>
        
        <div className="flex gap-4">
          <button type="submit" className="neo-button flex-1 bg-neon-lime text-black">
            SAVE CHANGES
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/profile/me')}
            className="neo-button flex-1 bg-gray-600 text-white"
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
}
