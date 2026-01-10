import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const CompetitionPostForm = ({ onPostSuccess }) => {

  // Initialize variable. 'useState' manage all form's input in single object.
  const [competitionData, setCompetitionData] = useState({
    title: '',
    description: '',
    dateCompetition: '',
    startTime: '',
    endTime: '',
    venue: '',
    priceParticipate: '',
    registrationLink: '',
  });

  const [competitionImage, setCompetitionImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Function for user to change input field content, event object, e was created when change occur.
  const handleChange = (e) => {
    const { name, value } = e.target; // Select input field content that user want to change.
    setCompetitionData(prevData => ({
      ...prevData, // Copy all previous input field content into new object.
      [name]: value // Change only input field content that user want to change.
    }));
  };

  // Function for user to change file.
  const handleImageChange = (e) => {
    const file = e.target.files[0]; // Select file that user want to change.
    if (file && file.type.startsWith('image/')) {
      setCompetitionImage(file); // Change to new file.
      setError(null);
    }
    else { // Cannot update image & display error message.
      setCompetitionImage(null);
      setError('Please select a valid image file (jpg, png, etc.).');
    }
  };

  // Function to upload image to supabase storage bucket.
  const uploadImage = async () => {
    if (!competitionImage) { // No file insert.
      return { publicUrl: null, uploadError: null };
    }
    const fileExtension = competitionImage.name.split('.').pop(); // Check file allowed type. Must be .jpg or .png
    const fileName = `${uuidv4()}.${fileExtension}`; // Generate unique file name using UUID to prevent collision.
    const filePath = `competition_images/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('competition_images')
      .upload(filePath, competitionImage, {
        cacheControl: '3600', // Cache for 1 hour.
        upsert: false // Not overwrite if file exist.
      });
    if (uploadError) {
      console.error('❌ Supabase Image Upload Error:', uploadError);
      return { publicUrl: null, uploadError };
    }
    const { data: publicUrlData } = supabase.storage // Know filePath in supabase storage bucket to uploaded image into supabase.
      .from('competition_images')
      .getPublicUrl(filePath);
    return { publicUrl: publicUrlData.publicUrl, uploadError: null };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true); // Start submit form.
    const { publicUrl, uploadError } = await uploadImage();
    if (uploadError) { // Error occur. Cannot submit form.
      setError(`Image upload failed: ${uploadError.message}. The post was NOT submitted.`);
      setIsSubmitting(false); // Stop submit form.
      return;
    }
    const imageUrl = publicUrl;
    const submissionPayload = { // Collect all input field content.
      competition_title: competitionData.title, // All column in 'competition_posts' table match with all attribute here.
      description: competitionData.description,
      competition_date: competitionData.dateCompetition,
      start_time: competitionData.startTime,
      end_time: competitionData.endTime,
      venue: competitionData.venue,
      price_participate: competitionData.priceParticipate,
      registration_link: competitionData.registrationLink,
      image_url: imageUrl,
    };
    console.log('Attempting Supabase insert for Competition:', submissionPayload);
    const { error: dbError } = await supabase
      .from('competition_posts')
      .insert([submissionPayload]); // Insert all input field content into 'competition_posts' table.
    setIsSubmitting(false);
    if (dbError) {
      console.error('❌ Supabase Insertion Error:', dbError);
      setError(`Submission Failed: ${dbError.message}.`);
    }
    else { // Successfully insert.
      alert('Competition Post successfully submitted to Supabase!');
      setCompetitionData({ // Reset form to initial empty value.
        title: '',
        description: '',
        dateCompetition: '',
        startTime: '',
        endTime: '',
        venue: '',
        priceParticipate: '',
        registrationLink: '',
      });
      setCompetitionImage(null); // Reset file input state.
      if (onPostSuccess) { onPostSuccess(); } // Refresh post.
    }
  };

  return ( // Form's Component Design
    <div className="min-h-screen p-8 sm:p-10 bg-black text-white flex justify-center items-center">
      <div className="max-w-4xl w-full p-8 bg-gray-900 rounded-xl shadow-2xl shadow-gray-950 border border-gray-700">

        <h2 className="text-4xl font-extrabold text-yellow-400 text-center mb-10 border-b border-gray-700 pb-4">Create New Competition Post</h2>
        {error && (<div className="p-4 mb-4 text-sm font-medium text-red-100 bg-red-800 rounded-lg" role="alert">🚨 Error: {error}</div>)}{/* Alert if any error occur */}

        <form onSubmit={handleSubmit} className="space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* 1.0 Make Title & Date aligned same row */}
            <div className="space-y-2"> {/* 1.1 Title */}
              <label htmlFor="title" className="block text-sm font-semibold text-gray-300">Competition Title<span className="text-red-400">*</span></label>
              <input
                type="text"
                id="title"
                name="title"
                value={competitionData.title}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 placeholder-gray-400"
                placeholder="e.g., Annual Coding Challenge 2025"
              />
            </div>
            <div className="space-y-2"> {/* 1.2 Date */}
              <label htmlFor="dateCompetition" className="block text-sm font-semibold text-gray-300">Date of Competition<span className="text-red-400">*</span></label>
              <input
                type="date"
                id="dateCompetition"
                name="dateCompetition"
                value={competitionData.dateCompetition}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150"
              />
            </div>
          </div>

          <div className="space-y-2"> {/* 2.0 Upload Image */}
            <label htmlFor="competitionImage" className="block text-sm font-semibold text-gray-300">Competition Picture (Optional)</label>
            <input
              type="file"
              id="competitionImage"
              name="competitionImage"
              onChange={handleImageChange}
              accept="image/*"
              className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-gray-900 hover:file:bg-yellow-600
              p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150"
            />
            {competitionImage && (<p className="text-sm text-yellow-400 mt-2">Selected file: {competitionImage.name}</p>)}
          </div>

          <div className="space-y-2"> {/* 3.0 Description */}
            <label htmlFor="description" className="block text-sm font-semibold text-gray-300">Competition Description<span className="text-red-400">*</span></label>
            <textarea
              id="description"
              name="description"
              value={competitionData.description}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 placeholder-gray-400"
              placeholder="Detail the rules, prizes, and target audience for the competition."
              rows="5"
            >
            </textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* 4.0 Make Start Time, End Time, Venue aligned same row */}
            <div className="space-y-2"> {/* 4.1 Start Time */}
              <label htmlFor="startTime" className="block text-sm font-semibold text-gray-300">Start Time<span className="text-red-400">*</span></label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={competitionData.startTime}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150"
              />
            </div>
            <div className="space-y-2"> {/* 4.2 End Time */}
              <label htmlFor="endTime" className="block text-sm font-semibold text-gray-300">End Time<span className="text-red-400">*</span></label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={competitionData.endTime}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150"
              />
            </div>
            <div className="space-y-2"> {/* 4.3 Venue */}
              <label htmlFor="venue" className="block text-sm font-semibold text-gray-300">Venue<span className="text-red-400">*</span></label>
              <input
                type="text"
                id="venue"
                name="venue"
                value={competitionData.venue}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 placeholder-gray-400"
                placeholder="e.g., Main Auditorium, Online"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* 5.0 Make Price Participate & Registration Link aligned same row */}
            <div className="space-y-2"> {/* 5.1 Price Participate */}
              <label htmlFor="priceParticipate" className="block text-sm font-semibold text-gray-300">Participation Fee<span className="text-red-400">*</span></label>
              <input
                type="text"
                id="priceParticipate"
                name="priceParticipate"
                value={competitionData.priceParticipate}
                onChange={handleChange}
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 placeholder-gray-400"
                placeholder="e.g., $20, Free, RM50"
              />
            </div>
            <div className="space-y-2"> {/* 5.2 Registration Link */}
              <label htmlFor="registrationLink" className="block text-sm font-semibold text-gray-300">Registration Link<span className="text-red-400">*</span></label>
              <input
                type="url"
                id="registrationLink"
                name="registrationLink"
                value={competitionData.registrationLink}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 placeholder-gray-400"
                placeholder="https://eventbrite.com/register-competition"
              />
            </div>
          </div>

          <button type="submit" // 6.0 Submit Button
            disabled={isSubmitting} // Disable submit button when data was successfully submit to supabase.
            className="w-full py-4 bg-yellow-600 text-gray-900 font-extrabold text-lg rounded-xl shadow-lg shadow-yellow-900/50 focus:outline-none focus:ring-4 focus:ring-yellow-500 focus:ring-opacity-50 transition duration-300 transform hover:scale-[1.01] disabled:bg-gray-500 disabled:shadow-none disabled:cursor-not-allowed">
            {isSubmitting ? 'Posting Competition...' : 'Post Competition'} {/* From 'Posting Competition...' to 'Post Competition' means form successfully submit to supabase */}
          </button>

        </form>

      </div>
    </div>
  );
};

export default CompetitionPostForm;