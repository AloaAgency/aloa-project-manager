export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-service';

// Helper to extract text from different file types
async function extractTextFromFile(file, fileType) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (fileType === 'text/plain' || fileType === 'text/markdown') {
    return buffer.toString('utf-8');
  }

  if (fileType === 'application/pdf') {
    try {
      // Dynamic import to avoid build-time issues with pdf-parse
      const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
      const pdfData = await pdf(buffer);
      return pdfData.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      // Dynamic import for mammoth
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error('Failed to extract text from Word document');
    }
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

// POST - Upload a new writing sample
export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {}
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Verify permissions
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'project_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const description = formData.get('description') || '';
    const sampleType = formData.get('sample_type') || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Also check by extension for markdown files
    const fileName = file.name || '';
    const isMarkdown = fileName.endsWith('.md') || fileName.endsWith('.markdown');
    const effectiveType = isMarkdown ? 'text/markdown' : file.type;

    if (!allowedTypes.includes(effectiveType) && !isMarkdown) {
      return NextResponse.json({
        error: 'Invalid file type. Supported: .txt, .md, .pdf, .docx'
      }, { status: 400 });
    }

    // Extract text from file
    let extractedText;
    try {
      extractedText = await extractTextFromFile(file, effectiveType);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json({
        error: 'Document has insufficient text content. Please upload a document with at least 50 characters.'
      }, { status: 400 });
    }

    // Count words
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;

    // Insert the sample
    const { data: sample, error: insertError } = await supabase
      .from('aloa_project_writing_samples')
      .insert({
        project_id: projectId,
        file_name: fileName,
        file_type: effectiveType,
        file_size: file.size,
        extracted_text: extractedText,
        word_count: wordCount,
        description: description,
        sample_type: sampleType,
        uploaded_by: user.id,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting writing sample:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to save writing sample' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sample: {
        id: sample.id,
        file_name: sample.file_name,
        file_type: sample.file_type,
        file_size: sample.file_size,
        word_count: sample.word_count,
        description: sample.description,
        sample_type: sample.sample_type,
        created_at: sample.created_at
      },
      message: `Successfully uploaded "${fileName}" (${wordCount} words)`
    });

  } catch (error) {
    console.error('Error in POST /api/project-writing-style/samples:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a writing sample
export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const sampleId = searchParams.get('sampleId');

    if (!sampleId) {
      return NextResponse.json({ error: 'Sample ID required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {}
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Verify permissions
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'project_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete (set is_active to false)
    const { error: deleteError } = await supabase
      .from('aloa_project_writing_samples')
      .update({ is_active: false })
      .eq('id', sampleId)
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting writing sample:', deleteError);
      return NextResponse.json({ error: 'Failed to delete sample' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/project-writing-style/samples:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
