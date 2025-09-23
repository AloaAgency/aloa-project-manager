import { useState, useEffect } from 'react';

export function useProjectKnowledge(projectId, contextType = 'full_project') {
  const [knowledge, setKnowledge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    fetchProjectKnowledge();
  }, [projectId, contextType]);

  const fetchProjectKnowledge = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/project-knowledge/${projectId}/context?type=${contextType}`);

      if (!response.ok) {
        throw new Error('Failed to fetch project knowledge');
      }

      const data = await response.json();
      setKnowledge(data.context);
    } catch (err) {

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshKnowledge = async () => {
    try {
      const response = await fetch(`/api/project-knowledge/${projectId}/context?type=${contextType}&refresh=true`);

      if (!response.ok) {
        throw new Error('Failed to refresh project knowledge');
      }

      const data = await response.json();
      setKnowledge(data.context);
      return data.context;
    } catch (err) {

      setError(err.message);
      throw err;
    }
  };

  const formatForAI = () => {
    if (!knowledge) return '';

    let formatted = `Project: ${knowledge.project.name}\n`;
    formatted += `Description: ${knowledge.project.description || 'N/A'}\n\n`;

    formatted += `=== PROJECT KNOWLEDGE ===\n\n`;

    for (const [category, items] of Object.entries(knowledge.knowledge || {})) {
      formatted += `## ${category.replace(/_/g, ' ').toUpperCase()}\n`;

      for (const item of items) {
        formatted += `- ${item.source} (Importance: ${item.importance_score || item.importance}/10)\n`;
        formatted += `  ${item.summary || item.content}\n`;
        if (item.tags && item.tags.length > 0) {
          formatted += `  Tags: ${item.tags.join(', ')}\n`;
        }
        formatted += '\n';
      }
    }

    if (knowledge.recent_activity?.form_responses?.length > 0) {
      formatted += `\n## RECENT FORM SUBMISSIONS\n`;
      for (const response of knowledge.recent_activity.form_responses) {
        formatted += `- ${response.form} (${new Date(response.submitted_at).toLocaleDateString()})\n`;
        formatted += `  Fields: ${response.data_preview.join(', ')}\n`;
      }
    }

    if (knowledge.recent_activity?.interactions?.length > 0) {
      formatted += `\n## RECENT INTERACTIONS\n`;
      for (const interaction of knowledge.recent_activity.interactions) {
        formatted += `- ${interaction.applet} (${interaction.type}): ${interaction.interaction_type}\n`;
      }
    }

    formatted += `\n=== STATISTICS ===\n`;
    formatted += `Total Knowledge Items: ${knowledge.statistics.total_knowledge_items}\n`;
    formatted += `Categories Covered: ${knowledge.statistics.categories_covered.join(', ')}\n`;
    formatted += `Average Importance: ${knowledge.statistics.average_importance.toFixed(1)}/10\n`;

    return formatted;
  };

  const getByCategory = (category) => {
    if (!knowledge || !knowledge.knowledge) return [];
    return knowledge.knowledge[category] || [];
  };

  const searchKnowledge = async (searchTerm) => {
    try {
      const response = await fetch(`/api/project-knowledge/${projectId}?search=${encodeURIComponent(searchTerm)}`);

      if (!response.ok) {
        throw new Error('Failed to search knowledge');
      }

      const data = await response.json();
      return data.knowledge;
    } catch (err) {

      throw err;
    }
  };

  return {
    knowledge,
    loading,
    error,
    refreshKnowledge,
    formatForAI,
    getByCategory,
    searchKnowledge
  };
}