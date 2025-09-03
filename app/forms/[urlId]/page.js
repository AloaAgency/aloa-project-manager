'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MultiStepFormRenderer from '@/components/MultiStepFormRenderer';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function FormPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForm();
  }, [params.urlId]);

  const fetchForm = async () => {
    try {
      const response = await fetch(`/api/forms/${params.urlId}`);
      if (!response.ok) {
        throw new Error('Form not found');
      }
      const data = await response.json();
      setForm(data);
    } catch (error) {
      console.error('Error fetching form:', error);
      toast.error('Form not found');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner message="Loading form..." />
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="bg-aloa-black text-aloa-cream px-6 sm:px-8 py-6 -m-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-wider">Form Submission</h1>
              <button
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                  toast.success('URL copied to clipboard!');
                }}
                className="text-aloa-cream/80 hover:text-aloa-cream transition-colors text-sm font-display uppercase tracking-wider"
              >
                Copy Link
              </button>
            </div>
          </div>
          <MultiStepFormRenderer form={form} />
        </div>
      </div>
    </div>
  );
}