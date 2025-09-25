'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  Link,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  Filter,
  Search,
  Sparkles,
  BarChart,
  Lock,
  Unlock,
  Clock,
  MessageSquare,
  FolderOpen,
  ExternalLink,
  TrendingUp
} from 'lucide-react';

function AdminFormsPageContent() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    closed: 0,
    totalResponses: 0
  });

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/aloa-forms');
      const data = await response.json();

      if (data.forms) {
        setForms(data.forms);
        calculateStats(data.forms);
      } else if (Array.isArray(data)) {
        // Handle backward compatibility
        setForms(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (formsList) => {
    const stats = {
      total: formsList.length,
      published: formsList.filter(f => f.status === 'published').length,
      draft: formsList.filter(f => f.status === 'draft').length,
      closed: formsList.filter(f => f.status === 'closed').length,
      totalResponses: formsList.reduce((sum, f) => sum + (f.response_count || 0), 0)
    };
    setStats(stats);
  };

  const deleteForm = async (formId) => {
    if (!confirm('Are you sure you want to delete this form? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/aloa-forms/by-id/${formId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchForms();
      }
    } catch (error) {

    }
  };

  const duplicateForm = async (formId) => {
    try {
      const response = await fetch(`/api/aloa-forms/by-id/${formId}/duplicate`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchForms();
      }
    } catch (error) {

    }
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          form.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || form.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'closed':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getSourceBadge = (source) => {
    if (source === 'legacy') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 border border-purple-200 ml-2">
          Legacy
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
      {/* Header */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/projects')}
                className="mr-4 hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold">Forms Management</h1>
                <p className="text-gray-300 mt-1">Create and manage all forms</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/create')}
                className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Form
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center"
              >
                <Eye className="w-5 h-5 mr-2" />
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Forms</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Published</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{stats.published}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Drafts</p>
                <p className="text-3xl font-bold mt-1 text-yellow-600">{stats.draft}</p>
              </div>
              <Edit className="w-10 h-10 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Closed</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{stats.closed}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Responses</p>
                <p className="text-3xl font-bold mt-1 text-blue-600">{stats.totalResponses}</p>
              </div>
              <BarChart className="w-10 h-10 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search forms by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <button
              onClick={() => router.push('/create')}
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 flex items-center"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              AI Form Builder
            </button>
          </div>
        </div>

        {/* Forms Grid/Table View */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">All Forms ({filteredForms.length})</h2>
          </div>

          {filteredForms.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No forms found matching your criteria' 
                  : 'No forms created yet'}
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <button
                  onClick={() => router.push('/create')}
                  className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
                >
                  Create Your First Form
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredForms.map((form) => (
                    <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {form.title}
                              </span>
                              {getSourceBadge(form.source)}
                            </div>
                            {form.description && (
                              <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                                {form.description}
                              </div>
                            )}
                            {form.projectName && (
                              <div className="flex items-center mt-1">
                                <FolderOpen className="w-3 h-3 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">{form.projectName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(form.status)}`}>
                          {form.status === 'closed' && <Lock className="w-3 h-3 mr-1" />}
                          {form.status === 'published' && <Unlock className="w-3 h-3 mr-1" />}
                          {form.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm">
                          <MessageSquare className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="font-medium text-gray-900">{form.response_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 text-gray-400 mr-1" />
                          <span>{new Date(form.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => router.push(`/edit/${form.id}`)}
                            className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                            title="Edit Form"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => window.open(`/forms/${form.urlId || form.id}`, '_blank')}
                            className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                            title="View Form"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/forms/${form.urlId || form.id}`;
                              navigator.clipboard.writeText(url);
                              const btn = event.currentTarget;
                              const originalTitle = btn.title;
                              btn.title = 'Copied!';
                              btn.classList.add('text-green-600');
                              setTimeout(() => {
                                btn.title = originalTitle;
                                btn.classList.remove('text-green-600');
                              }, 2000);
                            }}
                            className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                            title="Copy Link"
                          >
                            <Link className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/responses/${form.id}`)}
                            className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                            title="View Responses"
                          >
                            <BarChart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => duplicateForm(form.id)}
                            className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                            title="Duplicate Form"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteForm(form.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Delete Form"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <button
            onClick={() => router.push('/create')}
            className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 text-left group"
          >
            <Sparkles className="w-8 h-8 text-white mb-3" />
            <h3 className="font-bold text-lg mb-2">AI Form Builder</h3>
            <p className="text-sm text-purple-100">
              Use AI to quickly generate forms based on your requirements
            </p>
          </button>

          <button
            onClick={() => router.push('/legacy-dashboard')}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 text-left group border border-gray-100"
          >
            <FileText className="w-8 h-8 text-gray-700 mb-3" />
            <h3 className="font-bold text-lg mb-2">Legacy Dashboard</h3>
            <p className="text-sm text-gray-600">
              Access the classic forms dashboard interface
            </p>
          </button>

          <button
            onClick={() => {
              const csvContent = forms.map(f =>
                `"${f.title}","${f.status}","${f.response_count || 0}","${f.projectName || 'None'}","${new Date(f.created_at).toLocaleDateString()}"`
              ).join('\n');
              const blob = new Blob([`"Title","Status","Responses","Project","Created"\n${csvContent}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'forms-export.csv';
              a.click();
            }}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 text-left group border border-gray-100"
          >
            <Download className="w-8 h-8 text-gray-700 mb-3" />
            <h3 className="font-bold text-lg mb-2">Export Data</h3>
            <p className="text-sm text-gray-600">
              Download all forms data as CSV for reporting
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/projects')}
            className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 text-left group"
          >
            <TrendingUp className="w-8 h-8 text-white mb-3" />
            <h3 className="font-bold text-lg mb-2">View Projects</h3>
            <p className="text-sm text-blue-100">
              Manage forms within project context
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFormsPage() {
  return (
    <AuthGuard allowedRoles={['super_admin', 'project_admin', 'team_member']} redirectTo="/auth/login">
      <AdminFormsPageContent />
    </AuthGuard>
  );
}