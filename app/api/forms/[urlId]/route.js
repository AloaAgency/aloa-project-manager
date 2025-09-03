import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Form from '@/lib/models/Form';
import Response from '@/lib/models/Response';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const form = await Form.findOne({ urlId: params.urlId });
    
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

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const form = await Form.findById(params.urlId);
    
    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }
    
    // Delete all responses for this form
    await Response.deleteMany({ formId: form._id });
    
    // Delete the form
    await form.deleteOne();
    
    return NextResponse.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}