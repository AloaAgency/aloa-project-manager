'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MultiStepFormRenderer from '@/components/MultiStepFormRenderer';
import { Loader2 } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-white text-2xl font-bold">Form Submission</h1>
              <button
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                  toast.success('URL copied to clipboard!');
                }}
                className="text-white/80 hover:text-white transition-colors text-sm"
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