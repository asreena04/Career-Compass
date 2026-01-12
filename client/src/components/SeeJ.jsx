import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

const MAX_CARDS_DISPLAYED = 3;
const MAX_DESCRIPTION_LENGTH = 300;

// Format date for better readability
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return dateString;
  }
};

const usePublicJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [visibleJobCount, setVisibleJobCount] = useState(MAX_CARDS_DISPLAYED);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const SELECT_COLUMNS = `
      job_posting_id,
      job_title,
      description,
      location,
      salary_range,
      application_link,
      application_deadline,
      created_at,
      job_posting_skill (
        is_other,
        skill (
          skill_name
        )
      )
    `;

    let query = supabase
      .from("job_posting")
      .select(SELECT_COLUMNS)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (searchTerm) {
      query = query.or(
        `job_title.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`
      );
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching public jobs:", fetchError);
      setError(fetchError.message);
      setJobs([]);
    } else {
      const formattedJobs = (data || []).map((job) => ({
        ...job,
        skills:
          job.job_posting_skill?.map((s) => ({
            name: s.skill?.skill_name,
            is_other: s.is_other,
          })) || [],
      }));
      setJobs(formattedJobs);
      setVisibleJobCount(Math.min(formattedJobs.length, MAX_CARDS_DISPLAYED));
    }

    setLoading(false);
  }, [searchTerm]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const toggleDescription = (jobId) =>
    setExpandedJobId((prevId) => (prevId === jobId ? null : jobId));

  // Show more +3 each click
  const handleShowMoreJobs = () => {
    setVisibleJobCount((prevCount) =>
      Math.min(prevCount + MAX_CARDS_DISPLAYED, jobs.length)
    );
  };

  const handleShowLessJobs = () => setVisibleJobCount(MAX_CARDS_DISPLAYED);
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setVisibleJobCount(MAX_CARDS_DISPLAYED); //allow visible count to reset immediately when type
  };

  return {
    state: {
      jobs,
      loading,
      error,
      expandedJobId,
      visibleJobCount,
      searchTerm,
      isShowingAllJobs: visibleJobCount >= jobs.length,
      hasMoreJobs: jobs.length > MAX_CARDS_DISPLAYED,
      jobsToDisplay: jobs.slice(0, visibleJobCount),
    },
    handlers: {
      toggleDescription,
      handleShowMoreJobs,
      handleShowLessJobs,
      handleSearchChange,
    },
  };
};

// Skill Chip component with conditional styling for 'is_other'
const SkillChip = ({ skillName, isOther }) => (
  <span
    className={`flex items-center text-xs font-bold px-3 py-1 rounded-full border transition-all duration-300 shadow-sm
      ${
        isOther
          ? "bg-purple-900/30 text-purple-300 border-purple-500/50"
          : "bg-teal-900/30 text-teal-300 border-teal-500/50"
      }`}
  >
    <i className={`bx ${isOther ? "bx-star" : "bx-check-double"} mr-1 text-[10px]`} />
    {skillName}
  </span>
);

