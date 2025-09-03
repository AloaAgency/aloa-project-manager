import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Form from '@/lib/models/Form';
import { parseMarkdownToForm } from '@/lib/markdownParser';

export async function POST(request) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const file = formData.get('markdown');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    const content = await file.text();
    
    try {
      const formStructure = parseMarkdownToForm(content);
      const form = new Form(formStructure);
      await form.save();
      
      return NextResponse.json({
        _id: form._id,
        urlId: form.urlId,
        title: form.title
      });
    } catch (parseError) {
      console.error('Parsing error:', parseError);
      return NextResponse.json(
        { error: parseError.message || 'Invalid markdown format' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}