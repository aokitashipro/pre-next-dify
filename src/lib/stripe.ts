/**
 * Stripeユーティリティ関数
 * 
 * Stripeとの通信を行うための汎用関数を提供します。
 * サブスクリプション管理、支払い処理、webhook処理などを含みます。
 */
import { Stripe } from 'stripe';
import { prisma } from '@/lib/prisma';
import { PlanType, SubscriptionStatus } from '@prisma/client';

// Stripe APIクライアントの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // @ts-ignore - APIVersionの型エラーを無視
  apiVersion: '2023-10-16',
});

// サブスクリプション価格設定（環境変数またはデフォルト値）
const SUBSCRIPTION_PRICE = Number(process.env.SUBSCRIPTION_PRICE_MONTHLY) || 10;
const SUBSCRIPTION_CURRENCY = process.env.SUBSCRIPTION_CURRENCY || 'usd';

/**
 * プランの詳細情報を定義
 */
export const PLAN_DETAILS = {
  FREE: {
    name: '無料プラン',
    description: '基本的な機能が利用可能',
    price: 0,
    features: [
      '月間50チャットメッセージ',
      '月間10ファイルアップロード',
      '基本的なAI機能',
    ]
  },
  PRO: {
    name: 'Proプラン',
    description: '全ての機能が無制限で利用可能',
    price: SUBSCRIPTION_PRICE,
    features: [
      '月間500チャットメッセージ',
      '月間100ファイルアップロード',
      '優先サポート',
      '高度なAI機能',
      'ファイルの永続化',
    ]
  }
};

/**
 * チェックアウトセッション作成のためのパラメータ
 */
interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  userName?: string;
}

/**
 * チェックアウトセッションを作成
 * 
 * ユーザーがサブスクリプションを購入するためのチェックアウトセッションを作成します。
 * 
 * @param params.userId ユーザーID
 * @param params.userEmail ユーザーのメールアドレス
 * @param params.userName ユーザーの表示名（オプション）
 * @returns チェックアウトセッションURL
 */
export async function createCheckoutSession(params: CreateCheckoutSessionParams) {
  const { userId, userEmail, userName } = params;
  
  try {
    // 既存のStripeカスタマーを検索
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    
    let customerId = existingSubscription?.stripeCustomerId;
    
    // Stripeカスタマーがまだ存在しない場合は作成
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          userId
        }
      });
      
      customerId = customer.id;
      
      // 新規サブスクリプションの場合は、Stripe顧客IDをサブスクリプションレコードに保存
      if (existingSubscription) {
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            stripeCustomerId: customerId
          }
        });
      } else {
        // サブスクリプションレコードがない場合は新規作成
        await prisma.subscription.create({
          data: {
            userId,
            stripeCustomerId: customerId,
            plan: PlanType.FREE,
            status: SubscriptionStatus.ACTIVE
          }
        });
      }
    }
    
    // チェックアウトセッションを作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: SUBSCRIPTION_CURRENCY,
            product_data: {
              name: PLAN_DETAILS.PRO.name,
              description: PLAN_DETAILS.PRO.description,
            },
            unit_amount: PLAN_DETAILS.PRO.price * 100, // 金額はセント単位で指定
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        userId,
      }
    });
    
    return session.url;
  } catch (error) {
    console.error('チェックアウトセッション作成エラー:', error);
    throw new Error('サブスクリプションの処理中にエラーが発生しました');
  }
}

/**
 * 顧客ポータルセッションを作成
 * 
 * ユーザーが自分のサブスクリプションを管理するためのカスタマーポータルURLを生成します。
 * 
 * @param userId ユーザーID
 * @returns カスタマーポータルセッションURL
 */
export async function createCustomerPortalSession(userId: string) {
  try {
    console.log(`ポータルセッション作成開始: ユーザーID ${userId}`);
    
    // ユーザーのサブスクリプション情報からStripeカスタマーIDを取得
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    
    console.log('取得したサブスクリプション情報:', subscription);
    
    if (!subscription?.stripeCustomerId) {
      throw new Error('Stripeカスタマー情報が見つかりません。サブスクリプションプロセスに問題がある可能性があります。');
    }
    
    // カスタマーポータルセッションを作成
    console.log(`カスタマーID ${subscription.stripeCustomerId} を使用してポータルセッションを作成します`);
    
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });
    
    return session.url;
  } catch (error) {
    console.error('カスタマーポータルセッション作成エラー詳細:', error);
    if (error instanceof Error) {
      throw new Error(`カスタマーポータルの処理中にエラーが発生しました: ${error.message}`);
    }
    throw new Error('カスタマーポータルの処理中に予期しないエラーが発生しました');
  }
}

/**
 * サブスクリプションのステータスを取得
 * 
 * ユーザーの現在のサブスクリプションステータスをStripeから取得します。
 * 
 * @param subscriptionId サブスクリプションID
 * @returns サブスクリプションステータス
 */
export async function getSubscriptionStatus(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.status;
  } catch (error) {
    console.error('サブスクリプションステータス取得エラー:', error);
    throw new Error('サブスクリプション情報の取得中にエラーが発生しました');
  }
}

/**
 * ユーザーをProプランにアップグレード
 * 
 * データベース内のユーザーのプラン情報を更新します。
 * 
 * @param params プラン更新に必要なパラメータ
 */
interface UpgradeUserParams {
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId?: string;
  stripeCustomerId?: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
}

export async function upgradeUserToPro(params: UpgradeUserParams) {
  const { userId, stripeSubscriptionId, stripePriceId, stripeCustomerId, status, currentPeriodEnd } = params;
  
  try {
    // 既存のサブスクリプション情報を確認
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    
    if (existingSubscription) {
      // 既存のサブスクリプションを更新
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan: PlanType.PREMIUM,
          stripeSubscriptionId,
          stripePriceId,
          stripeCustomerId,
          status,
          currentPeriodStart: new Date(),
          currentPeriodEnd,
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        }
      });
    } else {
      // 新しいサブスクリプションを作成
      await prisma.subscription.create({
        data: {
          userId,
          plan: PlanType.PREMIUM,
          stripeSubscriptionId,
          stripePriceId,
          stripeCustomerId,
          status,
          currentPeriodStart: new Date(),
          currentPeriodEnd,
          cancelAtPeriodEnd: false
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('ユーザープラン更新エラー:', error);
    throw new Error('サブスクリプション情報の更新中にエラーが発生しました');
  }
}

/**
 * ユーザーを無料プランにダウングレード
 * 
 * データベース内のユーザーのプラン情報を無料プランに変更します。
 * 
 * @param userId ユーザーID
 */
export async function downgradeUserToFree(userId: string) {
  try {
    // 既存のサブスクリプション情報を確認
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    
    if (existingSubscription) {
      // サブスクリプションを無料プランに更新
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan: PlanType.FREE,
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('ユーザープラン更新エラー:', error);
    throw new Error('サブスクリプション情報の更新中にエラーが発生しました');
  }
}

export { stripe }; 