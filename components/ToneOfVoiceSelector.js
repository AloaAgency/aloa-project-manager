'use client';

import { useState, useEffect } from 'react';
import { X, Check, Sparkles, GraduationCap } from 'lucide-react';

const toneOptions = [
  {
    value: 'Professional',
    label: 'Professional',
    description: 'Clean, corporate, and authoritative. Focuses on expertise and reliability.',
    sampleParagraph: 'At our company, we deliver comprehensive solutions tailored to meet the evolving needs of modern enterprises. Our team of industry experts brings decades of combined experience to every project, ensuring that your business objectives are met with precision and professionalism. We maintain the highest standards of quality throughout our engagement, providing transparent communication and measurable results that drive sustainable growth for your organization.',
    characteristics: ['Formal language', 'Complex sentences', 'Industry terminology', 'Third-person perspective']
  },
  {
    value: 'Casual',
    label: 'Casual & Friendly',
    description: 'Friendly and conversational. Like talking to a good friend.',
    sampleParagraph: 'Hey there! We\'re super excited to work with you on this project. We know that finding the right partner can be tough, but don\'t worry – we\'ve got your back. Our team loves what we do, and we\'re here to make sure you have a great experience from start to finish. Let\'s grab a coffee (virtual or real!) and chat about how we can help bring your ideas to life.',
    characteristics: ['Contractions', 'Simple sentences', 'Personal pronouns', 'Conversational tone']
  },
  {
    value: 'Bold',
    label: 'Bold & Direct',
    description: 'Aggressive and direct. Makes strong statements and takes a stand.',
    sampleParagraph: 'Stop settling for mediocrity. Your competition isn\'t waiting, and neither should you. We don\'t just deliver solutions – we demolish obstacles and obliterate limitations. Every day you delay is a day your rivals get ahead. It\'s time to make a decision that actually matters. Choose dominance. Choose excellence. Choose to win.',
    characteristics: ['Imperative mood', 'Short, punchy sentences', 'Strong action verbs', 'Direct commands']
  },
  {
    value: 'Minimalist',
    label: 'Minimalist',
    description: 'Just the facts. No fluff, straight to the point.',
    sampleParagraph: 'We build websites. Fast loading. Mobile responsive. SEO optimized. Clear navigation. Secure hosting. Regular updates. Fixed pricing. No hidden fees. Two week delivery. One revision round included. Support available.',
    characteristics: ['Fragments acceptable', 'No adjectives', 'Lists and bullets', 'Essential info only']
  },
  {
    value: 'Technical',
    label: 'Technical & Data-Driven',
    description: 'Data-driven and precise. Uses industry terminology and detailed explanations.',
    sampleParagraph: 'Our platform leverages a microservices architecture deployed on Kubernetes, ensuring 99.99% uptime through automated failover and load balancing. The API processes 10,000 requests per second with sub-100ms latency, utilizing Redis caching and PostgreSQL with read replicas. Our CI/CD pipeline implements automated testing with 95% code coverage, deploying to production through blue-green deployments to minimize downtime.',
    characteristics: ['Technical jargon', 'Specific metrics', 'Detailed specifications', 'Acronyms and numbers']
  },
  {
    value: 'Inspirational',
    label: 'Inspirational',
    description: 'Motivational and uplifting. Focuses on possibilities and aspirations.',
    sampleParagraph: 'Every great journey begins with a single step, and today, you\'re taking yours. Imagine a world where your vision becomes reality, where boundaries dissolve and possibilities emerge. Together, we\'ll transform challenges into opportunities, dreams into achievements. Your potential is limitless, and we\'re here to help you unlock it. The future you\'ve been dreaming of? It starts now.',
    characteristics: ['Emotional language', 'Future-focused', 'Metaphorical', 'Second-person address']
  },
  {
    value: 'Playful',
    label: 'Playful & Humorous',
    description: 'Fun and humorous. Doesn\'t take itself too seriously.',
    sampleParagraph: 'Okay, let\'s be real – most company websites are about as exciting as watching paint dry. (Sorry, paint-watching enthusiasts!) But here\'s the thing: who says business has to be boring? We\'re a bunch of creative weirdos who happen to be really, really good at what we do. We\'ll make you look awesome online, have some laughs along the way, and maybe even become friends. Warning: side effects may include actually enjoying the process!',
    characteristics: ['Humor and puns', 'Self-deprecating', 'Parenthetical asides', 'Casual punctuation']
  },
  {
    value: 'Luxurious',
    label: 'Luxurious & Premium',
    description: 'Premium and exclusive. Emphasizes quality and sophistication.',
    sampleParagraph: 'Experience the pinnacle of digital craftsmanship, where every pixel is meticulously placed and every interaction thoughtfully orchestrated. Our bespoke solutions are reserved for those who demand nothing less than perfection. From conception to completion, we curate an unparalleled journey that reflects the sophistication of your brand. This is not merely web design; this is digital artistry at its finest.',
    characteristics: ['Elevated vocabulary', 'Sensory language', 'Exclusivity emphasis', 'Refined tone']
  },
  {
    value: 'Empathetic',
    label: 'Empathetic & Caring',
    description: 'Caring and understanding. Shows genuine concern for the audience.',
    sampleParagraph: 'We know that choosing the right partner for your project can feel overwhelming, and we genuinely understand the weight of this decision. You\'re not just investing money; you\'re investing trust, hope, and vision. That\'s why we take the time to truly listen to your concerns, understand your challenges, and support you through every uncertainty. Your success matters deeply to us, not just as a business outcome, but because we care about the people behind every project.',
    characteristics: ['Emotional validation', 'Active listening cues', 'Supportive language', 'Personal connection']
  },
  {
    value: 'Authoritative',
    label: 'Authoritative & Expert',
    description: 'Expert and commanding. Establishes thought leadership.',
    sampleParagraph: 'With over 15 years of industry leadership, we have consistently set the standards that others follow. Our methodologies, published in leading industry journals and adopted by Fortune 500 companies, have proven their effectiveness time and again. When you work with us, you\'re not just hiring a service provider; you\'re partnering with the recognized authorities in digital innovation. The results speak for themselves: 97% client retention, 200+ industry awards, and consistent recognition as the benchmark for excellence.',
    characteristics: ['Credentials emphasized', 'Definitive statements', 'Evidence-based', 'Third-party validation']
  }
];

