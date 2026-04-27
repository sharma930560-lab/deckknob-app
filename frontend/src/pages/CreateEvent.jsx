import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // TODO: Submit to /api/events/
    // await axios.post('/api/events/', { title, description, date_time: dateTime, location_name: locationName });
    
    setIsSubmitting(false);
    navigate('/events');
  };

  return (
    <div className="neo-container p-8 glass-panel max-w-2xl mx-auto">
      <h1 className="text-3xl text-neon-pink mb-6 font-black italic">HOST AN EVENT</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-heading mb-2 text-neon-lime text-lg">EVENT TITLE</label>
          <input 
            type="text" 
            placeholder="e.g. Midnight Techno Session"
            className="w-full bg-base-dark border-2 border-black p-3 text-white outline-none focus:border-neon-pink"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-heading mb-2 text-neon-lime text-lg">DATE & TIME</label>
            <input 
              type="datetime-local" 
              className="w-full bg-base-dark border-2 border-black p-3 text-white outline-none focus:border-neon-pink"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-heading mb-2 text-neon-lime text-lg">LOCATION</label>
            <input 
              type="text" 
              placeholder="e.g. Club Horizon"
              className="w-full bg-base-dark border-2 border-black p-3 text-white outline-none focus:border-neon-pink"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block font-heading mb-2 text-neon-lime text-lg">DETAILS</label>
          <textarea 
            className="w-full bg-base-dark border-2 border-black p-3 text-white outline-none focus:border-neon-pink h-32"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us about the vibes..."
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`neo-button w-full bg-neon-pink text-white border-black font-black italic py-4 ${isSubmitting ? 'opacity-50' : ''}`}
        >
          {isSubmitting ? 'LAUNCHING...' : 'PUBLISH EVENT'}
        </button>
      </form>
    </div>
  );
}
