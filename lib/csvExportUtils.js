export function escapeCSVValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportFormResponsesToCSV(form, responses, fileName = null) {
  if (!form || !responses || responses.length === 0) {
    return false;
  }

  // Handle both old form.fields and new form.aloa_form_fields structures
  const formFields = form.fields || form.aloa_form_fields || [];
  const headers = ['Submitted At', 'User', ...formFields.map(f => f.label || f.field_label)].map(escapeCSVValue).join(',');

  const rows = responses.map(response => {
    const submittedAt = response.submittedAt || response.created_at || response.submitted_at;
    const formattedDate = submittedAt ? new Date(submittedAt).toLocaleString() : '';

    const userName = response.user?.full_name || response.user?.email ||
                     response.user_full_name || response.user_email || 'Anonymous';

    const values = [formattedDate, userName];

    formFields.forEach(field => {
      const fieldName = field.name || field.field_name;
      let value = '';

      if (response.response_data) {
        if (response.response_data instanceof Map) {
          value = response.response_data.get(fieldName);
        } else {
          value = response.response_data[fieldName];
        }
      } else if (response.data) {
        value = response.data[fieldName];
      }

      if (Array.isArray(value)) {
        value = value.join('; ');
      }

      values.push(value || '');
    });

    return values.map(escapeCSVValue).join(',');
  });

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const defaultFileName = fileName || `${form.title || 'form'}-responses-${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', defaultFileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return true;
}

export async function fetchAndExportFormResponses(formId, formTitle = 'form') {
  try {
    const [formRes, responsesRes] = await Promise.all([
      fetch(`/api/aloa-forms/${formId}`),
      fetch(`/api/aloa-responses?form_id=${formId}`)
    ]);

    if (!formRes.ok || !responsesRes.ok) {
      console.error('Failed to fetch form or responses');
      return false;
    }

    const form = await formRes.json();
    const responsesData = await responsesRes.json();
    const responses = responsesData.responses || [];

    if (responses.length === 0) {
      console.log('No responses to export');
      return false;
    }

    // Map aloa_form_fields to fields for consistent handling
    if (form.aloa_form_fields && !form.fields) {
      form.fields = form.aloa_form_fields;
    }

    return exportFormResponsesToCSV(form, responses, `${formTitle}-responses.csv`);
  } catch (error) {
    console.error('Error exporting responses:', error);
    return false;
  }
}