const educationLevels = [
  { value: 'elementary', label: 'Elementary (Grade School)', description: 'Simple words, short sentences' },
  { value: 'middle', label: 'Middle School', description: 'Basic concepts, clear explanations' },
  { value: 'high', label: 'High School', description: 'Standard vocabulary, moderate complexity' },
  { value: 'college', label: 'College/University', description: 'Advanced vocabulary, nuanced concepts' },
  { value: 'graduate', label: 'Graduate/Professional', description: 'Technical terms, complex ideas' },
  { value: 'phd', label: 'PhD/Expert', description: 'Highly technical, specialized language' }
];

export default function ToneOfVoiceSelector({
  applet,
  isViewOnly,
  onClose,
  projectId,
  userId,
  onComplete
}) {
  const [selectedTone, setSelectedTone] = useState(null);
  const [selectedEducation, setSelectedEducation] = useState(null);
  const [previousSelection, setPreviousSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredTone, setHoveredTone] = useState(null);

  useEffect(() => {
    // Load previous selection from applet's form_progress data
    console.log('Loading previous selection for:', { appletId: applet.id, userId });
    console.log('Applet data:', applet);

    // Check if applet has form_progress from user's progress tracking
    if (applet.form_progress) {
      console.log('Found form_progress:', applet.form_progress);
      if (applet.form_progress.selectedTone) {
        setSelectedTone(applet.form_progress.selectedTone);
        setSelectedEducation(applet.form_progress.educationLevel || null);
        setPreviousSelection(applet.form_progress);
      }
    }
    // Also check config for backward compatibility
    else if (applet.config?.tone_selection) {
      console.log('Found config tone_selection:', applet.config.tone_selection);
      setSelectedTone(applet.config.tone_selection.selectedTone);
      setSelectedEducation(applet.config.tone_selection.educationLevel || null);
      setPreviousSelection(applet.config.tone_selection);
    }
  }, [applet]);

  const handleSave = async () => {
    console.log('Save button clicked', { selectedTone, selectedEducation });
    if (!selectedTone || !selectedEducation) {
      console.log('Missing selection:', { selectedTone, selectedEducation });
      alert('Please select both a tone and education level');
      return;
    }

    setLoading(true);
    try {
      // Use the standardized progress tracking endpoint
      console.log('Saving tone selection using standardized progress tracking...');
      const response = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          status: 'completed',
          interactionType: 'tone_selection',
          userId,
          data: {
            form_progress: {
              selectedTone,
              educationLevel: selectedEducation,
              toneName: toneOptions.find(t => t.value === selectedTone)?.label,
              educationLevelName: educationLevels.find(e => e.value === selectedEducation)?.label,
              timestamp: new Date().toISOString()
            }
          }
        })
      });

      console.log('Response status:', response.status);
      if (response.ok) {
        console.log('Successfully saved tone selection');
        // Trigger confetti celebration
        if (onComplete) {
          onComplete();
        }
        // Close modal after short delay to see confetti
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        alert(`Failed to save selection: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving tone selection:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              {isViewOnly ? 'Your Selected Tone of Voice' : 'Select Your Brand\'s Tone of Voice'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isViewOnly ? 'This is the tone you selected for your brand' : 'Choose the tone that best represents your brand personality'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isViewOnly && previousSelection ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-8">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 mb-4">Your selected tone:</p>
                  <h3 className="text-3xl font-bold mb-2">{previousSelection.selectedTone || previousSelection}</h3>
                  {previousSelection.educationLevel && (
                    <p className="text-sm text-gray-600">
                      Reading Level: {educationLevels.find(e => e.value === previousSelection.educationLevel)?.label}
                    </p>
                  )}
                </div>
                {toneOptions.find(t => t.value === (previousSelection.selectedTone || previousSelection)) && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-white rounded-lg p-6">
                      <p className="text-xs font-semibold text-gray-500 mb-3">SAMPLE PARAGRAPH:</p>
                      <p className="text-gray-700 leading-relaxed">
                        {toneOptions.find(t => t.value === (previousSelection.selectedTone || previousSelection)).sampleParagraph}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">CHARACTERISTICS:</p>
                      <div className="flex flex-wrap gap-2">
                        {toneOptions.find(t => t.value === (previousSelection.selectedTone || previousSelection)).characteristics.map((char, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">{char}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toneOptions.map((tone) => (
                  <div
                    key={tone.value}
                    onClick={() => !isViewOnly && setSelectedTone(tone.value)}
                    onMouseEnter={() => setHoveredTone(tone.value)}
                    onMouseLeave={() => setHoveredTone(null)}
                    className={`
                      relative border-2 rounded-lg p-6 cursor-pointer transition-all
                      ${selectedTone === tone.value
                        ? 'border-black bg-gray-50 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
                      }
                    `}
                  >
                    {selectedTone === tone.value && (
                      <div className="absolute top-4 right-4">
                        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}

                    <h3 className="text-lg font-semibold mb-2">{tone.label}</h3>
                    <p className="text-sm text-gray-600 mb-3">{tone.description}</p>

                    <div className={`
                      transition-all duration-300 overflow-hidden
                      ${(hoveredTone === tone.value || selectedTone === tone.value) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                    `}>
                      <div className="pt-3 border-t space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">SAMPLE PARAGRAPH:</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{tone.sampleParagraph}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">CHARACTERISTICS:</p>
                          <div className="flex flex-wrap gap-1">
                            {tone.characteristics.map((char, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{char}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Education Level Selection */}
              {!isViewOnly && selectedTone && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Select Target Audience Reading Level
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {educationLevels.map((level) => (
                      <div
                        key={level.value}
                        onClick={() => setSelectedEducation(level.value)}
                        className={`
                          relative border-2 rounded-lg p-4 cursor-pointer transition-all
                          ${selectedEducation === level.value
                            ? 'border-black bg-gray-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-400'
                          }
                        `}
                      >
                        {selectedEducation === level.value && (
                          <div className="absolute top-3 right-3">
                            <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                        <h4 className="font-medium text-sm mb-1">{level.label}</h4>
                        <p className="text-xs text-gray-600">{level.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isViewOnly && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleSave}
                    disabled={!selectedTone || !selectedEducation || loading}
                    className={`
                      px-8 py-3 rounded-lg font-semibold transition-all
                      ${selectedTone && !loading
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {loading ? 'Saving...' : previousSelection && selectedTone === previousSelection?.selectedTone && selectedEducation === previousSelection?.educationLevel ? 'Keep Current Selection' : 'Save Selections'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}