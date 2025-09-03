export function parseMarkdownToForm(markdown) {
  const lines = markdown.split('\n');
  const form = {
    title: '',
    description: '',
    fields: []
  };

  let currentField = null;
  let inDescription = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('# ')) {
      form.title = line.substring(2).trim();
      inDescription = true;
      continue;
    }
    
    if (inDescription && line === '') {
      inDescription = false;
      continue;
    }
    
    if (inDescription && !line.startsWith('## ')) {
      form.description += (form.description ? ' ' : '') + line;
      continue;
    }

    if (line.startsWith('  - ') && currentField && currentField.options !== undefined) {
      currentField.options.push(line.substring(4).trim());
      continue;
    }
    
    if (line.startsWith('## ')) {
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
        type: 'text'
      };
      continue;
    }
    
    if (currentField && line.startsWith('Type: ')) {
      const type = line.substring(6).trim().toLowerCase();
      const normalizedType = type === 'multiline' ? 'textarea' : type;
      currentField.type = normalizedType;
      
      if (['select', 'radio', 'checkbox'].includes(normalizedType)) {
        currentField.options = [];
      }
      continue;
    }
    
    if (currentField && line.startsWith('Placeholder: ')) {
      currentField.placeholder = line.substring(13).trim();
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
      continue;
    }
    
    if (currentField && line.startsWith('Pattern: ')) {
      if (!currentField.validation) currentField.validation = {};
      currentField.validation.pattern = line.substring(9).trim();
      continue;
    }
  }
  
  if (currentField) {
    form.fields.push(currentField);
  }
  
  if (!form.title || form.fields.length === 0) {
    throw new Error('Invalid form structure');
  }
  
  return form;
}