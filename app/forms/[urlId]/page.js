import { notFound } from 'next/navigation';
import FormClient from './FormClient';

async function getForm(urlId) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/forms/${urlId}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
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