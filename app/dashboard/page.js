import { redirect } from 'next/navigation';

// No user should go to /dashboard - redirect them to the appropriate page
export default function DashboardRedirect() {
  // Redirect to admin projects page as the safe default
  redirect('/admin/projects');
}