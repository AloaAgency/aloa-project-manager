'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, ThumbsUp, ThumbsDown, Palette, Sparkles, Moon, Sun, CheckCircle, Info, Lightbulb, TrendingUp, Star, Award, FileText, AlertCircle, Plus, Trash2, HelpCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Helper functions for color manipulation
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const adjustBrightness = (hex, percent) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const amount = Math.round(255 * percent / 100);
  const r = Math.max(0, Math.min(255, rgb.r + amount));
  const g = Math.max(0, Math.min(255, rgb.g + amount));
  const b = Math.max(0, Math.min(255, rgb.b + amount));

  return rgbToHex(r, g, b);
};

const generateComplementaryColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = 255 - rgb.r;
  const g = 255 - rgb.g;
  const b = 255 - rgb.b;

  return rgbToHex(r, g, b);
};

const generateAnalogousColors = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return [hex];

  // Simplified analogous color generation
  const colors = [];
  colors.push(adjustBrightness(hex, -30));
  colors.push(hex);
  colors.push(adjustBrightness(hex, 30));

  return colors;
};

const generateMonochromaticPalette = (hex, isDarkMode = false) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return [hex, hex, hex, hex, hex];

  // For monochromatic, we want to maintain the hue but vary the saturation and lightness
  // This creates a more sophisticated monochromatic palette
  const colors = [];

  if (isDarkMode) {
    // For dark mode, start darker and go lighter
    colors.push(adjustBrightness(hex, -60)); // Very dark
    colors.push(adjustBrightness(hex, -35)); // Dark
    colors.push(hex); // Original
    colors.push(adjustBrightness(hex, 25)); // Light
    colors.push(adjustBrightness(hex, 50)); // Very light
  } else {
    // For light mode, more even distribution
    colors.push(adjustBrightness(hex, -50)); // Darkest
    colors.push(adjustBrightness(hex, -25)); // Darker
    colors.push(hex); // Original
    colors.push(adjustBrightness(hex, 35)); // Lighter
    colors.push(adjustBrightness(hex, 60)); // Lightest
  }

  return colors;
};

