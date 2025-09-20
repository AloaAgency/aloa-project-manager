'use client';

import { useUser } from '@/components/UserContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, LogOut, Settings, Users, FileText, BarChart3, Plus, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import UserAvatar from '@/components/UserAvatar';

export default function Navigation() {
  const { user, profile, signOut, isSuperAdmin, isProjectAdmin, isTeamMember, loading, refreshAuth } = useUser();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);

  // Debug logging for navigation visibility
  useEffect(() => {
    console.log('Navigation Debug:', {
      pathname,
      loading,
      hasUser: !!user,
      hasProfile: !!profile,
      userEmail: user?.email,
      profileRole: profile?.role,
      hasAttemptedRefresh
    });
  }, [pathname, loading, user, profile, hasAttemptedRefresh]);

  // Attempt refresh once if we have no user after initial load
  useEffect(() => {
    if (!loading && !user && !hasAttemptedRefresh && !pathname.startsWith('/auth/')) {
      console.log('Navigation: No user found after loading, attempting one-time refresh');
      setHasAttemptedRefresh(true);
      refreshAuth();
    }
  }, [loading, user, hasAttemptedRefresh, pathname, refreshAuth]);

  // Don't show navigation on auth pages
  if (pathname.startsWith('/auth/')) {
    console.log('Navigation: Hiding on auth page');
    return null;
  }

  // Show loading state while checking auth (only on client)
  if (loading) {
    console.log('Navigation: Showing loading state');
    return <div className="h-16 bg-aloa-black border-b-2 border-aloa-black" />;
  }

  // Don't show navigation if user is not authenticated and we're done loading
  if (!loading && !user) {
    console.log('Navigation: No user, hiding navigation');
    return null;
  }

  // If we have a user but no profile yet, still show navigation with basic info
  // This is better UX than hiding the navigation entirely
  if (user && !profile) {
    console.log('Navigation: User exists but no profile, showing basic navigation');
    // Continue with rendering, we'll use user.email as fallback
  }

  // Safety check - if we somehow have neither user nor loading state, hide nav
  if (!user) {
    console.log('Navigation: No user data available');
    return null;
  }

  // Different nav items for admins vs clients
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'project_admin' || profile?.role === 'team_member';
  
  const navItems = isAdmin ? [
    { href: '/admin/projects', label: 'Projects', icon: BarChart3 },
    { href: '/admin/forms', label: 'Forms', icon: FileText },
    { href: '/admin/users', label: 'Users', icon: Users, show: isSuperAdmin },
    { href: '/create', label: 'Create Form', icon: Plus },
  ].filter(item => item.show !== false) : [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  return (
    <nav className="bg-aloa-black border-b-2 border-aloa-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex">
            <Link href={isAdmin ? "/admin/projects" : "/dashboard"} className="flex items-center px-2 py-2 text-aloa-cream font-bold text-xl">
              Aloa®
            </Link>
            
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || 
                  (item.href === '/admin/projects' && pathname === '/dashboard');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-aloa-cream border-b-2 border-aloa-cream'
                        : 'text-gray-300 hover:text-aloa-cream'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-aloa-black focus:ring-aloa-cream"
              >
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-aloa-cream">
                      {profile?.full_name || user.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      {profile?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                  <UserAvatar
                    user={{
                      full_name: profile?.full_name,
                      email: user?.email || profile?.email,
                      avatar_url: profile?.avatar_url
                    }}
                    size="sm"
                  />
                </div>
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1" role="menu">
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="sm:hidden border-t border-gray-700">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-aloa-cream'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-aloa-cream'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}