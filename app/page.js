'use client';

import { useRouter } from 'next/navigation';
import { Upload, FileText, Share2, Database } from 'lucide-react';
import AloaLogo from '@/components/AloaLogo';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-aloa-cream">
      <div className="bg-gradient-cream-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <div className="flex flex-col items-center mb-6">
              <AloaLogo className="h-20 w-20 sm:h-24 sm:w-24 mb-4" />
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-aloa-black tracking-tight leading-tight text-center">
                ALOA CUSTOM<br className="sm:hidden" /> FORM MAKER
              </h1>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl text-aloa-black/80 max-w-3xl mx-auto mb-8 sm:mb-12 font-body px-4 font-medium">
              Transform your markdown files into beautiful, shareable forms with unique URLs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center px-4">
              <button 
                onClick={() => router.push('/create')}
                className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5 w-full sm:w-auto"
              >
                Create Form
              </button>
              <button 
                onClick={() => router.push('/dashboard')}
                className="btn-secondary text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5 w-full sm:w-auto"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="card group hover:scale-105 transition-transform duration-300">
            <div className="mb-6">
              <Upload className="w-12 h-12 text-aloa-black group-hover:animate-float" />
            </div>
            <h3 className="text-xl font-display font-bold text-aloa-black mb-3 uppercase tracking-wider">
              Upload Markdown
            </h3>
            <p className="text-aloa-black/70 font-body">
              Simply upload your markdown file with form structure
            </p>
          </div>

          <div className="card group hover:scale-105 transition-transform duration-300">
            <div className="mb-6">
              <FileText className="w-12 h-12 text-aloa-black group-hover:animate-float" />
            </div>
            <h3 className="text-xl font-display font-bold text-aloa-black mb-3 uppercase tracking-wider">
              Auto-Generate
            </h3>
            <p className="text-aloa-black/70 font-body">
              Beautiful forms are automatically created from your markdown
            </p>
          </div>

          <div className="card group hover:scale-105 transition-transform duration-300">
            <div className="mb-6">
              <Share2 className="w-12 h-12 text-aloa-black group-hover:animate-float" />
            </div>
            <h3 className="text-xl font-display font-bold text-aloa-black mb-3 uppercase tracking-wider">
              Share URL
            </h3>
            <p className="text-aloa-black/70 font-body">
              Get a unique URL to share your form with anyone
            </p>
          </div>

          <div className="card group hover:scale-105 transition-transform duration-300">
            <div className="mb-6">
              <Database className="w-12 h-12 text-aloa-black group-hover:animate-float" />
            </div>
            <h3 className="text-xl font-display font-bold text-aloa-black mb-3 uppercase tracking-wider">
              Collect Data
            </h3>
            <p className="text-aloa-black/70 font-body">
              All responses are stored and accessible in your dashboard
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-subtle py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-aloa-black mb-6 sm:mb-8">
            Markdown-Powered Forms
          </h2>
          <p className="text-base sm:text-lg text-aloa-black/70 mb-8 sm:mb-12 font-body max-w-2xl mx-auto px-4 font-medium">
            Use our simple markdown syntax to define form fields, validation rules, and more. 
            Your markdown becomes a fully functional form in seconds.
          </p>
          <div className="bg-aloa-black text-aloa-cream p-4 sm:p-8 font-mono text-left overflow-x-auto text-xs sm:text-sm">
            <pre>{`# Contact Form
Please fill out this form to get in touch.

## Name *
Type: text
Placeholder: Your full name

## Email *
Type: email
Placeholder: your@email.com

## Message *
Type: textarea
Placeholder: Your message here...
Min: 10
Max: 500`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}