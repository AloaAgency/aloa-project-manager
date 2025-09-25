'use client';

import { useUser } from '@/components/UserContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, LogOut, Settings, Users, FileText, BarChart3, Plus, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/UserAvatar';

export default function Navigation() {
  const { user, profile, signOut, isSuperAdmin, isProjectAdmin, isTeamMember, loading, refreshAuth } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const refreshAttemptsRef = useRef(0);
  const lastVisibilityCheckRef = useRef(Date.now());

  // Detect Safari private mode
  const isSafariPrivate = () => {
    if (typeof window === 'undefined') return false;

    const isWebkit = /webkit/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

    if (!isSafari && !isWebkit) return false;

    // Check if we're in private mode by testing localStorage
    try {
      const test = '__safari_private_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return false;
    } catch (e) {
      return true;
    }
  };

  // Enhanced visibility change handler for Safari private mode
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastCheck = now - lastVisibilityCheckRef.current;

        // If page was hidden for more than 30 seconds and we have no user, try to recover
        if (timeSinceLastCheck > 30000 && !user && !loading) {
          // Force a complete session refresh when visibility is restored
          setIsRecovering(true);
          refreshAttemptsRef.current = 0; // Reset attempts for new visibility
          await refreshAuth();
          setIsRecovering(false);
        }

        lastVisibilityCheckRef.current = now;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loading, refreshAuth]);


  // Attempt refresh with retry logic for Safari private mode
  useEffect(() => {
    if (!loading && !user && !hasAttemptedRefresh && !isRecovering && !pathname.startsWith('/auth/')) {
      setHasAttemptedRefresh(true);

      // More aggressive refresh for Safari private mode
      if (isSafariPrivate()) {
        const attemptRefresh = async () => {
          refreshAttemptsRef.current++;
          await refreshAuth();

          // Retry up to 3 times in Safari private mode
          if (!user && refreshAttemptsRef.current < 3) {
            setTimeout(attemptRefresh, 1000 * refreshAttemptsRef.current);
          }
        };
        attemptRefresh();
      } else {
        refreshAuth();
      }
    }
  }, [loading, user, hasAttemptedRefresh, isRecovering, pathname, refreshAuth]);

  // For protected pages (admin/dashboard), always show at least a minimal nav
  // This prevents the nav from completely disappearing in Safari private mode
  const isProtectedPage = pathname.startsWith('/admin/') ||
                         pathname.startsWith('/dashboard') ||
                         pathname.startsWith('/project/') ||
                         pathname.startsWith('/create') ||
                         pathname.startsWith('/edit/') ||
                         pathname.startsWith('/responses/');

  // Handle session loss on protected pages - clear session and redirect to login
  useEffect(() => {
    if (!loading && !user && isProtectedPage && !pathname.startsWith('/auth/')) {
      // Immediately redirect to login - don't wait for signOut
      router.push('/auth/login');

      // Failsafe: If router.push doesn't work, use window.location
      const redirectTimeout = setTimeout(() => {
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
      }, 500);

      // Clear session in background (non-blocking)
      signOut().catch(err => {});

      return () => clearTimeout(redirectTimeout);
    }
  }, [loading, user, isProtectedPage, pathname, signOut, router]);

  // Don't show navigation on auth pages
  if (pathname.startsWith('/auth/')) {
    return null;
  }

  // Show loading state while checking auth or recovering
  if (loading || isRecovering) {
    return <div className="h-16 bg-aloa-black border-b-2 border-aloa-black" />;
  }

  // Don't show navigation if user is not authenticated and we're done loading
  // UNLESS we're on a protected page (which means they were authenticated to get there)
  if (!loading && !user && !isProtectedPage) {
    return null;
  }

  // If we're on a protected page but lost the user session (Safari private mode issue)
  // Show a brief loading state while redirecting
  if (!user && isProtectedPage) {
    return (
      <nav className="bg-aloa-black border-b-2 border-aloa-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center px-2 py-2 text-aloa-cream font-bold text-xl">
                Aloa®
              </Link>
              <span className="ml-4 text-sm text-gray-400">
                Redirecting to login...
              </span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // If we have a user but no profile yet, still show navigation with basic info
  // This is better UX than hiding the navigation entirely
  if (user && !profile) {
    // Continue with rendering, we'll use user.email as fallback
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