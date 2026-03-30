import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/globals.css';

// Contextos
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Componentes ligeros (importacion directa)
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import LandingPage from './components/Landing/LandingPage';

// Componentes pesados (code splitting con lazy loading)
const Dashboard = lazy(() => import('./components/UI/Dashboard'));
const ManagementDashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const QuoteForm = lazy(() => import('./components/QuoteForm/QuoteForm'));
const QuoteResults = lazy(() => import('./components/Results/QuoteResults'));
const QuoteHistory = lazy(() => import('./components/History/QuoteHistory'));
const ClientManagement = lazy(() => import('./components/Clients/ClientManagement'));
const UserManagement = lazy(() => import('./components/Users/UserManagement'));
const Reports = lazy(() => import('./components/Reports/Reports'));
const ClientPortal = lazy(() => import('./components/Portal/ClientPortal'));
const ChatInterface = lazy(() => import('./components/Chat/ChatInterface'));
const FreightExchange = lazy(() => import('./components/FreightExchange/FreightExchange'));

// Component for the main app with navigation
function MainApp() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [quoteResults, setQuoteResults] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleQuoteGenerated = (results) => {
    setQuoteResults(results);
    setCurrentView('results');
    navigate('/results');
  };

  const handleNewQuote = () => {
    setQuoteResults(null);
    setCurrentView('quote');
    navigate('/quote');
  };

  // Sync currentView with URL
  React.useEffect(() => {
    const path = location.pathname;
    if (path === '/') setCurrentView('dashboard');
    else if (path === '/quote') setCurrentView('quote');
    else if (path === '/results') setCurrentView('results');
    else if (path === '/history') setCurrentView('history');
    else if (path === '/clients') setCurrentView('clients');
    else if (path === '/reports') setCurrentView('reports');
    else if (path === '/freight-exchange') setCurrentView('freight-exchange');
    else if (path === '/users') setCurrentView('users');
  }, [location.pathname]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        // Show Management Dashboard for alta gerencia, regular Dashboard for others
        return user?.role === 'alta_gerencia' ?
          <ManagementDashboard /> :
          <Dashboard onNewQuoteClick={handleNewQuote} />;
      case 'quote':
        return <QuoteForm onQuoteGenerated={handleQuoteGenerated} />;
      case 'results':
        return <QuoteResults results={quoteResults} />;
      case 'history':
        return <QuoteHistory />;
      case 'clients':
        return <ClientManagement />;
      case 'reports':
        return <Reports />;
      case 'freight-exchange':
        return <FreightExchange />;
      case 'users':
        return <UserManagement />;
      default:
        return user?.role === 'alta_gerencia' ?
          <ManagementDashboard /> :
          <Dashboard onNewQuoteClick={handleNewQuote} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Navegación de Pestañas */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide -mb-px">
            <button
              onClick={() => { setCurrentView('dashboard'); navigate('/'); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                currentView === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {user?.role === 'alta_gerencia' ? 'Dashboard Ejecutivo' : 'Dashboard'}
            </button>

            {/* Nueva Cotización - available for all roles */}
            <button
              onClick={handleNewQuote}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                currentView === 'quote'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Nueva Cotización
            </button>

            {/* Historial - available for all roles */}
            <button
              onClick={() => { setCurrentView('history'); navigate('/history'); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                currentView === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Historial
            </button>

            {/* Clientes - available for all roles */}
            <button
              onClick={() => { setCurrentView('clients'); navigate('/clients'); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                currentView === 'clients'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {user?.role === 'agente_comercial' ? 'Mis Clientes' : 'Clientes'}
            </button>

            {/* Reportes - available for all roles */}
            <button
              onClick={() => { setCurrentView('reports'); navigate('/reports'); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                currentView === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reportes
            </button>

            {/* Bolsas de Carga - freight exchanges */}
            <button
              onClick={() => { setCurrentView('freight-exchange'); navigate('/freight-exchange'); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                currentView === 'freight-exchange'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bolsas de Carga
            </button>

            {/* Usuarios - only for supervisors and alta_gerencia */}
            {(user?.role === 'supervisor' || user?.role === 'alta_gerencia') && (
              <button
                onClick={() => { setCurrentView('users'); navigate('/users'); }}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  currentView === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Usuarios
              </button>
            )}
            {quoteResults && (
              <button
                onClick={() => { setCurrentView('results'); navigate('/results'); }}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  currentView === 'results'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Resultados
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 w-full">
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
          {renderContent()}
        </Suspense>
      </main>

      <Footer />

      {/* Chat LUC1 - Disponible en todas las vistas */}
      <Suspense fallback={null}>
        <ChatInterface
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      </Suspense>
    </div>
  );
}

// Show LandingPage for non-authenticated users, redirect to dashboard for authenticated
function PublicLanding() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <ProtectedRoute>
        <MainApp />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#363636', color: '#fff' },
            success: { duration: 3000, theme: { primary: 'green', secondary: 'black' } },
          }}
        />
      </ProtectedRoute>
    );
  }

  return <LandingPage />;
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <Router>
        <Routes>
          {/* Client Portal Route - standalone */}
          <Route path="/portal/:token" element={
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
              <ClientPortal />
            </Suspense>
          } />

          {/* Public Auth Routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Landing page for non-authenticated users at / */}
          <Route path="/" element={<PublicLanding />} />

          {/* Main App Routes - Protected */}
          <Route path="/*" element={
            <ProtectedRoute>
              <MainApp />
              {/* Notificaciones Toast */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    theme: {
                      primary: 'green',
                      secondary: 'black',
                    },
                  },
                }}
              />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
