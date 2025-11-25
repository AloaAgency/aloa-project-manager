import { notFound } from 'next/navigation';
import FormClient from './FormClient';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

async function getForm(urlId) {
  try {
    // First, try with service client to check if form exists and is public
    // This bypasses RLS to check if the form is public
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const { data: formCheck, error: checkError } = await serviceSupabase
      .from('aloa_forms')
      .select('id, is_public, status')
      .eq('url_id', urlId)
      .single();

    if (checkError || !formCheck) {
      return null;
    }

    // If form is public, use service client to fetch full form data
    // If not public, try with authenticated client (user must be logged in)
    let supabase;
    if (formCheck.is_public) {
      supabase = serviceSupabase;
    } else {
      // Use authenticated client for non-public forms
      const cookieStore = cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value;
            },
            set(name, value, options) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name, options) {
              cookieStore.set({ name, value: '', ...options });
            }
          }
        }
      );
    }

    // Fetch full form data
    const { data: form, error } = await supabase
      .from('aloa_forms')
      .select(`
        *,
        aloa_form_fields (
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

    // Format aloa_form response
    const sortedFields = form.aloa_form_fields?.sort((a, b) => (a.field_order || 0) - (b.field_order || 0)) || [];

    return {
      ...form,
      _id: form.id,
      urlId: form.url_id,
      isPublic: form.is_public || false,
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
      responseCount: 0
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
      description: 'The requested form could not be found.',
      robots: {
        index: false,
        follow: false,
      }
    };
  }

  const title = form.title || 'Form';
  const description = form.description || 'Please take a moment to complete this brief survey.';
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://custom-forms.vercel.app';
  const formUrl = `${siteUrl}/forms/${params.urlId}`;

  // Public forms should NOT be indexed by search engines
  // They contain potentially sensitive client data collection
  const shouldIndex = false; // Never index forms - they're private by nature

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
      index: shouldIndex,
      follow: shouldIndex,
      googleBot: {
        index: shouldIndex,
        follow: shouldIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
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
