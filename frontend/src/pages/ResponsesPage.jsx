import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, Calendar, User, Clock, PieChart, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { formAPI, responseAPI } from '../utils/api';

function ResponsesPage() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState('responses'); // 'responses' or 'analytics'

  useEffect(() => {
    loadData();
  }, [formId, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [formData, responsesData, statsData] = await Promise.all([
        formAPI.getFormDetails(formId),
        responseAPI.getResponses(formId, currentPage),
        responseAPI.getResponseStats(formId)
      ]);
      
      setForm(formData);
      setResponses(responsesData.responses);
      setPagination(responsesData.pagination);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  const exportResponses = async () => {
    try {
      const blob = await responseAPI.exportResponses(formId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.title.replace(/\s+/g, '-').toLowerCase()}-responses.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Responses exported successfully');
    } catch (error) {
      console.error('Error exporting responses:', error);
      toast.error('Failed to export responses');
    }
  };

  const deleteResponse = async (responseId) => {
    if (!window.confirm('Are you sure you want to delete this response?')) {
      return;
    }

    try {
      await responseAPI.deleteResponse(responseId);
      toast.success('Response deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting response:', error);
      toast.error('Failed to delete response');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{form?.title}</h1>
            <p className="text-gray-600 mt-1">
              {stats?.summary?.totalResponses || 0} total responses
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={exportResponses}
              disabled={!responses.length}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('responses')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'responses'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            Responses
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'analytics'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            Analytics
          </button>
        </div>

        {view === 'analytics' ? (
          // Analytics View
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-600 mb-1">Total Responses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.summary?.totalResponses || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-600 mb-1">Unique Respondents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.summary?.uniqueRespondents || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-600 mb-1">Avg. Time Spent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.summary?.avgTimeSpent || 0}s
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-600 mb-1">Last Response</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats?.summary?.lastSubmission
                    ? format(new Date(stats.summary.lastSubmission), 'MMM d')
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Field Statistics */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Field Statistics</h3>
              <div className="space-y-4">
                {Object.entries(stats?.fieldStats || {}).map(([fieldName, fieldData]) => (
                  <div key={fieldName} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <h4 className="font-medium text-gray-900 mb-2">{fieldData.label}</h4>
                    
                    {fieldData.distribution ? (
                      <div className="space-y-2">
                        {Object.entries(fieldData.distribution).map(([option, count]) => (
                          <div key={option} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{option}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full"
                                  style={{
                                    width: `${(count / fieldData.responses) * 100}%`
                                  }}
                                />
                              </div>
                              <span className="text-sm text-gray-700 w-12 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">Fill Rate:</span>
                        <span className="font-medium text-gray-900">{fieldData.fillRate}</span>
                        <span className="text-gray-600">({fieldData.filled} responses)</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Responses View
          <div className="space-y-4">
            {responses.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
                <p className="text-gray-600">Share your form URL to start collecting responses</p>
              </div>
            ) : (
              <>
                {responses.map((response, idx) => (
                  <div key={response._id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">
                          Response #{(currentPage - 1) * 50 + idx + 1}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(response.submittedAt), 'MMM d, yyyy h:mm a')}
                        </span>
                        {response.respondentInfo?.email && (
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {response.respondentInfo.email}
                          </span>
                        )}
                        {response.metadata?.timeSpent && (
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {response.metadata.timeSpent}s
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteResponse(response._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Response"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid gap-3">
                      {form?.sections?.map((section) => (
                        <div key={section.title}>
                          <h4 className="font-medium text-gray-900 mb-2">{section.title}</h4>
                          <div className="grid gap-2 pl-4">
                            {section.fields.map((field) => {
                              const answer = response.answers[field.name];
                              return (
                                <div key={field.name} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    {field.label}:
                                  </span>
                                  <span className="md:col-span-2 text-sm text-gray-600">
                                    {Array.isArray(answer) 
                                      ? answer.join(', ') 
                                      : answer || '-'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          page === currentPage
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResponsesPage;