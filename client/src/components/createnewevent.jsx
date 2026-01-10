import React, { useState } from 'react';
const CreateNewEvent = () => {
  // formData: Stores all current values from form inputs
  // initialize it with empty strings for each required field
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    location: '',
    description: '',
  });

  // Updates the formData state every time an input value changes
  // [e.target.name] dynamically selects key (e.g., 'title', 'date') in state object based on input's 'name' attribute
  const handleChange = (e) => {
    setFormData({
      ...formData, // Keep existing form data
      [e.target.name]: e.target.value, // Overwrite only the changed field
    });
  };

  // handleSubmit was called when user clicks "Publish Event" button
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevents browser from reloading page
    
    // Log collected data to console for verification
    console.log('Event Data Submitted:', formData);
  };

  // Form's Layout and Inputs
  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl mx-auto text-white">
      <h2 className="text-3xl font-bold mb-6 text-white">
        Create New Event
      </h2>
      
      <form onSubmit={handleSubmit}>
        
        {/* Title Field */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
            Title:
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
            placeholder="Title:"
            required
          />
        </div>
        
        {/* Date and Location Fields */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
            
            {/* Date Field: uses type = "date" for a native calendar picker */}
            <div className="flex-1">
                <label htmlFor="date" className="block text-sm font-medium text-white mb-2">
                    Date:
                </label>
                <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
                    required
                />
            </div>

            {/* Location Field */}
            <div className="flex-1">
                <label htmlFor="location" className="block text-sm font-medium text-white mb-2">
                    Location:
                </label>
                <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
                    placeholder="Location:"
                    required
                />
            </div>
        </div>

        {/* Description Field */}
        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
            Description:
          </label>
          <textarea
            id="description"
            name="description"
            rows="4"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
            placeholder="Description:"
            required
          ></textarea>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 bg-black text-white font-bold rounded-lg transition-all duration-300 hover:bg-gray-800"
        >
          Publish Event
        </button>
      </form>
    </div>
  );
};

export default CreateNewEvent;