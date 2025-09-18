// Test script for Project Knowledge System
// Run this in your browser console or as a Node script

async function testKnowledgeSystem(projectId) {
  const baseUrl = 'http://localhost:3000'; // Adjust if needed

  console.log('🧪 Testing Project Knowledge System...\n');

  // Test 1: Check if knowledge table exists and is accessible
  console.log('1️⃣ Testing Knowledge API Endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/project-knowledge/${projectId}`);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ Knowledge API is accessible');
      console.log(`   Found ${data.knowledge?.length || 0} knowledge items`);
      if (data.stats?.categoryCounts) {
        console.log('   Categories:', Object.keys(data.stats.categoryCounts).join(', '));
      }
    } else {
      console.log('❌ Knowledge API error:', data.error);
    }
  } catch (error) {
    console.log('❌ Failed to access Knowledge API:', error.message);
  }

  // Test 2: Check AI Context Builder
  console.log('\n2️⃣ Testing AI Context Builder...');
  try {
    const response = await fetch(`${baseUrl}/api/project-knowledge/${projectId}/context?type=full_project`);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ AI Context Builder is working');
      console.log(`   Context has ${data.context?.statistics?.total_knowledge_items || 0} items`);
      console.log(`   Cached: ${data.cached ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Context Builder error:', data.error);
    }
  } catch (error) {
    console.log('❌ Failed to build AI context:', error.message);
  }

  // Test 3: Check Extraction Queue
  console.log('\n3️⃣ Testing Extraction Queue...');
  try {
    const response = await fetch(`${baseUrl}/api/project-knowledge/${projectId}/extract`);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ Extraction Queue is accessible');
      console.log('   Queue stats:', data.stats || 'No items in queue');
    } else {
      console.log('❌ Extraction Queue error:', data.error);
    }
  } catch (error) {
    console.log('❌ Failed to access Extraction Queue:', error.message);
  }

  // Test 4: Test Manual Knowledge Creation
  console.log('\n4️⃣ Testing Manual Knowledge Creation...');
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
      console.log('✅ Successfully created test knowledge item');
      console.log(`   ID: ${data.id}`);

      // Clean up - delete the test item
      await fetch(`${baseUrl}/api/project-knowledge/${projectId}?id=${data.id}`, {
        method: 'DELETE'
      });
      console.log('   (Test item cleaned up)');
    } else {
      console.log('❌ Failed to create knowledge:', data.error);
    }
  } catch (error) {
    console.log('❌ Failed to test knowledge creation:', error.message);
  }

  console.log('\n✨ Test Complete!');
  console.log('If all tests passed, the Knowledge System is working correctly.');
}

// Test with a specific project ID
// Replace with an actual project ID from your database
const testProjectId = 'YOUR_PROJECT_ID_HERE';

// Instructions
console.log('📋 How to use this test:');
console.log('1. Find a project ID from your database');
console.log('2. Run: testKnowledgeSystem("your-project-id-here")');
console.log('\nExample:');
console.log('testKnowledgeSystem("123e4567-e89b-12d3-a456-426614174000")');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testKnowledgeSystem };
}