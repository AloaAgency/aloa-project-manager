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
        <div className="bg-aloa-white shadow-xl overflow-hidden">
          <div className="bg-aloa-black text-aloa-cream px-4 sm:px-8 py-4 sm:py-6">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <img 
                src="https://images.ctfassets.net/qkznfzcikv51/xWpsUAypBrRgAjmbyLGYy/b969f4353174e4f209996ebf60af8f7c/aloa_-_white.svg" 
                alt="Aloa" 
                className="h-8 sm:h-10 w-auto"
              />
              <button
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                  toast.success('URL copied to clipboard!');
                }}
                className="text-aloa-cream/80 hover:text-aloa-cream transition-colors text-xs sm:text-sm font-display uppercase tracking-wider whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <MultiStepFormRenderer form={form} />
          </div>
        </div>
      </div>
    </div>
  );
}