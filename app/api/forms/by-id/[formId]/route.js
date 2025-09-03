import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Form from '@/lib/models/Form';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const form = await Form.findById(params.formId);
    
    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(form);
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}