// Generate all 21 custom palettes organized by pages (3 per page)
const generateAllCustomPalettes = (brandColors, isDarkMode = false) => {
  if (!brandColors || brandColors.length === 0) return [];

  const allPalettes = [];
  const primaryColor = brandColors[0];
  const secondaryColor = brandColors[1] || null;

  // Page 1: Original & Foundation (3 palettes)

  // 1. Your exact brand colors
  if (brandColors.length > 1) {
    const brandPalette = [...brandColors];
    while (brandPalette.length < 5) {
      brandPalette.push(adjustBrightness(brandColors[brandPalette.length % brandColors.length], (brandPalette.length - brandColors.length) * 20));
    }
    allPalettes.push({
      id: 'brand-original',
      colors: brandPalette.slice(0, 5),
      mood: 'Your Current Brand',
      page: 1
    });
  } else {
    // Single color with shades
    allPalettes.push({
      id: 'brand-original',
      colors: [
        adjustBrightness(primaryColor, -40),
        adjustBrightness(primaryColor, -20),
        primaryColor,
        adjustBrightness(primaryColor, 20),
        adjustBrightness(primaryColor, 40)
      ],
      mood: 'Your Brand Shades',
      page: 1
    });
  }

  // 2. Navy & Gold Professional
  allPalettes.push({
    id: 'navy-gold',
    colors: [
      primaryColor,
      '#1E3A5F',
      '#FFC107',
      isDarkMode ? '#0D1929' : '#F8F9FA',
      secondaryColor || '#4A6FA5'
    ],
    mood: 'Executive Professional',
    page: 1
  });

  // 3. Sage & Terracotta Earth
  allPalettes.push({
    id: 'sage-terra',
    colors: [
      primaryColor,
      '#87A96B',
      '#CC6B49',
      '#F4E4D4',
      secondaryColor || '#6B8E6B'
    ],
    mood: 'Natural Harmony',
    page: 1
  });

  // Page 2: Modern Tech (3 palettes)

  // 4. Cyberpunk Neon
  allPalettes.push({
    id: 'cyberpunk',
    colors: [
      primaryColor,
      '#FF00FF',
      '#00FFFF',
      isDarkMode ? '#0A0A0A' : '#1A0033',
      '#7B00FF'
    ],
    mood: 'Digital Future',
    page: 2
  });

  // 5. Minimal Scandinavian
  allPalettes.push({
    id: 'scandi',
    colors: [
      primaryColor,
      isDarkMode ? '#2C2C2C' : '#FAFAFA',
      '#E0E0E0',
      isDarkMode ? '#1A1A1A' : '#FFFFFF',
      secondaryColor || '#B8B8B8'
    ],
    mood: 'Clean Minimal',
    page: 2
  });

  // 6. Ocean Depths
  allPalettes.push({
    id: 'ocean',
    colors: [
      primaryColor,
      '#006994',
      '#00A8CC',
      '#40E0D0',
      isDarkMode ? '#002E3F' : '#E6F7FB'
    ],
    mood: 'Aquatic Flow',
    page: 2
  });

  // Page 3: Warm Vibes (3 palettes)

  // 7. Sunset Glow
  allPalettes.push({
    id: 'sunset',
    colors: [
      primaryColor,
      '#FF6B6B',
      '#FFE66D',
      '#FF9F1C',
      '#F77F00'
    ],
    mood: 'Golden Hour',
    page: 3
  });

  // 8. Desert Oasis
  allPalettes.push({
    id: 'desert',
    colors: [
      primaryColor,
      '#C19A6B',
      '#8B7355',
      '#FFE5CC',
      secondaryColor || '#D2691E'
    ],
    mood: 'Warm Desert',
    page: 3
  });

  // 9. Autumn Leaves
  allPalettes.push({
    id: 'autumn',
    colors: [
      primaryColor,
      '#D2691E',
      '#FF7F50',
      '#8B4513',
      '#FFE4B5'
    ],
    mood: 'Fall Warmth',
    page: 3
  });

  // Page 4: Cool Tones (3 palettes)

  // 10. Nordic Ice
  allPalettes.push({
    id: 'nordic',
    colors: [
      primaryColor,
      '#B4D4E7',
      '#6FA3C7',
      isDarkMode ? '#2C3E50' : '#F0F4F8',
      '#4A90A4'
    ],
    mood: 'Arctic Cool',
    page: 4
  });

  // 11. Purple Haze
  allPalettes.push({
    id: 'purple-haze',
    colors: [
      primaryColor,
      '#9B59B6',
      '#8E44AD',
      '#E8DAEF',
      secondaryColor || '#6C3483'
    ],
    mood: 'Royal Purple',
    page: 4
  });

  // 12. Mint Fresh
  allPalettes.push({
    id: 'mint',
    colors: [
      primaryColor,
      '#00C9A7',
      '#4FFFB0',
      isDarkMode ? '#003D30' : '#E8FFF8',
      '#00A693'
    ],
    mood: 'Fresh Mint',
    page: 4
  });

  // Page 5: Bold & Energetic (3 palettes)

  // 13. Miami Vice
  allPalettes.push({
    id: 'miami',
    colors: [
      primaryColor,
      '#FF006E',
      '#FFB700',
      '#00D9FF',
      '#FB5607'
    ],
    mood: 'Vibrant Energy',
    page: 5
  });

  // 14. Pop Art
  allPalettes.push({
    id: 'pop-art',
    colors: [
      primaryColor,
      '#FF1744',
      '#00E676',
      '#FFEA00',
      '#2979FF'
    ],
    mood: 'Bold Pop',
    page: 5
  });

  // 15. Electric Dreams
  allPalettes.push({
    id: 'electric',
    colors: [
      primaryColor,
      '#FF00F5',
      '#00FF88',
      isDarkMode ? '#000033' : '#FFFF00',
      '#00BFFF'
    ],
    mood: 'Electric Bold',
    page: 5
  });

  // Page 6: Sophisticated (3 palettes)

  // 16. Black Tie
  allPalettes.push({
    id: 'black-tie',
    colors: [
      primaryColor,
      isDarkMode ? '#FFFFFF' : '#000000',
      '#C0C0C0',
      isDarkMode ? '#1C1C1C' : '#F5F5F5',
      secondaryColor || '#808080'
    ],
    mood: 'Formal Elegance',
    page: 6
  });

  // 17. Burgundy & Cream
  allPalettes.push({
    id: 'burgundy',
    colors: [
      primaryColor,
      '#800020',
      '#FFFDD0',
      '#4B0013',
      '#F5E6D3'
    ],
    mood: 'Wine & Cream',
    page: 6
  });

  // 18. Jewel Tones
  allPalettes.push({
    id: 'jewel',
    colors: [
      primaryColor,
      '#0F52BA',  // Sapphire
      '#50C878',  // Emerald
      '#E0115F',  // Ruby
      '#FFD700'   // Gold
    ],
    mood: 'Precious Gems',
    page: 6
  });

  // Page 7: Experimental (3 palettes)

  // 19. Pastel Dreams
  allPalettes.push({
    id: 'pastel',
    colors: [
      primaryColor,
      '#FFD1DC',
      '#C7CEEA',
      '#FFDAC1',
      '#B5EAD7'
    ],
    mood: 'Soft Pastels',
    page: 7
  });

  // 20. Industrial Steel
  allPalettes.push({
    id: 'industrial',
    colors: [
      primaryColor,
      '#434343',
      '#7F7F7F',
      isDarkMode ? '#1A1A1A' : '#ECECEC',
      secondaryColor || '#5C5C5C'
    ],
    mood: 'Urban Industrial',
    page: 7
  });

  // 21. Botanical Garden
  allPalettes.push({
    id: 'botanical',
    colors: [
      primaryColor,
      '#2E7D32',
      '#689F38',
      '#FDD835',
      '#8BC34A'
    ],
    mood: 'Garden Fresh',
    page: 7
  });

  return allPalettes;
};

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
  isViewOnly = false,
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
  const [isEditingPrevious, setIsEditingPrevious] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);

  // New states for brand color assessment
  const [showBrandAssessment, setShowBrandAssessment] = useState(true);
  const [hasBrandColors, setHasBrandColors] = useState(null);
  const [brandColorAttachment, setBrandColorAttachment] = useState(null);
  const [brandColors, setBrandColors] = useState([]);
  const [brandColorInput, setBrandColorInput] = useState('');
  const [customPalettes, setCustomPalettes] = useState([]);
  const [customPalettePage, setCustomPalettePage] = useState(1);
  const [totalCustomPages, setTotalCustomPages] = useState(0);

  const currentQuestion = PALETTE_COLLECTIONS[currentStep];
  const totalSteps = PALETTE_COLLECTIONS.length;

  // Calculate progress based on the user's journey
  let progress = 0;
  if (showBrandAssessment) {
    progress = 0; // At brand assessment
  } else if (showSummary) {
    progress = 100; // At summary/completion
  } else if (brandColorAttachment === 'very') {
    // For "very attached" users: brand assessment -> background -> 7 custom pages -> final selection -> summary
    // Total steps: 1 (background) + 7 (custom palettes) + 1 (final selection) + 1 (summary) = 10 steps
    const totalVeryAttachedSteps = 10;

    if (!backgroundPreference) {
      progress = 10; // At background selection (step 1/10)
    } else if (customPalettes.length > 0 && !showFinalSelection) {
      // At custom palettes (steps 2-8 out of 10)
      const customPaletteProgress = (1 + customPalettePage) / totalVeryAttachedSteps;
      progress = customPaletteProgress * 100;
    } else if (showFinalSelection) {
      progress = 90; // At final selection (step 9/10)
    }
  } else if (brandColorAttachment === 'somewhat' || brandColorAttachment === 'not') {
    // For other users: includes both custom and standard palettes
    if (!backgroundPreference) {
      progress = 5; // At background selection
    } else if (customPalettes.length > 0 && currentStep === 0 && !showFinalSelection) {
      // At custom palettes phase
      const customPhaseProgress = (customPalettePage * 10) + 10; // 10-70% range
      progress = customPhaseProgress;
    } else if (currentStep > 0 && !showFinalSelection) {
      // At standard palettes
      const standardPhaseProgress = 70 + ((currentStep / totalSteps) * 20); // 70-90% range
      progress = standardPhaseProgress;
    } else if (showFinalSelection) {
      progress = 90; // At final selection
    }
  } else {
    // Standard flow without brand colors
    progress = ((currentStep + 1) / totalSteps) * 100;
  }

  // Use background preference for display
  const isDark = backgroundPreference === 'dark';

  // Save progress before closing
  useEffect(() => {
    return () => {
      // Save progress when component unmounts (modal closes)
      if (!isViewOnly) {
        saveProgressBeforeClose();
      }
    };
  }, [backgroundPreference, paletteRatings, finalSelections, notes, noneSelected, currentStep, showFinalSelection, showSummary, hasBrandColors, brandColors, brandColorAttachment]);

  const saveProgressBeforeClose = async () => {
    const hasChanges = backgroundPreference || Object.keys(paletteRatings).length > 0 ||
                      finalSelections.length > 0 || notes || noneSelected || hasBrandColors !== null;

    if (hasChanges) {
      const progressData = {
        currentStep,
        backgroundPreference,
        paletteRatings,
        finalSelections,
        notes,
        noneSelected,
        showFinalSelection,
        showSummary,
        // Brand assessment data
        hasBrandColors,
        brandColors,
        brandColorAttachment,
        brandColorInput,
        customPalettes,
        customPalettePage,
        showBrandAssessment,
        lastUpdated: new Date().toISOString()
      };

      await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          userId,
          status: wasAlreadyCompleted ? 'completed' : 'in_progress',
          interactionType: 'palette_progress',
          data: {
            form_progress: progressData
          }
        })
      });
    }
  };

  // Helper function to get user email
  const getUserEmail = async () => {
    try {
      const response = await fetch('/api/auth/profile');
      if (response.ok) {
        const data = await response.json();
        return data.email;
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
    return null;
  };

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        // Check for existing brand colors from project knowledge base
        let projectBrandColors = [];
        try {
          // Fetch from the knowledge API which now includes brand_colors
          const knowledgeResponse = await fetch(`/api/aloa-projects/${projectId}/knowledge`);
          if (knowledgeResponse.ok) {
            const knowledgeData = await knowledgeResponse.json();
            // Brand colors are now in project.brand_colors (extracted from metadata)
            if (knowledgeData.project?.brand_colors && Array.isArray(knowledgeData.project.brand_colors)) {
              projectBrandColors = knowledgeData.project.brand_colors;
              console.log('Loaded brand colors from project:', projectBrandColors);
            }
          }
        } catch (error) {
          console.error('Error fetching project brand colors:', error);
        }

        // First check if we have form_progress data from the applet prop
        if (applet && applet.form_progress) {
          const savedData = applet.form_progress;
          console.log('Loading from applet.form_progress:', savedData);

          // Restore all the saved state
          setCurrentStep(savedData.currentStep || 0);
          setBackgroundPreference(savedData.backgroundPreference || null);
          setPaletteRatings(savedData.paletteRatings || {});
          setFinalSelections(savedData.finalSelections || []);
          setNotes(savedData.notes || '');
          setNoneSelected(savedData.noneSelected || false);
          setShowFinalSelection(savedData.showFinalSelection || false);
          setShowSummary(isViewOnly ? true : savedData.showSummary || false);

          // Restore brand assessment data
          setHasBrandColors(savedData.hasBrandColors !== undefined ? savedData.hasBrandColors : null);
          setBrandColors(savedData.brandColors || []);
          setBrandColorAttachment(savedData.brandColorAttachment || null);
          setBrandColorInput(savedData.brandColorInput || '');
          setCustomPalettes(savedData.customPalettes || []);
          setCustomPalettePage(savedData.customPalettePage || 1);
          setHasLoadedData(true);

          // Skip brand assessment if we have data
          if (savedData.hasBrandColors !== null || savedData.backgroundPreference || savedData.currentStep > 0) {
            setShowBrandAssessment(false);
          } else if (savedData.showBrandAssessment !== undefined) {
            setShowBrandAssessment(savedData.showBrandAssessment);
          }

          // Generate custom palettes if we have brand colors and background preference
          if (savedData.brandColors && savedData.brandColors.length > 0 && savedData.backgroundPreference) {
            const isDark = savedData.backgroundPreference === 'dark';
            const allPalettes = generateAllCustomPalettes(savedData.brandColors, isDark);
            setCustomPalettes(allPalettes);
            setTotalCustomPages(7);
          }

          if (!isViewOnly) {
            toast.success('Your previous progress has been restored');
          }

          return; // Exit early since we loaded from applet.form_progress
        }

        // Otherwise check if user has completed this palette cleanser before
        const userEmail = userId === 'anonymous' ? null : await getUserEmail();

        if (userEmail || userId !== 'anonymous') {
          // Try to fetch existing submission data
          const submissionResponse = await fetch(
            `/api/aloa-projects/${projectId}/applet-interactions?appletId=${applet.id}&userEmail=${userEmail || ''}&userId=${userId}&type=submission`
          );

          if (submissionResponse.ok) {
            const submissionData = await submissionResponse.json();
            console.log('Submission response:', submissionData);

            // The API returns { interactions: [...] } and we need the first item's data
            if (submissionData && submissionData.interactions && submissionData.interactions.length > 0) {
              // Load the existing submission data
              const savedData = submissionData.interactions[0].data;
              setBackgroundPreference(savedData.backgroundPreference || null);
              setPaletteRatings(savedData.paletteRatings || {});
              setFinalSelections(savedData.finalSelections || []);
              setNotes(savedData.notes || '');
              setNoneSelected(savedData.noneSelected || false);
              setHasBrandColors(savedData.hasBrandColors || null);
              setBrandColors(savedData.brandColors || []);
              setBrandColorAttachment(savedData.brandColorAttachment || null);
              setBrandColorInput(savedData.brandColorInput || '');
              setCustomPalettes(savedData.customPalettes || []);
              setCustomPalettePage(savedData.customPalettePage || 1);

              // Mark that we're editing previous data
              setIsEditingPrevious(true);
              setHasLoadedData(true);
              setShowBrandAssessment(false); // Skip brand assessment when editing

              // Check if this was already completed
              console.log('Checking if already completed:', {
                appletId: applet.id,
                user_completed_at: applet.user_completed_at,
                user_status: applet.user_status,
                submissionData,
                hasSubmission: !!submissionData
              });

              // Check both user_completed_at and if we have submission data
              if (applet.user_completed_at || submissionData) {
                console.log('Setting wasAlreadyCompleted to true');
                setWasAlreadyCompleted(true);
              }

              // If we're in edit mode (not view-only), go directly to final selection
              // since the user has already completed all steps
              if (!isViewOnly) {
                setCurrentStep(PALETTE_COLLECTIONS.length - 1);
                setShowFinalSelection(true);
                toast.success('Your previous selections have been loaded for editing');

                // Scroll to top after loading
                setTimeout(() => {
                  const modalContent = document.querySelector('.palette-cleanser-modal-content');
                  if (modalContent) {
                    modalContent.scrollTop = 0;
                  }
                }, 100);
              } else {
                // In view-only mode, show the summary
                setCurrentStep(PALETTE_COLLECTIONS.length - 1);
                setShowFinalSelection(true);
                setShowSummary(true);
              }

              console.log('Loaded existing palette data:', savedData);
              return;
            }
          }
        }

        // If no existing data or anonymous user, check for in-progress data
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
            setShowSummary(isViewOnly ? true : savedData.showSummary || false);
            setHasBrandColors(savedData.hasBrandColors || null);
            setBrandColors(savedData.brandColors || []);
            setBrandColorAttachment(savedData.brandColorAttachment || null);
            setBrandColorInput(savedData.brandColorInput || '');
            setCustomPalettes(savedData.customPalettes || []);
            setCustomPalettePage(savedData.customPalettePage || 1);
            setHasLoadedData(true);

            // If we have any saved data, skip the brand assessment
            if (savedData.hasBrandColors !== null || savedData.backgroundPreference || savedData.currentStep > 0) {
              setShowBrandAssessment(false);
            }

            if (!isViewOnly && (savedData.currentStep > 0 || savedData.backgroundPreference)) {
              toast.success('Your previous progress has been restored');

              // Scroll to top after loading
              setTimeout(() => {
                const modalContent = document.querySelector('.palette-cleanser-modal-content');
                if (modalContent) {
                  modalContent.scrollTop = 0;
                }
              }, 100);
            }
          }
        }

        // Always pre-populate brand colors from project if they exist and we haven't loaded saved data
        // This ensures brand colors from admin panel are shown to the client
        if (projectBrandColors.length > 0 && !hasLoadedData) {
          console.log('Pre-populating brand colors from project:', projectBrandColors);
          setBrandColors(projectBrandColors);
          // Don't set hasBrandColors automatically - let user go through the flow
          // This way they still answer the questions but see their colors pre-filled
          toast.info(`Your brand colors have been loaded: ${projectBrandColors.join(', ')}`);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    };

    loadProgress();
  }, [applet.id, projectId, userId, isViewOnly]);

  // Auto-save progress function
  const saveProgress = async () => {
    if (isSaving) return;

    console.log('PaletteCleanser auto-save triggered:', {
      wasAlreadyCompleted,
      statusToSend: wasAlreadyCompleted ? 'completed' : 'in_progress',
      appletId: applet.id
    });

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
        // Brand assessment data
        hasBrandColors,
        brandColors,
        brandColorAttachment,
        brandColorInput,
        customPalettes,
        customPalettePage,
        showBrandAssessment,
        lastUpdated: new Date().toISOString()
      };

      await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          userId,
          status: wasAlreadyCompleted ? 'completed' : 'in_progress',
          interactionType: 'palette_progress',
          data: {
            form_progress: progressData
          }
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

    // If user has brand colors, generate custom palettes based on their light/dark preference
    if (brandColors && brandColors.length > 0) {
      const isDark = choice === 'dark';
      const allPalettes = generateAllCustomPalettes(brandColors, isDark);
      setCustomPalettes(allPalettes);
      setTotalCustomPages(7); // We have 7 pages total
      setCustomPalettePage(1); // Start on page 1
    }

    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      // If user is "very attached" to brand colors, show only custom palettes
      // Otherwise continue to standard palettes after custom ones
      if (brandColorAttachment === 'very' && brandColors.length > 0) {
        setCurrentStep(0); // Stay on step 0 but will show custom palettes
      } else {
        setCurrentStep(1);
      }
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

  const getDisplayPalettes = () => {
    // For "very attached" users, only show custom palettes based on their brand
    if (brandColorAttachment === 'very' && customPalettes.length > 0) {
      const likedCustomPalettes = customPalettes.filter(p =>
        paletteRatings[p.id] === 'love' || paletteRatings[p.id] === 'like'
      );

      // If they didn't like any, show all custom palettes for selection
      return likedCustomPalettes.length > 0 ? likedCustomPalettes : allCustomPalettes;
    }

    // When editing previous submission, show both previous selections and newly liked palettes
    if (isEditingPrevious && finalSelections.length > 0) {
      const likedPalettes = getLikedPalettes();
      const likedCustomPalettes = customPalettes.filter(p =>
        paletteRatings[p.id] === 'love' || paletteRatings[p.id] === 'like'
      );

      // If user started over and has new ratings, use those
      if (Object.keys(paletteRatings).length > 0) {
        const allPalettes = [...likedCustomPalettes, ...likedPalettes];

        // Add previous selections that aren't in the new liked palettes
        finalSelections.forEach(palette => {
          if (!allPalettes.some(p => p.id === palette.id)) {
            allPalettes.push(palette);
          }
        });

        return allPalettes;
      }

      // If no new ratings, show previous selections
      return finalSelections;
    }

    // Otherwise show liked palettes including custom ones
    const likedPalettes = getLikedPalettes();
    const likedCustomPalettes = customPalettes.filter(p =>
      paletteRatings[p.id] === 'love' || paletteRatings[p.id] === 'like'
    );
    return [...likedCustomPalettes, ...likedPalettes];
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

  const handleStartOver = () => {
    if (confirm('Are you sure you want to start over? This will clear all your selections.')) {
      // Reset all state
      setCurrentStep(0);
      setBackgroundPreference(null);
      setPaletteRatings({});
      setFinalSelections([]);
      setNotes('');
      setShowFinalSelection(false);
      setShowSummary(false);
      setNoneSelected(false);
      setIsEditingPrevious(false);
      // Reset brand assessment
      setShowBrandAssessment(true);
      setHasBrandColors(null);
      setBrandColors([]);
      setBrandColorAttachment(null);
      setBrandColorInput('');
      setCustomPalettes([]);
      setCustomPalettePage(1);
      setTotalCustomPages(0);
      // Clear saved progress
      saveProgress();
      toast.success('Started fresh! Let\'s explore your color preferences.');
    }
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
      console.log('Submitting palette preferences:', {
        backgroundPreference,
        finalSelections,
        paletteRatings,
        noneSelected,
        isEditingPrevious,
        userId
      });

      const responseData = {
        backgroundPreference,
        finalSelections,
        paletteRatings,
        noneSelected,
        hasBrandColors,
        brandColors,
        brandColorAttachment,
        customPalettes,
        preferences: {
          prefersDark: backgroundPreference === 'dark',
          prefersWarm: finalSelections.some(p => p.id === 'warm'),
          prefersCool: finalSelections.some(p => p.id === 'cool'),
          prefersVibrant: finalSelections.some(p => p.id === 'vibrant'),
          prefersPastel: finalSelections.some(p => p.id === 'pastel'),
          prefersMinimal: finalSelections.some(p => p.id === 'minimal'),
          prefersCorporate: finalSelections.some(p => p.id === 'corporate'),
          prefersCreative: finalSelections.some(p => p.id === 'creative'),
          hasBrandColors,
          brandColorAttachment
        },
        insights: getInsightFromSelections(),
        notes,
        completedAt: new Date().toISOString()
      };

      // Save to applet-interactions endpoint for proper retrieval
      const response = await fetch(`/api/aloa-projects/${projectId}/applet-interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          userId,
          type: 'submission',
          data: responseData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save to applet-interactions:', errorData);
        throw new Error(errorData.error || 'Failed to save preferences');
      }

      // Also update progress tracking - ensure we mark as completed
      console.log('Updating progress for palette cleanser:', {
        appletId: applet.id,
        userId,
        status: 'completed'
      });

      const progressResponse = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          userId,
          status: 'completed',
          interactionType: 'palette_submit',
          data: {
            form_progress: responseData
          }
        })
      });

      if (!progressResponse.ok) {
        const errorText = await progressResponse.text();
        console.error('Failed to update progress:', errorText);
        throw new Error('Failed to update progress status');
      }

      const progressResult = await progressResponse.json();
      console.log('Progress update response:', progressResult);

      // Wait a bit longer to ensure database transaction completes
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Your color preferences have been saved!');

      // Call onComplete to trigger confetti and close modal
      if (onComplete) {
        onComplete();
      }
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
        <div className={`sticky top-0 border-b p-6 z-20 ${
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
            <div className="flex items-center gap-2">
              {!isViewOnly && (
                <button
                  onClick={handleStartOver}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                  title="Start Over"
                >
                  <RefreshCw className="w-4 h-4" />
                  Start Over
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                {showBrandAssessment ? 'Brand Assessment' : customPalettes.length > 0 && currentStep === 0 ? 'Custom Palettes' : `Step ${currentStep + 1} of ${totalSteps}`}
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
          {/* Brand Assessment Screen */}
          {showBrandAssessment ? (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Palette className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : ''}`}>
                  Let's Start With Your Brand
                </h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                  Before we begin exploring palettes, we'd like to understand your current brand colors and how attached you are to them. Please note! This process is only to get to know you better, these are *not* necessarily the final colors we will use.
                </p>
              </div>

              {/* Question 1: Do you have brand colors? */}
              {hasBrandColors === null ? (
                <div className="space-y-4">
                  <div className={`p-6 rounded-xl border-2 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>
                      Do you already have established brand colors?
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setHasBrandColors(true)}
                        className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                          isDark
                            ? 'border-gray-600 hover:border-purple-400 bg-gray-800'
                            : 'border-gray-200 hover:border-purple-300 bg-white'
                        }`}
                      >
                        <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className={`font-medium ${isDark ? 'text-white' : ''}`}>Yes, I have brand colors</p>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          I want to work with or refine my existing colors
                        </p>
                      </button>
                      <button
                        onClick={() => {
                          setHasBrandColors(false);
                          setShowBrandAssessment(false);
                        }}
                        className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                          isDark
                            ? 'border-gray-600 hover:border-purple-400 bg-gray-800'
                            : 'border-gray-200 hover:border-purple-300 bg-white'
                        }`}
                      >
                        <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className={`font-medium ${isDark ? 'text-white' : ''}`}>No brand colors yet</p>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          I'm starting fresh and exploring options
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              ) : hasBrandColors && brandColorAttachment === null ? (
                /* Question 2: How attached are you? */
                <div className="space-y-4">
                  {/* Back button */}
                  <button
                    onClick={() => setHasBrandColors(null)}
                    className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <div className={`p-6 rounded-xl border-2 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>
                      How attached are you to your current brand colors?
                    </h4>
                    <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Are you open to exploring new possibilities?
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={() => setBrandColorAttachment('very')}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          brandColorAttachment === 'very'
                            ? 'border-purple-500 bg-purple-50'
                            : isDark
                              ? 'border-gray-600 hover:border-purple-400 bg-gray-800'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Heart className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                              Very attached - They're part of our identity
                            </p>
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              I want palettes that work perfectly with my existing colors
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setBrandColorAttachment('somewhat')}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          brandColorAttachment === 'somewhat'
                            ? 'border-purple-500 bg-purple-50'
                            : isDark
                              ? 'border-gray-600 hover:border-purple-400 bg-gray-800'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <ThumbsUp className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                              Somewhat attached - Open to refinements
                            </p>
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Show me variations and improvements on my current palette
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setBrandColorAttachment('open')}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          brandColorAttachment === 'open'
                            ? 'border-purple-500 bg-purple-50'
                            : isDark
                              ? 'border-gray-600 hover:border-purple-400 bg-gray-800'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className={`font-medium ${isDark ? 'text-white' : ''}`}>
                              Very open to change
                            </p>
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              I'm ready to explore completely new directions
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : hasBrandColors && brandColorAttachment !== null ? (
                /* Brand Color Input */
                <div className="space-y-6">
                  {/* Back button */}
                  <button
                    onClick={() => setBrandColorAttachment(null)}
                    className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <div className={`p-6 rounded-xl border-2 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>
                      Enter Your Current Brand Colors
                    </h4>
                    <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {brandColors.length > 0 && !hasLoadedData ?
                        "We found your brand colors in our system! Feel free to adjust them if needed." :
                        "Add your brand colors (hex codes like #FF5733) and we'll create custom palettes that work with them."}
                    </p>

                    {/* Color input */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={brandColorInput}
                        onChange={(e) => setBrandColorInput(e.target.value)}
                        placeholder="#000000 or rgb(0,0,0)"
                        className={`flex-1 px-4 py-2 rounded-lg border ${
                          isDark
                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-200'
                        }`}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const color = brandColorInput.trim();
                            if (color && color.match(/^#[0-9A-Fa-f]{6}$/)) {
                              if (brandColors.length < 5) {
                                setBrandColors([...brandColors, color.toUpperCase()]);
                                setBrandColorInput('');
                              } else {
                                toast.error('Maximum 5 colors allowed');
                              }
                            } else {
                              toast.error('Please enter a valid hex color (e.g., #FF5733)');
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const color = brandColorInput.trim();
                          if (color && color.match(/^#[0-9A-Fa-f]{6}$/)) {
                            if (brandColors.length < 5) {
                              setBrandColors([...brandColors, color.toUpperCase()]);
                              setBrandColorInput('');
                            } else {
                              toast.error('Maximum 5 colors allowed');
                            }
                          } else {
                            toast.error('Please enter a valid hex color (e.g., #FF5733)');
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Add Color
                      </button>
                    </div>

                    {/* Display added colors */}
                    {brandColors.length > 0 && (
                      <div className="space-y-2">
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Your Brand Colors ({brandColors.length}/5):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {brandColors.map((color, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200"
                            >
                              <div
                                className="w-8 h-8 rounded border-2 border-gray-300"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-mono text-sm">{color}</span>
                              <button
                                onClick={() => setBrandColors(brandColors.filter((_, i) => i !== index))}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Generated custom palettes preview */}
                    {brandColors.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Preview of custom palettes we'll create:
                        </p>
                        <div className="grid gap-2">
                          {generateAllCustomPalettes(brandColors).slice(0, 3).map(palette => (
                            <div
                              key={palette.id}
                              className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${
                                isDark ? 'border-gray-600' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="grid grid-cols-5 gap-1 flex-1">
                                  {palette.colors.map((color, idx) => (
                                    <div
                                      key={idx}
                                      className="h-8 rounded"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {palette.mood}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Continue button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (brandColors.length === 0) {
                          toast.error('Please add at least one brand color');
                          return;
                        }
                        // Don't generate palettes yet - we need to ask about light/dark first
                        setShowBrandAssessment(false);
                        // Go to background preference question
                        setCurrentStep(0);
                      }}
                      disabled={brandColors.length === 0}
                      className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                        brandColors.length > 0
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Continue to Background Preference
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : /* Show final selection screen */
          showFinalSelection && !showSummary ? (
            <div className="space-y-6">
              {/* Show editing indicator if loading previous data */}
              {isEditingPrevious && !isViewOnly && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      You're editing your previous submission. You can update your selections or add notes below.
                    </p>
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : ''}`}>
                  {isEditingPrevious
                    ? 'Review and Update Your Palette Selections'
                    : getDisplayPalettes().length > 0
                      ? 'Select Your Top Palettes'
                      : 'No Palettes Matched Your Taste'}
                </h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {isEditingPrevious
                    ? 'Your previous selections are shown below. You can modify them if needed.'
                    : getDisplayPalettes().length > 0
                      ? 'Choose up to 3 palettes that best represent your vision (or none if they don\'t work)'
                      : 'None of the palettes seemed to match what you\'re looking for'}
                </p>
              </div>

              {(getDisplayPalettes().length > 0 || (isEditingPrevious && finalSelections.length > 0)) ? (
                <>
                  {/* Show liked palettes for final selection */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {getDisplayPalettes().map(palette => (
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
                        {paletteRatings[palette.id] && (
                          <p className="text-xs text-purple-600 mt-1">
                            You {paletteRatings[palette.id] === 'love' ? 'loved' : paletteRatings[palette.id] === 'like' ? 'liked' : 'passed on'} this
                          </p>
                        )}
                        {isEditingPrevious && !paletteRatings[palette.id] && (
                          <p className="text-xs text-gray-500 mt-1">
                            Previously selected
                          </p>
                        )}
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
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (isEditingPrevious) {
                        // Reset everything to start fresh
                        setCurrentStep(0);
                        setBackgroundPreference(null);
                        setPaletteRatings({});
                        setFinalSelections([]);
                        setNotes('');
                        setNoneSelected(false);
                        setShowFinalSelection(false);
                        setIsEditingPrevious(false);
                        toast.success('Starting fresh palette selection');
                      } else {
                        setShowFinalSelection(false);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isDark ? 'text-white hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                    <ChevronLeft className="w-5 h-5" />
                    {isEditingPrevious ? 'Start Over' : 'Back'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowSummary(true);
                    // Auto-scroll to top when showing summary
                    setTimeout(() => {
                      const modalContent = document.querySelector('.palette-cleanser-modal-content');
                      if (modalContent) {
                        modalContent.scrollTop = 0;
                      }
                    }, 100);
                  }}
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
          ) : customPalettes.length > 0 && currentStep === 0 && backgroundPreference && !showFinalSelection ? (
            /* Show custom palettes based on brand colors after background preference is set */
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : ''}`}>
                  {brandColorAttachment === 'very'
                    ? 'Palettes designed specifically for your brand'
                    : 'Let\'s explore palettes based on your brand colors'}
                </h3>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {customPalettePage === 1 && 'Starting with your brand and professional options'}
                  {customPalettePage === 2 && 'Modern tech-inspired variations'}
                  {customPalettePage === 3 && 'Warm and energetic combinations'}
                  {customPalettePage === 4 && 'Cool and calming tones'}
                  {customPalettePage === 5 && 'Bold and vibrant energy'}
                  {customPalettePage === 6 && 'Sophisticated elegance'}
                  {customPalettePage === 7 && 'Creative experimental options'}
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Page {customPalettePage} of {totalCustomPages}
                  </span>
                  <div className="flex gap-1">
                    {[...Array(totalCustomPages)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${
                          customPalettePage === i + 1
                            ? 'bg-purple-600 w-3'
                            : 'bg-gray-300 hover:bg-gray-400 cursor-pointer'
                        }`}
                        onClick={() => {
                          // Allow jumping to already rated pages
                          const targetPagePalettes = customPalettes.filter(p => p.page === i + 1);
                          if (i < customPalettePage - 1 || targetPagePalettes.every(p => paletteRatings[p.id] !== undefined)) {
                            setCustomPalettePage(i + 1);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Display only 3 palettes for current page */}
              <div className="grid md:grid-cols-1 gap-6 max-w-2xl mx-auto">
                {customPalettes
                  .filter(palette => palette.page === customPalettePage)
                  .map(palette => renderPaletteRating(palette))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t">
                <button
                  onClick={() => {
                    if (customPalettePage > 1) {
                      setCustomPalettePage(customPalettePage - 1);
                    } else {
                      setBackgroundPreference(null);
                      setCustomPalettes([]);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isDark
                      ? 'text-white hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                  {customPalettePage === 1 ? 'Back to Background' : 'Previous'}
                </button>

                <div className="flex gap-3 items-center">
                  <div className="text-sm text-gray-500">
                    {customPalettes
                      .filter(p => p.page === customPalettePage)
                      .filter(p => paletteRatings[p.id] !== undefined)
                      .length} of 3 rated
                  </div>

                  <button
                    onClick={() => {
                      const currentPagePalettes = customPalettes.filter(p => p.page === customPalettePage);

                      if (currentPagePalettes.every(p => paletteRatings[p.id] !== undefined)) {
                        if (customPalettePage < totalCustomPages) {
                          // Go to next page
                          setCustomPalettePage(customPalettePage + 1);
                        } else {
                          // Finished all pages
                          if (brandColorAttachment === 'very') {
                            // For "very attached", go straight to final selection
                            setShowFinalSelection(true);
                          } else {
                            // Otherwise continue to standard palettes
                            setCurrentStep(1);
                          }
                        }
                      } else {
                        toast.error('Please rate all 3 palettes before continuing');
                      }
                    }}
                    disabled={!customPalettes.filter(p => p.page === customPalettePage).every(p => paletteRatings[p.id] !== undefined)}
                    className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      customPalettes.filter(p => p.page === customPalettePage).every(p => paletteRatings[p.id] !== undefined)
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {customPalettePage < totalCustomPages
                      ? 'Next Page'
                      : (brandColorAttachment === 'very' ? 'View Selection' : 'Standard Palettes')}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
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
                  Let's review your preferences. Remember: These aren't final. It's just a window into your soul.
                </p>
              </div>

              {/* Brand Color Assessment - Show for admins viewing results */}
              {(brandColorAttachment !== null || brandColors.length > 0) && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'} border ${isDark ? 'border-purple-700' : 'border-purple-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h4 className={`font-semibold ${isDark ? 'text-white' : ''}`}>Brand Color Assessment</h4>
                  </div>

                  {/* Attachment Level */}
                  <div className="mb-3">
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      Attachment to Current Brand Colors:
                    </p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      brandColorAttachment === 'very'
                        ? 'bg-green-100 text-green-800'
                        : brandColorAttachment === 'somewhat'
                          ? 'bg-yellow-100 text-yellow-800'
                          : brandColorAttachment === 'not'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}>
                      {brandColorAttachment === 'very' ? '💚 Very Attached' :
                       brandColorAttachment === 'somewhat' ? '💛 Somewhat Attached' :
                       brandColorAttachment === 'not' ? '❌ Not Attached' :
                       '❓ No Response'}
                    </span>
                  </div>

                  {/* Brand Colors if provided */}
                  {brandColors.length > 0 && (
                    <div>
                      <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {hasBrandColors === 'yes_custom' ? 'Client Provided Colors:' : 'Colors from Project Settings:'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {brandColors.map((color, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                            <div
                              className="w-8 h-8 rounded border border-gray-300"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-mono text-gray-700">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation based on attachment */}
                  <p className={`text-sm mt-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {brandColorAttachment === 'very'
                      ? "Client wants to stay close to their existing brand colors. All suggested palettes were based on these colors."
                      : brandColorAttachment === 'somewhat'
                        ? "Client is open to exploring beyond their current colors but wants some connection to their brand."
                        : brandColorAttachment === 'not'
                          ? "Client is ready for a complete refresh and isn't attached to their current brand colors."
                          : "No brand color preference was indicated."}
                  </p>
                </div>
              )}

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
                {!isViewOnly ? (
                  <>
                    <button
                      onClick={() => {
                        setShowSummary(false);
                        // Ensure we go back to final selection for "very attached" users
                        if (brandColorAttachment === 'very') {
                          setShowFinalSelection(true);
                        }
                        // Auto-scroll to top when going back to selection
                        setTimeout(() => {
                          const modalContent = document.querySelector('.palette-cleanser-modal-content');
                          if (modalContent) {
                            modalContent.scrollTop = 0;
                          }
                        }, 100);
                      }}
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
                  </>
                ) : (
                  <div className="w-full text-center">
                    <p className="text-sm text-gray-500 mb-3">Viewing saved palette preferences</p>
                    <button
                      onClick={onClose}
                      className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                      Close
                    </button>
                  </div>
                )}
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
              onClick={() => {
                if (currentStep === 0 && hasBrandColors !== null) {
                  // Go back to brand assessment if we came from there
                  setShowBrandAssessment(true);
                  setBackgroundPreference(null);
                } else {
                  handleBack();
                }
              }}
              disabled={currentStep === 0 && hasBrandColors === null}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentStep === 0 && hasBrandColors === null
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
                  onClick={() => {
                    setShowFinalSelection(true);
                    // Auto-scroll to top when showing final selection
                    setTimeout(() => {
                      const modalContent = document.querySelector('.palette-cleanser-modal-content');
                      if (modalContent) {
                        modalContent.scrollTop = 0;
                      }
                    }, 100);
                  }}
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