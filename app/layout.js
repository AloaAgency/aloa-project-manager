import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Aloa® Agency Custom Forms',
  description: 'Create and manage custom forms for internal use.',
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
      </body>
    </html>
  );
}