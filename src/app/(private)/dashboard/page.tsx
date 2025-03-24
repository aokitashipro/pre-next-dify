import { Metadata } from 'next';
import { auth } from '@/auth';
import UsageStats from '@/components/UsageStats';

export const metadata: Metadata = {
  title: 'ダッシュボード | AI Chat',
  description: '利用状況の確認やプラン管理を行えます',
};

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <UsageStats className="h-full" />
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">アカウント情報</h2>
            <div className="space-y-2">
              <p><span className="font-medium">名前:</span> {session.user.name}</p>
              <p><span className="font-medium">メール:</span> {session.user.email}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">クイックリンク</h2>
            <ul className="space-y-2">
              <li>
                <a href="/chat" className="text-blue-600 hover:underline">新しいチャットを開始</a>
              </li>
              <li>
                <a href="/pricing" className="text-blue-600 hover:underline">プランを変更</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
