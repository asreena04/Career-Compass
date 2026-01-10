import React from 'react';
import MyAppointment from '../components/MyAppointment.jsx';
import AdvisorMenuBar from '../components/AdvisorMenuBar.jsx';

const AdvisorMyAppointmentPage = () => {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
            Appointments
          </h1>
          <p className="text-gray-400 text-lg mt-2">View and manage student appointments</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <AdvisorMenuBar/>
          <div className="flex-1">
            <MyAppointment userRole="advisor" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorMyAppointmentPage;