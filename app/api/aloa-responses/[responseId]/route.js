import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request, { params }) {
  try {
    const { responseId } = params;
    
    // Delete the response (answers will cascade delete)
    const { error } = await supabase
      .from('aloa_form_responses')
      .delete()
      .eq('id', responseId);
    
    if (error) {
      console.error('Error deleting response:', error);
      return NextResponse.json(
        { error: 'Failed to delete response' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Response deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/aloa-responses/[responseId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}