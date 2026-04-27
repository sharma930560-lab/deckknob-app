import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement register logic
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="neo-container max-w-md w-full p-8 glass-panel text-left">
        <h1 className="text-4xl mb-6 text-neon-pink text-center">JOIN DECKKNOB</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-heading mb-1 text-sm">Username</label>
            <input 
              type="text" 
              className="w-full bg-base-dark border-2 border-black p-2 text-white outline-none focus:border-neon-pink"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-heading mb-1 text-sm">Email</label>
            <input 
              type="email" 
              className="w-full bg-base-dark border-2 border-black p-2 text-white outline-none focus:border-neon-pink"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-heading mb-1 text-sm">Password</label>
            <input 
              type="password" 
              className="w-full bg-base-dark border-2 border-black p-2 text-white outline-none focus:border-neon-pink"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="neo-button w-full mt-4 bg-neon-pink text-white border-black">
            CREATE PROFILE
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          Already have an account? <Link to="/login" className="text-neon-lime hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
