import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    
    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch responses with their answers joined with field names
    const { data: responses, error } = await supabase
      .from('form_responses')
      .select(`
        *,
        form_response_answers (
          id,
          value,
          form_fields (
            field_name,
            field_label
          )
        )
      `)
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    
    // Format responses for compatibility - create plain object for data
    const formattedResponses = responses.map(response => {
      const dataObject = {};
      response.form_response_answers?.forEach(answer => {
        if (answer.form_fields?.field_name) {
          // Parse JSON values for arrays/objects
          try {
            const parsedValue = JSON.parse(answer.value);
            dataObject[answer.form_fields.field_name] = parsedValue;
          } catch {
            // If not JSON, use as-is
            dataObject[answer.form_fields.field_name] = answer.value;
          }
        }
      });
      
      return {
        ...response,
        _id: response.id,
        formId: response.form_id,
        submittedAt: response.submitted_at,
        data: dataObject
      };
    });
    
    return NextResponse.json(formattedResponses);
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
    const body = await request.json();
    
    // First, create the response record
    const responseData = {
      form_id: body.formId
    };
    
    const { data: response, error: responseError } = await supabase
      .from('form_responses')
      .insert([responseData])
      .select()
      .single();
    
    if (responseError) throw responseError;
    
    // Get the form fields to map field names to IDs
    const { data: fields, error: fieldsError } = await supabase
      .from('form_fields')
      .select('id, field_name')
      .eq('form_id', body.formId);
    
    if (fieldsError) throw fieldsError;
    
    // Create a map of field names to IDs
    const fieldMap = new Map();
    fields.forEach(field => {
      fieldMap.set(field.field_name, field.id);
    });
    
    // Convert the form data to answer records
    const dataToStore = body.data instanceof Map 
      ? body.data
      : new Map(Object.entries(body.data || {}));
    
    console.log('Form data received:', body.data);
    console.log('Field mapping:', Array.from(fieldMap.entries()));
    
    const answers = [];
    dataToStore.forEach((value, fieldName) => {
      const fieldId = fieldMap.get(fieldName);
      if (fieldId && value !== undefined && value !== null && value !== '') {
        // Store arrays and objects as JSON strings
        const storedValue = typeof value === 'object' 
          ? JSON.stringify(value)
          : String(value);
        
        answers.push({
          response_id: response.id,
          field_id: fieldId,
          value: storedValue
        });
        console.log(`Storing answer for field ${fieldName} (ID: ${fieldId}):`, storedValue);
      } else if (!fieldId) {
        console.warn(`Field name '${fieldName}' not found in field map`);
      }
    });
    
    // Insert all answers
    if (answers.length > 0) {
      console.log(`Inserting ${answers.length} answers for response ${response.id}`);
      const { error: answersError } = await supabase
        .from('form_response_answers')
        .insert(answers);
      
      if (answersError) {
        console.error('Error inserting answers:', answersError);
        // Rollback by deleting the response
        await supabase.from('form_responses').delete().eq('id', response.id);
        throw answersError;
      }
      console.log('Answers inserted successfully');
    } else {
      console.warn('No answers to insert - form data may be empty');
    }
    
    return NextResponse.json({
      ...response,
      _id: response.id,
      formId: response.form_id,
      submittedAt: response.submitted_at
    });
  } catch (error) {
    console.error('Error creating response:', error);
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    );
  }
}