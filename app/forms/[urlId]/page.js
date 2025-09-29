import { notFound } from 'next/navigation';
import FormClient from './FormClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getForm(urlId) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
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

    // ONLY use aloa_forms - no legacy fallback
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
