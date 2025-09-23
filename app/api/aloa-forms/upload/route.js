import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

function parseMarkdown(markdown) {
  const lines = markdown.split('\n');
  const form = {
    title: '',
    description: '',
    fields: []
  };

  let currentSection = 'General Information';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      form.title = trimmed.substring(2).trim();
      // Check if next line is a description (not starting with # or ## or -)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.startsWith('#') && !nextLine.startsWith('-') && !nextLine.startsWith('  -')) {
          form.description = nextLine;
          i++; // Skip the description line
        }
      }
    } else if (trimmed.startsWith('> ')) {
      form.description = trimmed.substring(2).trim();
    } else if (trimmed.startsWith('## ')) {
      // Handle both "## Section: Name" and "## Name" formats
      if (trimmed.startsWith('## Section: ')) {
        currentSection = trimmed.substring(12).trim();
      } else {
        currentSection = trimmed.substring(3).trim();
      }
    } else if (trimmed.startsWith('- ')) {
      // Format: "- type* | field_id | Label | placeholder" - Manual markdown format
      // Split by pipe first to handle properly
      const parts = trimmed.substring(2).split('|').map(p => p.trim());

      if (parts.length >= 3) {
        const type = parts[0];
        const fieldId = parts[1];
        const label = parts[2];
        const placeholder = parts[3] || '';

        const isRequired = type.includes('*');
        const fieldType = type.replace('*', '').trim();

        const field = {
          type: fieldType,
          name: fieldId,
          label: label,
          required: isRequired,
          section: currentSection,
          position: form.fields.length,
          placeholder: placeholder,
          validation: { section: currentSection }
        };

        // Collect options for select/radio/checkbox fields
        const options = [];
        for (let j = i + 1; j < lines.length; j++) {
          const optLine = lines[j].trim();
          if (optLine.startsWith('  - ')) {
            options.push(optLine.substring(4).trim());
          } else if (optLine && !optLine.startsWith('  ')) {
            break;
          }
        }
        if (options.length > 0) {
          field.options = options;
        }

        form.fields.push(field);
      } else {
        continue;
      }
    } else if (trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('  -')) {
      // Format: "Question? (type) *" - AI Chat format
      const aiFormatMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*(\*)?$/);

      if (aiFormatMatch) {
        const [, label, typeInfo, requiredStar] = aiFormatMatch;
        const isRequired = !!requiredStar;

        // Parse type and options from typeInfo
        let fieldType = typeInfo;
        let options = [];

        // Check if type includes options like "select: Option1, Option2"
        if (typeInfo.includes(':')) {
          const [type, optionsStr] = typeInfo.split(':');
          fieldType = type.trim();
          options = optionsStr.split(',').map(opt => opt.trim());
        }

        // Generate field name from label
        const fieldName = label.trim()
          .toLowerCase()
          .replace(/[?!.]/g, '')
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');

        const field = {
          type: fieldType,
          name: fieldName,
          label: label.trim(),
          required: isRequired,
          section: currentSection,
          position: form.fields.length,
          placeholder: '',
          validation: { section: currentSection }
        };

        if (options.length > 0) {
          field.options = options;
        }

        form.fields.push(field);
      }
    }
  }

  return form;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('markdown');
    const projectId = formData.get('projectId');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const markdown = await file.text();

    // Log each line processing
    const lines = markdown.split('\n');
    lines.forEach((line, i) => {
      if (line.trim().startsWith('- ')) {
        const parts = line.trim().substring(2).split('|').map(p => p.trim());
        // Process parts if needed
      }
    });

    const parsedForm = parseMarkdown(markdown);

    if (parsedForm.fields.length === 0) {

    }

    // Create form in aloa_forms
    const urlId = nanoid(10);
    const { data: form, error: formError } = await supabase
      .from('aloa_forms')
      .insert([{
        title: parsedForm.title,
        description: parsedForm.description,
        url_id: urlId,
        aloa_project_id: projectId || null,
        sections: parsedForm.fields.reduce((acc, field) => {
          if (!acc.includes(field.section)) acc.push(field.section);
          return acc;
        }, []),
        settings: {
          requiresAuth: false,
          multipleSubmissions: false,
          showProgressBar: true
        },
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (formError) {

      return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
    }

    // Create fields in aloa_form_fields
    if (parsedForm.fields.length > 0) {
      const fieldsToInsert = parsedForm.fields.map(field => ({
        aloa_form_id: form.id,
        field_label: field.label,
        field_name: field.name,
        field_type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        options: field.options,
        validation: field.validation,
        field_order: field.position
      }));

      const { error: fieldsError } = await supabase
        .from('aloa_form_fields')
        .insert(fieldsToInsert);

      if (fieldsError) {
        // Error creating form fields
        // Rollback form creation
        await supabase.from('aloa_forms').delete().eq('id', form.id);
        return NextResponse.json({ error: 'Failed to create form fields' }, { status: 500 });
      }

    } else {

    }

    return NextResponse.json({
      id: form.id,
      urlId: form.url_id,
      title: form.title,
      description: form.description,
      sections: form.sections,
      fieldCount: parsedForm.fields.length
    });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}