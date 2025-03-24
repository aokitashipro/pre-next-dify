/**
 * Stripe Webhookハンドラー
 * 
 * Stripeから送信されるイベント通知を処理します。
 * サブスクリプションの作成・更新・キャンセルなどのイベントに対応します。
 */
import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { prisma } from '@/lib/prisma';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import { upgradeUserToPro, downgradeUserToFree } from '@/lib/stripe';

// Stripe APIクライアントの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // @ts-ignore - APIVersionの型エラーを無視
  apiVersion: '2023-10-16',
});

/**
 * ストライプからのJSON形式のWebhookをリクエストから抽出
 */
async function getStripeEvent(request: NextRequest, secret: string) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  
  try {
    return stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error: any) {
    console.error('Stripeイベント検証エラー:', error.message);
    throw new Error(`Webhookエラー: ${error.message}`);
  }
}

/**
 * POSTリクエスト処理 - Stripeからのwebhookイベントを受け取り処理する
 */
export async function POST(request: NextRequest) {
  try {
    // Webhookシークレットを取得
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Stripe webhookシークレットが設定されていません' },
        { status: 500 }
      );
    }
    
    // Stripeイベントを検証・取得
    const event = await getStripeEvent(request, webhookSecret);
    
    // イベントタイプに応じた処理
    switch (event.type) {
      case 'checkout.session.completed': {
        // チェックアウト完了時の処理
        const session = event.data.object as Stripe.Checkout.Session;
        
        // ユーザーIDを取得
        const userId = session.metadata?.userId;
        if (!userId) {
          throw new Error('ユーザーIDがWebhookに含まれていません');
        }
        
        // サブスクリプション情報を取得
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = subscription.customer as string;
        
        console.log('Webhook: checkout.session.completed', { 
          userId, 
          subscriptionId, 
          customerId,
          priceId: subscription.items.data[0].price.id
        });
        
        // ユーザーのプランをProにアップグレード
        await upgradeUserToPro({
          userId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCustomerId: customerId,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        // 支払い成功時の処理（更新時など）
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // サブスクリプションを特定して期間を更新
        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId }
        });
        
        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });
        }
        
        break;
      }
      
      case 'customer.subscription.updated': {
        // サブスクリプション更新時の処理
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        
        // サブスクリプションを取得
        const dbSubscription = await prisma.subscription.findFirst({
          where: { 
            stripeSubscriptionId: subscriptionId
          }
        });
        
        if (dbSubscription) {
          // キャンセル予定の場合
          if (subscription.cancel_at_period_end) {
            // 期間終了時にキャンセルするよう設定
            await prisma.subscription.update({
              where: { id: dbSubscription.id },
              data: {
                cancelAtPeriodEnd: true,
              },
            });
          } else {
            // キャンセル予定を解除した場合
            await prisma.subscription.update({
              where: { id: dbSubscription.id },
              data: {
                cancelAtPeriodEnd: false,
              },
            });
          }
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        // サブスクリプション削除時の処理
        const subscription = event.data.object as Stripe.Subscription;
        
        // サブスクリプションを取得
        const dbSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        
        if (dbSubscription) {
          // ユーザーの権限を無料プランにダウングレード
          await downgradeUserToFree(dbSubscription.userId);
        }
        
        break;
      }
    }
    
    // 正常応答
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhookエラー:', error.message);
    return NextResponse.json(
      { error: `Webhookエラー: ${error.message}` },
      { status: 400 }
    );
  }
} 