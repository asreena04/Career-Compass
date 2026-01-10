import React from 'react';
import CompanyMenuBar from '../components/CompanyMenuBar.jsx';
import JobPostForm from '../components/JobPostForm.jsx';

const JobPostPage = () => {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="w-full bg-gradient-to-r from-black via-black to-black border-b border-gray-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
            Job Post Form
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Post new job!</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <CompanyMenuBar />
          <div className="flex-1">
            <JobPostForm userRole="company" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobPostPage;