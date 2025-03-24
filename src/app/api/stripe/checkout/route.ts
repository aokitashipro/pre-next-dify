/**
 * Stripe Checkout API
 * 
 * Proプランを購入するためのチェックアウトセッションを作成します。
 * ユーザーはこのAPIを呼び出した後、Stripeのチェックアウトページにリダイレクトされます。
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCheckoutSession } from '@/lib/stripe';

/**
 * POSTリクエスト処理
 * 
 * 認証済みユーザーのStripeチェックアウトセッションを作成します。
 */
export async function POST() {
  try {
    // ユーザーの認証状態を確認
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name || undefined;
    
    console.log('チェックアウトセッション作成:', {
      userId,
      userEmail,
      userName
    });
    
    // チェックアウトセッションを作成
    const checkoutUrl = await createCheckoutSession({
      userId,
      userEmail,
      userName
    });
    
    // チェックアウトURLを返す
    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('チェックアウトセッション作成エラー詳細:', error);
    
    // より詳細なエラー情報を返す
    return NextResponse.json(
      { 
        error: 'チェックアウトの処理中にエラーが発生しました',
        message: error.message || '不明なエラー',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
} 