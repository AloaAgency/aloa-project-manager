'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Map, Plus, X, ChevronRight, ChevronDown, Edit2, Trash2, Check, Home, Info, Users, Phone, ShoppingBag, FileText, Settings, Mail, Search, Menu, Navigation, Link } from 'lucide-react';
import { debounce } from '../lib/debounce';

const SitemapBuilderV2 = ({
  config = {},
  projectScope = { main_pages: 5, aux_pages: 5 },
  isLocked = false,
  initialData = null,
  onSave = () => {},
  onAutoSave = () => {},
  appletId = null,
  projectId = null,
  userId = null,
  websiteUrl = null
}) => {

  // Common page templates
  const pageTemplates = [
    { name: 'About', icon: Info, description: 'About us/company info', type: 'main' },
    { name: 'Services', icon: Settings, description: 'Products or services', type: 'main' },
    { name: 'Solutions', icon: FileText, description: 'How you solve problems', type: 'main' },
    { name: 'Case Studies', icon: FileText, description: 'Success stories', type: 'main' },
    { name: 'Resources', icon: FileText, description: 'Guides, tools, content', type: 'main' },
    { name: 'Blog', icon: FileText, description: 'News and insights', type: 'main' },
    { name: 'Team', icon: Users, description: 'Meet the team', type: 'main' },
    { name: 'Pricing', icon: FileText, description: 'Plans and pricing', type: 'main' },
    { name: 'Contact', icon: Phone, description: 'Contact information', type: 'aux' },
    { name: 'Privacy Policy', icon: FileText, description: 'Privacy policy', type: 'aux' },
    { name: 'Terms & Conditions', icon: FileText, description: 'Terms of service', type: 'aux' },
    { name: 'FAQ', icon: Search, description: 'Frequently asked questions', type: 'aux' },
    { name: 'Sitemap', icon: Map, description: 'Site structure', type: 'aux' },
    { name: 'Careers', icon: Users, description: 'Job opportunities', type: 'aux' },
    { name: 'Support', icon: Settings, description: 'Customer support', type: 'aux' },
  ];

  // Initialize sitemap with navigation and footer sections
  const [sitemap, setSitemap] = useState(() => {
    if (initialData) {
      // Handle old format (with children) and new format (with navigation/footer)
      if (initialData.navigation || initialData.footer) {
        return {
          ...initialData,
          name: websiteUrl || initialData.name || 'Website'
        };
      } else if (initialData.children) {
        // Convert old format to new format
        const navPages = [];
        const footerPages = [];

        initialData.children.forEach(page => {
          if (page.location === 'footer' || ['Privacy Policy', 'Terms & Conditions', 'FAQ', 'Sitemap', 'Careers', 'Support'].includes(page.name)) {
            footerPages.push(page);
          } else {
            navPages.push(page);
          }
        });

        return {
          name: websiteUrl || initialData.name || 'Website',
          navigation: navPages,
          footer: footerPages
        };
      }
    }

    return {
      name: websiteUrl || 'Website',
      navigation: [
        { id: '1', name: 'Home', type: 'main', children: [] }
      ],
      footer: []
    };
  });

  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverInfo, setDragOverInfo] = useState(null);
  const [pageCount, setPageCount] = useState({ main: 1, aux: 0 });
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [editName, setEditName] = useState('');
  const hasInitialized = useRef(false);
  const prevSitemapRef = useRef(null);

  // Update sitemap when initialData changes
  useEffect(() => {
    if (initialData && JSON.stringify(initialData) !== JSON.stringify(sitemap)) {
      if (initialData.navigation || initialData.footer) {
        setSitemap({
          ...initialData,
          name: websiteUrl || initialData.name || 'Website'
        });
      } else if (initialData.children) {
        const navPages = [];
        const footerPages = [];
        initialData.children.forEach(page => {
          if (page.location === 'footer' || ['Privacy Policy', 'Terms & Conditions', 'FAQ', 'Sitemap', 'Careers', 'Support'].includes(page.name)) {
            footerPages.push(page);
          } else {
            navPages.push(page);
          }
        });
        setSitemap({
          name: websiteUrl || initialData.name || 'Website',
          navigation: navPages,
          footer: footerPages
        });
      }
    }
  }, [initialData]);

  // Count pages
  useEffect(() => {
    const countPages = (pages) => {
      let main = 0;
      let aux = 0;
      pages.forEach(page => {
        if (page.type === 'main') main++;
        else if (page.type === 'aux') aux++;
        if (page.children) {
          const childCounts = countPages(page.children);
          main += childCounts.main;
          aux += childCounts.aux;
        }
      });
      return { main, aux };
    };

    const allPages = [...(sitemap.navigation || []), ...(sitemap.footer || [])];
    const counts = countPages(allPages);
    setPageCount(counts);
  }, [sitemap]);

  // Create debounced auto-save function
  const debouncedAutoSave = useMemo(
    () => debounce(async (sitemapData) => {
      setIsSaving(true);
      try {
        await onAutoSave(sitemapData);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        setTimeout(() => setIsSaving(false), 1000);
      }
    }, 2000),
    [onAutoSave]
  );

  // Auto-save with proper debouncing
  useEffect(() => {
    if (!onAutoSave || isLocked) return;

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      prevSitemapRef.current = JSON.stringify(sitemap);
      return;
    }

    const currentSitemapStr = JSON.stringify(sitemap);
    if (prevSitemapRef.current === currentSitemapStr) return;

    prevSitemapRef.current = currentSitemapStr;
    debouncedAutoSave(sitemap);

    // Cleanup: cancel any pending saves on unmount
    return () => {
      debouncedAutoSave.cancel?.();
    };
  }, [sitemap, debouncedAutoSave, isLocked, onAutoSave]);

  const handleDragStart = useCallback((e, item, fromSection) => {
    if (item.name === 'Home' || item.id === '1' || isLocked) {
      e.preventDefault();
      return;
    }

    const dragData = { ...item, fromSection };
    setDraggedItem(dragData);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
  }, [isLocked]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, toSection, toIndex) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || isLocked) {
      setDraggedItem(null);
      setDragOverInfo(null);
      return;
    }

    // Prevent dropping above Home in navigation
    if (toSection === 'navigation' && toIndex === 0) {
      setDraggedItem(null);
      setDragOverInfo(null);
      return;
    }

    setSitemap(prev => {
      // Create completely new objects
      const newSitemap = {
        ...prev,
        navigation: [...prev.navigation],
        footer: [...prev.footer]
      };

      // Handle adding from templates
      if (draggedItem.fromSection === 'templates') {
        const newPage = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: draggedItem.name,
          type: draggedItem.type,
          children: []
        };

        const isMain = draggedItem.type === 'main';
        const limit = isMain ? projectScope.main_pages : projectScope.aux_pages;
        const current = isMain ? pageCount.main : pageCount.aux;

        if (current >= limit) {
          alert(`You have reached the maximum number of ${isMain ? 'main' : 'auxiliary'} pages in your plan.`);
          return prev;
        }

        if (toSection === 'navigation') {
          newSitemap.navigation.splice(toIndex, 0, newPage);
        } else {
          newSitemap.footer.splice(toIndex, 0, newPage);
        }
      } else {
        // Handle moving existing items
        const fromSection = draggedItem.fromSection;

        // Remove from source
        if (fromSection === 'navigation') {
          const index = newSitemap.navigation.findIndex(item => item.id === draggedItem.id);
          if (index !== -1) {
            newSitemap.navigation.splice(index, 1);
          }
        } else if (fromSection === 'footer') {
          const index = newSitemap.footer.findIndex(item => item.id === draggedItem.id);
          if (index !== -1) {
            newSitemap.footer.splice(index, 1);
          }
        }

        // Add to destination
        const itemToAdd = {
          id: draggedItem.id,
          name: draggedItem.name,
          type: draggedItem.type,
          children: draggedItem.children || []
        };

        if (toSection === 'navigation') {
          // Adjust index if moving within same section and moving down
          let adjustedIndex = toIndex;
          if (fromSection === 'navigation') {
            const originalIndex = prev.navigation.findIndex(item => item.id === draggedItem.id);
            if (originalIndex < toIndex) {
              adjustedIndex = Math.max(0, toIndex - 1);
            }
          }
          newSitemap.navigation.splice(adjustedIndex, 0, itemToAdd);
        } else {
          // Adjust index if moving within same section and moving down
          let adjustedIndex = toIndex;
          if (fromSection === 'footer') {
            const originalIndex = prev.footer.findIndex(item => item.id === draggedItem.id);
            if (originalIndex < toIndex) {
              adjustedIndex = Math.max(0, toIndex - 1);
            }
          }
          newSitemap.footer.splice(adjustedIndex, 0, itemToAdd);
        }
      }

      return newSitemap;
    });

    setDraggedItem(null);
    setDragOverInfo(null);
  }, [draggedItem, isLocked, projectScope.main_pages, projectScope.aux_pages, pageCount]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverInfo(null);
  }, []);

  const deletePage = (pageId, section) => {
    if (isLocked || pageId === '1') return;
    setSitemap(prev => ({
      ...prev,
      [section]: prev[section].filter(page => page.id !== pageId)
    }));
  };

  const startEdit = (page, section) => {
    if (isLocked || page.name === 'Home' || page.id === '1') return;
    setEditingPage({ ...page, section });
    setEditName(page.name);
  };

  const saveEdit = () => {
    if (!editingPage || !editName.trim()) return;
    setSitemap(prev => ({
      ...prev,
      [editingPage.section]: prev[editingPage.section].map(page =>
        page.id === editingPage.id ? { ...page, name: editName.trim() } : page
      )
    }));
    setEditingPage(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingPage(null);
    setEditName('');
  };

  const handleSave = useCallback(() => {
    if (isLocked) return;
    if (typeof onSave === 'function') {
      onSave(sitemap);
    }
  }, [isLocked, onSave, sitemap]);

  const renderPage = (page, section, index) => {
    const isHome = page.name === 'Home' || page.id === '1';
    const isDraggable = !isLocked && !isHome;

    return (
      <div
        key={page.id}
        draggable={isDraggable}
        onDragStart={(e) => isDraggable && handleDragStart(e, page, section)}
        onDragEnd={handleDragEnd}
        className={`
          group flex items-center gap-2 p-2 rounded-lg border transition-all
          ${isHome ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50 border-gray-200'}
          ${draggedItem?.id === page.id ? 'opacity-50' : ''}
          ${isDraggable ? 'cursor-move' : ''}
        `}
      >
        {!isLocked && !isHome && (
          <div className="opacity-50 hover:opacity-100">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
            </svg>
          </div>
        )}

        {isHome ? (
          <Home className="w-4 h-4 text-blue-600" />
        ) : (
          <FileText className={`w-4 h-4 ${page.type === 'main' ? 'text-blue-600' : 'text-gray-500'}`} />
        )}

        {editingPage?.id === page.id ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                else if (e.key === 'Escape') cancelEdit();
              }}
              className="px-2 py-1 border rounded text-sm flex-1"
              autoFocus
            />
            <button onClick={saveEdit} className="text-green-600 hover:text-green-700 p-1">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancelEdit} className="text-gray-600 hover:text-gray-700 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className={`flex-1 ${isHome ? 'font-medium' : ''}`}>
              {page.name}
              {isHome && <span className="text-xs text-gray-500 ml-1">(Required)</span>}
            </span>

            {!isLocked && !isHome && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(page, section)}
                  className="p-1 text-gray-600 hover:text-blue-600"
                  title="Edit page name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deletePage(page.id, section)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete page"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {page.type === 'main' && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Main</span>
            )}
            {page.type === 'aux' && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Aux</span>
            )}
          </>
        )}
      </div>
    );
  };

  const renderSection = (title, sectionKey, icon) => {
    const pages = sitemap[sectionKey] || [];
    const Icon = icon;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="text-xs text-gray-500">({pages.length} pages)</span>
        </div>

        <div className="space-y-1 min-h-[100px] p-2 rounded border-2 border-dashed border-gray-200">
          {pages.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, sectionKey, 0)}
              className={`py-8 text-center ${draggedItem ? 'bg-blue-50' : ''}`}
            >
              <p className="text-sm text-gray-400">Drag pages here</p>
            </div>
          ) : (
            <>
              {pages.map((page, index) => (
                <React.Fragment key={page.id}>
                  {/* Drop zone above each item */}
                  {!(sectionKey === 'navigation' && index === 0) && (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, sectionKey, index)}
                      className={`h-2 -my-1 ${
                        draggedItem && dragOverInfo?.section === sectionKey && dragOverInfo?.index === index
                          ? 'bg-blue-400 h-8'
                          : ''
                      }`}
                      onDragEnter={() => setDragOverInfo({ section: sectionKey, index })}
                      onDragLeave={() => setDragOverInfo(null)}
                    />
                  )}
                  {renderPage(page, sectionKey, index)}
                </React.Fragment>
              ))}
              {/* Drop zone at the end */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, sectionKey, pages.length)}
                className={`h-2 -my-1 ${
                  draggedItem && dragOverInfo?.section === sectionKey && dragOverInfo?.index === pages.length
                    ? 'bg-blue-400 h-8'
                    : ''
                }`}
                onDragEnter={() => setDragOverInfo({ section: sectionKey, index: pages.length })}
                onDragLeave={() => setDragOverInfo(null)}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Map className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold">{sitemap.name || 'Website'} Sitemap</h2>
              </div>
              {!isLocked && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Complete & Save
                </button>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-sm text-blue-800">
                Build your website's sitemap based on your project scope of <strong>{projectScope.main_pages} main pages</strong> and <strong>{projectScope.aux_pages} auxiliary pages</strong>.
              </p>
            </div>

            <div className="flex gap-4 mt-3">
              <div className="text-sm">
                <span className="font-medium">Main Pages:</span> {pageCount.main} / {projectScope.main_pages}
              </div>
              <div className="text-sm">
                <span className="font-medium">Auxiliary Pages:</span> {pageCount.aux} / {projectScope.aux_pages}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {renderSection('Main Navigation', 'navigation', Navigation)}
            {renderSection('Footer Links', 'footer', Link)}
          </div>

          {lastSaved && (
            <div className="mt-4 text-xs text-gray-500 text-center">
              {isSaving ? 'Saving...' : `Auto-saved ${lastSaved.toLocaleTimeString()}`}
            </div>
          )}
        </div>
      </div>

      {!isLocked && (
        <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Page Templates</h3>
          <p className="text-xs text-gray-500 mb-4">Drag templates to add pages</p>

          <div className="space-y-2">
            {pageTemplates.map((template) => {
              const Icon = template.icon;
              const isMain = template.type === 'main';
              const disabled = isMain
                ? pageCount.main >= projectScope.main_pages
                : pageCount.aux >= projectScope.aux_pages;

              return (
                <div
                  key={template.name}
                  draggable={!disabled}
                  onDragStart={(e) => !disabled && handleDragStart(e, template, 'templates')}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-3 p-2 border rounded-lg bg-white
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 cursor-move'}
                  `}
                >
                  <Icon className={`w-4 h-4 ${isMain ? 'text-blue-600' : 'text-gray-600'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-gray-500">{template.description}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    isMain ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isMain ? 'Main' : 'Aux'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders during drag operations
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.appletId === nextProps.appletId &&
    prevProps.projectId === nextProps.projectId &&
    prevProps.userId === nextProps.userId &&
    prevProps.websiteUrl === nextProps.websiteUrl &&
    JSON.stringify(prevProps.config) === JSON.stringify(nextProps.config) &&
    JSON.stringify(prevProps.projectScope) === JSON.stringify(nextProps.projectScope) &&
    JSON.stringify(prevProps.initialData) === JSON.stringify(nextProps.initialData)
  );
};

export default React.memo(SitemapBuilderV2, arePropsEqual);