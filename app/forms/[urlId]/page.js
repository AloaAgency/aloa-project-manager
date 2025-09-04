import { notFound } from 'next/navigation';
import FormClient from './FormClient';
import { supabase } from '@/lib/supabase';

async function getForm(urlId) {
  try {
    // Direct database query instead of API call
    const { data: form, error } = await supabase
      .from('forms')
      .select(`
        *,
        form_fields (
          id,
          field_label,
          field_name,
          field_type,
          required,
          placeholder,
          options,
          validation,
          field_order
        )
      `)
      .eq('url_id', urlId)
      .single();
    
    if (error || !form) {
      return null;
    }
    
    // Sort fields by position and format response
    const sortedFields = form.form_fields?.sort((a, b) => (a.field_order || 0) - (b.field_order || 0)) || [];
    
    // Format response for compatibility with FormClient
    return {
      ...form,
      _id: form.id,
      urlId: form.url_id,
      fields: sortedFields.map(field => ({
        _id: field.id,
        label: field.field_label,
        name: field.field_name,
        type: field.field_type,
        position: field.field_order,
        section: field.validation?.section || 'General Information',
        required: field.required,
        placeholder: field.placeholder,
        options: field.options,
        validation: field.validation
      })),
      createdAt: form.created_at,
      updatedAt: form.updated_at
    };
  } catch (error) {
    console.error('Error fetching form:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const form = await getForm(params.urlId);
  
  if (!form) {
    return {
      title: 'Form Not Found - Aloa Custom Forms',
      description: 'The requested form could not be found.'
    };
  }

  const title = form.title || 'Form';
  const description = form.description || 'Please take a moment to complete this brief survey.';
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://custom-forms.vercel.app';
  const formUrl = `${siteUrl}/forms/${params.urlId}`;
  
  return {
    title: `${title} - Aloa® Agency`,
    description: description,
    openGraph: {
      title: `${title} - Aloa® Agency`,
      description: description,
      url: formUrl,
      siteName: 'Aloa® Agency',
      images: [
        {
          url: 'https://images.ctfassets.net/qkznfzcikv51/1fBa4ioxqgBwRlhFWzKKb4/35990186eb154886f87eef10e4a9f31c/cta-bg.jpg',
          width: 1200,
          height: 630,
          alt: title
        }
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - Aloa® Agency`,
      description: description,
      images: ['https://images.ctfassets.net/qkznfzcikv51/1fBa4ioxqgBwRlhFWzKKb4/35990186eb154886f87eef10e4a9f31c/cta-bg.jpg'],
    },
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: formUrl,
    },
    robots: {
      index: true,
      follow: true,
    }
  };
}

export default async function FormPage({ params }) {
  const form = await getForm(params.urlId);
  
  if (!form) {
    notFound();
  }
  
  return <FormClient initialForm={form} />;
}