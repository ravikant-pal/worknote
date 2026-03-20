import { Navigate, Route, Routes } from 'react-router-dom';
import NotesPage from './pages/NotesPage';
import OnboardingPage from './pages/OnboardingPage';
import ProfilePage from './pages/ProfilePage';
import useIdentityStore from './stores/useIdentityStore';

/**
 * ProtectedRoute — redirects to onboarding if no identity exists yet.
 */
function ProtectedRoute({ children }) {
  const { identity, isLoaded } = useIdentityStore();
  if (!isLoaded) return null;
  if (!identity) return <Navigate to='/onboarding' replace />;
  return children;
}

/**
 * GuestRoute — redirects to home if identity already exists.
 * Prevents going back to onboarding once set up.
 */
function GuestRoute({ children }) {
  const { identity, isLoaded } = useIdentityStore();
  if (!isLoaded) return null;
  if (identity) return <Navigate to='/' replace />;
  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Onboarding — only accessible before identity is created */}
      <Route
        path='/onboarding'
        element={
          <GuestRoute>
            <OnboardingPage />
          </GuestRoute>
        }
      />

      {/* Profile */}
      <Route
        path='/profile'
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Main notes view — also handles /note/:id deep links */}
      <Route
        path='/'
        element={
          <ProtectedRoute>
            <NotesPage />
          </ProtectedRoute>
        }
      />

      {/* Share link deep link — loads a specific note */}
      <Route
        path='/note/:noteId'
        element={
          <ProtectedRoute>
            <NotesPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
