'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Account Registration
          </h2>
        </div>

        <div className="rounded-md bg-blue-50 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Invitation Required
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Account creation is by invitation only. If you need access to the Aloa Project Management system, 
                  please contact your project administrator.
                </p>
                <p className="mt-2">
                  If you have received an invitation, please check your email for the registration link.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link 
            href="/auth/login" 
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
}