'use client';

import { useState, useEffect } from 'react';
import { X, Heart, Download, Palette } from 'lucide-react';

export default function PaletteResultsModal({
  userName,
  responseData,
  onClose
}) {
  if (!responseData) return null;

  const { requiredColors = [], likedPalettes = [], customPalette, preferences = {} } = responseData;

  const exportPalette = () => {
    const exportData = {
      user: userName,
      date: new Date().toISOString(),
      requiredColors,
      likedPalettes,
      customPalette,
      preferences
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userName.replace(/\s+/g, '_')}_palette_preferences.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Palette className="w-8 h-8 text-purple-600" />
              <div>
                <h2 className="text-2xl font-bold">Color Palette Preferences</h2>
                <p className="text-gray-600">{userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportPalette}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                title="Export palette data"
              >
                <Download className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Preferences Summary */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">Preferences Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Prefers Dark Background:</span>
                <span className="ml-2 font-medium">
                  {preferences.prefersDark ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Likes Vibrant Colors:</span>
                <span className="ml-2 font-medium">
                  {preferences.prefersVibrant ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Likes Pastel Colors:</span>
                <span className="ml-2 font-medium">
                  {preferences.prefersPastel ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Liked Palettes:</span>
                <span className="ml-2 font-medium">{likedPalettes.length}</span>
              </div>
            </div>
          </div>

          {/* Required Brand Colors */}
          {requiredColors.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-yellow-600">⭐</span>
                Required Brand Colors
              </h3>
              <div className="flex gap-3 flex-wrap">
                {requiredColors.map((color, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white border rounded-lg p-2 shadow-sm">
                    <div
                      className="w-12 h-12 rounded"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-sm">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Palette */}
          {customPalette && (
            <div>
              <h3 className="font-semibold mb-3">Custom Created Palette</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-5 gap-3">
                  {customPalette.map((color, idx) => (
                    <div key={idx} className="text-center">
                      <div
                        className="aspect-square rounded-lg shadow-md mb-2"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Liked Palettes */}
          {likedPalettes.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Liked Palettes ({likedPalettes.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {likedPalettes.map((palette, idx) => (
                  <div key={idx} className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-sm">{palette.mood || `Palette ${idx + 1}`}</p>
                        <p className="text-xs text-gray-500">
                          Viewed in {palette.bgMode || 'light'} mode as {palette.viewMode || 'cards'}
                        </p>
                      </div>
                      {palette.timestamp && (
                        <span className="text-xs text-gray-400">
                          {new Date(palette.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {palette.colors.map((color, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded"
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

          {/* Color Distribution Analysis */}
          {likedPalettes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Color Trends</h3>
              <div className="space-y-2">
                {(() => {
                  // Analyze color trends
                  const allColors = likedPalettes.flatMap(p => p.colors);
                  const colorCategories = {
                    warm: 0,
                    cool: 0,
                    neutral: 0,
                    bright: 0,
                    dark: 0
                  };

                  allColors.forEach(color => {
                    const hex = color.replace('#', '');
                    const r = parseInt(hex.substr(0, 2), 16);
                    const g = parseInt(hex.substr(2, 2), 16);
                    const b = parseInt(hex.substr(4, 2), 16);
                    const brightness = (r + g + b) / 3;

                    if (brightness > 200) colorCategories.bright++;
                    else if (brightness < 100) colorCategories.dark++;

                    if (r > b && r > g) colorCategories.warm++;
                    else if (b > r && b > g) colorCategories.cool++;
                    else colorCategories.neutral++;
                  });

                  const total = allColors.length;

                  return Object.entries(colorCategories).map(([category, count]) => (
                    <div key={category} className="flex items-center">
                      <span className="text-sm text-gray-600 capitalize w-20">{category}:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            category === 'warm' ? 'bg-orange-400' :
                            category === 'cool' ? 'bg-blue-400' :
                            category === 'neutral' ? 'bg-gray-400' :
                            category === 'bright' ? 'bg-yellow-300' :
                            'bg-gray-700'
                          }`}
                          style={{ width: `${(count / total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 ml-2 w-10">
                        {Math.round((count / total) * 100)}%
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}