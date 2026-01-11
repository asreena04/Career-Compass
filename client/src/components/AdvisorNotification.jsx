import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiX, FiCheckSquare, FiCalendar, FiClock, FiFileText, FiUsers } from 'react-icons/fi';

const AdvisorNotification = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
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
  );
};

export default AdvisorNotification;