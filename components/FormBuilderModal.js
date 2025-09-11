'use client';

import { useState, useEffect } from 'react';
import { X, Brain, Wand2 } from 'lucide-react';
import AIChatFormBuilder from './AIChatFormBuilder';
import toast from 'react-hot-toast';

export default function FormBuilderModal({ 
  isOpen, 
  onClose, 
  projectId, 
  projectName,
  projectKnowledge,
  projectletId,
  projectletName,
  onFormCreated
}) {
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleMarkdownGenerated = async (markdown) => {
    setIsCreating(true);
    try {
      // Parse the markdown to extract form details
      const lines = markdown.split('\n');
      const titleLine = lines.find(line => line.startsWith('#'));
      const title = titleLine ? titleLine.replace(/^#+\s*/, '') : 'Untitled Form';
      
      // Find description (first non-title, non-empty line)
      const descriptionLine = lines.find(line => 
        line.trim() && !line.startsWith('#') && !line.startsWith('##')
      );
      const description = descriptionLine || '';

      // Create form in aloa_forms
      const response = await fetch('/api/aloa-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          markdownContent: markdown,
          projectId,
          fields: parseMarkdownToFields(markdown)
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create form');
      }

      // If this form is being created for a projectlet, attach it as an applet
      if (projectletId && data.id) {
        try {
          const attachResponse = await fetch(
            `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: data.title || 'Form',
                description: `Form created with AI: ${data.title}`,
                type: 'form',
                form_id: data.id,
                config: {
                  formTitle: data.title,
                  formId: data.id
                }
              })
            }
          );

          if (attachResponse.ok) {
            toast.success('Form created and attached to projectlet!');
            onFormCreated && onFormCreated(data);
            onClose();
            return;
          }
        } catch (attachError) {
          console.error('Error attaching form to projectlet:', attachError);
          // Continue even if attachment fails
        }
      }

      toast.success('Form created successfully!');
      onFormCreated && onFormCreated(data);
      onClose();
    } catch (error) {
      console.error('Form creation error:', error);
      toast.error(error.message || 'Failed to create form');
    } finally {
      setIsCreating(false);
    }
  };

  const parseMarkdownToFields = (markdown) => {
    const fields = [];
    const lines = markdown.split('\n');
    let currentSection = 'General Information';
    let fieldOrder = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for section headers
      if (line.startsWith('## Section:')) {
        currentSection = line.replace('## Section:', '').trim();
        continue;
      }

      // Check for field definitions (- type* | field_id | Label | placeholder)
      if (line.startsWith('- ')) {
        // Split by pipe to handle all parts properly
        const parts = line.substring(2).split('|').map(p => p.trim());
        
        if (parts.length >= 3) {
          // Extract type and required flag
          const typeStr = parts[0];
          const required = typeStr.includes('*');
          const type = typeStr.replace('*', '').trim().toLowerCase();
          
          // Extract field name, label, and placeholder
          const fieldId = parts[1];
          const label = parts[2];
          const placeholder = parts.length >= 4 ? parts[3] : '';
          
          const field = {
            type: type,
            required: required,
            name: fieldId,
            label: label,
            placeholder: placeholder,
            section: currentSection,
            position: fieldOrder++
          };

          // Check for options (for select, radio, checkbox, multiselect fields)
          if (['select', 'radio', 'checkbox', 'multiselect'].includes(type)) {
            const options = [];
            let j = i + 1;
            while (j < lines.length && lines[j].startsWith('  - ')) {
              options.push(lines[j].replace(/^\s+-\s*/, '').trim());
              j++;
            }
            if (options.length > 0) {
              field.options = options;
            }
            // Skip the option lines we just processed
            i = j - 1;
          }

          fields.push(field);
        }
      }
    }

    return fields;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <Brain className="w-6 h-6 mr-2" />
                Create Form with AI
              </h2>
              <p className="text-purple-100 mt-1">
                {projectletName 
                  ? `Creating form for "${projectletName}" in ${projectName}`
                  : `Creating form for ${projectName}`
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={isCreating}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isCreating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600">Creating your form...</p>
            </div>
          ) : (
            <div className="h-full">
              <AIChatFormBuilder
                onMarkdownGenerated={handleMarkdownGenerated}
                projectKnowledge={projectKnowledge}
                embedded={true}
                projectName={projectName}
                projectletName={projectletName}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}