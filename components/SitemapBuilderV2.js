'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Map, Plus, X, ChevronRight, ChevronDown, Edit2, Trash2, Check, Home, Info, Users, Phone, ShoppingBag, FileText, Settings, Mail, Search, Menu, Navigation, Link } from 'lucide-react';

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
    console.log('Initializing sitemap with data:', initialData);

    if (initialData) {
      // Handle old format (with children) and new format (with navigation/footer)
      if (initialData.navigation || initialData.footer) {
        console.log('Loading saved sitemap data:', initialData);
        return {
          ...initialData,
          name: websiteUrl || initialData.name || 'Website'
        };
      } else if (initialData.children) {
        // Convert old format to new format
        console.log('Converting old format to new format');
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

    console.log('No initial data, creating default sitemap');
    return {
      name: websiteUrl || 'Website',
      navigation: [
        { id: '1', name: 'Home', type: 'main', children: [] }
      ],
      footer: []
    };
  });

  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [pageCount, setPageCount] = useState({ main: 1, aux: 0 });
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [editName, setEditName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const justDraggedRef = useRef(false);
  const isProcessingDrop = useRef(false);

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

  // Auto-save with debounce
  useEffect(() => {
    if (!onAutoSave || isLocked) return;

    // Don't save on initial mount
    if (sitemap === initialData) return;

    console.log('Auto-save triggered, sitemap changed:', sitemap);

    const timer = setTimeout(() => {
      console.log('Auto-saving sitemap...');
      setIsSaving(true);

      // Call onAutoSave and handle any errors
      try {
        onAutoSave(sitemap);
        setLastSaved(new Date());
        console.log('Auto-save successful');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }

      setTimeout(() => setIsSaving(false), 1000);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sitemap, onAutoSave, isLocked]);

  const handleDragStart = (e, item, fromSection) => {
    // Prevent dragging Home page
    if (isLocked || (item.name === 'Home' || item.id === '1')) return;
    setDraggedItem({ ...item, fromSection });
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, section, index = null) => {
    e.preventDefault();
    if (!draggedItem || isLocked) return;

    // Don't show drop indicator above Home in navigation
    if (section === 'navigation' && index === 0) {
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(section);
    setDragOverIndex(index);
  };

  const handleDrop = (e, toSection, toIndex = null) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent duplicate processing
    if (isProcessingDrop.current) return;
    if (!draggedItem || isLocked) return;

    isProcessingDrop.current = true;

    // Prevent dropping above Home in navigation
    if (toSection === 'navigation' && toIndex === 0) {
      setDraggedItem(null);
      setDragOverSection(null);
      setDragOverIndex(null);
      isProcessingDrop.current = false;
      return;
    }

    const newSitemap = { ...sitemap };

    // If dragging from templates, create a new page
    if (draggedItem.fromSection === 'templates') {
      // Create more unique ID to prevent duplicates
      const newPage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: draggedItem.name,
        type: draggedItem.type,
        children: []
      };

      // Check if we have room for this page type
      const isMain = draggedItem.type === 'main';
      const limit = isMain ? projectScope.main_pages : projectScope.aux_pages;
      const current = isMain ? pageCount.main : pageCount.aux;

      if (current >= limit) {
        alert(`You have reached the maximum number of ${isMain ? 'main' : 'auxiliary'} pages in your plan.`);
        setDraggedItem(null);
        setDragOverSection(null);
        setDragOverIndex(null);
        return;
      }

      // Add to target section
      const targetArray = toSection === 'navigation' ? newSitemap.navigation : newSitemap.footer;
      if (toIndex !== null && toIndex !== undefined) {
        targetArray.splice(toIndex, 0, newPage);
      } else {
        targetArray.push(newPage);
      }
    } else {
      // Remove from original section (for existing pages)
      if (draggedItem.fromSection === 'navigation') {
        newSitemap.navigation = newSitemap.navigation.filter(item => item.id !== draggedItem.id);
      } else {
        newSitemap.footer = newSitemap.footer.filter(item => item.id !== draggedItem.id);
      }

      // Add to new section
      const targetArray = toSection === 'navigation' ? newSitemap.navigation : newSitemap.footer;
      if (toIndex !== null && toIndex !== undefined) {
        targetArray.splice(toIndex, 0, draggedItem);
      } else {
        targetArray.push(draggedItem);
      }
    }

    setSitemap(newSitemap);
    setDraggedItem(null);
    setDragOverSection(null);
    setDragOverIndex(null);

    // Reset processing flag after a delay
    setTimeout(() => {
      isProcessingDrop.current = false;
    }, 100);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverSection(null);
    setDragOverIndex(null);
    // Set flag to prevent click from firing
    justDraggedRef.current = true;
    setTimeout(() => {
      setIsDragging(false);
      justDraggedRef.current = false;
    }, 200);
  };

  const addPage = (template, section) => {
    if (isLocked) return;

    const pageType = template.type || 'main';
    const limit = pageType === 'main' ? projectScope.main_pages : projectScope.aux_pages;
    const current = pageType === 'main' ? pageCount.main : pageCount.aux;

    if (current >= limit) {
      alert(`You have reached the maximum number of ${pageType === 'main' ? 'main' : 'auxiliary'} pages in your plan.`);
      return;
    }

    const newPage = {
      id: Date.now().toString(),
      name: template.name,
      type: pageType,
      children: []
    };

    setSitemap(prev => ({
      ...prev,
      [section]: [...prev[section], newPage]
    }));
  };

  const deletePage = (pageId, section) => {
    // Only prevent deletion of Home page (id '1')
    console.log('Attempting to delete page with ID:', pageId, 'Name:', sitemap[section].find(p => p.id === pageId)?.name);
    if (isLocked || pageId === '1') {
      console.log('Delete blocked - isLocked:', isLocked, 'pageId:', pageId);
      return;
    }

    setSitemap(prev => ({
      ...prev,
      [section]: prev[section].filter(page => page.id !== pageId)
    }));
  };

  const startEdit = (page, section) => {
    // Prevent editing Home page
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

  const handleSave = () => {
    if (isLocked) {
      console.log('Cannot save - sitemap is locked');
      return;
    }

    console.log('handleSave called');
    console.log('Saving sitemap:', sitemap);
    console.log('onSave function exists:', typeof onSave === 'function');

    if (typeof onSave === 'function') {
      onSave(sitemap);
    } else {
      console.error('onSave prop is not a function!');
    }
  };

  const renderPage = (page, section, index) => {
    const isHome = page.name === 'Home' || page.id === '1';

    return (
      <div
        key={page.id}
        draggable={!isLocked && !isHome}
        onDragStart={(e) => handleDragStart(e, page, section)}
        onDragOver={(e) => handleDragOver(e, section, index)}
        onDrop={(e) => {
          e.stopPropagation();
          handleDrop(e, section, index);
        }}
        onDragEnd={handleDragEnd}
        className={`
          group flex items-center gap-2 p-2 rounded-lg border transition-all
          ${isHome ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'}
          ${draggedItem?.id === page.id ? 'opacity-50' : ''}
          ${dragOverSection === section && dragOverIndex === index ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
          ${!isLocked && !isHome ? 'cursor-move' : ''}
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
          <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
              className="px-2 py-1 border rounded text-sm flex-1"
              autoFocus
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                saveEdit();
              }}
              className="text-green-600 hover:text-green-700 p-1"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelEdit();
              }}
              className="text-gray-600 hover:text-gray-700 p-1"
            >
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
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(page, section);
                  }}
                  className="p-1 text-gray-600 hover:text-blue-600"
                  title="Edit page name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePage(page.id, section);
                  }}
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

        <div
          onDragOver={(e) => handleDragOver(e, sectionKey)}
          onDrop={(e) => {
            e.stopPropagation();
            handleDrop(e, sectionKey, pages.length);
          }}
          className={`
            space-y-2 min-h-[100px] p-2 rounded border-2 border-dashed
            ${dragOverSection === sectionKey && dragOverIndex === null ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
          `}
        >
          {pages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Drag pages here or add from templates
            </p>
          ) : (
            pages.map((page, index) => renderPage(page, sectionKey, index))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Map className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold">{sitemap.name || 'Website'} Sitemap</h2>
              </div>
              {!isLocked && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Complete & Save
                </button>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-sm text-blue-800">
                Build your website's sitemap based on your project scope of <strong>{projectScope.main_pages} main pages</strong> and <strong>{projectScope.aux_pages} auxiliary pages</strong>.
              </p>
              <p className="text-sm text-blue-800">
                <strong>Main pages</strong> are your core content pages (About, Services, Blog, etc.).
                <strong>Auxiliary pages</strong> are supporting pages (Contact, Privacy Policy, FAQ, etc.).
              </p>
              <p className="text-sm text-blue-800">
                Organize pages by dragging them between Main Navigation and Footer sections.
                Pages in <strong>Main Navigation</strong> will appear in your site's primary menu, while <strong>Footer</strong> pages will be links at the bottom of your site.
              </p>
            </div>

            {/* Page Count */}
            <div className="flex gap-4 mt-3">
              <div className="text-sm">
                <span className="font-medium">Main Pages:</span> {pageCount.main} / {projectScope.main_pages}
              </div>
              <div className="text-sm">
                <span className="font-medium">Auxiliary Pages:</span> {pageCount.aux} / {projectScope.aux_pages}
              </div>
            </div>
          </div>

          {/* Two Sections */}
          <div className="space-y-6">
            {renderSection('Main Navigation', 'navigation', Navigation)}
            {renderSection('Footer Links', 'footer', Link)}
          </div>

          {/* Save Status */}
          {lastSaved && (
            <div className="mt-4 text-xs text-gray-500 text-center">
              {isSaving ? 'Saving...' : `Auto-saved ${lastSaved.toLocaleTimeString()}`}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar with Templates */}
      {!isLocked && (
        <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Page Templates</h3>
          <p className="text-xs text-gray-500 mb-4">
            Drag templates to Main Navigation or Footer Links
          </p>

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
                  onDragStart={(e) => {
                    if (disabled) return;
                    e.stopPropagation();
                    const tempPage = {
                      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      name: template.name,
                      type: template.type,
                      children: [],
                      isTemplate: true
                    };
                    handleDragStart(e, tempPage, 'templates');
                  }}
                  onDragEnd={handleDragEnd}
                >
                  <div
                    className={`
                      w-full flex items-center gap-3 p-2 border rounded-lg text-left transition-colors bg-white
                      ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-blue-50 hover:border-blue-300 cursor-move'}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isMain ? 'text-blue-600' : 'text-gray-600'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{template.name}</p>
                        {isMain ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Main</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Aux</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{template.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SitemapBuilderV2;