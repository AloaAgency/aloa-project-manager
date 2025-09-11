import './globals.css';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from '@/components/UserContext';
import Navigation from '@/components/Navigation';

export const metadata = {
  title: 'Aloa® Project Manager',
  description: 'Gamified project management system for Aloa web design projects.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-aloa-cream">
        <UserProvider>
          <Navigation />
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#0A0A0A',
                color: '#FAF6F0',
                borderRadius: '0',
                border: '2px solid #0A0A0A',
              },
            }}
          />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}