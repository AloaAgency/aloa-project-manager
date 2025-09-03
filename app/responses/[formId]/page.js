'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedResponse, setExpandedResponse] = useState(null);

  useEffect(() => {
    fetchFormAndResponses();
  }, [params.formId]);

  const fetchFormAndResponses = async () => {
    try {
      const [formRes, responsesRes] = await Promise.all([
        fetch(`/api/forms/by-id/${params.formId}`),
        fetch(`/api/responses?formId=${params.formId}`)
      ]);

      if (!formRes.ok || !responsesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const formData = await formRes.json();
      const responsesData = await responsesRes.json();

      setForm(formData);
      setResponses(responsesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load responses');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!form || responses.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Create proper CSV with escaped values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Submitted At', ...form.fields.map(f => f.label)].map(escapeCSV).join(',');
    const rows = responses.map(response => {
      const submittedAt = formatDate(response.submittedAt);
      const values = [submittedAt, ...form.fields.map(field => {
        // Handle both Map and plain object data structures
        const value = response.data instanceof Map ? 
          response.data.get(field.name) : 
          response.data[field.name] || '';
        return Array.isArray(value) ? value.join('; ') : value;
      })];
      return values.map(escapeCSV).join(',');
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title.toLowerCase().replace(/\s+/g, '-')}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpanded = (responseId) => {
    setExpandedResponse(expandedResponse === responseId ? null : responseId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner message="Loading responses..." />
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 text-aloa-black hover:text-aloa-gray transition-colors font-display uppercase tracking-wider text-sm"
          >
            ← Back to Dashboard
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-aloa-black uppercase tracking-tight mb-2">
                {form.title}
              </h1>
              <p className="text-sm font-display uppercase tracking-wider">
                <span className="bg-aloa-sand px-3 py-1 text-aloa-black inline-block">
                  {responses.length} response{responses.length !== 1 ? 's' : ''}
                </span>
              </p>
            </div>
            {responses.length > 0 && (
              <button
                onClick={exportToCSV}
                className="btn-secondary flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {responses.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-xl text-aloa-gray mb-8 font-body">
              No responses yet
            </p>
            <button
              onClick={() => window.open(`/forms/${form.urlId}`, '_blank')}
              className="btn-primary mx-auto"
            >
              View Form
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {responses.map((response) => (
              <div key={response._id} className="card hover:shadow-xl transition-all duration-300">
                <div 
                  className="flex items-center justify-between cursor-pointer group"
                  onClick={() => toggleExpanded(response._id)}
                >
                  <div>
                    <p className="text-sm font-display uppercase tracking-wider text-aloa-black">
                      Submitted {formatDate(response.submittedAt)}
                    </p>
                  </div>
                  <button className="p-2 hover:bg-aloa-sand transition-all duration-200 group-hover:bg-aloa-sand">
                    {expandedResponse === response._id ? (
                      <ChevronUp className="w-5 h-5 transition-transform" />
                    ) : (
                      <ChevronDown className="w-5 h-5 transition-transform" />
                    )}
                  </button>
                </div>

                {expandedResponse === response._id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 pt-6 border-t-2 border-aloa-sand"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      {form.fields.map((field) => {
                        // Handle both Map and plain object data structures
                        const value = response.data instanceof Map ? 
                          response.data.get(field.name) : 
                          response.data[field.name];
                        if (!value || (Array.isArray(value) && value.length === 0)) {
                          return null;
                        }
                        
                        return (
                          <div key={field._id || field.id} className="bg-aloa-sand p-3">
                            <p className="text-xs font-display uppercase tracking-wider text-aloa-gray mb-1">
                              {field.label}
                            </p>
                            <p className="text-aloa-black font-body break-words">
                              {Array.isArray(value) ? value.join(', ') : value}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}