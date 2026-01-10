import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiMail, FiMapPin, FiBriefcase, FiBook, FiBell, FiX, FiCheckSquare, FiCalendar, FiClock, FiFileText, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import AdvisorMenuBar from '../components/AdvisorMenuBar.jsx';
import AdvisorAvailabilitySetup from '../components/AdvisorAvailability.jsx';

const AdvisorHomepage = () => {
  const navigate = useNavigate();
  const [advisor, setAdvisor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
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

    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('advisor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        setNotifications(data || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchCurrentAdvisorProfile();
    fetchNotifications();

    // Set up real-time subscription for new notifications
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `advisor_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New notification received:', payload);
            setNotifications(prev => [payload.new, ...prev].slice(0, 10));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(notifications.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'proof_submitted' || 
        notification.type === 'proof_resubmitted' || 
        notification.type === 'proof_reviewed') {
      navigate('/proof-verification', {
        state: {
          highlightProofId: notification.proof_id,
          filter: notification.type === 'proof_reviewed' ? 'all' : 'pending'
        }
      });
    } else if (notification.appointment_id) {
      // Navigate to appointments page
      navigate('/advisor/appointments', {
        state: {
          highlightAppointmentId: notification.appointment_id,
          filter: notification.type === 'appointment_today' ? 'upcoming' : 'all'
        }
      });
    } else if (notification.student_id) {
      // Navigate to student management
      navigate('/student-management', {
        state: {
          highlightStudentId: notification.student_id
        }
      });
    }

    setShowNotifications(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_booked':
        return { icon: FiCalendar, color: 'indigo' };
      case 'appointment_cancelled':
        return { icon: FiX, color: 'red' };
      case 'appointment_today':
        return { icon: FiClock, color: 'teal' };
      case 'student_update':
        return { icon: FiUsers, color: 'cyan' };
      case 'proof_submitted':
        return { icon: FiFileText, color: 'yellow' };
      case 'proof_resubmitted':
        return { icon: FiFileText, color: 'orange' };
      case 'proof_reviewed':
        return { icon: FiCheckSquare, color: 'gray' };
      default:
        return { icon: FiCheckSquare, color: 'gray' };
    }
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

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

            {/* NOTIFICATION BELL */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-4 bg-gray-800 rounded-xl border border-gray-700 hover:bg-gray-700 transition-all shadow-lg hover:shadow-indigo-500/20"
              >
                <FiBell size={28} className="text-cyan-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* NOTIFICATION DROPDOWN */}
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-[420px] bg-gray-900 rounded-xl shadow-2xl border border-gray-800 z-50 max-h-[600px] overflow-hidden">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-800/50">
                    <h3 className="font-bold text-white text-lg">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <FiX size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-[520px]">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => {
                        const { icon: Icon, color } = getNotificationIcon(notif.type);
                        const bgColor = {
                          indigo: 'bg-indigo-900/50 border-indigo-700',
                          red: 'bg-red-900/50 border-red-700',
                          teal: 'bg-teal-900/50 border-teal-700',
                          cyan: 'bg-cyan-900/50 border-cyan-700',
                          yellow: 'bg-yellow-900/50 border-yellow-700',
                          orange: 'bg-orange-900/50 border-orange-700',
                          green: 'bg-green-900/50 border-green-700',
                          gray: 'bg-gray-800/50 border-gray-700'
                        }[color];
                        const iconColor = {
                          indigo: 'text-indigo-400',
                          red: 'text-red-400',
                          teal: 'text-teal-400',
                          cyan: 'text-cyan-400',
                          yellow: 'text-yellow-400',
                          orange: 'text-orange-400',
                          green: 'text-green-400',
                          gray: 'text-gray-400'
                        }[color];

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors ${
                              !notif.is_read ? 'bg-gray-800/50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg border ${bgColor}`}>
                                <Icon size={18} className={iconColor} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-sm font-semibold text-white">{notif.title}</p>
                                  {!notif.is_read && (
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 flex-shrink-0 mt-1"></div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed mb-2">{notif.message}</p>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-500">{formatNotificationTime(notif.created_at)}</p>
                                  <span className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                                    View Details →
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center">
                        <FiBell size={40} className="text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500">No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
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