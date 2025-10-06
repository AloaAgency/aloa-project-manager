'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Mail,
  Lock,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Building
} from 'lucide-react';

export default function UsersManagementPage() {
  const router = useRouter();
  const { user, profile, isSuperAdmin, loading: userLoading } = useUser();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'client',
    project_id: ''
  });
  const [inviteMode, setInviteMode] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ESC key handler for modals
  useEscapeKey(() => {
    setShowCreateModal(false);
    setInviteMode(false);
  }, showCreateModal);

  useEscapeKey(() => {
    setShowPasswordModal(false);
    setResetPasswordUser(null);
    setNewPassword('');
    setConfirmPassword('');
  }, showPasswordModal);

  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (!isSuperAdmin) {
        router.push('/dashboard');
      } else {
        fetchUsers();
        fetchProjects();
      }
    }
  }, [user?.id, userLoading, router, isSuperAdmin]); // Only depend on user.id, not the entire user object

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/users');

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();

      setUsers(data.users || []);
    } catch (err) {

      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/aloa-projects');

      if (response.ok) {
        const data = await response.json();
         // Debug log
        setProjects(data.projects || []);
      }
    } catch (err) {

    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (inviteMode) {
        // Send invitation
        const response = await fetch('/api/auth/users/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            project_id: formData.project_id || undefined, // Don't send empty string
            custom_message: customMessage
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send invitation');
        }

        // Check if email was actually sent
        if (data.emailError) {
          setSuccess(`Invitation created for ${formData.email}. Note: Email could not be sent (${data.emailError}). Share this link manually: ${data.invitation?.invite_url}`);
        } else if (data.emailSent === false) {
          setSuccess(`Invitation created for ${formData.email}. Email notifications not configured. Share this link: ${data.invitation?.invite_url}`);
        } else {
          setSuccess(`Invitation sent to ${formData.email}`);
        }
      } else {
        // Create user directly
        const response = await fetch('/api/auth/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create user');
        }

        setSuccess(`User ${formData.email} created successfully`);
      }

      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'client',
        project_id: ''
      });
      setCustomMessage('');
      setInviteMode(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, updates })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetPasswordUser.id,
          newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(`Password reset successfully for ${resetPasswordUser.email}`);
      setShowPasswordModal(false);
      setResetPasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/auth/users?user_id=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignProject = async (userId, projectId) => {
    try {
      const response = await fetch('/api/auth/users/assign-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: userId, 
          project_id: projectId,
          role: 'client'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        // Handle "already assigned" error more gracefully
        if (data.error?.includes('already assigned')) {
          setError('This user is already assigned to the selected project');
          fetchUsers(); // Refresh to show current state
          return;
        }
        throw new Error(data.error || 'Failed to assign project');
      }

      setSuccess('Project assigned successfully');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveProject = async (userId, projectId) => {
    try {
      const response = await fetch(`/api/auth/users/assign-project?user_id=${userId}&project_id=${projectId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove project');
      }

      setSuccess('Project removed successfully');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'project_admin':
        return 'bg-purple-100 text-purple-800';
      case 'team_member':
        return 'bg-blue-100 text-blue-800';
      case 'client':
        return 'bg-green-100 text-green-800';
      case 'client_admin':
        return 'bg-emerald-100 text-emerald-800';
      case 'client_participant':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center">
        <LoadingSpinner message="Loading users" size="default" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-600 mt-1">Manage system users and permissions</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((userData) => (
                <tr key={userData.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {userData.full_name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{userData.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === userData.id ? (
                      <select
                        value={userData.role}
                        onChange={(e) => handleUpdateUser(userData.id, { role: e.target.value })}
                        className="text-sm border-gray-300 rounded-md"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="project_admin">Project Admin</option>
                        <option value="team_member">Team Member</option>
                        <option value="client">Client</option>
                        <option value="client_admin">Client Admin</option>
                        <option value="client_participant">Client Participant</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(userData.role)}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {userData.role === 'super_admin' ? 'Super Admin' :
                         userData.role === 'project_admin' ? 'Project Admin' :
                         userData.role === 'team_member' ? 'Team Member' :
                         userData.role === 'client_admin' ? 'Client Admin' :
                         userData.role === 'client_participant' ? 'Client Participant' :
                         userData.role === 'client' ? 'Client' : userData.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {['client', 'client_admin', 'client_participant'].includes(userData.role) && (
                      <div className="flex flex-wrap gap-1">
                        {userData.projects?.map(project => (
                          <span
                            key={project.id}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            {project.project_name || project.name || project.client_name}
                            {editingUser === userData.id && (
                              <button
                                onClick={() => handleRemoveProject(userData.id, project.id)}
                                className="ml-1 text-gray-400 hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        ))}
                        {editingUser === userData.id && projects.length > 0 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignProject(userData.id, e.target.value);
                                // Reset the select after selection
                                setTimeout(() => {
                                  e.target.value = '';
                                }, 100);
                              }
                            }}
                            className="text-xs border-gray-300 rounded"
                            defaultValue=""
                          >
                            <option value="" disabled>Add project...</option>
                            {projects
                              .filter(p => !userData.projects?.find(up => up.id === p.id))
                              .map(project => (
                                <option key={project.id} value={project.id}>
                                  {project.project_name || project.client_name || `Project ${project.id.substring(0, 8)}`}
                                </option>
                              ))}
                          </select>
                        )}
                        {userData.projects?.length === 0 && editingUser !== userData.id && (
                          <span className="text-xs text-gray-500">No projects assigned</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(userData.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => setEditingUser(editingUser === userData.id ? null : userData.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit user"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setResetPasswordUser(userData);
                          setShowPasswordModal(true);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Reset password"
                      >
                        <Lock className="h-4 w-4" />
                      </button>
                      {userData.id !== user.id ? ( // Prevent deleting yourself
                        <button
                          onClick={() => handleDeleteUser(userData.id, userData.email)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="inline-block text-gray-400 cursor-not-allowed" title="Cannot delete yourself">
                          <Trash2 className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {inviteMode ? 'Send User Invitation' : 'Create New User'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setInviteMode(false);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Toggle between invite and create */}
              <div className="mb-4 flex rounded-lg border border-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => setInviteMode(false)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    !inviteMode
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Create Directly
                </button>
                <button
                  type="button"
                  onClick={() => setInviteMode(true)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    inviteMode
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Send Invitation
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {!inviteMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      type="password"
                      required={!inviteMode}
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={inviteMode ? 'User will set their own password' : ''}
                    />
                  </div>
                )}

                {inviteMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Custom Message (Optional)
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Add a personal message to the invitation email..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="client">Client</option>
                    <option value="client_admin">Client Admin</option>
                    <option value="client_participant">Client Participant</option>
                    <option value="team_member">Team Member</option>
                    <option value="project_admin">Project Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {['client', 'client_admin', 'client_participant'].includes(formData.role) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Assign to Project (Optional)
                    </label>
                    {projects.length > 0 ? (
                      <select
                        value={formData.project_id}
                        onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select a project...</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>
                            {project.project_name || project.client_name || `Project ${project.id.substring(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">No projects available</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {inviteMode ? 'Send Invitation' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordModal && resetPasswordUser && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Reset Password
                </h3>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setResetPasswordUser(null);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Resetting password for: <span className="font-medium">{resetPasswordUser.email}</span>
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1 relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                      <div className="ml-2">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setResetPasswordUser(null);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newPassword || !confirmPassword}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}