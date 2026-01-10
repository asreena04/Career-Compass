import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiUsers, FiMail, FiBook, FiSearch, FiX, FiUser, FiAward } from 'react-icons/fi';
import { Link } from "react-router-dom";
import { useLocation } from 'react-router-dom';

const StudentManagement = () => {
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterYear, setFilterYear] = useState('all');

  // Add this useEffect to handle highlighted student
  useEffect(() => {
    if (location.state?.highlightStudentId && students.length > 0) {
      const student = students.find(s => s.id === location.state.highlightStudentId);
      if (student) {
        setSelectedStudent(student);
        setShowModal(true);
      }
    }
  }, [location.state, students]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, filterYear, students]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user logged in');
        setLoading(false);
        return;
      }

      // Fetch students assigned to this advisor
      const { data: studentProfiles, error: studentsError } = await supabase
        .from('student_profiles')
        .select(`
          id,
          full_name,
          matric_number,
          programme,
          school,
          year_of_study,
          advisor_id
        `)
        .eq('advisor_id', user.id)
        .order('full_name', { ascending: true });

      if (studentsError) throw studentsError;

      // Fetch email for each student from profiles table
      const studentIds = studentProfiles?.map(s => s.id) || [];
      
      if (studentIds.length === 0) {
        setStudents([]);
        setFilteredStudents([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, avatar_url')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      // Combine student data with email
      const combinedData = studentProfiles.map(student => {
        const profile = profiles.find(p => p.id === student.id);
        return {
          ...student,
          email: profile?.email || 'N/A',
          avatar_url: profile?.avatar_url || null
        };
      });

      setStudents(combinedData);
      setFilteredStudents(combinedData);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
    setLoading(false);
  };

  const filterStudents = () => {
    let filtered = [...students];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matric_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.programme?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by year
    if (filterYear !== 'all') {
      filtered = filtered.filter(student => 
        student.year_of_study === parseInt(filterYear)
      );
    }

    setFilteredStudents(filtered);
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const getYearLabel = (year) => {
    const labels = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year', 5: '5th Year' };
    return labels[year] || `Year ${year}`;
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
          Student Management
        </h2>
        <p className="text-gray-400">View and manage students under your advisorship</p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, matric number, email, or programme..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <FiX size={20} />
            </button>
          )}
        </div>

        {/* Year Filter */}
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        >
          <option value="all">All Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Students</p>
              <p className="text-2xl font-bold text-white">{students.length}</p>
            </div>
            <div className="p-3 bg-cyan-900/30 rounded-lg border border-cyan-700/50">
              <FiUsers size={24} className="text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Filtered Results</p>
              <p className="text-2xl font-bold text-white">{filteredStudents.length}</p>
            </div>
            <div className="p-3 bg-indigo-900/30 rounded-lg border border-indigo-700/50">
              <FiSearch size={24} className="text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Programmes</p>
              <p className="text-2xl font-bold text-white">
                {new Set(students.map(s => s.programme)).size}
              </p>
            </div>
            <div className="p-3 bg-teal-900/30 rounded-lg border border-teal-700/50">
              <FiBook size={24} className="text-teal-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Student List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading students...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
          <FiUsers size={64} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">
            {students.length === 0 ? 'No students assigned yet' : 'No students match your search'}
          </p>
          <p className="text-gray-500 text-sm">
            {students.length === 0 ? 'Students will appear here once they are assigned to you' : 'Try adjusting your search filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-cyan-500/50 transition-all shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
              onClick={() => handleViewDetails(student)}
            >
              {/* Student Avatar */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 border border-gray-600 flex-shrink-0">
                  {student.avatar_url ? (
                    <img 
                      src={student.avatar_url} 
                      alt={student.full_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center" style={{ display: student.avatar_url ? 'none' : 'flex' }}>
                    <FiUser size={28} className="text-gray-500" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{student.full_name}</h3>
                  <p className="text-sm text-gray-400">{student.matric_number || 'No Matric Number'}</p>
                </div>
              </div>

              {/* Student Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FiAward size={16} className="text-indigo-400 flex-shrink-0" />
                  <p className="text-sm text-gray-300 truncate">{getYearLabel(student.year_of_study)}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <FiBook size={16} className="text-teal-400 flex-shrink-0" />
                  <p className="text-sm text-gray-300 truncate">{student.programme || 'N/A'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <FiMail size={16} className="text-cyan-400 flex-shrink-0" />
                  <p className="text-sm text-gray-300 truncate">{student.email}</p>
                </div>
              </div>

              {/* View Details Button */}
              <button
                className="w-full mt-4 py-2 bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-cyan-700/50 rounded-lg text-cyan-400 font-medium text-sm hover:from-teal-900/50 hover:to-cyan-900/50 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(student);
                }}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Student Detail Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-800 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Student Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <FiX size={24} className="text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Student Avatar & Name */}
              <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-800">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-800 border-2 border-gray-700 flex-shrink-0">
                  {selectedStudent.avatar_url ? (
                    <img 
                      src={selectedStudent.avatar_url} 
                      alt={selectedStudent.full_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center" style={{ display: selectedStudent.avatar_url ? 'none' : 'flex' }}>
                    <FiUser size={40} className="text-gray-600" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white mb-1">{selectedStudent.full_name}</h4>
                  <p className="text-gray-400">{selectedStudent.matric_number || 'No Matric Number'}</p>
                </div>
              </div>

              {/* Student Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-cyan-900/30 rounded-lg border border-cyan-700/50">
                      <FiMail size={20} className="text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-sm text-white break-all">{selectedStudent.email}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-900/30 rounded-lg border border-indigo-700/50">
                      <FiAward size={20} className="text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Year of Study</p>
                      <p className="text-sm text-white">{getYearLabel(selectedStudent.year_of_study)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-teal-900/30 rounded-lg border border-teal-700/50">
                      <FiBook size={20} className="text-teal-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Programme</p>
                      <p className="text-sm text-white">{selectedStudent.programme || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-900/30 rounded-lg border border-purple-700/50">
                      <FiUsers size={20} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">School</p>
                      <p className="text-sm text-white">{selectedStudent.school || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

             {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
            <Link 
              to="/advisor/student-progress" 
              state={{ highlightStudentId: selectedStudent.id }}
              className="flex-1 flex items-center justify-center py-3 bg-green-800 border border-green-700 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
            >
            View Student Progress
            </Link>
      
                  <button 
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-red-800 border border-red-700 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default StudentManagement;