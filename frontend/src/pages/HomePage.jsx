import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, BarChart3, Zap, Shield, Clock, ArrowRight, Circle } from 'lucide-react';

function HomePage() {
  return (
    <div className="min-h-screen bg-aloa-cream">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-effect border-b border-aloa-black/10">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Circle className="h-8 w-8 text-aloa-black fill-aloa-black" />
              <span className="text-xl font-bold tracking-tight">CUSTOM FORMS</span>
            </div>
            <div className="flex space-x-8">
              <Link to="/create" className="text-aloa-black hover:text-aloa-gray transition-colors text-sm uppercase tracking-wider">
                Create
              </Link>
              <Link to="/dashboard" className="text-aloa-black hover:text-aloa-gray transition-colors text-sm uppercase tracking-wider">
                Dashboard
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.9] mb-6 animate-fade-in">
                Forms,
                <br />
                <span className="italic font-light">reimagined</span>
              </h1>
              <p className="text-xl text-aloa-gray mb-8 max-w-md animate-slide-up">
                Transform markdown into beautiful, responsive forms. Collect responses with style and sophistication.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
                <Link
                  to="/create"
                  className="inline-flex items-center justify-center btn-primary group"
                >
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center btn-secondary"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-black-cream opacity-10 blur-3xl animate-pulse-slow"></div>
              <div className="relative bg-aloa-black text-aloa-cream p-8 animate-float">
                <pre className="text-xs md:text-sm font-mono overflow-x-auto">
                  <code>{`# Survey Form

## Section: Contact
- text* | name | Your Name
- email* | email | Email

## Section: Feedback
- select* | rating | Rating
  - Excellent
  - Good
  - Fair`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything you need,<br />
              <span className="italic font-light">nothing you don't</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-aloa-white p-8 hover:shadow-xl transition-shadow group">
              <div className="h-12 w-12 mb-6 flex items-center justify-center">
                <Zap className="h-8 w-8 text-aloa-black group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-semibold mb-3 uppercase tracking-wide">Instant</h3>
              <p className="text-aloa-gray leading-relaxed">
                Upload markdown, get a custom form URL instantly. No coding, no complexity.
              </p>
            </div>

            <div className="bg-aloa-white p-8 hover:shadow-xl transition-shadow group">
              <div className="h-12 w-12 mb-6 flex items-center justify-center">
                <Shield className="h-8 w-8 text-aloa-black group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-semibold mb-3 uppercase tracking-wide">Secure</h3>
              <p className="text-aloa-gray leading-relaxed">
                Your data is protected with unique URLs and secure storage protocols.
              </p>
            </div>

            <div className="bg-aloa-white p-8 hover:shadow-xl transition-shadow group">
              <div className="h-12 w-12 mb-6 flex items-center justify-center">
                <Clock className="h-8 w-8 text-aloa-black group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-semibold mb-3 uppercase tracking-wide">Real-time</h3>
              <p className="text-aloa-gray leading-relaxed">
                Track responses instantly and export data whenever you need it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Markdown Example */}
      <section className="py-20 bg-aloa-black text-aloa-cream">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple markdown,<br />
              <span className="italic font-light">powerful forms</span>
            </h2>
            <p className="text-aloa-cream/70 text-lg max-w-2xl mx-auto">
              Our intuitive markdown format makes form creation effortless
            </p>
          </div>
          
          <div className="bg-aloa-black/50 border border-aloa-cream/20 p-8">
            <pre className="text-sm md:text-base overflow-x-auto font-mono text-aloa-cream/90">
              <code>{`# Customer Feedback

We value your opinion and want to hear from you.

## Section: Personal Information
- text* | name | Full Name
- email* | email | Email Address
- text | company | Company Name

## Section: Experience
- select* | satisfaction | Overall Satisfaction
  - Very Satisfied
  - Satisfied
  - Neutral
  - Dissatisfied

- textarea* | comments | Your Feedback
- checkbox | interests | Areas of Interest
  - Product Updates
  - Newsletter
  - Special Offers`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-cream-black">
        <div className="container mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-aloa-cream">
            Ready to create<br />
            <span className="italic font-light">beautiful forms?</span>
          </h2>
          <p className="text-aloa-cream/70 text-xl mb-8 max-w-2xl mx-auto">
            Join thousands who've transformed their data collection with Custom Forms.
          </p>
          <Link
            to="/create"
            className="inline-flex items-center px-10 py-5 bg-aloa-cream text-aloa-black font-semibold uppercase tracking-wider hover:bg-aloa-white transition-all group"
          >
            Get Started Now
            <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-aloa-black text-aloa-cream py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <Circle className="h-6 w-6 text-aloa-cream fill-aloa-cream" />
              <span className="text-sm uppercase tracking-wider">Custom Forms</span>
            </div>
            <p className="text-sm text-aloa-cream/60">
              © 2024 Custom Forms. Crafted with precision.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;