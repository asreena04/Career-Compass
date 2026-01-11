import { useState } from "react";

/* ===================== UI Helpers ===================== */
const Input = (props) => (
  <input
    {...props}
    className={[
      "w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white",
      "placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500",
      props.className || "",
    ].join(" ")}
  />
);

const Textarea = (props) => (
  <textarea
    {...props}
    className={[
      "w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white",
      "placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500",
      props.className || "",
    ].join(" ")}
  />
);

const Card = ({ title, subtitle, children }) => (
  <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
    <div className="mb-6">
      <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
        {title}
      </h2>
      {subtitle ? <p className="text-gray-400 mt-2">{subtitle}</p> : null}
    </div>
    {children}
  </div>
);

const AddButton = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-5 py-2 rounded-xl font-semibold transition shadow-md
               bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900
               hover:from-teal-400 hover:to-cyan-400"
  >
    {children}
  </button>
);

const RemoveButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="h-10 w-10 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition"
    title="Remove"
  >
    ✕
  </button>
);

const MsgBox = ({ responseMsg }) => {
  if (!responseMsg) return null;

  const msgType = responseMsg.includes('✅') ? 'success' :
                  responseMsg.includes('❌') ? 'error' : 'info';

  const cls =
    msgType === "success"
      ? "bg-green-900/20 border-green-700/30 text-green-200"
      : msgType === "error"
      ? "bg-red-900/20 border-red-700/30 text-red-200"
      : "bg-cyan-900/20 border-cyan-700/30 text-cyan-200";

  return (
    <div className={`mt-8 p-4 rounded-xl border ${cls}`}>
      <p className="font-medium">{responseMsg}</p>
    </div>
  );
};

