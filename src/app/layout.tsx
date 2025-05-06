
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

export const metadata: Metadata = {
  title: 'AI Text Assistant', // Updated title
  description: 'A simple starter app using GenAI features', // Update description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add the 'dark' class here to enable the dark theme
    <html lang="en" className="dark">
      <body className="antialiased flex flex-col min-h-screen">
        <header className="bg-card text-card-foreground border-b py-4 px-6 shadow-sm">
          <h1 className="text-xl font-semibold text-center">AI Text Assistant</h1> {/* Updated header title */}
        </header>
        <main className="flex-grow container mx-auto py-8">{children}</main> {/* Added padding */}
        <footer className="bg-muted text-muted-foreground text-center py-4 px-6 text-sm border-t">
          @ charu 2025. All Rights Reserved.
        </footer>
        <Toaster /> {/* Add Toaster */}
      </body>
    </html>
  );
}
