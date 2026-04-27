import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import MainLayout from './layouts/MainLayout';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ManageSocials from './pages/ManageSocials';
import Upload from './pages/Upload';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<MainLayout />}>
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/social-links" element={<ManageSocials />} />
          <Route path="/upload" element={<Upload />} />
          {/* Feed and Events will go here */}
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
