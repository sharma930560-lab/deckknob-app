import { useState, useEffect } from 'react';

export default function ManageSocials() {
  const [links, setLinks] = useState([]);
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    // TODO: Fetch social links for current user
    setLinks([
      { id: 1, platform_name: 'Instagram', url: 'https://instagram.com/dj_neon' },
      { id: 2, platform_name: 'Spotify', url: 'https://spotify.com' }
    ]);
  }, []);

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!platform || !url) return;
    
    // TODO: Submit to API
    const newLink = { id: Date.now(), platform_name: platform, url };
    setLinks([...links, newLink]);
    setPlatform('');
    setUrl('');
  };

  const handleRemove = (id) => {
    // TODO: Delete from API
    setLinks(links.filter(link => link.id !== id));
  };

  return (
    <div className="neo-container p-8 glass-panel max-w-2xl mx-auto">
      <h1 className="text-3xl text-neon-pink mb-6">SOCIAL LINKS</h1>
      
      <form onSubmit={handleAddLink} className="flex flex-col md:flex-row gap-4 mb-8">
        <input 
          type="text" 
          placeholder="Platform (e.g. Instagram)"
          className="flex-1 bg-base-dark border-2 border-black p-3 text-white outline-none focus:border-neon-pink"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        />
        <input 
          type="url" 
          placeholder="https://..."
          className="flex-2 bg-base-dark border-2 border-black p-3 text-white outline-none focus:border-neon-pink"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" className="neo-button bg-neon-pink text-white border-black md:w-32">
          ADD
        </button>
      </form>

      <div className="space-y-4">
        {links.map((link) => (
          <div key={link.id} className="flex justify-between items-center bg-base-dark border-2 border-black p-4">
            <div>
              <p className="font-heading font-black text-neon-lime">{link.platform_name}</p>
              <a href={link.url} target="_blank" rel="noreferrer" className="text-sm text-gray-400 hover:underline">
                {link.url}
              </a>
            </div>
            <button 
              onClick={() => handleRemove(link.id)}
              className="text-red-500 hover:text-red-400 font-black italic p-2"
            >
              X
            </button>
          </div>
        ))}
        {links.length === 0 && (
          <p className="text-center text-gray-400 py-4">No social links added yet.</p>
        )}
      </div>
    </div>
  );
}
