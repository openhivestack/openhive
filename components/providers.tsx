'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';

interface Props {
  children: ReactNode;
}

export function Providers({ children }: Props) {
  return (
    <ThemeProvider defaultTheme="system" attribute="class">
      {children}
      <Toaster richColors expand />
    </ThemeProvider>
  );
}
