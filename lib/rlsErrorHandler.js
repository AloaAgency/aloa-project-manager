import { NextResponse } from 'next/server';

/**
 * Handle Row Level Security (RLS) errors from Supabase
 * PostgreSQL error code 42501 indicates insufficient privilege
 *
 * @param {Object} error - The error object from Supabase
 * @returns {NextResponse|null} - Returns error response if RLS violation, null otherwise
 */
export function handleRLSError(error) {
  // Check for RLS violation error code
  if (error?.code === '42501') {
    return NextResponse.json(
      {
        error: 'Access denied',
        details: 'You do not have permission to access this resource',
        code: 'RLS_VIOLATION'
      },
      { status: 403 }
    );
  }

  // Check for other permission-related error messages
  if (error?.message?.toLowerCase().includes('permission denied') ||
      error?.message?.toLowerCase().includes('row level security')) {
    return NextResponse.json(
      {
        error: 'Access denied',
        details: 'Row level security policy violation',
        code: 'RLS_VIOLATION'
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Wrap error handling with RLS checks
 *
 * @param {Object} error - The error object from Supabase
 * @param {string} defaultMessage - Default error message if not RLS
 * @returns {NextResponse} - Error response
 */
export function handleDatabaseError(error, defaultMessage = 'Database operation failed') {
  // First check for RLS violations
  const rlsResponse = handleRLSError(error);
  if (rlsResponse) return rlsResponse;

  // Log non-RLS errors for debugging
  console.error('Database error:', error);

  // Return generic error for other database issues
  return NextResponse.json(
    {
      error: defaultMessage,
      code: error?.code || 'DATABASE_ERROR'
    },
    { status: 500 }
  );
}