// Test script for Project Knowledge System
// Run this in your browser console or as a Node script

async function testKnowledgeSystem(projectId) {
  const baseUrl = 'http://localhost:3000'; // Adjust if needed

  // Test 1: Check if knowledge table exists and is accessible

  try {
    const response = await fetch(`${baseUrl}/api/project-knowledge/${projectId}`);
    const data = await response.json();

    if (response.ok) {

      if (data.stats?.categoryCounts) {
        .join(', '));
      }
    } else {

    }
  } catch (error) {

  }

  // Test 2: Check AI Context Builder

  try {
    const response = await fetch(`${baseUrl}/api/project-knowledge/${projectId}/context?type=full_project`);
    const data = await response.json();

    if (response.ok) {

    } else {

    }
  } catch (error) {

  }

  // Test 3: Check Extraction Queue

  try {
    const response = await fetch(`${baseUrl}/api/project-knowledge/${projectId}/extract`);
    const data = await response.json();

    if (response.ok) {

    } else {

    }
  } catch (error) {

  }

  // Test 4: Test Manual Knowledge Creation

  try {
    const testKnowledge = {
      source_type: 'team_notes',
      source_name: 'Test Knowledge Item',
      content: 'This is a test knowledge item created at ' + new Date().toISOString(),
      content_type: 'text',
      category: 'business_goals',
      importance_score: 5,
      tags: ['test', 'verification']
    };

    const response = await fetch(`${baseUrl}/api/project-knowledge/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testKnowledge)
    });

    const data = await response.json();

    if (response.ok) {

      // Clean up - delete the test item
      await fetch(`${baseUrl}/api/project-knowledge/${projectId}?id=${data.id}`, {
        method: 'DELETE'
      });
      ');
    } else {

    }
  } catch (error) {

  }

}

// Test with a specific project ID
// Replace with an actual project ID from your database
const testProjectId = 'YOUR_PROJECT_ID_HERE';

// Instructions

');

');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testKnowledgeSystem };
}