/* ===================== Main Component ===================== */
export default function CV() {
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    state: "",
    email: "",
    phoneNumber: "",
    linkedin: "",

    careerObjective: "",
    technicalSkills: "",
    technicalLevel: "",
    transferableSkills: "",

    referenceName: "",
    referenceEmail: "",
    referencePhoneNumber: "",
    referenceRole: "",
    referenceDepartment: "",
    referenceInstitution: "",

    educations: [],
    achievements: [],
    certificates: [],
  });

  const [responseMsg, setResponseMsg] = useState("");

  // Handler for simple, flat input fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler for adding a new item to a dynamic list
  const addItem = (section) => {
    let newItem = {};
    if (section === 'educations') {
        newItem = { educationTitle: "", educationYears: "" };
    } else if (section === 'achievements') {
        newItem = { achievementTitle: "", achievementYear: "" };
    } else if (section === 'certificates') {
        newItem = { certificateTitle: "", certificateYear: "" };
    }

    setFormData((prev) => ({
      ...prev,
      [section]: [...(prev[section] || []), newItem],
    }));
  };

  // Handler for updating an item within a dynamic list
  const updateItem = (section, index, key, value) => {
    setFormData((prev) => {
      const updatedList = [...(prev[section] || [])];
      if (updatedList[index]) {
        updatedList[index][key] = value;
      }
      return { ...prev, [section]: updatedList };
    });
  };

  // Handler for removing an item from a dynamic list
  const removeItem = (section, index) => {
    setFormData((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setResponseMsg("⏳ Processing... Please wait.");

    try {
      // Validate required fields before sending
      if (!formData.name.trim()) {
        setResponseMsg("❌ Error: Name is required");
        return;
      }

      // Use environment variable for backend URL
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      console.log("Sending request to:", `${API_URL}/api/generate-cv`);

      const response = await fetch(`${API_URL}/api/generate-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      console.log("Response status:", response.status);
      console.log("Content-Type:", response.headers.get('content-type'));

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      // Check if response is JSON or PDF
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        // Old endpoint - returns JSON with URL
        const data = await response.json();
        console.log("Response data:", data);

        setResponseMsg(`✅ Success! CV generated successfully!`);

        if (data.url) {
          window.open(data.url, '_blank');
        }
      } else {
        // New endpoint - streams PDF directly
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        setResponseMsg(`✅ Success! CV generated successfully!`);
        window.open(url, '_blank');
      }

    } catch (error) {
      console.error("CV generation error:", error);

      // Better error messages
      if (error.message === 'Failed to fetch') {
        setResponseMsg(`❌ Error: Cannot connect to server. Make sure the backend is running.`);
      } else {
        setResponseMsg(`❌ Error: ${error.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
            CV Generator
          </h1>
          <p className="text-gray-400 text-lg mt-2">
            Fill in your details and generate a clean PDF CV instantly
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Personal Information */}
          <Card title="Personal Information" subtitle="Basic contact details shown at the top of your CV.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required />
              <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" required />
              <Input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Phone Number" />
              <Input type="text" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="LinkedIn Profile" />
              <Input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
              <Input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
            </div>
          </Card>

          {/* Career Objective */}
          <Card title="Career Objective" subtitle="A short paragraph describing your goals and what role you're aiming for.">
            <Textarea
              name="careerObjective"
              value={formData.careerObjective}
              onChange={handleChange}
              placeholder="Write your career goals or objective..."
              rows={5}
            />
          </Card>

          {/* Skills */}
          <Card title="Skills" subtitle="Add your technical and transferable skills.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                name="technicalSkills"
                value={formData.technicalSkills}
                onChange={handleChange}
                placeholder="Technical Skills (e.g., Python, SQL, React)"
                rows={4}
                className="md:col-span-2"
              />
              <Input
                type="text"
                name="technicalLevel"
                value={formData.technicalLevel}
                onChange={handleChange}
                placeholder="Technical Skill Level (e.g., Expert)"
              />
              <Input
                type="text"
                name="transferableSkills"
                value={formData.transferableSkills}
                onChange={handleChange}
                placeholder="Transferable Skills (e.g., Teamwork, Leadership)"
              />
            </div>
          </Card>

          {/* Education */}
          <Card title="Education" subtitle="Add one or more education entries.">
            <div className="space-y-4">
              {formData.educations.map((item, index) => (
                <div key={index} className="bg-gray-800/40 border border-gray-700 rounded-2xl p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 w-full">
                      <Input
                        type="text"
                        name="educationTitle"
                        value={item.educationTitle}
                        onChange={(e) => updateItem('educations', index, 'educationTitle', e.target.value)}
                        placeholder="Degree Title / Institution"
                      />
                    </div>
                    <div className="w-full md:w-52">
                      <Input
                        type="text"
                        name="educationYears"
                        value={item.educationYears}
                        onChange={(e) => updateItem('educations', index, 'educationYears', e.target.value)}
                        placeholder="Years (e.g., 2020-2024)"
                      />
                    </div>
                    <RemoveButton onClick={() => removeItem('educations', index)} />
                  </div>
                </div>
              ))}
              <AddButton onClick={() => addItem('educations')}>+ Add Education</AddButton>
            </div>
          </Card>

          {/* Achievements */}
          <Card title="Achievements" subtitle="Highlight awards, leadership, hackathons, etc.">
            <div className="space-y-4">
              {formData.achievements.map((item, index) => (
                <div key={index} className="bg-gray-800/40 border border-gray-700 rounded-2xl p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 w-full">
                      <Input
                        type="text"
                        name="achievementTitle"
                        value={item.achievementTitle}
                        onChange={(e) => updateItem('achievements', index, 'achievementTitle', e.target.value)}
                        placeholder="Achievement Description"
                      />
                    </div>
                    <div className="w-full md:w-52">
                      <Input
                        type="text"
                        name="achievementYear"
                        value={item.achievementYear}
                        onChange={(e) => updateItem('achievements', index, 'achievementYear', e.target.value)}
                        placeholder="Year"
                      />
                    </div>
                    <RemoveButton onClick={() => removeItem('achievements', index)} />
                  </div>
                </div>
              ))}
              <AddButton onClick={() => addItem('achievements')}>+ Add Achievement</AddButton>
            </div>
          </Card>

          {/* Certificates */}
          <Card title="Certificates" subtitle="List relevant certs and the year earned.">
            <div className="space-y-4">
              {formData.certificates.map((item, index) => (
                <div key={index} className="bg-gray-800/40 border border-gray-700 rounded-2xl p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 w-full">
                      <Input
                        type="text"
                        name="certificateTitle"
                        value={item.certificateTitle}
                        onChange={(e) => updateItem('certificates', index, 'certificateTitle', e.target.value)}
                        placeholder="Certificate Name"
                      />
                    </div>
                    <div className="w-full md:w-52">
                      <Input
                        type="text"
                        name="certificateYear"
                        value={item.certificateYear}
                        onChange={(e) => updateItem('certificates', index, 'certificateYear', e.target.value)}
                        placeholder="Year"
                      />
                    </div>
                    <RemoveButton onClick={() => removeItem('certificates', index)} />
                  </div>
                </div>
              ))}
              <AddButton onClick={() => addItem('certificates')}>+ Add Certificate</AddButton>
            </div>
          </Card>

          {/* Reference */}
          <Card title="Reference" subtitle="Include a referee if needed (optional).">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="text" name="referenceName" value={formData.referenceName} onChange={handleChange} placeholder="Reference Name" />
              <Input type="email" name="referenceEmail" value={formData.referenceEmail} onChange={handleChange} placeholder="Reference Email" />
              <Input type="text" name="referencePhoneNumber" value={formData.referencePhoneNumber} onChange={handleChange} placeholder="Reference Phone Number" />
              <Input type="text" name="referenceRole" value={formData.referenceRole} onChange={handleChange} placeholder="Reference Role" />
              <Input type="text" name="referenceDepartment" value={formData.referenceDepartment} onChange={handleChange} placeholder="Reference Department" />
              <Input type="text" name="referenceInstitution" value={formData.referenceInstitution} onChange={handleChange} placeholder="Reference Institution" />
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 rounded-xl font-bold transition shadow-lg border inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900 border-cyan-400/20 hover:from-teal-400 hover:to-cyan-400"
            >
              Generate CV
            </button>
          </div>

          {/* Response Message */}
          <MsgBox responseMsg={responseMsg} />
        </div>
      </div>
    </div>
  );
}