/**
 * PlagiCheck - Main Application Component & Router
 *
 * Implements complete workflow:
 * Register → Login → Dashboard → Plagiarism Checker → Paste text → Check Plagiarism
 * → Analysis screen → Similarity calculation → Results → Matched content
 * → Reference source → Detailed report → Download report → History
 */

import React, { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AboutPage } from './pages/public/AboutPage';
import { FeaturesPage } from './pages/public/FeaturesPage';
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { PricingPage } from './pages/public/PricingPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { CheckerPage } from './pages/app/CheckerPage';
import { DashboardPage } from './pages/app/DashboardPage';
import { DetailedReportPage } from './pages/app/DetailedReportPage';
import { HistoryPage } from './pages/app/HistoryPage';
import { ProfilePage } from './pages/app/ProfilePage';
import { ReportsPage } from './pages/app/ReportsPage';
import { ResultPage } from './pages/app/ResultPage';
import { SubscriptionPage } from './pages/app/SubscriptionPage';
import { PageRoute } from './types';

const MainApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageRoute>('home');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | undefined>(undefined);
  const { isAuthenticated } = useAuth();

  const handleNavigate = (page: PageRoute, analysisId?: number) => {
    if (analysisId !== undefined) {
      setSelectedAnalysisId(analysisId);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Public Pages (render full-bleed with PublicNavbar)
  if (currentPage === 'home') {
    return <HomePage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'features') {
    return <FeaturesPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'pricing') {
    return <PricingPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'about') {
    return <AboutPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'login') {
    return <LoginPage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'register') {
    return <RegisterPage onNavigate={handleNavigate} />;
  }

  // Application Pages (rendered inside AppLayout with persistent left Sidebar and Header)
  return (
    <AppLayout currentPage={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
      {currentPage === 'checker' && <CheckerPage onNavigate={handleNavigate} />}
      {currentPage === 'result' && (
        <ResultPage analysisId={selectedAnalysisId} onNavigate={handleNavigate} />
      )}
      {currentPage === 'detailed-report' && (
        <DetailedReportPage analysisId={selectedAnalysisId} onNavigate={handleNavigate} />
      )}
      {currentPage === 'reports' && <ReportsPage onNavigate={handleNavigate} />}
      {currentPage === 'history' && <HistoryPage onNavigate={handleNavigate} />}
      {currentPage === 'profile' && <ProfilePage onNavigate={handleNavigate} />}
      {currentPage === 'subscription' && <SubscriptionPage onNavigate={handleNavigate} />}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
