'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

// Dashboard redirect page - determines where to send users based on their role
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirectUser() {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('aloa_user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role;
      const adminRoles = ['super_admin', 'project_admin', 'team_member'];
      const clientRoles = ['client', 'client_admin', 'client_participant'];

      if (adminRoles.includes(userRole)) {
        // Admin users go to admin projects
        router.push('/admin/projects');
      } else if (clientRoles.includes(userRole)) {
        // Client users - try to get their project
        const { data: memberData } = await supabase
          .from('aloa_project_members')
          .select('project_id')
          .eq('user_id', user.id)
          .eq('project_role', 'viewer')
          .single();

        if (memberData?.project_id) {
          router.push(`/project/${memberData.project_id}/dashboard`);
        } else {
          // Client with no project - show error

          router.push('/auth/login?error=no-project');
        }
      } else {
        // Unknown role - default to login
        router.push('/auth/login');
      }
    }

    redirectUser();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}