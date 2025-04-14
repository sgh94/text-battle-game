'use client';

import { Provider } from 'jotai';
import { FC, PropsWithChildren } from 'react';

// Jotai 상태 관리를 위한 Provider
export const JotaiProvider: FC<PropsWithChildren> = ({ children }) => {
  return <Provider>{children}</Provider>;
};
