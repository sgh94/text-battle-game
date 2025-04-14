import { CharacterDetail } from '@/components/CharacterDetail';

export default function CharacterDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">텍스트 배틀</h1>
      
      <div className="w-full max-w-2xl">
        <CharacterDetail id={params.id} />
      </div>
    </main>
  );
}
