import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MongoBlocks | Visual MongoDB Learning Studio',
  description: 'Build, understand, and run MongoDB queries with interlocking blocks.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
