import { RankingList } from '@/components/RankingList';

export default function RankingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Text Battle</h1>
      
      <div className="w-full max-w-2xl">
        <RankingList />
      </div>
    </main>
  );
}
