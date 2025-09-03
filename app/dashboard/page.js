'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, BarChart, ExternalLink, Trash2 } from 'lucide-react';
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
      const response = await fetch(`/api/forms/${formId}`, {
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
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-aloa-black rounded-full animate-pulse-slow" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push('/')}
              className="mb-4 text-aloa-black hover:text-aloa-gray transition-colors font-display uppercase tracking-wider"
            >
              ← Back
            </button>
            <h1 className="text-4xl font-display font-bold text-aloa-black uppercase tracking-tight">
              Dashboard
            </h1>
          </div>
          <button
            onClick={() => router.push('/create')}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Form
          </button>
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
          <div className="grid gap-6">
            {forms.map((form) => (
              <div key={form._id} className="card hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-display font-bold text-aloa-black mb-2 uppercase tracking-wider">
                      {form.title}
                    </h3>
                    {form.description && (
                      <p className="text-aloa-gray mb-4 font-body">{form.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-aloa-gray font-body">
                      <span>{form.fields.length} fields</span>
                      <span>{form.responseCount || 0} responses</span>
                      <span>Created {formatDate(form.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => window.open(`/forms/${form.urlId}`, '_blank')}
                      className="p-3 bg-aloa-sand hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300"
                      title="View Form"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => router.push(`/responses/${form._id}`)}
                      className="p-3 bg-aloa-sand hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300"
                      title="View Responses"
                    >
                      <BarChart className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteForm(form._id)}
                      className="p-3 bg-aloa-sand hover:bg-red-600 hover:text-white transition-all duration-300"
                      title="Delete Form"
                    >
                      <Trash2 className="w-5 h-5" />
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