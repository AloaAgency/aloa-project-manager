'use client';

import { useState, useEffect } from 'react';
import { X, Check, Type } from 'lucide-react';

// Font pairings that tell emotional stories
const fontPairings = [
  {
    id: 'bold_authority',
    mood: 'Bold & Authoritative',
    description: 'Geared for command and clarity; there\'s no mistaking the lead voice.',
    emotion: 'Decisive, commanding, structured',
    heading: { font: 'League Spartan', text: 'Lead With Clarity', weight: '700' },
    subheading: { font: 'Barlow Semi Condensed', text: 'Strategy First, Always', weight: '600' },
    body: { font: 'IBM Plex Sans', text: 'The typographic equivalent of a firm handshake. Precision and confidence for brands that make decisions, not guesses.', weight: '400' },
    googleFonts: 'League+Spartan:700|Barlow+Semi+Condensed:600|IBM+Plex+Sans:400',
    vibe: ['Commanding', 'Corporate', 'Structured', 'Modern']
  },
  {
    id: 'elegant_luxury',
    mood: 'Elegant & Luxurious',
    description: 'Refined contrast and editorial polish that signals premium service.',
    emotion: 'Exclusive, poised, couture',
    heading: { font: 'Playfair Display', text: 'Tailored Grandeur', weight: '700' },
    subheading: { font: 'Cormorant Garamond', text: 'Craft Meets Couture', weight: '500' },
    body: { font: 'Lora', text: 'Supple serifs whisper prestige and care. Ideal for timeless hospitality, fine events, and premium experiences.', weight: '400' },
    googleFonts: 'Playfair+Display:700|Cormorant+Garamond:500|Lora:400',
    vibe: ['Luxury', 'Sophisticated', 'Editorial', 'Premium']
  },
  {
    id: 'warm_friendly',
    mood: 'Warm & Approachable',
    description: 'Soft edges and generous curves keep conversations human.',
    emotion: 'Friendly, trustworthy, collaborative',
    heading: { font: 'Cabin', text: 'Let\'s Build Together', weight: '700' },
    subheading: { font: 'Merriweather', text: 'Real people, real collaboration', weight: '600' },
    body: { font: 'Source Sans Pro', text: 'Rounded forms stay open and inviting without feeling childish. Perfect for service teams that lead with empathy.', weight: '400' },
    googleFonts: 'Cabin:700|Merriweather:600|Source+Sans+Pro:400',
    vibe: ['Friendly', 'Human', 'Welcoming', 'Collaborative']
  },
  {
    id: 'modern_tech',
    mood: 'Modern & Technical',
    description: 'Sleek geometry paired with mono precision for product-minded teams.',
    emotion: 'Innovative, precise, engineered',
    heading: { font: 'Rajdhani', text: 'Built for Tomorrow', weight: '600' },
    subheading: { font: 'Roboto Mono', text: 'Interfaces with intent', weight: '500' },
    body: { font: 'Inter', text: 'Angular sans and mono accents telegraph engineering rigor. Made for SaaS, data, and forward-thinking builders.', weight: '400' },
    googleFonts: 'Rajdhani:600|Roboto+Mono:500|Inter:400',
    vibe: ['Tech', 'Innovative', 'Precise', 'Futuristic']
  },
  {
    id: 'creative_playful',
    mood: 'Creative & Playful',
    description: 'Chunky display meets sketchbook energy for bold ideas.',
    emotion: 'Imaginative, high-energy, brave',
    heading: { font: 'Shrikhand', text: 'Spark Something Wild', weight: '400' },
    subheading: { font: 'Cabin Sketch', text: 'Ideas that refuse to sit still', weight: '700' },
    body: { font: 'Nunito', text: 'Oversized curves and hand-drawn notes keep things unexpected. Perfect for agencies, makers, and experimenters.', weight: '400' },
    googleFonts: 'Shrikhand|Cabin+Sketch:700|Nunito:400',
    vibe: ['Playful', 'Bold', 'Retro', 'Experimental']
  },
  {
    id: 'classic_editorial',
    mood: 'Classic & Editorial',
    description: 'High-contrast serifs made for longform storytelling.',
    emotion: 'Thoughtful, literary, established',
    heading: { font: 'Bodoni Moda', text: 'Stories Worth Printing', weight: '700' },
    subheading: { font: 'Libre Baskerville', text: 'Considered words, considered forms', weight: '400' },
    body: { font: 'Crimson Pro', text: 'Magazine-ready typography with deliberate pacing. Great for thought leadership and narrative work.', weight: '400' },
    googleFonts: 'Bodoni+Moda:700|Libre+Baskerville:400|Crimson+Pro:400',
    vibe: ['Editorial', 'Traditional', 'Serif', 'Timeless']
  },
  {
    id: 'minimal_zen',
    mood: 'Minimal & Zen',
    description: 'Airy sans combos that live for calm focus.',
    emotion: 'Balanced, intentional, light',
    heading: { font: 'Work Sans', text: 'Intentionally Simple', weight: '500' },
    subheading: { font: 'Josefin Sans', text: 'Space to breathe', weight: '300' },
    body: { font: 'Open Sans', text: 'Clean letterforms and generous spacing craft a sense of ease. Ideal for wellness, lifestyle, and mindful brands.', weight: '300' },
    googleFonts: 'Work+Sans:500|Josefin+Sans:300|Open+Sans:300',
    vibe: ['Minimal', 'Calm', 'Focused', 'Modern']
  },
  {
    id: 'bold_feminine',
    mood: 'Bold & Feminine',
    description: 'Voluminous curves with steel in the spine.',
    emotion: 'Empowered, elegant, magnetic',
    heading: { font: 'Abril Fatface', text: 'Grace With Backbone', weight: '400' },
    subheading: { font: 'DM Serif Display', text: 'Elegance that owns the room', weight: '400' },
    body: { font: 'Mulish', text: 'Statement serifs balanced with a modern sans keep things luxe and unapologetic. Built for beauty, fashion, and powerhouse founders.', weight: '400' },
    googleFonts: 'Abril+Fatface|DM+Serif+Display:400|Mulish:400',
    vibe: ['Feminine', 'Strong', 'Elegant', 'Confident']
  },
  {
    id: 'industrial_grit',
    mood: 'Industrial & Gritty',
    description: 'Condensed, engineered forms that smell like fresh steel.',
    emotion: 'Rugged, hardworking, real',
    heading: { font: 'Staatliches', text: 'Built For Impact', weight: '400' },
    subheading: { font: 'Oswald', text: 'Rugged from day one', weight: '500' },
    body: { font: 'Roboto Condensed', text: 'Blocky display and utilitarian sans show up ready to work. Perfect for trades, logistics, and anything forged not finessed.', weight: '400' },
    googleFonts: 'Staatliches|Oswald:500|Roboto+Condensed:400',
    vibe: ['Industrial', 'Masculine', 'Raw', 'Utility']
  },
  {
    id: 'soft_whimsical',
    mood: 'Soft & Whimsical',
    description: 'Signature script meets soft rounded support.',
    emotion: 'Delightful, welcoming, lighthearted',
    heading: { font: 'Dancing Script', text: 'Curiously Charming', weight: '600' },
    subheading: { font: 'Quicksand', text: 'A gentle wink of personality', weight: '500' },
    body: { font: 'Karla', text: 'Playful swashes paired with cozy sans make everything feel warm and memorable. Great for hospitality, gifting, or kid-forward brands.', weight: '400' },
    googleFonts: 'Dancing+Script:600|Quicksand:500|Karla:400',
    vibe: ['Whimsical', 'Soft', 'Friendly', 'Signature']
  }
];

