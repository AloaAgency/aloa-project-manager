/**
 * Parse markdown content to form structure
 * 
 * Format:
 * # Form Title
 * Description text (optional)
 * 
 * ## Section: Section Name
 * Section description (optional)
 * 
 * - type* | field_name | Label Text
 *   - Option 1 (for select/radio/checkbox)
 *   - Option 2
 * 
 * Supported types: text, textarea, email, number, date, select, radio, checkbox
 * Add * after type to make field required
 */

export function parseMarkdown(markdown) {
  const lines = markdown.trim().split('\n');
  const formData = {
    title: '',
    description: '',
    sections: []
  };
  
  let currentSection = null;
  let currentField = null;
  let inDescription = false;
  let descriptionLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines but preserve currentField
    if (!trimmedLine) {
      if (inDescription && descriptionLines.length > 0) {
        inDescription = false;
        if (!formData.title) {
          formData.description = descriptionLines.join('\n').trim();
        } else if (currentSection) {
          currentSection.description = descriptionLines.join('\n').trim();
        }
        descriptionLines = [];
      }
      // Don't reset currentField here - we need it for options
      continue;
    }
    
    // Check for option lines FIRST (before other conditions)
    // Options for select/radio/checkbox (indented with - Option)
    if (line.startsWith('  - ') && currentField && currentField.options !== undefined) {
      currentField.options.push(line.substring(4).trim());
    }
    // Form title (# Title)
    else if (trimmedLine.startsWith('# ')) {
      formData.title = trimmedLine.substring(2).trim();
      inDescription = true;
      descriptionLines = [];
      currentSection = null;
      currentField = null;
    }
    // Section header (## Section: Name)
    else if (trimmedLine.startsWith('## ')) {
      if (inDescription && descriptionLines.length > 0) {
        if (!currentSection) {
          formData.description = descriptionLines.join('\n').trim();
        } else {
          currentSection.description = descriptionLines.join('\n').trim();
        }
      }
      
      const sectionText = trimmedLine.substring(3).trim();
      const sectionTitle = sectionText.startsWith('Section:') 
        ? sectionText.substring(8).trim()
        : sectionText;
        
      currentSection = {
        title: sectionTitle,
        description: '',
        fields: []
      };
      formData.sections.push(currentSection);
      currentField = null;  // Reset field when starting new section
      inDescription = true;
      descriptionLines = [];
    }
    // Field definition (- type | name | label)
    else if (trimmedLine.startsWith('- ') && currentSection) {
      // Save any pending description
      if (inDescription && descriptionLines.length > 0) {
        currentSection.description = descriptionLines.join('\n').trim();
        descriptionLines = [];
        inDescription = false;
      }
      
      const fieldLine = trimmedLine.substring(2).trim();
      const parts = fieldLine.split('|').map(p => p.trim());
      
      if (parts.length >= 3) {
        const typeInfo = parts[0];
        const required = typeInfo.includes('*');
        const type = typeInfo.replace('*', '').trim();
        
        // Validate and normalize the field type
        const validTypes = ['text', 'textarea', 'email', 'number', 'date', 'select', 'radio', 'checkbox'];
        const normalizedType = validTypes.includes(type) ? type : 'text';
        
        currentField = {
          type: normalizedType,
          name: parts[1],
          label: parts[2],
          required: required
        };
        
        // Add placeholder if provided (4th part)
        if (parts[3]) {
          currentField.placeholder = parts[3];
        }
        
        // Initialize options array for select/radio/checkbox
        if (['select', 'radio', 'checkbox'].includes(normalizedType)) {
          currentField.options = [];
        }
        
        currentSection.fields.push(currentField);
      }
    }
    // Description lines
    else if (inDescription) {
      descriptionLines.push(trimmedLine);
    }
  }
  
  // Handle any remaining description
  if (inDescription && descriptionLines.length > 0) {
    if (!currentSection) {
      formData.description = descriptionLines.join('\n').trim();
    } else {
      currentSection.description = descriptionLines.join('\n').trim();
    }
  }
  
  return formData;
}

/**
 * Validate parsed form structure
 */
export function validateFormStructure(formData) {
  const errors = [];
  
  if (!formData.title) {
    errors.push('Form must have a title');
  }
  
  if (!formData.sections || formData.sections.length === 0) {
    errors.push('Form must have at least one section');
  }
  
  formData.sections?.forEach((section, sIdx) => {
    if (!section.title) {
      errors.push(`Section ${sIdx + 1} must have a title`);
    }
    
    if (!section.fields || section.fields.length === 0) {
      errors.push(`Section "${section.title}" must have at least one field`);
    }
    
    section.fields?.forEach((field, fIdx) => {
      if (!field.type) {
        errors.push(`Field ${fIdx + 1} in section "${section.title}" must have a type`);
      }
      
      if (!field.name) {
        errors.push(`Field ${fIdx + 1} in section "${section.title}" must have a name`);
      }
      
      if (!field.label) {
        errors.push(`Field ${fIdx + 1} in section "${section.title}" must have a label`);
      }
      
      if (['select', 'radio', 'checkbox'].includes(field.type) && 
          (!field.options || field.options.length === 0)) {
        errors.push(`Field "${field.label}" must have at least one option`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}