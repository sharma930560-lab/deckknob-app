import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement login logic
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="neo-container max-w-md w-full p-8 glass-panel text-left">
        <h1 className="text-4xl mb-6 text-neon-lime text-center">LOGIN</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-heading mb-1 text-sm">Username or Email</label>
            <input 
              type="text" 
              className="w-full bg-base-dark border-2 border-black p-2 text-white outline-none focus:border-neon-lime"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-heading mb-1 text-sm">Password</label>
            <input 
              type="password" 
              className="w-full bg-base-dark border-2 border-black p-2 text-white outline-none focus:border-neon-lime"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="neo-button w-full mt-4">
            ENTER THE NIGHT
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          Don't have an account? <Link to="/register" className="text-neon-pink hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
