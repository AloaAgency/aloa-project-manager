'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, ThumbsUp, ThumbsDown, Palette, Sparkles, Moon, Sun, CheckCircle, Info, Lightbulb, TrendingUp, Star, Award, FileText, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Comprehensive palette collections for better preference learning
const PALETTE_COLLECTIONS = [
  // Step 1: Background Preference
  {
    id: 'background-preference',
    question: 'First, do you prefer dark or light backgrounds?',
    type: 'background',
    required: true,
    options: [
      { id: 'light', label: 'Light & Bright', icon: Sun, description: 'Clean, airy, and professional' },
      { id: 'dark', label: 'Dark & Moody', icon: Moon, description: 'Sophisticated, modern, and easy on the eyes' }
    ]
  },
  // Step 2: Warmth
  {
    id: 'temperature',
    question: 'Do you lean toward warm or cool tones?',
    type: 'palette',
    palettes: [
      { id: 'warm', colors: ['#FF6B6B', '#FFA500', '#FFD700', '#FF8C00', '#CD853F'], mood: 'Warm & Inviting' },
      { id: 'cool', colors: ['#4ECDC4', '#556270', '#6BB6D6', '#95E1D3', '#3D5A80'], mood: 'Cool & Calm' },
      { id: 'neutral', colors: ['#8B7355', '#A0826D', '#C9B79C', '#D4C4A0', '#E5D4B7'], mood: 'Neutral & Balanced' }
    ]
  },
  // Step 3: Saturation
  {
    id: 'saturation',
    question: 'How vibrant do you like your colors?',
    type: 'palette',
    palettes: [
      { id: 'vibrant', colors: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF'], mood: 'Bold & Vibrant' },
      { id: 'muted', colors: ['#6C7B8B', '#8B9DC3', '#B0C4DE', '#C6D7E8', '#DDE8F3'], mood: 'Muted & Subtle' },
      { id: 'pastel', colors: ['#FFE5EC', '#FFC2D1', '#FFB3C6', '#FF8FAB', '#FB6F92'], mood: 'Soft Pastels' }
    ]
  },
  // Step 4: Professional vs Creative
  {
    id: 'style',
    question: 'What style resonates with your brand?',
    type: 'palette',
    palettes: [
      { id: 'corporate', colors: ['#1E3A8A', '#1E40AF', '#3B82F6', '#93C5FD', '#DBEAFE'], mood: 'Corporate Professional' },
      { id: 'creative', colors: ['#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'], mood: 'Creative & Playful' },
      { id: 'minimal', colors: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#9E9E9E', '#212121'], mood: 'Minimalist' }
    ]
  },
  // Step 5: Nature-inspired
  {
    id: 'nature',
    question: 'Which natural palette speaks to you?',
    type: 'palette',
    palettes: [
      { id: 'forest', colors: ['#2D5016', '#3E7A1E', '#4E9F3D', '#8FBC8F', '#C8E6C9'], mood: 'Forest Fresh' },
      { id: 'ocean', colors: ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8'], mood: 'Ocean Depths' },
      { id: 'sunset', colors: ['#FF7B54', '#FF9A76', '#FFB5A0', '#FCD5CE', '#FFF5F0'], mood: 'Sunset Glow' },
      { id: 'earth', colors: ['#8B4513', '#A0522D', '#BC8F8F', '#D2B48C', '#F5E6D3'], mood: 'Earthy & Grounded' }
    ]
  },
  // Step 6: Accent Colors
  {
    id: 'accents',
    question: 'What accent colors catch your eye?',
    type: 'palette',
    palettes: [
      { id: 'jewel', colors: ['#8B008B', '#FF1493', '#00CED1', '#FFD700', '#FF69B4'], mood: 'Jewel Tones' },
      { id: 'neon', colors: ['#39FF14', '#FF073A', '#00F5FF', '#FFD700', '#FF6EC7'], mood: 'Electric Neon' },
      { id: 'classic', colors: ['#000080', '#800020', '#006400', '#FFD700', '#708090'], mood: 'Classic Accents' }
    ]
  },
  // Step 7: Monochrome Test
  {
    id: 'monochrome',
    question: 'How do you feel about monochromatic schemes?',
    type: 'palette',
    palettes: [
      { id: 'blue-mono', colors: ['#0A1929', '#173A5E', '#1E5288', '#3B82C4', '#93C5FD'], mood: 'Blue Monochrome' },
      { id: 'green-mono', colors: ['#1B3A1B', '#2D5016', '#3E7A1E', '#4E9F3D', '#8FBC8F'], mood: 'Green Monochrome' },
      { id: 'purple-mono', colors: ['#2E1A47', '#4A2C68', '#6B46A3', '#9B72CF', '#C8B3E6'], mood: 'Purple Monochrome' }
    ]
  },
  // Step 8: Final Combinations
  {
    id: 'combinations',
    question: 'Finally, which complete palette feels most "you"?',
    type: 'palette',
    palettes: [
      { id: 'modern-tech', colors: ['#0F172A', '#1E293B', '#3B82F6', '#60A5FA', '#F0F9FF'], mood: 'Modern Tech' },
      { id: 'warm-elegant', colors: ['#FFF8DC', '#FFE4B5', '#DEB887', '#D2691E', '#8B4513'], mood: 'Warm Elegance' },
      { id: 'fresh-natural', colors: ['#F0FFF4', '#C6F6D5', '#68D391', '#38A169', '#22543D'], mood: 'Fresh & Natural' },
      { id: 'bold-confident', colors: ['#DC2626', '#EA580C', '#FACC15', '#16A34A', '#2563EB'], mood: 'Bold & Confident' }
    ]
  }
];

export default function PaletteCleanserModal({
  applet,
  projectId,
  userId,
  onClose,
  onComplete
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [backgroundPreference, setBackgroundPreference] = useState(null);
  const [paletteRatings, setPaletteRatings] = useState({});
  const [finalSelections, setFinalSelections] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showFinalSelection, setShowFinalSelection] = useState(false);
  const [notes, setNotes] = useState('');
  const [hoveredPalette, setHoveredPalette] = useState(null);
  const [noneSelected, setNoneSelected] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentQuestion = PALETTE_COLLECTIONS[currentStep];
  const totalSteps = PALETTE_COLLECTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Use background preference for display
  const isDark = backgroundPreference === 'dark';

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/aloa-projects/${projectId}/client-view?appletId=${applet.id}&userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          const latestInteraction = data.interactions?.find(
            interaction => interaction.interaction_type === 'palette_progress'
          );

          if (latestInteraction?.data) {
            const savedData = latestInteraction.data;
            setCurrentStep(savedData.currentStep || 0);
            setBackgroundPreference(savedData.backgroundPreference || null);
            setPaletteRatings(savedData.paletteRatings || {});
            setFinalSelections(savedData.finalSelections || []);
            setNotes(savedData.notes || '');
            setNoneSelected(savedData.noneSelected || false);
            setShowFinalSelection(savedData.showFinalSelection || false);
            setShowSummary(savedData.showSummary || false);

            if (savedData.currentStep > 0 || savedData.backgroundPreference) {
              toast.success('Your previous progress has been restored');
            }
          }
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    };

    loadProgress();
  }, [applet.id, projectId, userId]);

  // Auto-save progress function
  const saveProgress = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const progressData = {
        currentStep,
        backgroundPreference,
        paletteRatings,
        finalSelections,
        notes,
        noneSelected,
        showFinalSelection,
        showSummary,
        lastUpdated: new Date().toISOString()
      };

      await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          userId,
          status: 'in_progress',
          interactionType: 'palette_progress',
          data: progressData
        })
      });

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when any important state changes
  useEffect(() => {
    const hasChanges = backgroundPreference || Object.keys(paletteRatings).length > 0 ||
                      finalSelections.length > 0 || notes || noneSelected;

    if (hasChanges) {
      const saveTimer = setTimeout(() => {
        saveProgress();
      }, 1000); // Save after 1 second of inactivity

      return () => clearTimeout(saveTimer);
    }
  }, [backgroundPreference, paletteRatings, finalSelections, notes, noneSelected, currentStep, showFinalSelection, showSummary]);

  const handleBackgroundChoice = (choice) => {
    setBackgroundPreference(choice);
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      setCurrentStep(1);
    }, 500);
  };

  const handleFinalPaletteToggle = (palette) => {
    if (noneSelected) {
      setNoneSelected(false);
    }

    const isSelected = finalSelections.some(p => p.id === palette.id);

    if (isSelected) {
      setFinalSelections(finalSelections.filter(p => p.id !== palette.id));
    } else if (finalSelections.length < 3) {
      setFinalSelections([...finalSelections, palette]);
    } else {
      toast.error('You can select up to 3 palettes maximum');
    }
  };

  const handleNoneSelected = () => {
    setNoneSelected(true);
    setFinalSelections([]);
  };

  const handlePaletteRating = (paletteId, rating) => {
    setPaletteRatings(prev => ({
      ...prev,
      [paletteId]: rating
    }));
  };

  const getLikedPalettes = () => {
    const liked = [];
    PALETTE_COLLECTIONS.slice(1).forEach(collection => {
      collection.palettes?.forEach(palette => {
        if (paletteRatings[palette.id] === 'love' || paletteRatings[palette.id] === 'like') {
          liked.push({ ...palette, category: collection.id });
        }
      });
    });
    return liked;
  };

  const canProceed = () => {
    if (currentStep === 0) return backgroundPreference !== null;
    // For palette steps, must rate all palettes
    if (currentQuestion.palettes) {
      return currentQuestion.palettes.every(p => paletteRatings[p.id] !== undefined);
    }
    return true;
  };

  const canComplete = () => {
    // Either selected 1-3 palettes or explicitly chose none
    return (finalSelections.length >= 1 && finalSelections.length <= 3) || noneSelected;
  };

  const getInsightFromSelections = () => {
    const insights = [];

    if (noneSelected) {
      insights.push('You need something unique - none of our standard palettes matched your vision.');
      insights.push('Your feedback will help us create a custom palette that truly represents your brand.');
      return insights;
    }

    // Analyze based on final selections
    finalSelections.forEach(palette => {
      // Temperature insights
      if (palette.id === 'warm') {
        insights.push('You gravitate toward warm, inviting tones that create comfort and energy.');
      } else if (palette.id === 'cool') {
        insights.push('Cool, calming tones resonate with your professional vision.');
      }

      // Saturation insights
      if (palette.id === 'vibrant') {
        insights.push('Bold, vibrant colors appeal to you - perfect for making a strong statement.');
      } else if (palette.id === 'muted') {
        insights.push('Subtle, muted tones align with your sophisticated aesthetic.');
      } else if (palette.id === 'pastel') {
        insights.push('Soft pastels create the gentle, approachable feeling you desire.');
      }

      // Style insights
      if (palette.id === 'corporate') {
        insights.push('Professional and trustworthy colors align with your brand vision.');
      } else if (palette.id === 'creative') {
        insights.push('Creative and playful palettes match your innovative spirit.');
      } else if (palette.id === 'minimal') {
        insights.push('Minimalist color schemes appeal to your refined sensibilities.');
      }
    });

    // General insights based on ratings
    const lovedCount = Object.values(paletteRatings).filter(r => r === 'love').length;
    const dislikedCount = Object.values(paletteRatings).filter(r => r === 'dislike').length;

    if (lovedCount > 3) {
      insights.push('You have a clear vision and strong color preferences.');
    }
    if (dislikedCount > 5) {
      insights.push('You know exactly what doesn\'t work for your brand.');
    }

    return insights.length > 0 ? insights : ['Your color preferences will guide our design process.'];
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setAnimating(true);
      setTimeout(() => {
        setAnimating(false);
        setCurrentStep(currentStep + 1);
        // Scroll to top of modal
        const modalContent = document.querySelector('.palette-cleanser-modal-content');
        if (modalContent) {
          modalContent.scrollTop = 0;
        }
      }, 300);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setAnimating(true);
      setTimeout(() => {
        setAnimating(false);
        setCurrentStep(currentStep - 1);
        // Scroll to top of modal
        const modalContent = document.querySelector('.palette-cleanser-modal-content');
        if (modalContent) {
          modalContent.scrollTop = 0;
        }
      }, 300);
    }
  };

  const handleSubmit = async () => {
    if (!canComplete()) {
      toast.error('Please make a selection or choose "None of these work"');
      return;
    }

    setIsSubmitting(true);

    try {
      const responseData = {
        backgroundPreference,
        finalSelections,
        paletteRatings,
        noneSelected,
        preferences: {
          prefersDark: backgroundPreference === 'dark',
          prefersWarm: finalSelections.some(p => p.id === 'warm'),
          prefersCool: finalSelections.some(p => p.id === 'cool'),
          prefersVibrant: finalSelections.some(p => p.id === 'vibrant'),
          prefersPastel: finalSelections.some(p => p.id === 'pastel'),
          prefersMinimal: finalSelections.some(p => p.id === 'minimal'),
          prefersCorporate: finalSelections.some(p => p.id === 'corporate'),
          prefersCreative: finalSelections.some(p => p.id === 'creative')
        },
        insights: getInsightFromSelections(),
        notes,
        completedAt: new Date().toISOString()
      };

      const response = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          userId,
          status: 'completed',
          interactionType: 'palette_selection',
          data: responseData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API response error:', errorData);
        throw new Error(errorData.error || 'Failed to save preferences');
      }

      toast.success('Your color preferences have been saved!');
      if (onComplete) onComplete(responseData);
    } catch (error) {
      console.error('Error saving palette preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPaletteRating = (palette) => {
    const rating = paletteRatings[palette.id];

    return (
      <div key={palette.id}
        className={`transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className={`p-4 rounded-xl border-2 ${
          isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
        }`}>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-1 h-20">
              {palette.colors.map((color, idx) => (
                <div key={idx}
                  className="rounded-lg shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className={`text-center ${isDark ? 'text-white' : ''}`}>
              <p className="font-semibold text-lg">{palette.mood}</p>
            </div>

            {/* Rating buttons - larger and clearer with visual feedback */}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handlePaletteRating(palette.id, 'love')}
                className={`p-3 rounded-lg transition-all flex flex-col items-center gap-1 transform ${
                  rating === 'love'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white scale-110 shadow-lg ring-4 ring-pink-200'
                    : isDark
                      ? 'hover:bg-gray-600 text-gray-400 hover:scale-105'
                      : 'hover:bg-gray-100 text-gray-400 hover:scale-105'
                }`}
              >
                <Heart className={`w-6 h-6 ${rating === 'love' ? 'fill-current animate-pulse' : ''}`} />
                <span className="text-xs font-medium">Love</span>
              </button>
              <button
                onClick={() => handlePaletteRating(palette.id, 'like')}
                className={`p-3 rounded-lg transition-all flex flex-col items-center gap-1 transform ${
                  rating === 'like'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white scale-110 shadow-lg ring-4 ring-blue-200'
                    : isDark
                      ? 'hover:bg-gray-600 text-gray-400 hover:scale-105'
                      : 'hover:bg-gray-100 text-gray-400 hover:scale-105'
                }`}
              >
                <ThumbsUp className={`w-6 h-6 ${rating === 'like' ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Like</span>
              </button>
              <button
                onClick={() => handlePaletteRating(palette.id, 'dislike')}
                className={`p-3 rounded-lg transition-all flex flex-col items-center gap-1 transform ${
                  rating === 'dislike'
                    ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white scale-110 shadow-lg ring-4 ring-gray-300'
                    : isDark
                      ? 'hover:bg-gray-600 text-gray-400 hover:scale-105'
                      : 'hover:bg-gray-100 text-gray-400 hover:scale-105'
                }`}
              >
                <ThumbsDown className={`w-6 h-6 ${rating === 'dislike' ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Pass</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 transition-colors duration-500 ${
      isDark ? 'bg-gray-900' : 'bg-black/50'
    }`}>
      <div className={`palette-cleanser-modal-content rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-500 ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 border-b p-6 z-10 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'
        }`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                <Palette className="w-8 h-8 text-purple-600" />
                Palette Discovery Journey
              </h2>
              <div className="flex items-center gap-4 mt-1">
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Let's find your perfect color palette together
                </p>
                {/* Auto-save indicator */}
                {(lastSaved || isSaving) && (
                  <div className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isSaving ? (
                      <>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        <span>Saving...</span>
                      </>
                    ) : lastSaved ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Saved</span>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                Step {currentStep + 1} of {totalSteps}
              </span>
              {showFinalSelection ? (
                <span className="font-semibold text-purple-600">
                  Choose your favorites
                </span>
              ) : (
                <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Rate each palette
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Show final selection screen */}
          {showFinalSelection && !showSummary ? (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : ''}`}>
                  {getLikedPalettes().length > 0 ? 'Select Your Top Palettes' : 'No Palettes Matched Your Taste'}
                </h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {getLikedPalettes().length > 0
                    ? 'Choose up to 3 palettes that best represent your vision (or none if they don\'t work)'
                    : 'None of the palettes seemed to match what you\'re looking for'}
                </p>
              </div>

              {getLikedPalettes().length > 0 ? (
                <>
                  {/* Show liked palettes for final selection */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {getLikedPalettes().map(palette => (
                      <button
                        key={palette.id}
                        onClick={() => handleFinalPaletteToggle(palette)}
                        disabled={noneSelected}
                        className={`p-4 rounded-xl border-2 transition-all relative ${
                          finalSelections.some(p => p.id === palette.id)
                            ? 'border-purple-500 bg-purple-50 shadow-lg'
                            : noneSelected
                              ? 'opacity-50 cursor-not-allowed border-gray-200'
                              : isDark
                                ? 'border-gray-600 bg-gray-700 hover:border-purple-400'
                                : 'border-gray-200 bg-white hover:border-purple-300'
                        }`}
                      >
                        {finalSelections.some(p => p.id === palette.id) && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                              {finalSelections.findIndex(p => p.id === palette.id) + 1}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-5 gap-1 h-12 mb-2">
                          {palette.colors.map((color, idx) => (
                            <div key={idx} className="rounded" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : ''}`}>{palette.mood}</p>
                        <p className="text-xs text-purple-600 mt-1">
                          You {paletteRatings[palette.id]}d this
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* None of these work option */}
                  <div className={`p-4 rounded-lg border-2 ${
                    noneSelected
                      ? 'border-orange-500 bg-orange-50'
                      : isDark
                        ? 'border-gray-600 bg-gray-700'
                        : 'border-gray-200 bg-gray-50'
                  }`}>
                    <button
                      onClick={handleNoneSelected}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          noneSelected
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-gray-400'
                        }`}>
                          {noneSelected && (
                            <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-left">
                          <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                            None of these palettes work for me
                          </p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            I need something different
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'} text-center`}>
                  <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    We'll work with you to find better options that match your vision.
                  </p>
                </div>
              )}

              {/* Notes section */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  Tell us more about what you're looking for:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the colors or feeling you want, specific colors to avoid, inspirations, etc..."
                  className={`w-full p-3 rounded-lg border resize-none ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-200'
                  }`}
                  rows={3}
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={() => setShowFinalSelection(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isDark ? 'text-white hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => setShowSummary(true)}
                  disabled={!canComplete()}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    canComplete()
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}>
                  Review & Submit
                </button>
              </div>
            </div>
          ) : showSummary ? (
            <div className="space-y-6">
              <div className="text-center">
                <Award className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : ''}`}>
                  Your Color Profile Is Ready!
                </h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Let's review your preferences before we create your perfect palette.
                </p>
              </div>

              {/* Background Preference Summary */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {backgroundPreference === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <h4 className={`font-semibold ${isDark ? 'text-white' : ''}`}>Background Preference</h4>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  You prefer {backgroundPreference === 'dark' ? 'dark, sophisticated' : 'light, airy'} backgrounds that
                  {backgroundPreference === 'dark' ? ' create depth and focus' : ' feel open and welcoming'}.
                </p>
              </div>

              {/* Selected Palettes or None Selected */}
              <div>
                <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                  <Palette className="w-5 h-5 text-purple-600" />
                  {noneSelected ? 'No Palettes Selected' : `Your Top Palettes (${finalSelections.length})`}
                </h4>
                {noneSelected ? (
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-orange-900/30' : 'bg-orange-50'} border border-orange-300`}>
                    <p className={`${isDark ? 'text-orange-200' : 'text-orange-800'}`}>
                      You indicated that none of the presented palettes work for your vision.
                      We'll use your feedback to find better options.
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {finalSelections.map((palette, index) => (
                      <div key={palette.id} className={`p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                            #{index + 1} Choice
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 h-12 mb-2">
                          {palette.colors?.map((color, idx) => (
                            <div key={idx} className="rounded" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : ''}`}>{palette.mood}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Insights */}
              {getInsightFromSelections().length > 0 && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <h4 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                    <Lightbulb className="w-5 h-5 text-purple-600" />
                    Our Analysis
                  </h4>
                  <ul className="space-y-2">
                    {getInsightFromSelections().map((insight, idx) => (
                      <li key={idx} className={`text-sm flex items-start gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        <Star className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes Section */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  Any additional thoughts or preferences? (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell us more about your vision, specific colors you love or hate, or any other preferences..."
                  className={`w-full p-3 rounded-lg border resize-none ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-200'
                  }`}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={() => setShowSummary(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isDark ? 'text-white hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                  <ChevronLeft className="w-5 h-5" />
                  Back to Selection
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                  <FileText className="w-5 h-5" />
                  {isSubmitting ? 'Saving Your Profile...' : 'Save My Color Profile'}
                </button>
              </div>
            </div>
          ) : (
          <>
          {/* Question */}
          <div className={`text-center mb-6 ${animating ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}>
            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : ''}`}>
              {currentQuestion.question}
            </h3>
            {currentStep > 0 && (
              <>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Rate each palette below
                </p>
                {/* Rating progress indicator */}
                {currentQuestion.palettes && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    {currentQuestion.palettes.map((palette) => (
                      <div
                        key={palette.id}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          paletteRatings[palette.id]
                            ? paletteRatings[palette.id] === 'love'
                              ? 'bg-pink-500 w-3 h-3'
                              : paletteRatings[palette.id] === 'like'
                                ? 'bg-blue-500'
                                : 'bg-gray-500'
                            : isDark ? 'bg-gray-600' : 'bg-gray-300'
                        }`}
                        title={paletteRatings[palette.id] ? `${palette.mood}: ${paletteRatings[palette.id]}` : 'Not rated'}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Content based on question type */}
          {currentQuestion.type === 'background' ? (
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {currentQuestion.options.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleBackgroundChoice(option.id)}
                  className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                    backgroundPreference === option.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <option.icon className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                  <h4 className="text-lg font-semibold mb-2">{option.label}</h4>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-1 gap-4 max-w-2xl mx-auto">
              {currentQuestion.palettes.map(palette => renderPaletteRating(palette))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentStep === 0
                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                  : isDark
                    ? 'text-white hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            <div className="flex gap-3">
              {currentStep > 0 && currentQuestion.palettes && (
                <div className="text-sm text-gray-500">
                  {Object.keys(paletteRatings).filter(key =>
                    currentQuestion.palettes.some(p => p.id === key)
                  ).length} of {currentQuestion.palettes.length} rated
                </div>
              )}

              {currentStep === totalSteps - 1 && canProceed() ? (
                <button
                  onClick={() => setShowFinalSelection(true)}
                  className="px-6 py-2 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" />
                  Continue to Selection
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                    canProceed()
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          </>
          )}
        </div>
      </div>
    </div>
  );
}