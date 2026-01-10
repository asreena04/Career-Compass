import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiClock, FiPlus, FiTrash2, FiCheck, FiX, FiSave } from 'react-icons/fi';

const AdvisorAvailability = () => {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newSlot, setNewSlot] = useState({
    day_of_week: '',
    start_time: '',
    end_time: ''
  });

  const daysOfWeek = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
  ];

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage({ type: 'error', text: 'Please sign in' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('advisor_availability')
        .select('*')
        .eq('advisor_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAvailability(data || []);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setMessage({ type: 'error', text: 'Failed to load availability' });
    }
    setLoading(false);
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage({ type: 'error', text: 'Please sign in' });
        setSaving(false);
        return;
      }

      // Validate times
      if (newSlot.start_time >= newSlot.end_time) {
        setMessage({ type: 'error', text: 'End time must be after start time' });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('advisor_availability')
        .insert({
          advisor_id: user.id,
          day_of_week: parseInt(newSlot.day_of_week),
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          is_available: true
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Time slot added successfully!' });
      setNewSlot({ day_of_week: '', start_time: '', end_time: '' });
      fetchAvailability();
    } catch (err) {
      console.error('Error adding slot:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to add time slot' });
    }
    setSaving(false);
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this time slot?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('advisor_availability')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Time slot deleted successfully!' });
      fetchAvailability();
    } catch (err) {
      console.error('Error deleting slot:', err);
      setMessage({ type: 'error', text: 'Failed to delete time slot' });
    }
  };

  const handleToggleAvailability = async (slotId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('advisor_availability')
        .update({ is_available: !currentStatus })
        .eq('id', slotId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Availability updated!' });
      fetchAvailability();
    } catch (err) {
      console.error('Error toggling availability:', err);
      setMessage({ type: 'error', text: 'Failed to update availability' });
    }
  };

  const getDayLabel = (dayNumber) => {
    return daysOfWeek.find(d => d.value === dayNumber)?.label || 'Unknown';
  };

  // Group slots by day
  const groupedAvailability = availability.reduce((acc, slot) => {
    const day = slot.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {});

  return (

    <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-800 px-8 py-10">
      <div className="text-center">
        <h2 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
          Availablity & Office Hour
          </h2>
          <p className="text-gray-400 text-base mb-10">Manage your weekly schedule for student bookings</p>
          </div>

      {/* Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-teal-900/30 border-teal-700/50 text-teal-400' 
            : 'bg-red-900/30 border-red-700/50 text-red-400'
        }`}>
          {message.type === 'success' ? <FiCheck size={20} /> : <FiX size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Add New Time Slot Form */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <FiPlus className="text-cyan-400" />
          Add your available time slot
        </h3>
        
        <form onSubmit={handleAddSlot} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Day Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Day</label>
            <select
              value={newSlot.day_of_week}
              onChange={(e) => setNewSlot({ ...newSlot, day_of_week: e.target.value })}
              required
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="">Select Day</option>
              {daysOfWeek.map(day => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Start Time</label>
            <input
              type="time"
              value={newSlot.start_time}
              onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
              required
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
            <input
              type="time"
              value={newSlot.end_time}
              onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
              required
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Slot'}
            </button>
          </div>
        </form>
      </div>

      {/* Current Availability */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-4">
          <FiClock className="text-indigo-400"/>
          Current Weekly Schedule
        </h3>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading availability...</p>
          </div>
        ) : Object.keys(groupedAvailability).length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <FiClock size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No availability set yet</p>
            <p className="text-gray-500 text-sm mt-2">Add your first time slot above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {daysOfWeek.map(day => {
              const daySlots = groupedAvailability[day.value];
              if (!daySlots) return null;

              return (
                <div key={day.value} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-lg font-bold text-white mb-4">{day.label}</h4>
                  <div className="space-y-3">
                    {daySlots.map(slot => (
                      <div 
                        key={slot.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                          slot.is_available 
                            ? 'bg-gray-900 border-gray-700' 
                            : 'bg-red-900/20 border-red-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <FiClock className={slot.is_available ? 'text-cyan-400' : 'text-red-400'} size={20} />
                          <span className="text-white font-medium">
                            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                          </span>
                          <span className={`text-xs px-3 py-1 rounded-full ${
                            slot.is_available 
                              ? 'bg-teal-900/50 text-teal-400 border border-teal-700/50' 
                              : 'bg-red-900/50 text-red-400 border border-red-700/50'
                          }`}>
                            {slot.is_available ? 'Active' : 'Disabled'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle Button */}
                          <button
                            onClick={() => handleToggleAvailability(slot.id, slot.is_available)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                              slot.is_available
                                ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50 hover:bg-yellow-900/50'
                                : 'bg-teal-900/30 text-teal-400 border border-teal-700/50 hover:bg-teal-900/50'
                            }`}
                          >
                            {slot.is_available ? 'Disable' : 'Enable'}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-2 bg-red-900/30 text-red-400 border border-red-700/50 rounded-lg hover:bg-red-900/50 transition-all"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisorAvailability;