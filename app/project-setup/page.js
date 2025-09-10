'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, User, Mail, Video, FileText, Rocket, AlertCircle } from 'lucide-react';

export default function ProjectSetupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    projectName: '',
    clientName: '',
    clientEmail: '',
    contractSignedDate: '',
    startDate: '',
    estimatedCompletionDate: '',
    introductionVideoUrl: '',
    mainPages: 5,
    auxPages: 5
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/aloa-projects/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Redirect to the project dashboard
      router.push(`/project/${data.project.id}/dashboard`);
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error.message || 'Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate suggested completion date (3 months from start date)
  const suggestCompletionDate = () => {
    if (formData.startDate) {
      const start = new Date(formData.startDate);
      start.setMonth(start.getMonth() + 3);
      return start.toISOString().split('T')[0];
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-full mb-6">
            <Rocket className="w-10 h-10 text-[#faf8f3]" />
          </div>
          <h1 className="text-5xl font-bold text-black mb-4">
            New Aloa Project
          </h1>
          <p className="text-xl text-gray-700">
            Let's set up your web design project and get started!
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Project Information */}
            <div>
              <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                Project Information
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Acme Corp Website Redesign"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contract Signed Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      name="contractSignedDate"
                      value={formData.contractSignedDate}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div>
              <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
                <User className="w-6 h-6 mr-2" />
                Client Information
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    required
                    placeholder="e.g., John Smith"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="clientEmail"
                      value={formData.clientEmail}
                      onChange={handleChange}
                      required
                      placeholder="client@example.com"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
                <Calendar className="w-6 h-6 mr-2" />
                Project Timeline
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Completion Date
                  </label>
                  <input
                    type="date"
                    name="estimatedCompletionDate"
                    value={formData.estimatedCompletionDate}
                    onChange={handleChange}
                    placeholder={suggestCompletionDate()}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                  />
                  {formData.startDate && !formData.estimatedCompletionDate && (
                    <p className="text-sm text-gray-500 mt-1">
                      Suggested: {suggestCompletionDate()} (3 months from start)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Project Rules */}
            <div>
              <h2 className="text-2xl font-bold text-black mb-6">
                Project Scope
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Main Pages
                  </label>
                  <input
                    type="number"
                    name="mainPages"
                    value={formData.mainPages}
                    onChange={handleChange}
                    min="1"
                    max="20"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Primary navigation pages
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auxiliary Pages
                  </label>
                  <input
                    type="number"
                    name="auxPages"
                    value={formData.auxPages}
                    onChange={handleChange}
                    min="0"
                    max="20"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Secondary/footer pages
                  </p>
                </div>
              </div>
            </div>

            {/* Introduction Video */}
            <div>
              <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
                <Video className="w-6 h-6 mr-2" />
                Introduction Video
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL (Optional)
                </label>
                <input
                  type="url"
                  name="introductionVideoUrl"
                  value={formData.introductionVideoUrl}
                  onChange={handleChange}
                  placeholder="https://vimeo.com/..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Welcome video to introduce the client to the process
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" />
                    Initialize Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-[#faf8f3] rounded-xl p-6 border-2 border-black/10">
          <h3 className="font-bold text-lg mb-2">What happens next?</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-black mr-2">1.</span>
              <span>The client will receive an introduction email with their project dashboard link</span>
            </li>
            <li className="flex items-start">
              <span className="text-black mr-2">2.</span>
              <span>The first projectlet (Design Inspiration Survey) will be unlocked</span>
            </li>
            <li className="flex items-start">
              <span className="text-black mr-2">3.</span>
              <span>Team members will be notified and given access to the project</span>
            </li>
            <li className="flex items-start">
              <span className="text-black mr-2">4.</span>
              <span>Progress tracking and gamification elements will be activated</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}