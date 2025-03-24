import { Metadata } from 'next';
import { auth } from '@/auth';
import UsageStats from '@/components/UsageStats';
import { prisma } from '@/lib/prisma';
import { PlanType } from '@prisma/client';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CalendarClock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ダッシュボード | AI Chat',
  description: '利用状況の確認やプラン管理を行えます',
};

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }

  // サブスクリプション情報を取得
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  // 解約情報
  const isProPlan = subscription?.plan === PlanType.PREMIUM;
  const isCancelled = subscription?.cancelAtPeriodEnd || false;
  const subscriptionEndsAt = subscription?.currentPeriodEnd;
  
  // 日付のフォーマット
  const formattedEndDate = subscriptionEndsAt 
    ? new Date(subscriptionEndsAt).toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    : null;

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
      
      {/* 解約通知アラート */}
      {isProPlan && isCancelled && formattedEndDate && (
        <Alert variant="default" className="mb-6 border-amber-500 bg-amber-50">
          <CalendarClock className="h-4 w-4 text-amber-600" />
          <AlertTitle>サブスクリプション解約済み</AlertTitle>
          <AlertDescription>
            Proプランは{formattedEndDate}まで有効です。この日以降は自動的に無料プランに切り替わります。
            <br />
            <a href="/pricing" className="text-blue-600 hover:underline mt-2 inline-block">
              プラン変更を取り消す場合はこちら
            </a>
          </AlertDescription>
        </Alert>
      )}
      
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
