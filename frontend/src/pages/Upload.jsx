import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    // TODO: Upload file to Cloudinary directly from frontend using their API
    // const formData = new FormData();
    // formData.append('file', file);
    // formData.append('upload_preset', 'your_preset');
    // const cloudinaryResponse = await axios.post('https://api.cloudinary.com/v1_1/YOUR_CLOUD/upload', formData);
    // const mediaUrl = cloudinaryResponse.data.secure_url;
    
    // TODO: Send mediaUrl and caption to Django backend
    // await axios.post('/api/posts/', { media_url: mediaUrl, media_type: 'image', caption });
    
    setIsUploading(false);
    navigate('/feed');
  };

  return (
    <div className="neo-container p-8 glass-panel max-w-2xl mx-auto">
      <h1 className="text-3xl text-neon-lime mb-6">NEW POST</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-heading mb-2 text-neon-pink">1. Choose Media (Image/Video)</label>
          <input 
            type="file" 
            accept="image/*,video/*"
            className="w-full bg-base-dark border-2 border-black p-3 text-white file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-neon-pink file:text-white hover:file:bg-pink-600"
            onChange={handleFileChange}
            required
          />
        </div>
        
        <div>
          <label className="block font-heading mb-2 text-neon-pink">2. Caption</label>
          <textarea 
            className="w-full bg-base-dark border-2 border-black p-3 text-white outline-none focus:border-neon-lime h-32"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's happening tonight?..."
          />
        </div>
        
        <button 
          type="submit" 
          disabled={!file || isUploading}
          className={`neo-button w-full ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isUploading ? 'UPLOADING...' : 'POST'}
        </button>
      </form>
    </div>
  );
}
