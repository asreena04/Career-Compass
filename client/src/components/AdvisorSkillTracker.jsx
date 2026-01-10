import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiAward, FiCalendar, FiArrowLeft, FiSearch, FiTrendingUp, FiTarget, FiBarChart2, FiAlertCircle } from 'react-icons/fi';
import AdvisorMenuBar from '../components/AdvisorMenuBar';

const API_BASE = "http://localhost:3001";

export default function StudentApprovedSkills() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [completedSkills, setCompletedSkills] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Fetch student data and their skills
  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const studentId = location.state?.highlightStudentId;
      
      if (!studentId) {
        console.error('No student ID provided');
        navigate('/student-management');
        return;
      }

      console.log('📊 Fetching data for student:', studentId);

      // Fetch student profile
      const { data: studentData, error: studentError } = await supabase
        .from('student_profiles')
        .select('id, full_name, matric_number, programme, year_of_study')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;
      setSelectedStudent(studentData);
      console.log('✅ Student data:', studentData);

      const token = await getToken();
      if (!token) return;

      // Fetch roadmap progress data from API
      const progressRes = await fetch(`${API_BASE}/advisor/student/${studentId}/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (progressRes.ok) {
        const data = await progressRes.json();
        console.log('📋 Progress data from API:', data);
        console.log('📋 API items:', data.items);
        setProgressData(data);
        
        // Filter approved skills from API data
        const approvedSkills = (data.items || []).filter(item => {
          const isApproved = item.proof_status === 'approved';
          console.log(`${item.skill_name}: proof_status="${item.proof_status}" -> ${isApproved ? 'APPROVED' : 'not approved'}`);
          return isApproved;
        });
        
        console.log('✅ Found approved skills:', approvedSkills.length);
        
        // Transform for display
        const transformed = approvedSkills.map(item => ({
          proof_id: item.progress_id,
          skill_id: item.skill_id,
          skill_name: item.skill_name,
          planned_year: item.planned_year,
          submitted_at: item.submitted_at || new Date().toISOString(),
          progress_status: item.progress_status,
          job_role_id: data.target?.job_role_id,
          job_role_name: data.target?.job_role?.job_role_name,
          proof_url: item.proof_url || item.file_url,
          proof_description: item.description || item.proof_description
        }));
        
        console.log('🔄 Transformed approved skills:', transformed);
        setCompletedSkills(transformed);
      } else {
        console.error('❌ API request failed');
        setProgressData({ items: [] });
        setCompletedSkills([]);
      }
    } catch (err) {
      console.error('❌ Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [location.state?.highlightStudentId]);

  const handleBackToStudentManagement = () => {
    navigate('/student-management', { 
      state: { highlightStudentId: selectedStudent?.id } 
    });
  };

  // Filter skills
  const filteredSkills = completedSkills.filter(skill => {
    const matchesYear = filterYear === 'all' || skill.planned_year === parseInt(filterYear);
    const matchesSearch = !searchTerm || skill.skill_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesYear && matchesSearch;
  });

  // Calculate statistics
  const allItems = progressData?.items || [];
  
  const approvedCount = allItems.filter(s => s.proof_status === 'approved').length;
  const pendingCount = allItems.filter(s => s.proof_status === 'pending').length;
  const rejectedCount = allItems.filter(s => s.proof_status === 'rejected').length;
  const noProofCount = allItems.filter(s => !s.proof_status).length;
  
  const stats = {
    totalSkills: allItems.length,
    completed: approvedCount,
    inProgress: pendingCount,
    notStarted: noProofCount,
    rejected: rejectedCount,
    completionRate: allItems.length > 0 ? Math.round((approvedCount / allItems.length) * 100) : 0
  };

  // Open proof file
  const openProofFile = async (pathOrUrl) => {
    if (!pathOrUrl) {
      alert('No proof file available');
      return;
    }

    // If already a full URL, just open it
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      window.open(pathOrUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Otherwise assume it's a storage path and create a signed URL
    const { data, error } = await supabase.storage
      .from('skill-proofs')
      .createSignedUrl(pathOrUrl, 60 * 10); // 10 minutes

    if (error) {
      console.error('Error opening proof file:', error);
      alert('Cannot open file: ' + error.message);
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  if (!selectedStudent && loading) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading student progress...</p>
        </div>
      </div>
    );
  }

  if (!selectedStudent) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No student selected</p>
          <button
            onClick={() => navigate('/student-management')}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-all"
          >
            Return to Student Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={handleBackToStudentManagement}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Back to Student Management"
            >
              <FiArrowLeft size={24} className="text-gray-400 hover:text-white" />
            </button>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
                Student Progress Overview
              </h1>
              <p className="text-gray-400 text-lg mt-1">Approved skills and achievement tracking</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <AdvisorMenuBar />

          {/* Main Content */}
          <div className="flex-1">
            {/* Student Info Card */}
            <div className="bg-gradient-to-r from-cyan-900/30 to-indigo-900/30 border border-cyan-700/50 rounded-xl p-6 mb-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Student Profile</p>
                  <h2 className="text-3xl font-bold text-white">{selectedStudent.full_name}</h2>
                  <p className="text-gray-300 mt-1">{selectedStudent.matric_number} • {selectedStudent.programme}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Current Year</p>
                  <p className="text-4xl font-black text-cyan-400">{selectedStudent.year_of_study}</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-300">Overall Progress</span>
                  <span className="text-sm font-bold text-cyan-400">{stats.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {stats.completed} of {stats.totalSkills} skills completed and approved
                </p>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-cyan-500/50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <FiTarget className="text-indigo-400" size={24} />
                  <span className="text-2xl font-bold text-white">{stats.totalSkills}</span>
                </div>
                <p className="text-sm text-gray-400">Total Skills</p>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-green-500/50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <FiCheckCircle className="text-green-400" size={24} />
                  <span className="text-2xl font-bold text-white">{stats.completed}</span>
                </div>
                <p className="text-sm text-gray-400">Approved</p>
                <p className="text-xs text-gray-500 mt-1">Verified proofs</p>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-yellow-500/50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <FiTrendingUp className="text-yellow-400" size={24} />
                  <span className="text-2xl font-bold text-white">{stats.inProgress}</span>
                </div>
                <p className="text-sm text-gray-400">Pending Review</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-cyan-500/50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <FiBarChart2 className="text-cyan-400" size={24} />
                  <span className="text-2xl font-bold text-white">{stats.completionRate}%</span>
                </div>
                <p className="text-sm text-gray-400">Completion Rate</p>
                <p className="text-xs text-gray-500 mt-1">Approved skills</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-center gap-3">
                  <FiAlertCircle className="text-gray-400" size={20} />
                  <div>
                    <p className="text-xs text-gray-400">Not Started</p>
                    <p className="text-xl font-bold text-white">{stats.notStarted} skills</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-center gap-3">
                  <FiCalendar className="text-red-400" size={20} />
                  <div>
                    <p className="text-xs text-gray-400">Rejected Proofs</p>
                    <p className="text-xl font-bold text-white">{stats.rejected} skills</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">Filter Approved Skills</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by skill name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="all">All Years</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>
            </div>

            {/* Skills by Year */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FiCheckCircle className="text-green-400" />
                Approved Skills ({filteredSkills.length})
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading skills...</p>
                </div>
              ) : filteredSkills.length === 0 ? (
                <div className="text-center py-12">
                  <FiCheckCircle size={64} className="text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No approved skills found</p>
                  {completedSkills.length > 0 ? (
                    <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                  ) : stats.inProgress > 0 ? (
                    <p className="text-gray-500 text-sm">{stats.inProgress} skill{stats.inProgress !== 1 ? 's' : ''} pending your review</p>
                  ) : (
                    <p className="text-gray-500 text-sm">Student hasn't had any proofs approved yet</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    filteredSkills.reduce((acc, skill) => {
                      const year = skill.planned_year || 'Unscheduled';
                      if (!acc[year]) acc[year] = [];
                      acc[year].push(skill);
                      return acc;
                    }, {})
                  )
                  .sort(([a], [b]) => {
                    if (a === 'Unscheduled') return 1;
                    if (b === 'Unscheduled') return -1;
                    return a - b;
                  })
                  .map(([year, skills]) => (
                    <div key={year} className="border border-gray-700 rounded-lg overflow-hidden">
                      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-cyan-400">
                            Year {year} {year == selectedStudent.year_of_study && <span className="text-xs text-green-400 ml-2">(Current)</span>}
                          </h4>
                          <span className="text-sm text-gray-400">{skills.length} skill{skills.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        {skills.map(skill => (
                          <div key={skill.proof_id} className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 hover:border-cyan-500/50 transition-all">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <FiCheckCircle className="text-green-400 flex-shrink-0" size={18} />
                                  <h5 className="text-base font-semibold text-white">{skill.skill_name}</h5>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {skill.job_role_name && (
                                    <span className="px-2 py-1 bg-teal-900/40 text-teal-300 border border-teal-700 rounded-full text-xs font-semibold">
                                      {skill.job_role_name}
                                    </span>
                                  )}
                                  <span className="px-2 py-1 bg-green-900/40 text-green-300 border border-green-700 rounded-full text-xs font-semibold">
                                    ✓ Approved
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-xs text-gray-400">Submitted</p>
                                <p className="text-sm font-semibold text-white whitespace-nowrap">
                                  {skill.submitted_at ? new Date(skill.submitted_at).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                            </div>

                            {skill.proof_description && (
                              <p className="text-sm text-gray-300 mb-3 pl-6">{skill.proof_description}</p>
                            )}

                            {skill.proof_url && (
                              <div className="pl-6">
                                <button
                                  onClick={() => openProofFile(skill.proof_url)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                >
                                  <FiAward size={16} />
                                  View Proof Submission
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}