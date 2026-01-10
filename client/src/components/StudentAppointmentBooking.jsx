import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiCalendar, FiClock, FiUser, FiCheck, FiX, FiMail, FiMapPin, FiBriefcase, FiBookOpen, FiAlertCircle } from 'react-icons/fi';

const StudentAppointmentBooking = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [advisorInfo, setAdvisorInfo] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [error, setError] = useState('');
  const [existingAppointmentOnDate, setExistingAppointmentOnDate] = useState(null);

  useEffect(() => {
    fetchStudentAndAdvisor();
  }, []);

  useEffect(() => {
    if (selectedDate && advisorInfo) {
      checkExistingAppointment();
      fetchAvailableSlots();
    }
  }, [selectedDate, advisorInfo]);

  const fetchStudentAndAdvisor = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to book an appointment');
        setPageLoading(false);
        return;
      }

      console.log('🔍 Fetching student profile for user:', user.id);

      const { data: student, error: studentError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('📊 Student data:', student);

      if (studentError) {
        console.error('Error fetching student:', studentError);
        setError(`Could not load student information: ${studentError.message}`);
        setPageLoading(false);
        return;
      }

      const { data: studentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      setStudentInfo({ ...student, profiles: studentProfile });

      if (!student.advisor_id) {
        console.warn('⚠️ No advisor_id found for student');
        setError('No academic advisor assigned. Please contact administration to assign an advisor.');
        setPageLoading(false);
        return;
      }

      console.log('🔍 Fetching advisor with ID:', student.advisor_id);

      const { data: advisor, error: advisorError } = await supabase
        .from('academic_advisor_profiles')
        .select('*')
        .eq('id', student.advisor_id)
        .single();

      console.log('👨‍🏫 Advisor data:', advisor);

      if (advisorError) {
        console.error('Error fetching advisor:', advisorError);
        setError(`Could not load advisor information: ${advisorError.message}`);
        setPageLoading(false);
        return;
      }

      const { data: advisorProfile, error: advisorProfileError } = await supabase
        .from('profiles')
        .select('email, avatar_url')
        .eq('id', student.advisor_id)
        .single();

      console.log('📸 Advisor profile data:', advisorProfile);

      if (advisorProfileError) {
        console.error('Error fetching advisor profile:', advisorProfileError);
      }

      setAdvisorInfo({ ...advisor, profiles: advisorProfile });
      console.log('✅ Successfully loaded advisor info with profile');
      setPageLoading(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      setPageLoading(false);
    }
  };

  const checkExistingAppointment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingAppts } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status')
        .eq('student_id', user.id)
        .eq('appointment_date', selectedDate)
        .in('status', ['pending', 'confirmed'])
        .order('start_time', { ascending: true });

      console.log('🔍 Existing appointment check:', existingAppts);
      
      const existingAppt = existingAppts && existingAppts.length > 0 ? existingAppts[0] : null;
      setExistingAppointmentOnDate(existingAppt);
    } catch (err) {
      console.error('Error checking existing appointment:', err);
    }
  };

  const fetchAvailableSlots = async () => {
    const date = new Date(selectedDate);
    let dayOfWeek = date.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;
    if (dayOfWeek > 4) {
      setAvailableSlots([]);
      return;
    }

    const { data: availability } = await supabase
      .from('advisor_availability')
      .select('*')
      .eq('advisor_id', advisorInfo.id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    if (!availability || availability.length === 0) {
      setAvailableSlots([]);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data: bookedSlots } = await supabase
      .from('appointments')
      .select('start_time, end_time, status, cancelled_by, student_id')
      .eq('advisor_id', advisorInfo.id)
      .eq('appointment_date', selectedDate);

    console.log('📅 All appointments for this date:', bookedSlots);
    console.log('👤 Current user ID:', user?.id);

    const slots = [];
    availability.forEach(avail => {
      let currentTime = new Date(`2000-01-01T${avail.start_time}`);
      const endTime = new Date(`2000-01-01T${avail.end_time}`);

      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        currentTime.setMinutes(currentTime.getMinutes() + 30);
        const slotEnd = currentTime.toTimeString().slice(0, 5);

        const blockingAppointment = bookedSlots?.find(booking => {
          const isActiveOrAdvisorCancelled = 
            booking.status !== 'cancelled' || 
            (booking.status === 'cancelled' && booking.cancelled_by === 'advisor');
          
          const exactMatch = booking.start_time.slice(0, 5) === slotStart;
          
          return isActiveOrAdvisorCancelled && exactMatch;
        });

        const isBooked = !!blockingAppointment;
        const isOwnBooking = blockingAppointment && user ? blockingAppointment.student_id === user.id : false;

        console.log(`Slot ${slotStart}-${slotEnd}: ${isBooked ? 'BOOKED' : 'AVAILABLE'}${isOwnBooking ? ' (Your booking)' : ''}, Blocking appt student_id: ${blockingAppointment?.student_id}, Current user: ${user?.id}`);

        slots.push({ 
          start: slotStart, 
          end: slotEnd, 
          isBooked,
          isOwnBooking
        });
      }
    });

    console.log('✅ All slots with status:', slots);
    setAvailableSlots(slots);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage({ type: 'error', text: 'Please sign in to book an appointment' });
        setLoading(false);
        return;
      }

      if (existingAppointmentOnDate) {
        setMessage({ 
          type: 'error', 
          text: 'Only 1 appointment is allowed per day. Please cancel your existing appointment to book another one.' 
        });
        setLoading(false);
        return;
      }

      const slot = availableSlots.find(s => s.start === selectedTime);
      
      if (!slot) {
        setMessage({ type: 'error', text: 'Invalid time slot selected' });
        setLoading(false);
        return;
      }

      if (slot.isBooked) {
        setMessage({ type: 'error', text: 'This slot is already booked. Please select another time.' });
        setLoading(false);
        return;
      }

      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('id, status, cancelled_by, student_id')
        .eq('advisor_id', advisorInfo.id)
        .eq('appointment_date', selectedDate)
        .eq('start_time', slot.start);

      console.log('🔍 Checking for conflicts:', existingAppointments);

      const isSlotBlocked = existingAppointments?.some(apt => {
        return apt.status !== 'cancelled' || 
               (apt.status === 'cancelled' && apt.cancelled_by === 'advisor');
      });

      if (isSlotBlocked) {
        setMessage({ type: 'error', text: 'This slot has just been booked. Please select another time.' });
        setLoading(false);
        fetchAvailableSlots();
        return;
      }
      
      const { error } = await supabase
        .from('appointments')
        .insert({
          student_id: user.id,
          advisor_id: advisorInfo.id,
          appointment_date: selectedDate,
          start_time: slot.start,
          end_time: slot.end,
          status: 'pending',
          notes: notes
        });

      if (error) {
        console.error('❌ Booking error:', error);
        
        if (error.code === '23505') {
          if (error.message.includes('unique_student_active_appointment_per_date')) {
            setMessage({ 
              type: 'error', 
              text: 'Only 1 appointment is allowed per day. Please cancel your existing appointment to book another one.' 
            });
          } else {
            setMessage({ type: 'error', text: 'This slot has just been booked. Please select another time.' });
            fetchAvailableSlots();
          }
        } else {
          setMessage({ type: 'error', text: error.message });
        }
      } else {
        console.log('✅ Appointment booked successfully');
        setMessage({ type: 'success', text: 'Appointment booked successfully! Your advisor will confirm shortly.' });
        setSelectedDate('');
        setSelectedTime('');
        setNotes('');
        setAvailableSlots([]);
        setExistingAppointmentOnDate(null);
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setMessage({ type: 'error', text: 'An error occurred while booking' });
    }

    setLoading(false);
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !advisorInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md text-center">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <div className="w-full max-w-3xl">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
                Book an Appointment
              </h1>
              <p className="text-gray-400 text-lg">Schedule a meeting with your academic advisor</p>
            </div>

            {advisorInfo && (
              <div className="bg-gradient-to-br from-cyan-900/40 to-indigo-900/40 backdrop-blur-sm rounded-2xl border border-cyan-500/30 p-8 mb-8 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <FiUser className="mr-2" size={28} />
                  Your Academic Advisor
                </h2>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-shrink-0">
                    {advisorInfo.profiles?.avatar_url ? (
                      <img 
                        src={advisorInfo.profiles.avatar_url} 
                        alt={advisorInfo.full_name}
                        className="w-32 h-32 rounded-full border-4 border-cyan-500 object-fit shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full border-4 border-cyan-500 bg-gradient-to-br from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg">
                        <FiUser size={40} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-grow space-y-3">
                    <h3 className="text-2xl font-bold text-white">{advisorInfo.full_name}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {advisorInfo.position && (
                        <div className="flex items-center text-gray-300">
                          <FiBriefcase size={18} className="mr-2 text-cyan-400" />
                          <span>{advisorInfo.position}</span>
                        </div>
                      )}
                      
                      {advisorInfo.department && (
                        <div className="flex items-center text-gray-300">
                          <FiBookOpen size={18} className="mr-2 text-cyan-400" />
                          <span>{advisorInfo.department}</span>
                        </div>
                      )}
                      
                      {advisorInfo.profiles?.email && (
                        <a 
                          href={`mailto:${advisorInfo.profiles.email}`}
                          className="flex items-center text-gray-300 hover:text-cyan-400 transition-colors"
                        >
                          <FiMail size={18} className="mr-2 text-cyan-400" />
                          <span className="truncate">{advisorInfo.profiles.email}</span>
                        </a>
                      )}
                      
                      {advisorInfo.room_number && (
                        <div className="flex items-center text-gray-300">
                          <FiMapPin size={18} className="mr-2 text-cyan-400" />
                          <span>Room {advisorInfo.room_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Select Appointment Time</h2>

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

              {existingAppointmentOnDate && (
                <div className="mb-6 p-4 rounded-xl border bg-yellow-900/30 border-yellow-700/50 text-yellow-400 flex items-start gap-3">
                  <FiAlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Existing Appointment</p>
                    <p className="text-sm">
                      You already have an appointment on this date at{' '}
                      {existingAppointmentOnDate.start_time.slice(0, 5)} - {existingAppointmentOnDate.end_time.slice(0, 5)}.
                      Only 1 appointment is allowed per day. Please cancel your existing appointment to book another one.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleBookAppointment} className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <FiCalendar className="text-cyan-400" />
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime('');
                      setMessage({ type: '', text: '' });
                    }}
                    min={minDate}
                    max={maxDate}
                    required
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>

                {selectedDate && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                      <FiClock className="text-indigo-400" />
                      Available Time Slots
                    </label>
                    
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.start}
                            type="button"
                            onClick={() => !slot.isBooked && setSelectedTime(slot.start)}
                            disabled={slot.isBooked}
                            className={`p-3 rounded-xl border transition-all text-sm font-medium relative ${
                              slot.isBooked
                                ? 'bg-gray-800/50 border-gray-700 text-gray-600 cursor-not-allowed'
                                : selectedTime === slot.start
                                ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-cyan-500/50'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>{slot.start} - {slot.end}</span>
                              {slot.isBooked && (
                                <span className="text-xs text-gray-500 mt-1">
                                  {slot.isOwnBooking ? '(Your booking)' : 'Booked'}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                        <p className="text-gray-400">No available slots for this date</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Appointment Details (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any specific topics or questions you'd like to discuss..."
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    disabled={!!existingAppointmentOnDate}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!selectedDate || !selectedTime || loading || !!existingAppointmentOnDate}
                  className={`w-full py-4 rounded-xl font-semibold text-white transition-all shadow-lg ${
                    !selectedDate || !selectedTime || loading || !!existingAppointmentOnDate
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-cyan-500/30'
                  }`}
                >
                  {loading ? 'Booking...' : existingAppointmentOnDate ? 'Cancel Existing Appointment First' : 'Book Appointment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAppointmentBooking;