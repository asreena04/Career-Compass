import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiCalendar, FiClock, FiUser, FiCheck, FiX, FiAlertCircle, FiTrash2, FiFileText } from 'react-icons/fi';

const MyAppointments = ({ userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const highlightedRef = useRef(null);

  useEffect(() => {
    fetchAppointments();

    // Handle navigation from notification
    if (location.state?.highlightAppointmentId) {
      const filterFromState = location.state.filter || 'all';
      setFilter(filterFromState);
    }
  }, [location.state]);

  useEffect(() => {
    // Scroll to highlighted appointment after render
    if (highlightedRef.current && location.state?.highlightAppointmentId) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300);
    }
  }, [appointments, location.state]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('No user logged in');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          advisor_cancellation_reason,
          student_cancellation_reason,
          cancelled_by,
          created_at,
          student_id,
          advisor_id
        `)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (userRole === 'student') {
        query = query.eq('student_id', user.id);
      } else if (userRole === 'advisor') {
        query = query.eq('advisor_id', user.id);
      }

      const { data: appointmentsData, error: appointmentsError } = await query;

      if (appointmentsError) throw appointmentsError;

      const studentIds = [...new Set(appointmentsData.map(a => a.student_id))];
      const advisorIds = [...new Set(appointmentsData.map(a => a.advisor_id))];

      const { data: students } = await supabase
        .from('student_profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const { data: advisors } = await supabase
        .from('academic_advisor_profiles')
        .select('id, full_name, department')
        .in('id', advisorIds);

      const enrichedAppointments = appointmentsData.map(apt => ({
        ...apt,
        student_name: students?.find(s => s.id === apt.student_id)?.full_name || 'Unknown',
        advisor_name: advisors?.find(a => a.id === apt.advisor_id)?.full_name || 'Unknown',
        advisor_department: advisors?.find(a => a.id === apt.advisor_id)?.department || ''
      }));

      setAppointments(enrichedAppointments);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
    setLoading(false);
  };

  const openCancelModal = (appointment) => {
    setSelectedAppointment(appointment);
    setCancellationReason('');
    setCancelModalOpen(true);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    // Validate cancellation reason input
    if (!cancellationReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    try {
      const updateData = {
        status: 'cancelled',
        cancelled_by: userRole
      };

      // Store cancellation reason in appropriate column
      if (userRole === 'advisor') {
        updateData.advisor_cancellation_reason = cancellationReason;
      } else if (userRole === 'student') {
        updateData.student_cancellation_reason = cancellationReason;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      setCancelModalOpen(false);
      setSelectedAppointment(null);
      setCancellationReason('');
      fetchAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert('Failed to cancel appointment');
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      fetchAppointments();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const handleStudentClick = (studentId, studentName) => {
    navigate('/student-management', {
      state: {
        highlightStudentId: studentId,
        studentName: studentName
      }
    });
  };

  const filteredAppointments = appointments.filter(apt => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const aptDate = new Date(apt.appointment_date);
    aptDate.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      return aptDate >= today && apt.status !== 'cancelled' && apt.status !== 'completed';
    } else if (filter === 'past') {
      return aptDate < today || apt.status === 'completed';
    } else if (filter === 'cancelled') {
      return apt.status === 'cancelled';
    }
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/10';
      case 'confirmed':
        return 'text-teal-400 bg-teal-500/10';
      case 'cancelled':
        return 'text-red-400 bg-red-500/10';
      case 'completed':
        return 'text-gray-400 bg-gray-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FiAlertCircle size={16} />;
      case 'confirmed':
        return <FiCheck size={16} />;
      case 'cancelled':
        return <FiX size={16} />;
      case 'completed':
        return <FiCheck size={16} />;
      default:
        return <FiAlertCircle size={16} />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to get the appropriate cancellation reason
  const getCancellationReason = (appointment) => {
    if (appointment.cancelled_by === 'advisor') {
      return appointment.advisor_cancellation_reason;
    } else if (appointment.cancelled_by === 'student') {
      return appointment.student_cancellation_reason;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Appointments</h2>
            <p className="text-gray-400 text-sm mt-1">Manage your scheduled meetings</p>
          </div>

          <div className="flex items-center gap-2">
            {['all', 'upcoming', 'past', 'cancelled'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === filterOption
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading appointments...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 text-center">
          <FiCalendar size={48} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">No {filter !== 'all' ? filter : ''} appointments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appointment) => {
            const cancellationReason = getCancellationReason(appointment);
            const isHighlighted = location.state?.highlightAppointmentId === appointment.id;

            return (
              <div
                key={appointment.id}
                ref={isHighlighted ? highlightedRef : null}
                className={`bg-gray-900 rounded-xl p-6 border transition-all ${
                  isHighlighted
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/20 animate-pulse-once'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Left - Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-lg flex items-center gap-2 ${getStatusColor(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          <span className="text-xs font-semibold uppercase">{appointment.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <FiCalendar className="text-gray-500" size={16} />
                        <span className="text-gray-300">{formatDate(appointment.appointment_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FiClock className="text-gray-500" size={16} />
                        <span className="text-gray-300">
                          {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm mb-3">
                      <FiUser className="text-gray-500" size={16} />
                      {userRole === 'advisor' ? (
                        <button
                          onClick={() => handleStudentClick(appointment.student_id, appointment.student_name)}
                          className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline"
                        >
                          {appointment.student_name}
                        </button>
                      ) : (
                        <span className="text-gray-300">
                          {appointment.advisor_name}
                          {appointment.advisor_department && (
                            <span className="text-gray-500 ml-1">• {appointment.advisor_department}</span>
                          )}
                        </span>
                      )}
                    </div>

                    {appointment.notes && (
                      <div className="flex items-start gap-2 text-sm mb-3">
                        <FiFileText className="text-gray-500 mt-0.5 flex-shrink-0" size={16} />
                        <p className="text-gray-400 line-clamp-2">{appointment.notes}</p>
                      </div>
                    )}

                    {cancellationReason && (
                      <div className="mt-3 p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
                        <p className="text-sm text-red-400">
                          <span className="font-semibold">
                            Cancelled by {appointment.cancelled_by}:
                          </span>{' '}
                          {cancellationReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right - Actions */}
                  <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                    {userRole === 'advisor' && appointment.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                        className="flex-1 lg:w-full px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <FiCheck size={16} />
                        Confirm
                      </button>
                    )}

                    {userRole === 'advisor' && appointment.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                        className="flex-1 lg:w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <FiCheck size={16} />
                        Complete
                      </button>
                    )}

                    {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                      <button
                        onClick={() => openCancelModal(appointment)}
                        className="flex-1 lg:w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <FiX size={16} />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Cancel Appointment</h3>

            <p className="text-gray-400 text-sm mb-4">
              Please provide a reason for cancelling this appointment.
              {userRole === 'advisor' && ' The student will be notified.'}
              {userRole === 'student' && ' Your advisor will be notified.'}
            </p>

            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              rows={4}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCancelModalOpen(false);
                  setSelectedAppointment(null);
                  setCancellationReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-all"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancelAppointment}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-all"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;