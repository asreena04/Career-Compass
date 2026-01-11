import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { FiUsers, FiMail, FiMapPin, FiBriefcase, FiBook } from 'react-icons/fi';
import AdvisorMenuBar from '../components/AdvisorMenuBar.jsx';
import AdvisorAvailabilitySetup from '../components/AdvisorAvailability.jsx';

const AdvisorHomepage = () => {
  const [advisor, setAdvisor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentAdvisorProfile = async () => {
      try {
        setLoading(true);

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('Error fetching user:', userError);
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setLoading(false);
          return;
        }

        const { data: academicProfile, error: academicError } = await supabase
          .from('academic_advisor_profiles')
          .select('full_name, room_number, department, position')
          .eq('id', user.id)
          .single();

        if (academicError) {
          console.error('Error fetching academic profile:', academicError);
          setLoading(false);
          return;
        }

        const combinedProfile = {
          ...profile,
          ...academicProfile
        };

        setAdvisor(combinedProfile);

      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentAdvisorProfile();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans">

      {/* TOP HEADER */}
      <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
                Advisor Dashboard
              </h1>
              <p className="text-gray-400 text-lg">Manage your students and appointments</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <nav className="space-y-100">
            {/* Advisor Menu Bar */}
            <AdvisorMenuBar/>
          </nav>

          <div className="flex-1">

            {/* PROFILE CARD */}
            <div className="bg-gray-900 shadow-2xl rounded-2xl overflow-hidden border border-gray-800">

              {/* Profile Header */}
              <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-800 px-8 py-10">
                <div className="text-center">
                  <h2 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
                    Profile Information
                  </h2>
                  <p className="text-gray-400 text-base">Your personal details and credentials</p>
                </div>
              </div>

              {/* PROFILE IMAGE */}
              <div className="flex justify-center px-8 pt-8 pb-4">
                <div className="w-40 h-40 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-800 bg-gray-800">
                  {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent"></div>
                    </div>
                  ) : advisor?.avatar_url ? (
                    <img
                      src={advisor.avatar_url}
                      alt="Advisor Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/160?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <FiUsers size={48} className="text-gray-600" />
                    </div>
                  )}
                </div>
              </div>

              <div className="px-8 pb-8 pt-4">

                {/* PROFILE DETAILS */}
                {loading ? (
                  <div className="mt-8 text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">Loading profile...</p>
                  </div>
                ) : advisor ? (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-cyan-500/50 transition-all shadow-lg hover:shadow-cyan-500/10">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-cyan-900/30 rounded-lg border border-cyan-700/50">
                          <FiUsers size={20} className="text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-1">Full Name</p>
                          <p className="text-lg font-semibold text-white">{advisor.full_name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-indigo-500/10">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-900/30 rounded-lg border border-indigo-700/50">
                          <FiMail size={20} className="text-indigo-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                          <p className="text-lg font-semibold text-white break-all">{advisor.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-teal-500/50 transition-all shadow-lg hover:shadow-teal-500/10">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-teal-900/30 rounded-lg border border-teal-700/50">
                          <FiMapPin size={20} className="text-teal-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-1">Room Number</p>
                          <p className="text-lg font-semibold text-white">{advisor.room_number || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-purple-500/50 transition-all shadow-lg hover:shadow-purple-500/10">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-900/30 rounded-lg border border-purple-700/50">
                          <FiBriefcase size={20} className="text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-1">Position</p>
                          <p className="text-lg font-semibold text-white">{advisor.position || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-cyan-500/50 transition-all shadow-lg hover:shadow-cyan-500/10 md:col-span-2">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-cyan-900/30 rounded-lg border border-cyan-700/50">
                          <FiBook size={20} className="text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-1">Department</p>
                          <p className="text-lg font-semibold text-white">{advisor.department || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="mt-8 text-center py-12">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                      <FiUsers size={32} className="text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-lg">No advisor profile found</p>
                    <p className="text-gray-600 text-sm mt-1">Please check back later</p>
                  </div>
                )}
                <div className="mt-8">
                  <AdvisorAvailabilitySetup />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorHomepage;