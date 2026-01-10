import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiUsers, FiTrendingUp, FiAward, FiTarget, FiCheckCircle, FiClock, FiXCircle, FiAlertCircle, FiFileText, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import AdvisorMenuBar from '../components/AdvisorMenuBar';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function StudentProgressTracker() {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [proofData, setProofData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState({});

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Fetch students assigned to this advisor
  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('student_profiles')
        .select('id, full_name, matric_number, programme, year_of_study')
        .eq('advisor_id', user.id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);

      // Auto-select student if coming from notification
      if (location.state?.highlightStudentId && data) {
        const student = data.find(s => s.id === location.state.highlightStudentId);
        if (student) {
          setSelectedStudent(student);
          fetchStudentProgress(student.id);
        }
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch student's roadmap progress
  const fetchStudentProgress = async (studentId) => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      // Fetch roadmap data from server
      const res = await fetch(`${API_BASE}/advisor/student/${studentId}/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setProgressData(data);
      }

      // Fetch proof submissions
      const proofRes = await fetch(`${API_BASE}/advisor/student/${studentId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (proofRes.ok) {
        const proofs = await proofRes.json();
        setProofData(proofs);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setProgressData(null);
    setProofData([]);
    fetchStudentProgress(student.id);
  };

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="text-green-400" size={20} />;
      case 'in_progress':
        return <FiClock className="text-yellow-400" size={20} />;
      case 'not_started':
        return <FiAlertCircle className="text-gray-500" size={20} />;
      default:
        return <FiAlertCircle className="text-gray-500" size={20} />;
    }
  };

  const getProofStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
      approved: 'bg-green-900/40 text-green-300 border-green-700',
      rejected: 'bg-red-900/40 text-red-300 border-red-700'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${badges[status] || badges.pending}`}>
        {status}
      </span>
    );
  };

  // Calculate statistics
  const calculateStats = () => {
    if (!progressData?.items) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, completionRate: 0 };
    
    const total = progressData.items.length;
    const completed = progressData.items.filter(i => i.progress_status === 'completed').length;
    const inProgress = progressData.items.filter(i => i.progress_status === 'in_progress').length;
    const notStarted = progressData.items.filter(i => i.progress_status === 'not_started').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, notStarted, completionRate };
  };

  // Group items by year
  const groupByYear = () => {
    if (!progressData?.items) return {};
    
    const grouped = {};
    progressData.items.forEach(item => {
      const year = item.planned_year || 'Unscheduled';
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(item);
    });
    
    return grouped;
  };

  const stats = calculateStats();
  const yearGroups = groupByYear();

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
            Student Progress Tracker
          </h1>
          <p className="text-gray-400 text-lg">Monitor skill development and proof submissions</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <AdvisorMenuBar />

          {/* Main Content */}
          <div className="flex-1">
            {/* Student Selection */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FiUsers className="text-cyan-400" />
                Select Student
              </h2>
              
              {loading && students.length === 0 ? (
                <div className="text-gray-400">Loading students...</div>
              ) : students.length === 0 ? (
                <div className="text-gray-500">No students assigned yet</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {students.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleStudentSelect(student)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedStudent?.id === student.id
                          ? 'bg-cyan-900/30 border-cyan-600'
                          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <p className="font-semibold text-white">{student.full_name}</p>
                      <p className="text-sm text-gray-400">{student.matric_number}</p>
                      <p className="text-xs text-gray-500 mt-1">{student.programme}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Progress Dashboard */}
            {selectedStudent && (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <FiTarget className="text-indigo-400" size={24} />
                      <span className="text-2xl font-bold text-white">{stats.total}</span>
                    </div>
                    <p className="text-sm text-gray-400">Total Skills</p>
                  </div>

                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <FiCheckCircle className="text-green-400" size={24} />
                      <span className="text-2xl font-bold text-white">{stats.completed}</span>
                    </div>
                    <p className="text-sm text-gray-400">Completed</p>
                  </div>

                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <FiClock className="text-yellow-400" size={24} />
                      <span className="text-2xl font-bold text-white">{stats.inProgress}</span>
                    </div>
                    <p className="text-sm text-gray-400">In Progress</p>
                  </div>

                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <FiTrendingUp className="text-cyan-400" size={24} />
                      <span className="text-2xl font-bold text-white">{stats.completionRate}%</span>
                    </div>
                    <p className="text-sm text-gray-400">Completion Rate</p>
                  </div>
                </div>

                {/* Career Target */}
                {progressData?.target && (
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <FiAward className="text-teal-400" size={24} />
                      <h3 className="text-xl font-bold text-white">Career Target</h3>
                    </div>
                    <p className="text-2xl font-bold text-cyan-400">
                      {progressData.target.job_role?.job_role_name || 'No target set'}
                    </p>
                  </div>
                )}

                {/* Skills Roadmap by Year */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">Skills Roadmap</h3>
                  
                  {loading ? (
                    <div className="text-gray-400">Loading roadmap...</div>
                  ) : Object.keys(yearGroups).length === 0 ? (
                    <div className="text-gray-500">No roadmap data available</div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(yearGroups)
                        .sort(([a], [b]) => a - b)
                        .map(([year, items]) => (
                          <div key={year} className="border border-gray-700 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleYear(year)}
                              className="w-full p-4 bg-gray-800 hover:bg-gray-750 flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-cyan-400">Year {year}</span>
                                <span className="text-sm text-gray-400">
                                  ({items.length} skill{items.length !== 1 ? 's' : ''})
                                </span>
                              </div>
                              {expandedYears[year] ? <FiChevronUp /> : <FiChevronDown />}
                            </button>

                            {expandedYears[year] && (
                              <div className="p-4 bg-gray-900/50 space-y-2">
                                {items.map(item => (
                                  <div key={item.progress_id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                                    <div className="flex items-center gap-3 flex-1">
                                      {getStatusIcon(item.progress_status)}
                                      <div>
                                        <p className="font-semibold text-white">{item.skill_name}</p>
                                        <p className="text-xs text-gray-500 capitalize">{item.progress_status?.replace('_', ' ')}</p>
                                      </div>
                                    </div>
                                    {item.proof_status && (
                                      <div className="flex items-center gap-2">
                                        <FiFileText className="text-gray-500" size={16} />
                                        {getProofStatusBadge(item.proof_status)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Proof Submissions */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <FiFileText className="text-indigo-400" />
                    Recent Proof Submissions
                  </h3>
                  
                  {proofData.length === 0 ? (
                    <div className="text-gray-500">No proof submissions yet</div>
                  ) : (
                    <div className="space-y-3">
                      {proofData.slice(0, 5).map(proof => (
                        <div key={proof.proof_id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-white">{proof.skill?.skill_name}</p>
                              <p className="text-sm text-gray-400">{proof.job_role?.job_role_name}</p>
                            </div>
                            {getProofStatusBadge(proof.status)}
                          </div>
                          {proof.description && (
                            <p className="text-sm text-gray-400 mb-2">{proof.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Submitted: {new Date(proof.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* No Student Selected */}
            {!selectedStudent && !loading && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
                <FiUsers size={64} className="text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Select a student to view their progress</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}