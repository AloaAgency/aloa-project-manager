import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase service client for storage operations
const getServiceClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// POST - Upload prototype file
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const formData = await request.formData();

    const file = formData.get('file');
    const appletId = formData.get('appletId');
    const name = formData.get('name');
    const description = formData.get('description');

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Prototype name is required' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${projectId}/${timestamp}_${sanitizedName}`;

    // Upload file to Supabase Storage
    const serviceClient = getServiceClient();
    const fileBuffer = await file.arrayBuffer();

    // Ensure prototype-files bucket exists
    const { data: buckets } = await serviceClient.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'prototype-files');

    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await serviceClient.storage.createBucket('prototype-files', {
        public: true,
        fileSizeLimit: maxSize,
        allowedMimeTypes: validTypes
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return NextResponse.json(
          { error: 'Failed to create storage bucket', details: createError.message },
          { status: 500 }
        );
      }
    }

    // Upload the file
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('prototype-files')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Check if upload succeeded
    if (!uploadData || !uploadData.path) {
      return NextResponse.json(
        { error: 'Upload failed - no data returned' },
        { status: 500 }
      );
    }

    // Get public URL for the file
    const { data: { publicUrl } } = serviceClient.storage
      .from('prototype-files')
      .getPublicUrl(storagePath);

    // Create prototype record in database
    const prototypeData = {
      aloa_project_id: projectId,
      applet_id: appletId || null,
      name: name,
      description: description || null,
      version: '1.0',
      status: 'active',
      source_type: 'upload',
      file_url: publicUrl,
      viewport_width: 1920,
      viewport_height: 1080,
      device_type: 'desktop',
      created_by: user.id
    };

    const { data: prototype, error: dbError } = await supabase
      .from('aloa_prototypes')
      .insert([prototypeData])
      .select()
      .single();

    if (dbError) {
      console.error('Error creating prototype record:', dbError);

      // Clean up uploaded file
      await serviceClient.storage
        .from('prototype-files')
        .remove([storagePath]);

      return NextResponse.json(
        { error: 'Failed to create prototype record', details: dbError.message },
        { status: 500 }
      );
    }

    // Log to project timeline
    await supabase
      .from('aloa_project_timeline')
      .insert({
        project_id: projectId,
        event_type: 'prototype_uploaded',
        description: `Prototype "${name}" uploaded`,
        user_id: user.id,
        metadata: {
          prototype_id: prototype.id,
          prototype_name: name,
          file_size: file.size,
          file_type: file.type
        }
      });

    // Create notification for clients if uploaded by admin
    const userRole = cookieStore.get('userRole')?.value;
    if (userRole === 'admin' || userRole === 'project_admin') {
      await supabase
        .from('aloa_applet_interactions')
        .insert({
          project_id: projectId,
          applet_id: appletId || null,
          interaction_type: 'prototype_upload',
          user_identifier: user.id,
          data: {
            prototype_id: prototype.id,
            prototype_name: name,
            file_name: file.name
          },
          created_at: new Date().toISOString(),
          read: false
        });
    }

    return NextResponse.json({
      prototype,
      file_url: publicUrl,
      message: 'Prototype uploaded successfully'
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
