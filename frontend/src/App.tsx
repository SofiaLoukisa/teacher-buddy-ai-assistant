import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AboutPage from './pages/AboutPage';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard';

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('teacherbuddy.theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Default to light mode
    return 'light';
  });

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('teacherbuddy.theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon" aria-hidden>📘</span>
          <Link to="/" className="brand-name">Teacher Buddy</Link>
        </div>
        <nav className="topnav">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Home</NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Chat</NavLink>
          {user?.isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Admin</NavLink>
          )}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {isAuthenticated ? (
            <>
              <span style={{ color: 'var(--muted)', marginLeft: '8px' }}>
                {user?.username}
              </span>
              <button onClick={handleLogout} className="btn ghost">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn ghost">Login</Link>
              <Link to="/register" className="btn primary">Sign Up</Link>
            </>
          )}
        </nav>
      </header>
      <main className={`page${isAuthRoute ? ' page--full-bleed' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
