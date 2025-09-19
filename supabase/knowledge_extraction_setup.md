# Knowledge Extraction System Setup

The knowledge extraction system is designed to automatically extract text content from uploaded files and store it in the `aloa_project_knowledge` table for AI context building.

## Current Status
- ✅ File upload works
- ✅ Knowledge extraction is triggered
- ❌ Extraction fails due to database permissions

## Issue
The `knowledgeExtractor.js` uses a Supabase client that cannot query the `aloa_project_files` table properly. This needs to be fixed by:

1. Ensuring the service role key is used for the extraction
2. Or granting proper RLS permissions on the `aloa_project_files` table

## Manual Knowledge Extraction

Until the automatic extraction is fixed, you can manually add knowledge items:

### SQL to Extract Text from Uploaded Files
```sql
-- Insert knowledge from text files
INSERT INTO aloa_project_knowledge (
  project_id,
  source_type,
  source_id,
  source_name,
  content_type,
  content,
  content_summary,
  category,
  tags,
  importance_score,
  extracted_by,
  extraction_confidence,
  is_current
)
SELECT
  project_id,
  'file_document' as source_type,
  id::text as source_id,
  file_name as source_name,
  'text' as content_type,
  'File content would go here - manual extraction needed' as content,
  SUBSTRING(file_name || ' - ' || COALESCE(description, 'Document'), 0, 200) as content_summary,
  'documentation' as category,
  ARRAY['file', 'document', 'manual'] as tags,
  5 as importance_score,
  'manual' as extracted_by,
  1.0 as extraction_confidence,
  true as is_current
FROM aloa_project_files
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND (file_type LIKE '%text%' OR file_name LIKE '%.md' OR file_name LIKE '%.txt')
  AND NOT EXISTS (
    SELECT 1 FROM aloa_project_knowledge
    WHERE source_id = aloa_project_files.id::text
  );
```

## Files Currently in System
The following text files have been uploaded but not extracted:
- glid-homepage-narrative.md
- kevin-priority-homepage.md

## Next Steps
1. Fix the Supabase client permissions in knowledgeExtractor.js
2. Add proper error handling and logging
3. Consider using a background job processor for extraction
4. Add support for more file types (PDF, DOCX, etc.)