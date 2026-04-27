import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import MainLayout from './layouts/MainLayout';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ManageSocials from './pages/ManageSocials';
import Upload from './pages/Upload';
import Feed from './pages/Feed';
import CreateEvent from './pages/CreateEvent';
import TodayEvents from './pages/TodayEvents';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/social-links" element={<ManageSocials />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/events/today" element={<TodayEvents />} />
          {/* Events will go here */}
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
