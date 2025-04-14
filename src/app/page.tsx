import { ConnectButton } from '@/components/ConnectButton';
import { CharactersList } from '@/components/CharactersList';
import { RankingList } from '@/components/RankingList';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">텍스트 배틀</h1>
      
      <div className="w-full max-w-2xl">
        <ConnectButton />
        <CharactersList />
      </div>
    </main>
  );
}
