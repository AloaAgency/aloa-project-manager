'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Map, Plus, X, ChevronRight, ChevronDown, Edit2, Trash2, Check, Home, Info, Users, Phone, ShoppingBag, FileText, Settings, Mail, Search, Menu } from 'lucide-react';

const SitemapBuilder = ({
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
  // Common page templates with type and location hints
  const mainPageTemplates = [
    { name: 'About', icon: Info, description: 'About us/company info', type: 'main', location: 'nav' },
    { name: 'Services', icon: Settings, description: 'Products or services', type: 'main', location: 'nav' },
    { name: 'Solutions', icon: FileText, description: 'How you solve problems', type: 'main', location: 'nav' },
    { name: 'Case Studies', icon: FileText, description: 'Success stories', type: 'main', location: 'nav' },
    { name: 'Resources', icon: FileText, description: 'Guides, tools, content', type: 'main', location: 'nav' },
    { name: 'Blog', icon: FileText, description: 'News and insights', type: 'main', location: 'nav' },
    { name: 'Team', icon: Users, description: 'Meet the team', type: 'main', location: 'nav' },
    { name: 'Pricing', icon: FileText, description: 'Plans and pricing', type: 'main', location: 'nav' },
  ];

  const auxiliaryPageTemplates = [
    { name: 'Contact', icon: Phone, description: 'Contact information', type: 'aux', location: 'nav' },
    { name: 'Privacy Policy', icon: FileText, description: 'Privacy policy', type: 'aux', location: 'footer' },
    { name: 'Terms & Conditions', icon: FileText, description: 'Terms of service', type: 'aux', location: 'footer' },
    { name: 'FAQ', icon: Search, description: 'Frequently asked questions', type: 'aux', location: 'footer' },
    { name: 'Sitemap', icon: Map, description: 'Site structure', type: 'aux', location: 'footer' },
    { name: 'Careers', icon: Users, description: 'Job opportunities', type: 'aux', location: 'footer' },
    { name: 'Support', icon: Settings, description: 'Customer support', type: 'aux', location: 'footer' },
  ];

  const [sitemap, setSitemap] = useState(() => {
    if (initialData) {
      // Update the root name with website URL if available
      return {
        ...initialData,
        name: websiteUrl || initialData.name || 'Website'
      };
    }
    return {
      name: websiteUrl || 'Website',
      type: 'root',
      children: [
        { id: '1', name: 'Home', type: 'main', children: [] }
      ]
    };
  });

  const [selectedNode, setSelectedNode] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [editName, setEditName] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
  const [pageCount, setPageCount] = useState({ main: 1, aux: 0 });
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedNode, setDraggedNode] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before', 'after', or 'inside'

  // Update root name when websiteUrl changes
  useEffect(() => {
    if (websiteUrl) {
      setSitemap(prev => ({
        ...prev,
        name: websiteUrl
      }));
    }
  }, [websiteUrl]);

  // Auto-save functionality
  const autoSave = useCallback(async (data) => {
    if (isLocked || !onAutoSave) return;

    setIsSaving(true);
    try {
      await onAutoSave(data);
      setLastSaved(new Date());
    } catch (error) {

    } finally {
      setIsSaving(false);
    }
  }, [isLocked, onAutoSave]);

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sitemap && sitemap !== initialData) {
        autoSave(sitemap);
      }
    }, 2000); // Auto-save after 2 seconds of no changes

    return () => clearTimeout(timer);
  }, [sitemap, autoSave, initialData]);

  useEffect(() => {
    // Count pages whenever sitemap changes
    const countPages = (node) => {
      let main = 0;
      let aux = 0;

      const traverse = (n) => {
        if (n.type === 'main') {
          main++;
        } else if (n.type === 'aux') {
          aux++;
        }

        if (n.children) {
          n.children.forEach(child => traverse(child));
        }
      };

      if (sitemap.children) {
        sitemap.children.forEach(child => traverse(child));
      }

      return { main, aux };
    };

    setPageCount(countPages(sitemap));
  }, [sitemap]);

  const toggleExpand = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const addPage = (parentNode, template = null) => {
    if (isLocked) return;

    const mainPagesLeft = projectScope.main_pages - pageCount.main;
    const auxPagesLeft = projectScope.aux_pages - pageCount.aux;

    // Determine page type based on template or availability
    let pageType = 'main';
    if (template?.type === 'aux') {
      pageType = 'aux';
      if (auxPagesLeft <= 0) {
        alert('You have reached the maximum number of auxiliary pages in your plan.');
        return;
      }
    } else if (template?.type === 'main' || !template) {
      pageType = 'main';
      if (mainPagesLeft <= 0) {
        // If no main pages left but aux pages available, suggest aux
        if (auxPagesLeft > 0) {
          pageType = 'aux';
        } else {
          alert('You have reached the maximum number of pages in your plan.');
          return;
        }
      }
    }

    const newPage = {
      id: Date.now().toString(),
      name: template?.name || 'New Page',
      type: pageType,
      location: template?.location || (pageType === 'aux' && ['Privacy Policy', 'Terms & Conditions', 'FAQ', 'Sitemap', 'Careers', 'Support'].includes(template?.name) ? 'footer' : 'nav'),
      children: []
    };

    const updateNode = (node) => {
      if (node === parentNode) {
        return { ...node, children: [...(node.children || []), newPage] };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateNode) };
      }
      return node;
    };

    setSitemap(updateNode(sitemap));
    setExpandedNodes(new Set([...expandedNodes, parentNode.id || 'root']));
  };

  const deletePage = (targetNode) => {
    if (isLocked || targetNode.id === '1' || targetNode.name === 'Home') return;

    const deleteNode = (node) => {
      if (node.children) {
        return {
          ...node,
          children: node.children.filter(child => child.id !== targetNode.id).map(deleteNode)
        };
      }
      return node;
    };

    setSitemap(deleteNode(sitemap));
    setSelectedNode(null);
  };

  const startEdit = (node) => {
    if (isLocked || node.type === 'root' || node.id === '1') return;
    setEditingNode(node);
    setEditName(node.name);
  };

  const saveEdit = () => {
    if (!editingNode || isLocked) return;

    const updateNodeName = (node) => {
      if (node.id === editingNode.id) {
        return { ...node, name: editName };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateNodeName) };
      }
      return node;
    };

    setSitemap(updateNodeName(sitemap));
    setEditingNode(null);
    setEditName('');
  };

  const handleSave = () => {

    if (isLocked) return;
    onSave(sitemap);
  };

  const removeNodeFromTree = (tree, nodeId) => {
    if (tree.children) {
      tree.children = tree.children.filter(child => child.id !== nodeId);
      tree.children.forEach(child => removeNodeFromTree(child, nodeId));
    }
    return tree;
  };

  const findNodeById = (tree, nodeId) => {
    if (tree.id === nodeId) return tree;
    if (tree.children) {
      for (let child of tree.children) {
        const found = findNodeById(child, nodeId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleDrop = (e, targetNode, position) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedNode || draggedNode.id === targetNode.id) {
      setDropTarget(null);
      setDropPosition(null);
      return;
    }

    // Don't allow dropping a parent into its own child
    const isDescendant = (parent, childId) => {
      if (parent.id === childId) return true;
      if (parent.children) {
        return parent.children.some(child => isDescendant(child, childId));
      }
      return false;
    };

    if (isDescendant(draggedNode, targetNode.id)) {
      setDropTarget(null);
      setDropPosition(null);
      return;
    }

    const newSitemap = JSON.parse(JSON.stringify(sitemap));
    const nodeToMove = findNodeById(newSitemap, draggedNode.id);

    // Remove node from its current position
    removeNodeFromTree(newSitemap, draggedNode.id);

    // Add node to new position
    if (position === 'inside') {
      // Drop inside - make it a child
      const target = findNodeById(newSitemap, targetNode.id || 'root');
      if (!target.children) target.children = [];
      target.children.push(nodeToMove);
      setExpandedNodes(prev => new Set([...prev, targetNode.id || 'root']));
    } else {
      // Drop before or after - sibling placement
      const parent = findParentOfNode(newSitemap, targetNode.id);
      if (parent) {
        const targetIndex = parent.children.findIndex(child => child.id === targetNode.id);
        if (position === 'before') {
          parent.children.splice(targetIndex, 0, nodeToMove);
        } else {
          parent.children.splice(targetIndex + 1, 0, nodeToMove);
        }
      }
    }

    setSitemap(newSitemap);
    setDropTarget(null);
    setDropPosition(null);
  };

  const findParentOfNode = (tree, nodeId, parent = null) => {
    if (tree.children) {
      for (let child of tree.children) {
        if (child.id === nodeId) return tree;
        const found = findParentOfNode(child, nodeId, tree);
        if (found) return found;
      }
    }
    return null;
  };

  const renderNode = (node, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id || 'root');
    const hasChildren = node.children && node.children.length > 0;
    const isRoot = node.type === 'root';
    const isHome = node.id === '1' || node.name === 'Home'; // Home page is special
    const isDragging = draggedNode?.id === node.id;

    return (
      <div key={node.id || 'root'} className={`${depth > 0 ? 'ml-6' : ''}`}>
        {/* Drop zone - before */}
        {!isRoot && !isHome && (
          <div
            className={`h-2 -mt-1 mb-1 rounded transition-all ${
              dropTarget?.id === node.id && dropPosition === 'before'
                ? 'bg-blue-400 opacity-50'
                : draggedNode && !isDragging ? 'hover:bg-gray-200' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(node);
              setDropPosition('before');
            }}
            onDragLeave={() => {
              if (dropTarget?.id === node.id && dropPosition === 'before') {
                setDropTarget(null);
                setDropPosition(null);
              }
            }}
            onDrop={(e) => handleDrop(e, node, 'before')}
          />
        )}

        <div
          className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 ${
            !isRoot && !isHome ? 'cursor-move' : 'cursor-pointer'
          } ${
            isDragging ? 'opacity-50' : ''
          } ${
            selectedNode?.id === node.id ? 'bg-purple-50 border border-purple-300' : ''
          } ${
            dropTarget?.id === node.id && dropPosition === 'inside'
              ? 'ring-2 ring-blue-400 bg-blue-50'
              : ''
          }`}
          onClick={() => {
            if (!isRoot && !editingNode) {
              setSelectedNode(node);
            }
          }}
          draggable={!isRoot && !isHome && !isLocked && !editingNode}
          onDragStart={(e) => {
            if (isRoot || isHome || isLocked || editingNode) return;
            e.stopPropagation();
            setDraggedNode(node);
          }}
          onDragEnd={() => {
            setDraggedNode(null);
            setDropTarget(null);
            setDropPosition(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isRoot && draggedNode && draggedNode.id !== node.id) {
              setDropTarget(node);
              setDropPosition('inside');
            }
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (dropTarget?.id === node.id && dropPosition === 'inside') {
              setDropTarget(null);
              setDropPosition(null);
            }
          }}
          onDrop={(e) => {
            if (!isRoot) {
              handleDrop(e, node, 'inside');
            }
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id || 'root');
              }}
              className="p-1"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          {/* Drag handle for non-root and non-home nodes */}
          {!isRoot && !isHome && !isLocked && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
              </svg>
            </div>
          )}

          {isRoot ? (
            <Home className="w-4 h-4 text-purple-600" />
          ) : isHome ? (
            <Home className="w-4 h-4 text-blue-600" />
          ) : (
            <FileText className={`w-4 h-4 ${node.type === 'main' ? 'text-blue-600' : 'text-gray-500'}`} />
          )}

          {editingNode?.id === node.id && !isRoot ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                    setEditingNode(null);
                    setEditName('');
                  }
                }}
                className="px-2 py-1 border rounded"
                autoFocus
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  saveEdit();
                }}
                className="text-green-600 hover:text-green-700"
                type="button"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingNode(null);
                  setEditName('');
                }}
                className="text-gray-600 hover:text-gray-700"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span className={`${isRoot ? 'font-bold' : ''} ${isHome ? 'font-medium' : ''}`}>
                {node.name}
                {isHome && <span className="text-xs text-gray-500 ml-1">(Required)</span>}
              </span>
              {node.type === 'main' && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Main</span>}
              {node.type === 'aux' && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Auxiliary</span>}
              {node.location === 'nav' && !isRoot && !isHome && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded ml-1" title="Appears in main navigation">
                  📍 Nav
                </span>
              )}
              {node.location === 'footer' && (
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded ml-1" title="Appears in footer">
                  📍 Footer
                </span>
              )}
            </>
          )}

          {!isRoot && !isHome && !isLocked && (!editingNode || editingNode.id !== node.id) && (
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(node);
                }}
                className="p-1 text-gray-600 hover:text-blue-600"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePage(node);
                }}
                className="p-1 text-gray-600 hover:text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Drop zone - after (for all non-root items) */}
        {!isRoot && (
          <div
            className={`h-2 -mb-1 mt-1 rounded transition-all ${
              dropTarget?.id === node.id && dropPosition === 'after'
                ? 'bg-blue-400 opacity-50'
                : draggedNode && !isDragging ? 'hover:bg-gray-200' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(node);
              setDropPosition('after');
            }}
            onDragLeave={() => {
              if (dropTarget?.id === node.id && dropPosition === 'after') {
                setDropTarget(null);
                setDropPosition(null);
              }
            }}
            onDrop={(e) => handleDrop(e, node, 'after')}
          />
        )}

        {isExpanded && hasChildren && (
          <div className="mt-1">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Sitemap Builder</h3>
            {isSaving && (
              <span className="text-sm text-gray-500 italic">Saving...</span>
            )}
            {!isSaving && lastSaved && (
              <span className="text-sm text-gray-500">
                Auto-saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
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

        {config.instructions && (
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-600">{config.instructions}</p>
            <p className="text-sm text-gray-500 italic">
              You can edit the name of any page by clicking the pencil icon. The pages on the right are templates/example pages only.
            </p>
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span>Main Pages: {pageCount.main}/{projectScope.main_pages}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>Auxiliary Pages: {pageCount.aux}/{projectScope.aux_pages}</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sitemap Tree */}
          <div className="lg:col-span-2">
            <div className="border rounded-lg p-4 min-h-[400px]">
              <div className="group">
                {renderNode(sitemap)}
              </div>

              {!isLocked && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => addPage(selectedNode || sitemap, { type: 'main', name: 'New Page' })}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={pageCount.main >= projectScope.main_pages}
                  >
                    <Plus className="w-4 h-4" />
                    + Add Main Page {selectedNode && selectedNode.type !== 'root' ? `to ${selectedNode.name}` : ''}
                  </button>
                  <button
                    onClick={() => addPage(selectedNode || sitemap, { type: 'aux', name: 'New Auxiliary Page' })}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={pageCount.aux >= projectScope.aux_pages}
                  >
                    <Plus className="w-4 h-4" />
                    + Add Auxiliary Page {selectedNode && selectedNode.type !== 'root' ? `to ${selectedNode.name}` : ''}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Page Templates */}
          {!isLocked && (
            <div className="space-y-4">
              {/* Main Pages Section */}
              <div>
                <h4 className="font-medium mb-2 text-blue-900">Main Pages</h4>
                <p className="text-xs text-gray-500 mb-3">Core content pages for your website</p>
                <div className="space-y-2">
                  {mainPageTemplates.map((template) => {
                    const Icon = template.icon;
                    const disabled = pageCount.main >= projectScope.main_pages;
                    return (
                      <button
                        key={template.name}
                        onClick={() => addPage(selectedNode || sitemap, template)}
                        className={`w-full flex items-center gap-3 p-2 border rounded-lg text-left transition-colors ${
                          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-blue-50 hover:border-blue-300'
                        }`}
                        disabled={disabled}
                      >
                        <Icon className="w-4 h-4 text-blue-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{template.name}</p>
                            {template.location === 'nav' && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                Nav
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{template.description}</p>
                        </div>
                        {!disabled && <Plus className="w-4 h-4 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auxiliary Pages Section */}
              <div>
                <h4 className="font-medium mb-2 text-gray-700">Auxiliary Pages</h4>
                <p className="text-xs text-gray-500 mb-3">Supporting pages (legal, contact, etc.)</p>
                <div className="space-y-2">
                  {auxiliaryPageTemplates.map((template) => {
                    const Icon = template.icon;
                    const disabled = pageCount.aux >= projectScope.aux_pages;
                    return (
                      <button
                        key={template.name}
                        onClick={() => addPage(selectedNode || sitemap, template)}
                        className={`w-full flex items-center gap-3 p-2 border rounded-lg text-left transition-colors ${
                          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'
                        }`}
                        disabled={disabled}
                      >
                        <Icon className="w-4 h-4 text-gray-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{template.name}</p>
                            {template.location === 'nav' && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                Nav
                              </span>
                            )}
                            {template.location === 'footer' && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                Footer
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{template.description}</p>
                        </div>
                        {!disabled && <Plus className="w-4 h-4 text-gray-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {isLocked && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              This sitemap is locked and cannot be edited at this time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SitemapBuilder;