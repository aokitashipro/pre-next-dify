'use client';

/**
 * サブスクリプション購入・管理ボタンコンポーネント
 * 
 * ユーザーの現在のプランに応じて「Proプランにアップグレード」または「サブスクリプション管理」ボタンを表示し、
 * クリック時にStripeのチェックアウトページまたはカスタマーポータルにリダイレクトします。
 */
import { PlanType } from '@prisma/client';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * SubscriptionButtonコンポーネントのプロパティ
 */
export interface SubscriptionButtonProps {
  /** 現在のプラン（FREE/PREMIUM） */
  currentPlan: PlanType | string;
  /** サブスクリプションがキャンセル予定かどうか */
  isCancelled?: boolean;
  /** ボタンのバリアント（primary/outline/ghost など） */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** ボタンのサイズ（default/sm/lg） */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** 追加のCSSクラス名 */
  className?: string;
}

/**
 * サブスクリプション購入・管理ボタンコンポーネント
 */
export default function SubscriptionButton({
  currentPlan,
  isCancelled = false,
  variant = 'default',
  size = 'default',
  className,
}: SubscriptionButtonProps) {
  const { isLoading, handleSubscription, buttonText } = useSubscription(currentPlan, isCancelled);

  return (
    <Button
      onClick={handleSubscription}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={cn(className)}
    >
      {buttonText}
    </Button>
  );
} 