const fontStatusOptions = [
  {
    value: 'have_fonts_flexible',
    label: 'I have fonts, but open to alternatives',
    description: 'You have specific fonts in mind but willing to explore better options'
  },
  {
    value: 'have_fonts_strict',
    label: 'I have fonts and must use them',
    description: 'Brand guidelines require specific fonts - no substitutions allowed'
  },
  {
    value: 'blank_slate',
    label: 'Complete blank slate - guide me!',
    description: 'No font preferences - help me discover what feels right'
  }
];

export default function FontPicker({
  applet,
  isViewOnly,
  onClose,
  projectId,
  userId,
  onComplete
}) {
  const [fontStatus, setFontStatus] = useState(null);
  const [customFonts, setCustomFonts] = useState('');
  const [selectedPairings, setSelectedPairings] = useState([]);
  const [previousSelection, setPreviousSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredPairing, setHoveredPairing] = useState(null);

  // Load Google Fonts
  useEffect(() => {
    // Build unique list of fonts with their weights
    const allFonts = [];
    fontPairings.forEach(pairing => {
      const fonts = pairing.googleFonts.split('|');
      fonts.forEach(font => {
        if (!allFonts.includes(font)) {
          allFonts.push(font);
        }
      });
    });

    const fontFamilies = allFonts.join('|');
    if (!fontFamilies) {
      return undefined;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css?family=${fontFamilies}&display=swap`;
    link.dataset.fontpickerFonts = 'true';
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  useEffect(() => {
    if (applet.form_progress) {
      setFontStatus(applet.form_progress.fontStatus || null);
      setCustomFonts(applet.form_progress.customFonts || '');
      setSelectedPairings(applet.form_progress.selectedPairings || []);
      setPreviousSelection(applet.form_progress);
    }
  }, [applet]);

  const handlePairingToggle = (pairingId) => {
    if (isViewOnly) return;

    if (selectedPairings.includes(pairingId)) {
      setSelectedPairings(selectedPairings.filter(p => p !== pairingId));
    } else {
      if (selectedPairings.length < 3) {
        setSelectedPairings([...selectedPairings, pairingId]);
      } else {
        alert('You can only select up to 3 font pairings. Deselect one first.');
      }
    }
  };

  const handleSave = async () => {
    if (!fontStatus) {
      alert('Please select your font status');
      return;
    }

    if ((fontStatus === 'have_fonts_flexible' || fontStatus === 'have_fonts_strict') && !customFonts.trim()) {
      alert('Please enter the names of your fonts');
      return;
    }

    if ((fontStatus === 'blank_slate' || fontStatus === 'have_fonts_flexible') && selectedPairings.length !== 3) {
      alert('Please select exactly 3 font pairings that resonate with you');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          status: 'completed',
          interactionType: 'font_preferences',
          userId,
          data: {
            form_progress: {
              fontStatus,
              fontStatusLabel: fontStatusOptions.find(f => f.value === fontStatus)?.label,
              customFonts: (fontStatus === 'have_fonts_flexible' || fontStatus === 'have_fonts_strict') ? customFonts : null,
              selectedPairings: (fontStatus === 'blank_slate' || fontStatus === 'have_fonts_flexible') ? selectedPairings : [],
              selectedPairingDetails: (fontStatus === 'blank_slate' || fontStatus === 'have_fonts_flexible')
                ? selectedPairings.map(id => fontPairings.find(p => p.id === id))
                : [],
              timestamp: new Date().toISOString()
            }
          }
        })
      });

      if (response.ok) {
        if (onComplete) {
          onComplete();
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to save selection: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Type className="w-5 h-5 text-gray-600" />
              {isViewOnly ? 'Your Typography Preferences' : 'Typography Exploration'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isViewOnly
                ? 'These are the typography moods you indicated'
                : 'Help us understand what visual emotions resonate with you'}
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
            <div className="max-w-6xl mx-auto">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-8">
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Font Status:</p>
                  <h3 className="text-2xl font-bold mb-2">{previousSelection.fontStatusLabel}</h3>

                  {(previousSelection.fontStatus === 'have_fonts_flexible' || previousSelection.fontStatus === 'have_fonts_strict') && previousSelection.customFonts && (
                    <div className="mt-4 bg-white rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">THEIR FONTS:</p>
                      <p className="text-gray-700">{previousSelection.customFonts}</p>
                      {previousSelection.fontStatus === 'have_fonts_strict' && (
                        <p className="text-xs text-red-600 mt-2">⚠️ Required by brand guidelines - no substitutions</p>
                      )}
                    </div>
                  )}

                  {(previousSelection.fontStatus === 'blank_slate' || previousSelection.fontStatus === 'have_fonts_flexible') && previousSelection.selectedPairings && previousSelection.selectedPairings.length > 0 && (
                    <div className="mt-6 space-y-6">
                      <p className="text-sm font-semibold text-gray-600">SELECTED TYPOGRAPHY MOODS:</p>
                      {previousSelection.selectedPairings.map((pairingId, idx) => {
                        const pairing = fontPairings.find(p => p.id === pairingId);
                        return pairing ? (
                          <div key={idx} className="bg-white rounded-xl p-6 border-2 border-gray-200">
                            <div className="mb-4">
                              <h4 className="text-xl font-bold mb-1">{pairing.mood}</h4>
                              <p className="text-sm text-gray-600 mb-1">{pairing.description}</p>
                              <p className="text-xs text-gray-500 italic">"{pairing.emotion}"</p>
                            </div>

                            <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
                              <div style={{ fontFamily: pairing.heading.font, fontWeight: pairing.heading.weight }}>
                                <p className="text-xs text-gray-500 mb-1">HEADING</p>
                                <p className="text-3xl">{pairing.heading.text}</p>
                              </div>
                              <div style={{ fontFamily: pairing.subheading.font, fontWeight: pairing.subheading.weight }}>
                                <p className="text-xs text-gray-500 mb-1">SUBHEADING</p>
                                <p className="text-xl">{pairing.subheading.text}</p>
                              </div>
                              <div style={{ fontFamily: pairing.body.font, fontWeight: pairing.body.weight }}>
                                <p className="text-xs text-gray-500 mb-1">BODY TEXT</p>
                                <p className="text-base leading-relaxed">{pairing.body.text}</p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {pairing.vibe.map((v, i) => (
                                <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                  {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Font Status Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">First, tell us about your font situation:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {fontStatusOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => !isViewOnly && setFontStatus(option.value)}
                      className={`
                        relative border-2 rounded-lg p-4 cursor-pointer transition-all
                        ${fontStatus === option.value
                          ? 'border-black bg-gray-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-400'
                        }
                      `}
                    >
                      {fontStatus === option.value && (
                        <div className="absolute top-3 right-3">
                          <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                      <h4 className="font-medium mb-1 pr-8">{option.label}</h4>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Fonts Input */}
              {(fontStatus === 'have_fonts_flexible' || fontStatus === 'have_fonts_strict') && (
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-2">
                    Enter your font names (separated by commas):
                  </label>
                  <textarea
                    value={customFonts}
                    onChange={(e) => setCustomFonts(e.target.value)}
                    placeholder="e.g., Helvetica Neue, Georgia, Proxima Nova"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  {fontStatus === 'have_fonts_strict' && (
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Since these are required, we'll work within these constraints. If you're open to alternatives, choose "flexible" instead.
                    </p>
                  )}
                </div>
              )}

              {/* Font Pairing Selection Grid */}
              {(fontStatus === 'blank_slate' || fontStatus === 'have_fonts_flexible') && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-2">
                    Select 3 typography moods that resonate with you ({selectedPairings.length}/3 selected):
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {fontStatus === 'have_fonts_flexible'
                      ? "Even with your existing fonts in mind, help us understand what visual emotions you're drawn to. This gives us insight into why you chose those fonts and what alternatives might work."
                      : "Don't focus on the specific fonts—focus on the <strong>feeling</strong> each pairing evokes. What emotions do you want your brand to convey?"
                    }
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {fontPairings.map((pairing) => (
                      <div
                        key={pairing.id}
                        onClick={() => handlePairingToggle(pairing.id)}
                        onMouseEnter={() => setHoveredPairing(pairing.id)}
                        onMouseLeave={() => setHoveredPairing(null)}
                        className={`
                          relative border-2 rounded-xl p-6 cursor-pointer transition-all
                          ${selectedPairings.includes(pairing.id)
                            ? 'border-black bg-gray-50 shadow-xl scale-[1.02]'
                            : 'border-gray-200 hover:border-gray-400 hover:shadow-lg'
                          }
                        `}
                      >
                        {selectedPairings.includes(pairing.id) && (
                          <div className="absolute top-4 right-4">
                            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}

                        <div className="mb-4">
                          <h4 className="text-xl font-bold mb-1">{pairing.mood}</h4>
                          <p className="text-sm text-gray-600 mb-1">{pairing.description}</p>
                          <p className="text-xs text-gray-500 italic">"{pairing.emotion}"</p>
                        </div>

                        <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
                          <div style={{ fontFamily: pairing.heading.font, fontWeight: pairing.heading.weight }}>
                            <p className="text-xs text-gray-400 mb-1">HEADING</p>
                            <p className="text-2xl lg:text-3xl">{pairing.heading.text}</p>
                          </div>
                          <div style={{ fontFamily: pairing.subheading.font, fontWeight: pairing.subheading.weight }}>
                            <p className="text-xs text-gray-400 mb-1">SUBHEADING</p>
                            <p className="text-lg">{pairing.subheading.text}</p>
                          </div>
                          <div style={{ fontFamily: pairing.body.font, fontWeight: pairing.body.weight }}>
                            <p className="text-xs text-gray-400 mb-1">BODY</p>
                            <p className="text-sm leading-relaxed">{pairing.body.text}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {pairing.vibe.map((v, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Button */}
              {!isViewOnly && fontStatus && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`
                      px-8 py-3 rounded-lg font-semibold transition-all
                      ${!loading
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {loading ? 'Saving...' : 'Save Typography Preferences'}
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
