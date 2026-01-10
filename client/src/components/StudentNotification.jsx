import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FiBell, FiX, FiClock, FiCheckSquare } from 'react-icons/fi';

const StudentNotification = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    setupRealtimeSubscription();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('student_notifications')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (err) {
      console.error('Error in fetchNotifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel('student-notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_notifications',
          filter: `student_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 New student notification:', payload);
          setNotifications(prev => [payload.new, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (notificationId) => {
    try {
      await supabase
        .from('student_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    
    if (unreadIds.length > 0) {
      try {
        await supabase
          .from('student_notifications')
          .update({ is_read: true })
          .in('id', unreadIds);

        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      } catch (err) {
        console.error('Error marking all as read:', err);
      }
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Handle appointment notifications
    if (notification.appointment_id) {
      navigate('/student/my-appointments', { 
        state: { 
          highlightAppointmentId: notification.appointment_id,
          filter: notification.type === 'appointment_today' ? 'upcoming' : 'all'
        } 
      });
    }
    
    // Handle proof notifications
    if (notification.proof_id) {
      navigate('/student/submissions', {
        state: {
          highlightProofId: notification.proof_id
        }
      });
    }

    setShowNotifications(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_confirmed':
        return { icon: FiCheckSquare, color: 'teal' };
      case 'advisor_cancelled':
        return { icon: FiX, color: 'red' };
      case 'appointment_today':
        return { icon: FiClock, color: 'indigo' };
      case 'proof_approved':
        return { icon: FiCheckSquare, color: 'green' };
      case 'proof_rejected':
        return { icon: FiX, color: 'orange' };
      default:
        return { icon: FiBell, color: 'gray' };
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
      {/* Notification Bell Button */}
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-3 bg-gray-800 rounded-xl border border-gray-700 hover:bg-gray-700 transition-all shadow-lg hover:shadow-cyan-500/20"
        aria-label="Notifications"
      >
        <FiBell size={24} className="text-cyan-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showNotifications && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowNotifications(false)}
          />
          
          {/* Dropdown panel */}
          <div className="fixed md:absolute right-4 md:right-0 top-20 md:top-full mt-0 md:mt-2 w-[calc(100vw-2rem)] md:w-[420px] bg-gray-900 rounded-xl shadow-2xl border border-gray-800 z-50 max-h-[600px] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-800/50 sticky top-0 z-10">
              <h3 className="font-bold text-white text-lg">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  aria-label="Close notifications"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
            
            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[520px]">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-gray-400 text-sm">Loading notifications...</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notif) => {
                  const { icon: Icon, color } = getNotificationIcon(notif.type);
                  const bgColor = {
                    teal: 'bg-teal-900/50 border-teal-700',
                    red: 'bg-red-900/50 border-red-700',
                    indigo: 'bg-indigo-900/50 border-indigo-700',
                    green: 'bg-green-900/50 border-green-700',
                    orange: 'bg-orange-900/50 border-orange-700',
                    gray: 'bg-gray-800/50 border-gray-700'
                  }[color];
                  const iconColor = {
                    teal: 'text-teal-400',
                    red: 'text-red-400',
                    indigo: 'text-indigo-400',
                    green: 'text-green-400',
                    orange: 'text-orange-400',
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
                        {/* Icon */}
                        <div className={`p-2 rounded-lg border ${bgColor} flex-shrink-0`}>
                          <Icon size={18} className={iconColor} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-white leading-tight">
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-400 leading-relaxed mb-2">
                            {notif.message}
                          </p>
                          
                          {/* Show cancellation reason if exists */}
                          {notif.metadata?.cancellation_reason && (
                            <div className="mb-2 p-2 bg-red-900/20 border border-red-800/30 rounded">
                              <p className="text-xs text-red-400 italic">
                                <span className="font-semibold">Reason:</span> {notif.metadata.cancellation_reason}
                              </p>
                            </div>
                          )}
                          
                          {/* Show review note for rejected proofs */}
                          {notif.type === 'proof_rejected' && notif.metadata?.review_note && (
                            <div className="mb-2 p-2 bg-orange-900/20 border border-orange-800/30 rounded">
                              <p className="text-xs text-orange-400 italic">
                                <span className="font-semibold">Feedback:</span> {notif.metadata.review_note}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              {formatNotificationTime(notif.created_at)}
                            </p>
                            {(notif.appointment_id || notif.proof_id) && (
                              <span className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                                View Details →
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                  <FiBell size={48} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No notifications yet</p>
                  <p className="text-gray-600 text-xs mt-1">You'll be notified when there are updates</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentNotification;