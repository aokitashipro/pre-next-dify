/**
 * Stripe カスタマーポータル API
 * 
 * 既存のサブスクリプションを管理するためのカスタマーポータルセッションを作成します。
 * ユーザーはこのAPIを呼び出した後、Stripeのカスタマーポータルにリダイレクトされます。
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCustomerPortalSession, stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

/**
 * POSTリクエスト処理
 * 
 * 認証済みユーザーのStripeカスタマーポータルセッションを作成します。
 */
export async function POST() {
  try {
    // ユーザーの認証状態を確認
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // 診断情報の収集
    const userSubscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    console.log('ユーザー診断情報:', JSON.stringify({
      userId,
      hasSubscription: !!userSubscription,
      subscriptionPlan: userSubscription?.plan,
      subscriptionId: userSubscription?.id,
      stripeCustomerId: userSubscription?.stripeCustomerId,
      stripeSubscriptionId: userSubscription?.stripeSubscriptionId
    }, null, 2));
    
    // Stripeカスタマー情報が見つからない場合、修復を試みる
    if (userSubscription && userSubscription.stripeSubscriptionId && !userSubscription.stripeCustomerId) {
      try {
        // サブスクリプションからカスタマーIDを取得して保存
        const stripeSubscription = await stripe.subscriptions.retrieve(userSubscription.stripeSubscriptionId);
        const stripeCustomerId = stripeSubscription.customer as string;
        
        if (stripeCustomerId) {
          // サブスクリプション情報を更新
          await prisma.subscription.update({
            where: { id: userSubscription.id },
            data: { stripeCustomerId }
          });
          
          console.log(`StripeカスタマーID(${stripeCustomerId})を正常に復旧しました`);
          
          // 修復後に再試行
          const portalUrl = await createCustomerPortalSession(userId);
          return NextResponse.json({ url: portalUrl });
        }
      } catch (repairError) {
        console.error('Stripeカスタマー情報修復エラー:', repairError);
      }
    }
    
    // 通常の処理
    const portalUrl = await createCustomerPortalSession(userId);
    
    // ポータルURLを返す
    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error('カスタマーポータルセッション作成エラー詳細:', error);
    
    // より詳細なエラー情報を返す
    return NextResponse.json(
      { 
        error: 'ポータルの処理中にエラーが発生しました',
        message: error.message || '不明なエラー',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 