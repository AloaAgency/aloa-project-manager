'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MultiStepFormRenderer from '@/components/MultiStepFormRenderer';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FormClient({ initialForm }) {
  const router = useRouter();
  const [form] = useState(initialForm);

  if (!form) {
    router.push('/');
    return null;
  }

  // Check if form is closed
  if (form.is_active === false) {
    return (
      <div className="min-h-screen bg-gradient-subtle py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-aloa-white shadow-xl overflow-hidden">
            <div className="bg-aloa-black text-aloa-cream px-4 sm:px-8 py-3 sm:py-4">
              <img 
                src="https://images.ctfassets.net/qkznfzcikv51/xWpsUAypBrRgAjmbyLGYy/b969f4353174e4f209996ebf60af8f7c/aloa_-_white.svg" 
                alt="Aloa" 
                className="h-12 sm:h-16 w-auto"
              />
            </div>
            <div className="p-8 sm:p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-100 rounded-full">
                  <Lock className="w-12 h-12 text-red-600" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-aloa-black mb-4 uppercase tracking-wider">
                {form.title}
              </h1>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
                <p className="text-lg text-amber-900 font-medium mb-2">
                  Survey Closed
                </p>
                <p className="text-amber-800">
                  {form.closed_message || 'This survey is no longer accepting responses. Thank you!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-aloa-white shadow-xl overflow-hidden">
          <div className="bg-aloa-black text-aloa-cream px-4 sm:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <img 
                src="https://images.ctfassets.net/qkznfzcikv51/xWpsUAypBrRgAjmbyLGYy/b969f4353174e4f209996ebf60af8f7c/aloa_-_white.svg" 
                alt="Aloa" 
                className="h-12 sm:h-16 w-auto"
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