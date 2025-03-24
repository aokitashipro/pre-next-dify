/**
 * 料金プランページ
 * 
 * 無料プランとProプランの比較を表示し、アップグレードオプションを提供します。
 */
import { auth } from '@/auth';
import { PlanType } from '@prisma/client';
import { PLAN_DETAILS } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';
import SubscriptionButton from '@/components/SubscriptionButton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

/**
 * ユーザーの現在のプランと解約情報を取得
 */
async function getUserSubscription() {
  const session = await auth();
  
  if (!session?.user?.id) {
    // 未ログインの場合はデフォルト値を返す
    return { 
      plan: PlanType.FREE,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null
    };
  }
  
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id }
  });
  
  if (!subscription) {
    // サブスクリプションがない場合はデフォルト値を返す
    return { 
      plan: PlanType.FREE,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null
    };
  }
  
  return subscription;
}

/**
 * 料金プランページコンポーネント
 */
export default async function PricingPage() {
  const subscription = await getUserSubscription();
  const currentPlan = subscription.plan;
  const isProPlan = currentPlan === PlanType.PREMIUM;
  const isCancelled = subscription.cancelAtPeriodEnd || false;
  const subscriptionEndsAt = subscription.currentPeriodEnd;
  
  // 日付のフォーマット
  const formattedEndDate = subscriptionEndsAt 
    ? new Date(subscriptionEndsAt).toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    : null;
  
  return (
    <div className="container mx-auto py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">料金プラン</h1>
        <p className="text-muted-foreground">
          ニーズに合わせた適切なプランをお選びください
        </p>
      </div>
      
      {/* 解約通知アラート */}
      {isProPlan && isCancelled && formattedEndDate && (
        <div className="max-w-4xl mx-auto mb-8">
          <Alert variant="default" className="border-amber-500 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle>サブスクリプション解約予定</AlertTitle>
            <AlertDescription>
              Proプランは{formattedEndDate}まで有効です。プランを継続する場合は、以下の「サブスクリプション管理」ボタンからキャンセルを取り消してください。
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* 無料プラン */}
        <Card className={`border ${isProPlan ? '' : 'border-primary'}`}>
          <CardHeader>
            <CardTitle>{PLAN_DETAILS.FREE.name}</CardTitle>
            <CardDescription>{PLAN_DETAILS.FREE.description}</CardDescription>
            <div className="mt-2">
              <span className="text-3xl font-bold">¥{PLAN_DETAILS.FREE.price}</span>
              <span className="text-muted-foreground ml-1">/月</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {PLAN_DETAILS.FREE.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {isProPlan ? (
              <div className="w-full p-2 text-center text-sm text-muted-foreground border rounded-md">
                {isCancelled && formattedEndDate
                  ? `${formattedEndDate}以降に自動切替予定`
                  : '現在Proプランをご利用中です'}
              </div>
            ) : (
              <div className="w-full p-2 text-center text-sm text-primary bg-primary/10 rounded-md">
                現在このプランをご利用中です
              </div>
            )}
          </CardFooter>
        </Card>
        
        {/* Proプラン */}
        <Card className={`border ${isProPlan ? 'border-primary' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{PLAN_DETAILS.PRO.name}</CardTitle>
              {isProPlan && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  {isCancelled ? '解約予定' : '現在のプラン'}
                </span>
              )}
            </div>
            <CardDescription>{PLAN_DETAILS.PRO.description}</CardDescription>
            <div className="mt-2">
              <span className="text-3xl font-bold">¥{PLAN_DETAILS.PRO.price}</span>
              <span className="text-muted-foreground ml-1">/月</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {PLAN_DETAILS.PRO.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <SubscriptionButton 
              currentPlan={currentPlan}
              isCancelled={isCancelled}
              variant={isProPlan ? 'outline' : 'default'}
              className="w-full"
            />
            {isProPlan && isCancelled && formattedEndDate && (
              <p className="text-xs text-amber-600 mt-2 text-center">
                {formattedEndDate}まで有効 - 自動更新はされません
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
      
      <div className="text-center mt-10 text-sm text-muted-foreground">
        <p>
          ※すべての支払いはStripeを通じて安全に処理されます。<br />
          いつでもキャンセル可能で、日割り計算で返金されます。
        </p>
      </div>
    </div>
  );
} 