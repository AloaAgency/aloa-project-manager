export function parseMarkdownToForm(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    throw new Error('Invalid input: markdown must be a non-empty string');
  }
  
  const lines = markdown.split('\n');
  const form = {
    title: '',
    description: '',
    fields: []
  };

  let currentField = null;
  let inDescription = false;
  let currentSection = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Parse title
    if (line.startsWith('# ')) {
      form.title = line.substring(2).trim();
      inDescription = true;
      i++;
      continue;
    }
    
    // Parse description
    if (inDescription && line === '') {
      inDescription = false;
      i++;
      continue;
    }
    
    if (inDescription && !line.startsWith('## ')) {
      form.description += (form.description ? ' ' : '') + line;
      i++;
      continue;
    }

    // Check for section headers
    if (line.startsWith('## Section:')) {
      // Save current field before changing sections
      if (currentField) {
        form.fields.push(currentField);
        currentField = null;
      }
      currentSection = line.substring(11).trim();
      i++;
      continue;
    }

    // Parse inline field format: - type* | name | label | placeholder
    if (line.startsWith('- ')) {
      if (currentField) {
        form.fields.push(currentField);
      }

      const fieldDef = line.substring(2).trim();
      const parts = fieldDef.split('|').map(p => p.trim());
      
      if (parts.length >= 3) {
        // Extract type and required flag
        const typeStr = parts[0];
        const required = typeStr.includes('*');
        const type = typeStr.replace('*', '').trim().toLowerCase();
        
        // Extract field name and label
        const name = parts[1];
        const label = parts[2];
        const placeholder = parts[3] || undefined;
        
        // Normalize type
        const normalizedType = type === 'multiline' ? 'textarea' : type;
        
        currentField = {
          label,
          name,
          type: normalizedType,
          required,
          placeholder,
          section: currentSection || 'General Information'
        };
        
        // Add options array for select/radio/checkbox
        if (['select', 'radio', 'checkbox'].includes(normalizedType)) {
          currentField.options = [];
          
          // Look ahead for options (indented with 2 spaces and dash)
          let j = i + 1;
          while (j < lines.length) {
            const nextLine = lines[j];
            if (nextLine.startsWith('  - ')) {
              currentField.options.push(nextLine.substring(4).trim());
              j++;
            } else if (nextLine.trim() === '') {
              // Skip empty lines
              j++;
            } else {
              // Stop if we hit a non-option line
              break;
            }
          }
          i = j - 1; // Move index to last processed line
        }
      }
      i++;
      continue;
    }
    
    // Handle simple format (## Field Name *)
    if (line.startsWith('## ') && !line.startsWith('## Section:')) {
      if (currentField) {
        form.fields.push(currentField);
      }
      
      const fieldLine = line.substring(3).trim();
      const requiredMatch = fieldLine.match(/^(.*?)\s*\*\s*$/);
      const label = requiredMatch ? requiredMatch[1].trim() : fieldLine;
      const required = !!requiredMatch;
      
      currentField = {
        label,
        name: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        required,
        type: 'text',
        section: currentSection || 'General Information'
      };
      i++;
      continue;
    }
    
    // Parse field properties for simple format
    if (currentField && line.startsWith('Type: ')) {
      const type = line.substring(6).trim().toLowerCase();
      const normalizedType = type === 'multiline' ? 'textarea' : type;
      currentField.type = normalizedType;
      
      if (['select', 'radio', 'checkbox'].includes(normalizedType)) {
        currentField.options = [];
        // Look ahead for options
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          if (nextLine.startsWith('  - ')) {
            currentField.options.push(nextLine.substring(4).trim());
            j++;
          } else if (nextLine.trim() === '') {
            j++;
          } else {
            break;
          }
        }
        i = j - 1;
      }
      i++;
      continue;
    }
    
    if (currentField && line.startsWith('Placeholder: ')) {
      currentField.placeholder = line.substring(13).trim();
      i++;
      continue;
    }
    
    if (currentField && line.startsWith('Min: ')) {
      if (!currentField.validation) currentField.validation = {};
      const value = line.substring(5).trim();
      if (currentField.type === 'number') {
        currentField.validation.min = parseInt(value);
      } else {
        currentField.validation.minLength = parseInt(value);
      }
      i++;
      continue;
    }
    
    if (currentField && line.startsWith('Max: ')) {
      if (!currentField.validation) currentField.validation = {};
      const value = line.substring(5).trim();
      if (currentField.type === 'number') {
        currentField.validation.max = parseInt(value);
      } else {
        currentField.validation.maxLength = parseInt(value);
      }
      i++;
      continue;
    }
    
    if (currentField && line.startsWith('Pattern: ')) {
      if (!currentField.validation) currentField.validation = {};
      currentField.validation.pattern = line.substring(9).trim();
      i++;
      continue;
    }
    
    i++;
  }
  
  // Add the last field if exists
  if (currentField) {
    form.fields.push(currentField);
  }
  
  // Validate form structure
  if (!form.title || form.fields.length === 0) {
    throw new Error('Invalid form structure');
  }
  
  return form;
}