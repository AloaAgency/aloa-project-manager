import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import UpdatePasswordForm from './update-password-form';
import { redirect } from 'next/navigation';

export default async function UpdatePasswordPage() {
  // Create server-side Supabase client
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Check if we have a valid session server-side
  const { data: { session }, error } = await supabase.auth.getSession();
  
  console.log('Server-side session check:', {
    hasSession: !!session,
    error,
    userEmail: session?.user?.email
  });

  // If no session, redirect to reset password page
  if (!session) {
    redirect('/auth/reset-password?error=Invalid or expired reset link');
  }

  // Pass the session to the client component
  return <UpdatePasswordForm initialSession={session} />;
}