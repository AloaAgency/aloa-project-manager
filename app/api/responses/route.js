import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Response from '@/lib/models/Response';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    
    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }
    
    const responses = await Response.find({ formId }).sort({ submittedAt: -1 });
    
    return NextResponse.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const response = new Response(body);
    await response.save();
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating response:', error);
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    );
  }
}