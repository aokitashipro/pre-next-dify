/**
 * サブスクリプション管理用のカスタムフック
 * 
 * サブスクリプションの購入、管理、ステータス確認などの機能を提供します。
 */
import { useState } from 'react';
import { PlanType } from '@prisma/client';
import { useToast } from '@/components/ui/use-toast';

/**
 * サブスクリプション関連の操作をまとめたカスタムフック
 * 
 * @param currentPlan 現在のプラン
 * @param isCancelled サブスクリプションがキャンセル予定かどうか
 * @returns サブスクリプション操作に関連する関数とステート
 */
export function useSubscription(currentPlan: PlanType | string, isCancelled: boolean = false) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const isPro = currentPlan === PlanType.PREMIUM;

  /**
   * ボタンに表示するテキストを取得
   */
  const getButtonText = (): string => {
    if (isLoading) return 'Loading...';
    
    if (isPro) {
      return isCancelled 
        ? 'サブスクリプションを再開' 
        : 'サブスクリプション管理';
    }
    
    return 'Proプランにアップグレード';
  };

  /**
   * サブスクリプションの購入や管理を行う
   * Proプランの場合はカスタマーポータルへ、無料プランの場合はチェックアウトページへリダイレクト
   */
  const handleSubscription = async () => {
    try {
      setIsLoading(true);
      
      // 現在のプランに応じてエンドポイントを選択
      const endpoint = isPro ? '/api/stripe/portal' : '/api/stripe/checkout';
      
      // APIを呼び出してURLを取得
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('サブスクリプション処理中にエラーが発生しました');
      }
      
      const { url } = await response.json();
      
      // 取得したURLへリダイレクト
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('リダイレクトURLが取得できませんでした');
      }
    } catch (error) {
      console.error('サブスクリプションエラー:', error);
      toast({
        title: 'エラーが発生しました',
        description: error instanceof Error ? error.message : 'サブスクリプションの処理中に問題が発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isLoading,
    isPro,
    buttonText: getButtonText(),
    handleSubscription
  };
} 