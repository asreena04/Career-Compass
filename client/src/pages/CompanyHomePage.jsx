import React, { useState } from 'react';
import CompanyMenuBar from '../components/CompanyMenuBar.jsx';
import EditDeleteCompetition from '../components/EditDeleteCompetition.jsx';
import EditDeleteJob from '../components/EditDeleteJob.jsx';

const CompanyHomePage = () => {
  const [activeTab, setActiveTab] = useState('jobs');

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* 1. Simple, Flat Header - No overlapping shadows */}
      <header className="w-full bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h1 className="text-6xl font-black tracking-tighter text-cyan-400">
            Company Dashboard
          </h1>
          <p className="text-slate-500 mt-2 font-medium italic">Overview of your active presence!</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* 2. Flex Container - items-start prevents vertical stretching bugs */}
        <div className="flex flex-col lg:flex-row gap-24 items-start">

          {/* 3. SIDEBAR - Removed all extra wrapper divs/gradients that cause the "ghost square" */}
          <aside className="w-full lg:w-80 shrink-0 sticky top-10">
            <CompanyMenuBar />
          </aside>

          {/* 4. MAIN CONTENT */}
          <main className="flex-1 w-full">
            {/* Tab Navigation */}
            <div className="flex gap-12 border-b border-gray-800 mb-10">
              <button
                onClick={() => setActiveTab('competitions')}
                className={`pb-4 text-lg font-bold transition-all ${
                  activeTab === 'competitions' ? 'text-white border-b-2 border-cyan-400' : 'text-gray-500'
                }`}
              >
                Active Competitions
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`pb-4 text-lg font-bold transition-all ${
                  activeTab === 'jobs' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500'
                }`}
              >
                Active Jobs
              </button>
            </div>

            {/* List Display */}
            <div className="w-full">
              {activeTab === 'jobs' ? (
                <EditDeleteJob userRole="company" />
              ) : (
                <EditDeleteCompetition userRole="company" />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CompanyHomePage;