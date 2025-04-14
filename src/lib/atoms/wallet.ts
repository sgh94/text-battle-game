import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Config } from 'wagmi';
import { config } from '../wallet-config';

// Wagmi 설정을 저장할 atom - 항상 설정값 반환하도록 수정
const wagmiConfigAtom = atom<Config>(config);

// Wagmi 설정을 가져오는 hook
export const useWagmiConfig = () => useAtomValue(wagmiConfigAtom);

// Wagmi 설정을 업데이트하는 hook
export const useUpdateWagmiConfig = () => useSetAtom(wagmiConfigAtom);

// 지갑 연결 중 로딩 상태를 저장하는 atom
const isConnectingAtom = atom<boolean>(false);

// 지갑 연결 로딩 상태를 관리하는 hooks
export const useConnectingState = () => useAtom(isConnectingAtom);
export const useIsConnecting = () => useAtomValue(isConnectingAtom);
export const useSetConnecting = () => useSetAtom(isConnectingAtom);

// 연결된 계정 상태 관리
const connectedAccountAtom = atom<string | null>(null);

// 연결된 계정 상태 관리 hooks
export const useConnectedAccount = () => useAtomValue(connectedAccountAtom);
export const useSetConnectedAccount = () => useSetAtom(connectedAccountAtom);
export const useConnectedAccountState = () => useAtom(connectedAccountAtom);

// 지갑 연결 오류 상태 관리
const walletErrorAtom = atom<string | null>(null);

// 지갑 연결 오류 상태 관리 hooks
export const useWalletError = () => useAtomValue(walletErrorAtom);
export const useSetWalletError = () => useSetAtom(walletErrorAtom);
export const useWalletErrorState = () => useAtom(walletErrorAtom);

// 현재 연결된 체인 ID 관리
const chainIdAtom = atom<number | null>(null);

// 체인 ID 관리 hooks
export const useChainId = () => useAtomValue(chainIdAtom);
export const useSetChainId = () => useSetAtom(chainIdAtom);

// 인증 상태 관리
const isAuthenticatingAtom = atom<boolean>(false);

// 인증 상태 관리 hooks
export const useAuthenticatingState = () => useAtom(isAuthenticatingAtom);
export const useIsAuthenticating = () => useAtomValue(isAuthenticatingAtom);
export const useSetAuthenticating = () => useSetAtom(isAuthenticatingAtom);
