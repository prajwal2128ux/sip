/**
 * AppLayout Component - Main shell for logged-in application pages
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageRoute } from '../../types';

interface AppLayoutProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Application Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentPage={currentPage}
          onNavigate={onNavigate}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-700">
          <p>
            PlagiCheck · Free & Open Source Academic Plagiarism Detection System · Algorithms: TF-IDF & N-Gram Cosine Similarity
          </p>
        </footer>
      </div>
    </div>
  );
};
