import React from 'react';
import SeeJ from '../components/SeeJ.jsx';

const StudentViewJobPage = () => {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Centered container with horizontal padding */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex gap-10">

          {/* 1. MAIN CONTENT */}
          <div className="flex-1 min-w-0">
            {/* Header stays inside the content flow */}
            <header className="pt-16 pb-10 border-b border-gray-800">
              <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
                Job
              </h1>
              <p className="text-gray-400 text-lg mt-2">View jobs posted by companies</p>
            </header>

            {/* Scrollable list area */}
            <div className="py-10">
              <SeeJ userRole="student" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentViewJobPage;