'use client';

import { useRouter } from 'next/navigation';
import { Upload, FileText, Share2, Database } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-aloa-cream">
      <div className="bg-gradient-cream-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-display font-bold text-aloa-black mb-6 tracking-tight">
              CUSTOM FORMS
            </h1>
            <p className="text-xl md:text-2xl text-aloa-gray max-w-3xl mx-auto mb-12 font-body">
              Transform your markdown files into beautiful, shareable forms with unique URLs
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button 
                onClick={() => router.push('/create')}
                className="btn-primary text-lg px-10 py-5"
              >
                Create Form
              </button>
              <button 
                onClick={() => router.push('/dashboard')}
                className="btn-secondary text-lg px-10 py-5"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="card group hover:scale-105 transition-transform duration-300">
            <div className="mb-6">
              <Upload className="w-12 h-12 text-aloa-black group-hover:animate-float" />
            </div>
            <h3 className="text-xl font-display font-bold text-aloa-black mb-3 uppercase tracking-wider">
              Upload Markdown
            </h3>
            <p className="text-aloa-gray font-body">
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
            <p className="text-aloa-gray font-body">
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
            <p className="text-aloa-gray font-body">
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
            <p className="text-aloa-gray font-body">
              All responses are stored and accessible in your dashboard
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-subtle py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-aloa-black mb-8">
            Markdown-Powered Forms
          </h2>
          <p className="text-lg text-aloa-gray mb-12 font-body max-w-2xl mx-auto">
            Use our simple markdown syntax to define form fields, validation rules, and more. 
            Your markdown becomes a fully functional form in seconds.
          </p>
          <div className="bg-aloa-black text-aloa-cream p-8 font-mono text-left overflow-x-auto">
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