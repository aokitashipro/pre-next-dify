'use client';

/**
 * 使用状況表示コンポーネント
 * 
 * このコンポーネントは、ユーザーの使用状況（チャット使用回数、アップロード回数など）を
 * グラフィカルに表示し、プランの制限に対する使用率を可視化します。
 * ダッシュボードページで使用されます。
 */

import { useState, useEffect } from 'react';
import { PlanType } from '@prisma/client';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUsageSummary } from '@/lib/actions/usage-actions';
import { useRouter } from 'next/navigation';

// コンポーネントのプロパティ定義
interface UsageStatsProps {
  // 追加のCSSクラス（レイアウト調整用）
  className?: string;
}

/**
 * 使用状況の視覚的表示を行うコンポーネント
 */
export default function UsageStats({ className }: UsageStatsProps) {
  // 使用状況データの状態
  const [usageData, setUsageData] = useState<any>(null);
  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);
  // ページ遷移用のルーター
  const router = useRouter();

  // マウント時にデータを取得
  useEffect(() => {
    // 使用状況データの非同期取得
    async function fetchUsageData() {
      try {
        // API経由で使用状況を取得
        const result = await getUsageSummary();
        if (result.success) {
          setUsageData(result);
        } else {
          console.error('使用状況の取得に失敗しました:', result.error);
        }
      } catch (error) {
        console.error('使用状況の取得に失敗しました:', error);
      } finally {
        // 読み込み完了
        setIsLoading(false);
      }
    }

    // データ取得実行
    fetchUsageData();
  }, []);

  // ローディング中の表示
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>使用状況</CardTitle>
          <CardDescription>データを読み込み中...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // データ取得失敗時の表示
  if (!usageData || !usageData.success) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>使用状況</CardTitle>
          <CardDescription>データの取得に失敗しました</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.refresh()}>再読み込み</Button>
        </CardFooter>
      </Card>
    );
  }

  // 使用状況データの取り出し
  const { stats, limits, isProPlan, subscription } = usageData;
  const { chatCount, uploadCount, totalTokens } = stats;
  
  // 制限値を取得
  const chatLimit = limits.MONTHLY_MESSAGES;
  const uploadLimit = limits.MONTHLY_UPLOADS;
  
  // 使用率の計算（パーセンテージ）
  const chatUsagePercentage = (chatCount / chatLimit) * 100;
  const uploadUsagePercentage = (uploadCount / uploadLimit) * 100;
  
  // プロプランのコスト計算 (トークン1000件あたり約$0.002として概算)
  const estimatedCost = totalTokens / 1000 * 0.002;
  const maxCost = 8; // $8.00の月間上限
  const costPercentage = (estimatedCost / maxCost) * 100;

  // カードコンポーネントでレイアウト
  return (
    <Card className={className}>
      {/* ヘッダー部分 */}
      <CardHeader>
        <CardTitle>使用状況 - {isProPlan ? 'Proプラン' : '無料プラン'}</CardTitle>
        <CardDescription>
          {isProPlan
            ? '今月の使用状況（$8の使用制限）'
            : '今月の無料枠の使用状況'}
        </CardDescription>
      </CardHeader>

      {/* メインコンテンツ */}
      <CardContent className="space-y-4">
        {/* チャット使用回数の表示 */}
        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span>チャット回数</span>
            <span>
              {chatCount} / {chatLimit} 回
            </span>
          </div>
          {/* 使用率のプログレスバー */}
          <Progress value={chatUsagePercentage} className="h-2" />
          {/* 制限到達時の警告 */}
          {chatCount >= chatLimit && !isProPlan && (
            <p className="text-xs text-red-500 mt-1">
              今月の無料枠を使い切りました。プランをアップグレードして制限を解除してください。
            </p>
          )}
        </div>
        
        {/* ファイルアップロード回数の表示 */}
        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span>ファイルアップロード</span>
            <span>
              {uploadCount} / {uploadLimit} 件
            </span>
          </div>
          {/* 使用率のプログレスバー */}
          <Progress value={uploadUsagePercentage} className="h-2" />
          {/* 制限到達時の警告 */}
          {uploadCount >= uploadLimit && (
            <p className="text-xs text-red-500 mt-1">
              今月のファイルアップロード制限に達しました。
            </p>
          )}
        </div>

        {/* プロプラン限定の表示項目 */}
        {isProPlan && (
          <>
            {/* コスト使用状況 */}
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>使用コスト</span>
                <span>
                  ${estimatedCost.toFixed(2)} / ${maxCost.toFixed(2)}
                </span>
              </div>
              {/* コスト使用率のプログレスバー */}
              <Progress value={costPercentage} className="h-2" />
              {/* コスト制限到達時の警告 */}
              {costPercentage >= 100 && (
                <p className="text-xs text-red-500 mt-1">
                  今月の使用制限に達しました。
                </p>
              )}
            </div>
            {/* トークン使用量の詳細 */}
            <div className="text-sm">
              <p>トークン使用量: {(totalTokens / 1000).toFixed(1)}K</p>
            </div>
          </>
        )}
      </CardContent>

      {/* フッター - 無料プランのみ表示 */}
      {!isProPlan && (
        <CardFooter>
          <Button 
            variant="default"
            className="w-full"
            onClick={() => router.push('/pricing')}
          >
            プランをアップグレード
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 