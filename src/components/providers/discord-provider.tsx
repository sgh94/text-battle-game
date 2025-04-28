'use client';

import { FC, PropsWithChildren } from 'react';
import { DiscordAuthProvider } from '@/hooks/useDiscordAuth';

const DiscordProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <DiscordAuthProvider>
      {children}
    </DiscordAuthProvider>
  );
};

export default DiscordProvider;
