'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Settings,
  Mail,
  Building,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

export default function AppSettingsPage() {
  const router = useRouter();
  const { user, isSuperAdmin, loading: userLoading } = useUser();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Define the settings schema with defaults
  const settingsSchema = [
    {
      key: 'default_notification_email',
      label: 'Default Notification Email',
      description: 'Email address for form submission notifications when no project is attached',
      type: 'email',
      default: 'info@aloa.agency',
      icon: Mail,
    },
    {
      key: 'company_name',
      label: 'Company Name',
      description: 'Company name displayed in emails and UI elements',
      type: 'text',
      default: 'Aloa Agency',
      icon: Building,
    },
    {
      key: 'support_email',
      label: 'Support Email',
      description: 'Support email address for user inquiries',
      type: 'email',
      default: 'support@aloa.agency',
      icon: Mail,
    },
  ];

  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (!isSuperAdmin) {
        router.push('/dashboard');
      } else {
        fetchSettings();
      }
    }
  }, [user?.id, userLoading, router, isSuperAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/app-settings');

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();

      // Convert array to object keyed by setting key
      const settingsObj = {};
      (data.settings || []).forEach((setting) => {
        try {
          settingsObj[setting.key] = typeof setting.value === 'string'
            ? JSON.parse(setting.value)
            : setting.value;
        } catch {
          settingsObj[setting.key] = setting.value;
        }
      });

      // Apply defaults for missing settings
      settingsSchema.forEach((schema) => {
        if (settingsObj[schema.key] === undefined) {
          settingsObj[schema.key] = schema.default;
        }
      });

      setSettings(settingsObj);
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Apply defaults if fetch fails
      const defaults = {};
      settingsSchema.forEach((schema) => {
        defaults[schema.key] = schema.default;
      });
      setSettings(defaults);
      setError('Failed to load settings. Using defaults.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    // Clear messages when user starts editing
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (key) => {
    const schema = settingsSchema.find((s) => s.key === key);
    if (!schema) return;

    // Validate email fields
    if (schema.type === 'email' && settings[key]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings[key])) {
        setError(`Invalid email format for ${schema.label}`);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/app-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: settings[key],
          description: schema.description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save setting');
      }

      setSuccess(`${schema.label} saved successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);

    try {
      for (const schema of settingsSchema) {
        // Validate email fields
        if (schema.type === 'email' && settings[schema.key]) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(settings[schema.key])) {
            throw new Error(`Invalid email format for ${schema.label}`);
          }
        }

        const response = await fetch('/api/app-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: schema.key,
            value: settings[schema.key],
            description: schema.description,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to save ${schema.label}`);
        }
      }

      setSuccess('All settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black rounded-lg">
              <Settings className="h-6 w-6 text-[#faf8f3]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">App Settings</h1>
              <p className="text-sm text-gray-500">Configure global application settings</p>
            </div>
          </div>
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure email addresses and company information used throughout the application
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {settingsSchema.map((schema) => {
              const Icon = schema.icon;
              return (
                <div key={schema.key} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor={schema.key}
                        className="block text-sm font-medium text-gray-900"
                      >
                        {schema.label}
                      </label>
                      <p className="text-sm text-gray-500 mt-1 mb-3">{schema.description}</p>
                      <div className="flex gap-3">
                        <input
                          id={schema.key}
                          type={schema.type}
                          value={settings[schema.key] || ''}
                          onChange={(e) => handleInputChange(schema.key, e.target.value)}
                          placeholder={schema.default}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                        />
                        <button
                          onClick={() => handleSave(schema.key)}
                          disabled={saving}
                          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save All Button */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-6 py-2.5 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save All Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">About App Settings</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              <strong>Default Notification Email:</strong> Used when form responses are submitted
              from public forms not attached to any project.
            </li>
            <li>
              <strong>Company Name:</strong> Displayed in email templates and various UI elements.
            </li>
            <li>
              <strong>Support Email:</strong> Shown to users who need assistance.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
