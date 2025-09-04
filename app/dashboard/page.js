'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, BarChart, ExternalLink, Trash2, Edit2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/forms');
      const data = await response.json();
      setForms(data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const deleteForm = async (formId) => {
    if (!confirm('Are you sure you want to delete this form and all its responses?')) {
      return;
    }

    try {
      const response = await fetch(`/api/forms/by-id/${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete form');
      }

      toast.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-aloa-black hover:text-aloa-gray transition-colors font-display uppercase tracking-wider text-sm"
          >
            ← Back to Home
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-aloa-black uppercase tracking-tight">
              Dashboard
            </h1>
            <button
              onClick={() => router.push('/create')}
              className="btn-primary flex items-center justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Form
            </button>
          </div>
        </div>

        {forms.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-xl text-aloa-gray mb-8 font-body">
              You haven't created any forms yet
            </p>
            <button
              onClick={() => router.push('/create')}
              className="btn-primary mx-auto"
            >
              Create Your First Form
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {forms.map((form) => (
              <div key={form._id} className="card hover:shadow-2xl transition-all duration-300 hover:transform hover:-translate-y-0.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-display font-bold text-aloa-black mb-2 uppercase tracking-wider break-words">
                      {form.title}
                    </h3>
                    {form.description && (
                      <p className="text-aloa-gray mb-4 font-body line-clamp-2">{form.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm font-display uppercase tracking-wider">
                      <span className="bg-aloa-sand px-3 py-1 text-aloa-black">
                        {form.fields.length} fields
                      </span>
                      <span className="bg-aloa-sand px-3 py-1 text-aloa-black">
                        {form.responseCount || 0} responses
                      </span>
                      <span className="bg-aloa-sand px-3 py-1 text-aloa-black">
                        {formatDate(form.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:ml-4">
                    <button
                      onClick={() => window.open(`/forms/${form.urlId}`, '_blank')}
                      className="p-2 sm:p-3 bg-aloa-sand hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 group"
                      title="View Form"
                    >
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => router.push(`/edit/${form._id}`)}
                      className="p-2 sm:p-3 bg-aloa-sand hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 group"
                      title="Edit Form Fields"
                    >
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => router.push(`/responses/${form._id}`)}
                      className="p-2 sm:p-3 bg-aloa-sand hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 group"
                      title="View Responses"
                    >
                      <BarChart className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => deleteForm(form._id)}
                      className="p-2 sm:p-3 bg-aloa-sand hover:bg-red-600 hover:text-white transition-all duration-300 group"
                      title="Delete Form"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}