'use client';

import { useState, useEffect } from 'react';
import { X, User, Calendar, FileText, CheckCircle, Download } from 'lucide-react';

export default function FormResponseModal({ isOpen, onClose, formId, userId, userName, formName }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && formId && userId) {
      fetchResponse();
    }
  }, [isOpen, formId, userId]);

  const fetchResponse = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the form response for this specific user
      const responseRes = await fetch(`/api/aloa-responses?form_id=${formId}&user_id=${userId}`);
      if (!responseRes.ok) throw new Error('Failed to fetch response');

      const responseData = await responseRes.json();

      // The API returns { responses: [...] } format
      if (responseData.responses && responseData.responses.length > 0) {
        const userResponse = responseData.responses[0];
        // Set response with proper data structure
        setResponse({
          ...userResponse,
          created_at: userResponse.submittedAt,
          data: userResponse.data || userResponse.response_data || {}
        });

        // Fetch form fields to display labels
        const formRes = await fetch(`/api/aloa-forms/${formId}`);
        if (formRes.ok) {
          const formData = await formRes.json();
          setFormFields(formData.fields || []);
        }
      } else {
        setError('No response found for this user');
      }
    } catch (error) {

      setError('Failed to load response');
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (fieldName) => {
    const field = formFields.find(f => f.field_name === fieldName);
    return field?.field_label || fieldName;
  };

  const formatFieldValue = (value) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value === null || value === undefined || value === '') {
      return 'Not provided';
    }
    return value;
  };

  const exportToCSV = () => {
    if (!response || !response.data) return;

    // Prepare CSV content
    const headers = ['Field', 'Value'];
    const rows = [];

    // Add metadata rows
    rows.push(['User', userName || 'Unknown User']);
    rows.push(['Form', formName || 'Form']);
    rows.push(['Submitted', response.created_at ? new Date(response.created_at).toLocaleString() : 'Unknown date']);
    rows.push(['', '']); // Empty row for separation

    // Add form field data
    Object.entries(response.data).forEach(([key, value]) => {
      const fieldLabel = getFieldLabel(key);
      const formattedValue = String(formatFieldValue(value)); // Convert to string
      // Escape values that contain commas or quotes
      const escapedValue = formattedValue.includes(',') || formattedValue.includes('"')
        ? `"${formattedValue.replace(/"/g, '""')}"`
        : formattedValue;
      rows.push([fieldLabel, escapedValue]);
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells that contain commas or quotes
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Format filename with user name and date
    const sanitizedUserName = (userName || 'user').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedFormName = (formName || 'form').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedFormName}_${sanitizedUserName}_${date}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Form Response
                </h3>
                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {userName || 'Unknown User'}
                  </div>
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-1" />
                    {formName || 'Form'}
                  </div>
                  {response?.created_at && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(response.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-4">
              {loading ? (
                <div className="py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-gray-600">Loading response...</p>
                </div>
              ) : error ? (
                <div className="py-8 text-center">
                  <p className="text-red-600">{error}</p>
                </div>
              ) : response ? (
                <div className="space-y-4">
                  {response.data && Object.entries(response.data).map(([key, value], index) => (
                    <div key={index} className="border-b pb-3 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {getFieldLabel(key)}
                          </label>
                          <div className="text-gray-900 whitespace-pre-wrap">
                            {formatFieldValue(value)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Completion Status */}
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <div>
                        <p className="font-medium text-green-800">Response Submitted</p>
                        <p className="text-sm text-green-700">
                          Submitted on {response.created_at ? new Date(response.created_at).toLocaleString() : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No response data available
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
            {response && response.data && (
              <button
                type="button"
                onClick={exportToCSV}
                className="mt-3 w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}