const JobCard = ({ job, isExpanded, toggleDescription }) => {
  const descriptionText = job.description || "";
  const isLongDescription = descriptionText.length > MAX_DESCRIPTION_LENGTH;
  const displayedDescription =
    isLongDescription && !isExpanded
      ? descriptionText.substring(0, MAX_DESCRIPTION_LENGTH) + "..."
      : descriptionText;

  return (
    <div className="relative p-6 rounded-2xl shadow-xl transition-all duration-300 transform bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:shadow-teal-900/50 hover:scale-[1.01] flex flex-col justify-between h-full">
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-400 leading-tight">
            {job.job_title}
          </h3>
          <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-widest">
            Posted: {formatDate(job.created_at)}
          </p>
        </div>

        {/* Skills Section */}
        <div className="flex flex-wrap gap-2 py-1">
          {job.skills && job.skills.length > 0 ? (
            job.skills.map((skill, index) => (
              <SkillChip
                key={index}
                skillName={skill.name}
                isOther={skill.is_other}
              />
            ))
          ) : (
            <span className="text-gray-600 text-xs italic">
              No specific skills listed
            </span>
          )}
        </div>

        <div className="text-gray-300 text-sm leading-relaxed break-words">
          <span className="text-gray-400 font-semibold">Description: </span>
          {displayedDescription}
          {isLongDescription && (
            <button
              onClick={() => toggleDescription(job.job_posting_id)}
              className="ml-2 text-teal-400 font-medium hover:text-teal-300 transition-colors focus:outline-none"
            >
              {isExpanded ? "Show Less" : "Show More"}
            </button>
          )}
        </div>

        <div className="pt-3 space-y-2 text-gray-300 text-xs border-t border-gray-700/50">
          <p className="flex items-center">
            <i className="bx bx-time-five text-teal-500 mr-2 text-sm" />
            Deadline: {formatDate(job.application_deadline)}
          </p>
          <p className="flex items-center">
            <i className="bx bx-map-pin text-teal-500 mr-2 text-sm" />
            Location: {job.location || "Remote"}
          </p>
          <p className="flex items-center">
            <i className="bx bx-money text-teal-500 mr-2 text-sm" />
            Salary Range: {job.salary_range || "Competitive Salary"}
          </p>
        </div>
      </div>

      <div className="pt-6 mt-4">
        <a
          href={job.application_link}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-teal-600 text-gray-900 font-extrabold rounded-lg text-sm flex items-center justify-center hover:bg-teal-700 transition transform hover:scale-[1.01] shadow-lg shadow-teal-900/50"
        >
          <i className="bx bx-link-external mr-2" />
          Visit Company
        </a>
      </div>
    </div>
  );
};

const SeeJ = () => {
  const { state, handlers } = usePublicJobs();
  const {
    jobs,
    loading,
    error,
    hasMoreJobs,
    isShowingAllJobs,
    jobsToDisplay,
    expandedJobId,
    searchTerm,
  } = state;

  const {
    handleShowMoreJobs,
    handleShowLessJobs,
    toggleDescription,
    handleSearchChange,
  } = handlers;

  // Loading state (keep your current style)
  if (loading && jobs.length === 0 && !error) {
    return (
      <div className="flex flex-col justify-center items-center py-20 bg-black min-h-screen">
        <i className="bx bx-loader-alt bx-spin text-5xl text-teal-500 mb-4" />
        <p className="text-teal-400 text-xl font-medium animate-pulse">
          Scanning the market for opportunities...
        </p>
      </div>
    );
  }

  return (
    // SeeC outer shell (box outside) but KEEP your JobCard styling inside
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
              Job Opportunities
            </h2>
            <p className="text-gray-400">
              Search by title, location, or keyword. Then click “Visit Company” to apply.
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-xl mb-10">
            <div className="relative group">
              <i className="bx bx-search text-gray-500 absolute left-4 top-1/2 transform -translate-y-1/2 text-xl group-focus-within:text-teal-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by title, location, or keyword..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full p-4 pl-12 bg-gray-900 border border-gray-800 text-white rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition shadow-2xl"
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400">
                Failed to load jobs: {error}
              </p>
            )}
          </div>

          {/* Empty state */}
          {jobs.length === 0 && !loading ? (
            <div className="text-center p-16 bg-gray-800/40 rounded-2xl border border-gray-700">
              <p className="text-2xl text-gray-500 italic">
                No matches found for your search.
              </p>
            </div>
          ) : (
            <>
              {/* Grid (items-stretch helps balance within row) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                {jobsToDisplay.map((job) => (
                  <JobCard
                    key={job.job_posting_id}
                    job={job}
                    isExpanded={expandedJobId === job.job_posting_id}
                    toggleDescription={toggleDescription}
                  />
                ))}
              </div>

              {/* Show more/less (keep your button style) */}
              {hasMoreJobs && (
                <div className="text-center mt-16">
                  <button
                    onClick={isShowingAllJobs ? handleShowLessJobs : handleShowMoreJobs}
                    className={`py-4 px-10 font-bold rounded-xl shadow-2xl transition duration-300 transform hover:scale-105 ${
                      isShowingAllJobs
                        ? "bg-gray-800 text-teal-400 hover:bg-gray-700 border border-gray-700"
                        : "bg-gradient-to-r from-teal-600 to-teal-700 text-gray-900 hover:from-teal-500 hover:to-teal-600"
                    }`}
                  >
                    {isShowingAllJobs ? "Show Less" : "Show More"}
                  </button>
                </div>
              )}
            </>
          )}

          <p className="mt-8 text-sm text-gray-500 italic">
            Tip: Apply early! Some postings close once they receive enough candidates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SeeJ;
