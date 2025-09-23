import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Copy, BarChart3, Trash2, ExternalLink, FileText, Calendar, Users, Check } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { formAPI } from '../utils/api';

function DashboardPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const data = await formAPI.getAllForms();
      setForms(data);
    } catch (error) {

      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (urlId) => {
    const url = `${window.location.origin}/form/${urlId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(urlId);
    toast.success('URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form and all its responses?')) {
      return;
    }

    try {
      await formAPI.deleteForm(formId);
      toast.success('Form deleted successfully');
      loadForms();
    } catch (error) {

      toast.error('Failed to delete form');
    }
  };

  const toggleFormStatus = async (formId, currentStatus) => {
    try {
      await formAPI.updateForm(formId, { isActive: !currentStatus });
      toast.success(`Form ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadForms();
    } catch (error) {

      toast.error('Failed to update form');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid gap-4">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aloa-cream p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-aloa-black">Dashboard</h1>
            <p className="text-aloa-gray mt-2">Manage your forms and view responses</p>
          </div>
          <div className="flex gap-4">
            <Link
              to="/"
              className="btn-secondary"
            >
              Home
            </Link>
            <Link
              to="/create"
              className="inline-flex items-center btn-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Form
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-aloa-white border border-aloa-black/10 p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-aloa-gray uppercase tracking-wider">Total Forms</p>
                <p className="text-3xl font-bold text-aloa-black mt-2">{forms.length}</p>
              </div>
              <FileText className="h-8 w-8 text-aloa-black" />
            </div>
          </div>

          <div className="bg-aloa-white border border-aloa-black/10 p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-aloa-gray uppercase tracking-wider">Active Forms</p>
                <p className="text-3xl font-bold text-aloa-black mt-2">
                  {forms.filter(f => f.isActive).length}
                </p>
              </div>
              <Eye className="h-8 w-8 text-aloa-black" />
            </div>
          </div>

          <div className="bg-aloa-white border border-aloa-black/10 p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-aloa-gray uppercase tracking-wider">Total Responses</p>
                <p className="text-3xl font-bold text-aloa-black mt-2">
                  {forms.reduce((sum, f) => sum + (f.responseCount || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-aloa-black" />
            </div>
          </div>
        </div>

        {/* Forms List */}
        {forms.length === 0 ? (
          <div className="bg-aloa-white border border-aloa-black/10 p-16 text-center">
            <FileText className="h-12 w-12 text-aloa-black/30 mx-auto mb-6" />
            <h3 className="text-2xl font-medium text-aloa-black mb-3">No forms yet</h3>
            <p className="text-aloa-gray mb-8">Create your first form to start collecting responses</p>
            <Link
              to="/create"
              className="inline-flex items-center btn-primary"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Form
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {forms.map((form) => (
              <div
                key={form._id}
                className="bg-aloa-white border border-aloa-black/10 hover:border-aloa-black/30 transition-all"
              >
                <div className="p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-xl font-semibold text-aloa-black">{form.title}</h3>
                        <span
                          className={`px-3 py-1 text-xs uppercase tracking-wider ${
                            form.isActive
                              ? 'bg-aloa-black text-aloa-cream'
                              : 'bg-aloa-gray/20 text-aloa-gray'
                          }`}
                        >
                          {form.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-6 text-sm text-aloa-gray">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Created {format(new Date(form.createdAt), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          {form.responseCount || 0} responses
                        </span>
                        <span className="flex items-center font-mono">
                          <FileText className="h-4 w-4 mr-2" />
                          {form.urlId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(form.urlId)}
                        className="p-3 text-aloa-black hover:bg-aloa-cream transition-colors border border-aloa-black/10"
                        title="Copy URL"
                      >
                        {copiedId === form.urlId ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>

                      <a
                        href={`/form/${form.urlId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 text-aloa-black hover:bg-aloa-cream transition-colors border border-aloa-black/10"
                        title="Preview Form"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>

                      <Link
                        to={`/responses/${form._id}`}
                        className="p-3 text-aloa-black hover:bg-aloa-cream transition-colors border border-aloa-black/10"
                        title="View Responses"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>

                      <button
                        onClick={() => toggleFormStatus(form._id, form.isActive)}
                        className="p-3 text-aloa-black hover:bg-aloa-cream transition-colors border border-aloa-black/10"
                        title={form.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Eye className={`h-4 w-4 ${!form.isActive && 'opacity-50'}`} />
                      </button>

                      <button
                        onClick={() => deleteForm(form._id)}
                        className="p-3 text-red-600 hover:bg-red-50 transition-colors border border-red-600/20"
                        title="Delete Form"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {form.expiresAt && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-sm text-orange-600">
                        Expires: {format(new Date(form.expiresAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;