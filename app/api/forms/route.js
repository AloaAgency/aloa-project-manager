import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Form from '@/lib/models/Form';
import Response from '@/lib/models/Response';

export async function GET() {
  try {
    await connectDB();
    
    const forms = await Form.find().sort({ createdAt: -1 });
    
    // Get response count for each form
    const formsWithCount = await Promise.all(
      forms.map(async (form) => {
        const responseCount = await Response.countDocuments({ formId: form._id });
        return {
          ...form.toObject(),
          responseCount
        };
      })
    );
    
    return NextResponse.json(formsWithCount);
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const form = new Form(body);
    await form.save();
    
    return NextResponse.json(form);
  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}