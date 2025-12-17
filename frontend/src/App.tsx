import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Home } from './pages/Home/Home';
import { Login } from './pages/Auth/Login';
import { Signup } from './pages/Auth/Signup';
import { DanceMovesList } from './pages/DanceMoves/DanceMovesList';
import { DanceMoveDetail } from './pages/DanceMoves/DanceMoveDetail';
import { SequencesList } from './pages/Sequences/SequencesList';
import { SequenceDetail } from './pages/Sequences/SequenceDetail';
import { EventsList } from './pages/Events/EventsList';
import { EventDetail } from './pages/Events/EventDetail';
import './styles/global.scss';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Dance Moves routes */}
            <Route path="/moves" element={<DanceMovesList />} />
            <Route path="/moves/:id" element={<DanceMoveDetail />} />

            {/* Sequences routes - public viewing */}
            <Route path="/sequences" element={<SequencesList />} />
            <Route path="/sequences/:id" element={<SequenceDetail />} />

            {/* Events routes */}
            <Route path="/events" element={<EventsList />} />
            <Route path="/events/:id" element={<EventDetail />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <div className="container">
                    <h1>Admin Panel</h1>
                    <p>Admin functionality coming soon...</p>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
