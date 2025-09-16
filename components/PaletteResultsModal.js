'use client';

import { useState } from 'react';
import { X, Heart, ThumbsUp, ThumbsDown, Download, Palette, Sun, Moon, Sparkles, AlertCircle, FileText, TrendingUp, CheckCircle } from 'lucide-react';

// Import the palette collections to recreate the visual palettes
const PALETTE_COLLECTIONS = [
  {
    id: 'temperature',
    palettes: [
      { id: 'warm', colors: ['#FF6B6B', '#FFA500', '#FFD700', '#FF8C00', '#CD853F'], mood: 'Warm & Inviting' },
      { id: 'cool', colors: ['#4ECDC4', '#556270', '#6BB6D6', '#95E1D3', '#3D5A80'], mood: 'Cool & Calm' },
      { id: 'neutral', colors: ['#8B7355', '#A0826D', '#C9B79C', '#D4C4A0', '#E5D4B7'], mood: 'Neutral & Balanced' }
    ]
  },
  {
    id: 'saturation',
    palettes: [
      { id: 'vibrant', colors: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF'], mood: 'Bold & Vibrant' },
      { id: 'muted', colors: ['#6C7B8B', '#8B9DC3', '#B0C4DE', '#C6D7E8', '#DDE8F3'], mood: 'Muted & Subtle' },
      { id: 'pastel', colors: ['#FFE5EC', '#FFC2D1', '#FFB3C6', '#FF8FAB', '#FB6F92'], mood: 'Soft Pastels' }
    ]
  },
  {
    id: 'style',
    palettes: [
      { id: 'corporate', colors: ['#1E3A8A', '#1E40AF', '#3B82F6', '#93C5FD', '#DBEAFE'], mood: 'Corporate Professional' },
      { id: 'creative', colors: ['#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'], mood: 'Creative & Playful' },
      { id: 'minimal', colors: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#9E9E9E', '#212121'], mood: 'Minimalist' }
    ]
  },
  {
    id: 'nature',
    palettes: [
      { id: 'forest', colors: ['#2D5016', '#3E7A1E', '#4E9F3D', '#8FBC8F', '#C8E6C9'], mood: 'Forest Fresh' },
      { id: 'ocean', colors: ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8'], mood: 'Ocean Depths' },
      { id: 'sunset', colors: ['#FF7B54', '#FF9A76', '#FFB5A0', '#FCD5CE', '#FFF5F0'], mood: 'Sunset Glow' },
      { id: 'earth', colors: ['#8B4513', '#A0522D', '#BC8F8F', '#D2B48C', '#F5E6D3'], mood: 'Earthy & Grounded' }
    ]
  },
  {
    id: 'accents',
    palettes: [
      { id: 'jewel', colors: ['#8B008B', '#FF1493', '#00CED1', '#FFD700', '#FF69B4'], mood: 'Jewel Tones' },
      { id: 'neon', colors: ['#39FF14', '#FF073A', '#00F5FF', '#FFD700', '#FF6EC7'], mood: 'Electric Neon' },
      { id: 'classic', colors: ['#000080', '#800020', '#006400', '#FFD700', '#708090'], mood: 'Classic Accents' }
    ]
  },
  {
    id: 'monochrome',
    palettes: [
      { id: 'blue-mono', colors: ['#0A1929', '#173A5E', '#1E5288', '#3B82C4', '#93C5FD'], mood: 'Blue Monochrome' },
      { id: 'green-mono', colors: ['#1B3A1B', '#2D5016', '#3E7A1E', '#4E9F3D', '#8FBC8F'], mood: 'Green Monochrome' },
      { id: 'purple-mono', colors: ['#2E1A47', '#4A2C68', '#6B46A3', '#9B72CF', '#C8B3E6'], mood: 'Purple Monochrome' }
    ]
  },
  {
    id: 'combinations',
    palettes: [
      { id: 'modern-tech', colors: ['#0F172A', '#1E293B', '#3B82F6', '#60A5FA', '#F0F9FF'], mood: 'Modern Tech' },
      { id: 'warm-elegant', colors: ['#FFF8DC', '#FFE4B5', '#DEB887', '#D2691E', '#8B4513'], mood: 'Warm Elegance' },
      { id: 'fresh-natural', colors: ['#F0FFF4', '#C6F6D5', '#68D391', '#38A169', '#22543D'], mood: 'Fresh & Natural' },
      { id: 'bold-confident', colors: ['#DC2626', '#EA580C', '#FACC15', '#16A34A', '#2563EB'], mood: 'Bold & Confident' }
    ]
  }
];

export default function PaletteResultsModal({
  userName,
  responseData,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!responseData) return null;

  const {
    backgroundPreference,
    finalSelections = [],
    paletteRatings = {},
    noneSelected = false,
    preferences = {},
    insights = [],
    notes = '',
    completedAt
  } = responseData;

  // Get all palettes with their ratings
  const getAllPalettesWithRatings = () => {
    const allPalettes = [];
    PALETTE_COLLECTIONS.forEach(collection => {
      collection.palettes?.forEach(palette => {
        if (paletteRatings[palette.id]) {
          allPalettes.push({
            ...palette,
            rating: paletteRatings[palette.id],
            category: collection.id
          });
        }
      });
    });
    return allPalettes;
  };

  const ratedPalettes = getAllPalettesWithRatings();
  const lovedPalettes = ratedPalettes.filter(p => p.rating === 'love');
  const likedPalettes = ratedPalettes.filter(p => p.rating === 'like');
  const dislikedPalettes = ratedPalettes.filter(p => p.rating === 'dislike');

  const exportData = () => {
    const exportData = {
      user: userName,
      completedAt,
      backgroundPreference,
      finalSelections,
      paletteRatings,
      noneSelected,
      preferences,
      insights,
      notes,
      summary: {
        totalRated: ratedPalettes.length,
        loved: lovedPalettes.length,
        liked: likedPalettes.length,
        passed: dislikedPalettes.length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userName.replace(/\s+/g, '_')}_palette_preferences.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRatingIcon = (rating) => {
    switch(rating) {
      case 'love': return <Heart className="w-4 h-4 text-pink-500 fill-current" />;
      case 'like': return <ThumbsUp className="w-4 h-4 text-blue-500 fill-current" />;
      case 'dislike': return <ThumbsDown className="w-4 h-4 text-gray-500 fill-current" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <Palette className="w-8 h-8" />
                Palette Discovery Results
              </h2>
              <p className="text-purple-100">{userName}'s Color Preferences</p>
              {completedAt && (
                <p className="text-xs text-purple-200 mt-1">
                  Completed: {new Date(completedAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportData}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Export data"
              >
                <Download className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="bg-white/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{ratedPalettes.length}</div>
              <div className="text-xs text-purple-100">Palettes Rated</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold flex justify-center">
                {backgroundPreference === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
              </div>
              <div className="text-xs text-purple-100">
                {backgroundPreference === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </div>
            </div>
            <div className="bg-white/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{lovedPalettes.length}</div>
              <div className="text-xs text-purple-100">Loved</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {noneSelected ? '0' : finalSelections.length}
              </div>
              <div className="text-xs text-purple-100">Final Picks</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex gap-1 p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('ratings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'ratings'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Ratings ({ratedPalettes.length})
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'insights'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Insights & Notes
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Final Selections or None Selected */}
              {noneSelected ? (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">
                    None of the Palettes Worked
                  </h3>
                  <p className="text-orange-700">
                    The client indicated that none of the presented color palettes match their vision.
                    Consider scheduling a consultation to explore custom options.
                  </p>
                </div>
              ) : finalSelections.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Final Selected Palettes ({finalSelections.length}/3)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {finalSelections.map((selection, idx) => {
                      const palette = PALETTE_COLLECTIONS
                        .flatMap(c => c.palettes || [])
                        .find(p => p.id === selection.id) || selection;

                      return (
                        <div key={idx} className="relative">
                          <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                            #{idx + 1}
                          </div>
                          <div className="bg-white border-2 border-purple-200 rounded-lg p-4 shadow-lg">
                            <p className="font-semibold text-center mb-3 text-purple-900">
                              {palette.mood}
                            </p>
                            <div className="grid grid-cols-5 gap-1 mb-3">
                              {palette.colors?.map((color, i) => (
                                <div key={i} className="relative group">
                                  <div
                                    className="aspect-square rounded shadow-md transition-transform hover:scale-110"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-black text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {color}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
                  <p>No final palette selections were made</p>
                </div>
              )}

              {/* Loved Palettes */}
              {lovedPalettes.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500 fill-current" />
                    Loved Palettes ({lovedPalettes.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {lovedPalettes.map((palette, idx) => (
                      <div key={idx} className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-pink-900 mb-2 truncate">
                          {palette.mood}
                        </p>
                        <div className="grid grid-cols-5 gap-0.5">
                          {palette.colors.map((color, i) => (
                            <div
                              key={i}
                              className="aspect-square rounded-sm"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferences Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Color Preferences Analysis
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(preferences).map(([key, value]) => {
                    if (!value) return null;
                    const label = key.replace('prefers', '').replace(/([A-Z])/g, ' $1').trim();
                    return (
                      <div key={key} className="bg-white rounded-lg p-2 text-center">
                        <Sparkles className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                        <p className="text-sm font-medium text-purple-900">{label}</p>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ratings' && (
            <div className="space-y-6">
              {/* Rating Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`rounded-lg p-3 text-center ${lovedPalettes.length > 0 ? 'bg-pink-50' : 'bg-gray-50'}`}>
                  <Heart className="w-6 h-6 text-pink-500 fill-current mx-auto mb-2" />
                  <div className="text-2xl font-bold text-pink-900">{lovedPalettes.length}</div>
                  <div className="text-xs text-pink-700">Loved</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${likedPalettes.length > 0 ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <ThumbsUp className="w-6 h-6 text-blue-500 fill-current mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-900">{likedPalettes.length}</div>
                  <div className="text-xs text-blue-700">Liked</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${dislikedPalettes.length > 0 ? 'bg-gray-100' : 'bg-gray-50'}`}>
                  <ThumbsDown className="w-6 h-6 text-gray-500 fill-current mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-700">{dislikedPalettes.length}</div>
                  <div className="text-xs text-gray-600">Passed</div>
                </div>
              </div>

              {/* All Rated Palettes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ratedPalettes.map((palette, idx) => (
                  <div key={idx} className={`rounded-lg p-4 border-2 ${
                    palette.rating === 'love' ? 'bg-pink-50 border-pink-200' :
                    palette.rating === 'like' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">{palette.mood}</p>
                        <p className="text-xs text-gray-500 capitalize">{palette.category.replace('-', ' ')}</p>
                      </div>
                      {getRatingIcon(palette.rating)}
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {palette.colors.map((color, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded shadow-sm"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* AI Insights */}
              {insights && insights.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Generated Insights
                  </h3>
                  <ul className="space-y-2">
                    {insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5 flex-shrink-0" />
                        <p className="text-sm text-purple-900">{insight}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Client Notes */}
              {notes && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Client's Additional Notes
                  </h3>
                  <p className="text-blue-900 whitespace-pre-wrap">{notes}</p>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-purple-900">
                  Design Recommendations
                </h3>
                <div className="space-y-2 text-sm text-purple-800">
                  {backgroundPreference === 'dark' && (
                    <p>• Consider implementing a dark mode design with high contrast elements</p>
                  )}
                  {lovedPalettes.some(p => p.id.includes('warm')) && (
                    <p>• Use warm accent colors to create an inviting atmosphere</p>
                  )}
                  {lovedPalettes.some(p => p.id.includes('minimal')) && (
                    <p>• Focus on clean, minimalist layouts with plenty of white space</p>
                  )}
                  {lovedPalettes.some(p => p.id.includes('vibrant')) && (
                    <p>• Incorporate bold, vibrant colors for calls-to-action and key elements</p>
                  )}
                  {noneSelected && (
                    <p>• Schedule a custom color consultation to explore unique palette options</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}