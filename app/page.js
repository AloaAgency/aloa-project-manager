'use client';

import { useRouter } from 'next/navigation';
import { Rocket, Users, Trophy, Zap, Target, Calendar, ChevronRight, Sparkles } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-black rounded-full">
                <Rocket className="w-12 h-12 text-[#faf8f3]" />
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-black tracking-tight leading-tight mb-6">
              Aloa Project Manager
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-700 max-w-3xl mx-auto mb-12">
              Gamified project management for web design excellence. 
              Guide clients through every step with clarity and excitement.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
              <button 
                onClick={() => router.push('/project-setup')}
                className="inline-flex items-center justify-center bg-black text-white px-8 py-4 font-semibold hover:bg-gray-800 transition-all duration-300 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Start New Project
              </button>
              
              <button 
                onClick={() => router.push('/projects')}
                className="inline-flex items-center justify-center bg-white text-black px-8 py-4 border-2 border-black font-semibold hover:bg-black hover:text-white transition-all duration-300 rounded-lg"
              >
                <Users className="w-5 h-5 mr-2" />
                View All Projects
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">The Aloa Way</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Structured Workflow */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-[#faf8f3] rounded-full mb-6">
              <Target className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-xl font-bold mb-3">Structured Workflow</h3>
            <p className="text-gray-600">
              Every project follows a proven path from contract to launch, ensuring nothing gets missed.
            </p>
          </div>

          {/* Gamified Progress */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-[#faf8f3] rounded-full mb-6">
              <Trophy className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-xl font-bold mb-3">Gamified Progress</h3>
            <p className="text-gray-600">
              Unlock achievements, track milestones, and celebrate wins throughout the project journey.
            </p>
          </div>

          {/* Client Collaboration */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-[#faf8f3] rounded-full mb-6">
              <Users className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-xl font-bold mb-3">Client Collaboration</h3>
            <p className="text-gray-600">
              Clients actively participate through forms and approvals, keeping everyone aligned.
            </p>
          </div>

          {/* Smart Forms */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-[#faf8f3] rounded-full mb-6">
              <Sparkles className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-xl font-bold mb-3">Smart Forms</h3>
            <p className="text-gray-600">
              Collect design preferences, content, and feedback through intelligent, sequential forms.
            </p>
          </div>

          {/* Timeline Management */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-[#faf8f3] rounded-full mb-6">
              <Calendar className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-xl font-bold mb-3">Timeline Management</h3>
            <p className="text-gray-600">
              Automatic deadline tracking and reminders keep projects on schedule.
            </p>
          </div>

          {/* Real-time Updates */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-[#faf8f3] rounded-full mb-6">
              <Zap className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-xl font-bold mb-3">Real-time Updates</h3>
            <p className="text-gray-600">
              Everyone stays informed with automatic notifications and progress updates.
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Preview */}
      <div className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Project Workflow</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Initialize", desc: "Contract, timeline, team setup" },
              { step: "2", title: "Discover", desc: "Design inspiration, mood boards, fonts" },
              { step: "3", title: "Create", desc: "Content, copy, page designs" },
              { step: "4", title: "Deliver", desc: "Development, revisions, launch" }
            ].map((phase, index) => (
              <div key={index} className="relative">
                <div className="bg-white/10 backdrop-blur rounded-lg p-6 hover:bg-white/20 transition-colors">
                  <div className="text-4xl font-bold text-[#faf8f3] mb-3">{phase.step}</div>
                  <h3 className="text-xl font-bold mb-2">{phase.title}</h3>
                  <p className="text-white/80 text-sm">{phase.desc}</p>
                </div>
                {index < 3 && (
                  <ChevronRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-white/40 w-6 h-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Project Management?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Start your first Aloa project and experience the difference of gamified, structured workflows.
          </p>
          <button 
            onClick={() => router.push('/project-setup')}
            className="inline-flex items-center justify-center bg-black text-white px-10 py-5 font-semibold hover:bg-gray-800 transition-all duration-300 rounded-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 text-lg"
          >
            <Rocket className="w-6 h-6 mr-3" />
            Initialize Your First Project
          </button>
        </div>
      </div>

      {/* Quick Links for existing forms (temporarily kept for backward compatibility) */}
      <div className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 mb-4">Legacy Form Builder</p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => router.push('/create')}
              className="text-sm text-gray-600 hover:text-black underline"
            >
              Create Form
            </button>
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-600 hover:text-black underline"
            >
              Forms Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}