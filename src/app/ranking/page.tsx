import { RankingList } from '@/components/RankingList';
import Link from 'next/link';

export default function RankingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center p-4 md:p-8 scroll-container">
      <h1 className="text-3xl font-bold mb-8">Mitosis Text Hero Battle</h1>
      
      <div className="w-full max-w-4xl flex-1 overflow-y-auto scrollbar-thin">
        <Link href="/" className="mb-6 inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md">
          &larr; Go Back
        </Link>
        <RankingList />
      </div>
    </div>
  );
}
