# Difyアプリケーション 使用状況管理機能マニュアル

## 1. 概要

このドキュメントは、Difyアプリケーションの使用状況管理機能について説明します。この機能は、無料プランとProプランのユーザーに対して、チャット回数やファイルアップロード回数などの使用制限を適用するために使用されます。

## 2. 使用状況管理の主要コンポーネント

使用状況管理機能は、以下の主要なファイルで構成されています：

### 2.1 コアファイル

| ファイル名 | 場所 | 役割 |
|------------|------|------|
| `usage-actions.ts` | `src/lib/actions/` | 使用状況の記録、取得、検証を行うコアロジック |
| `UsageStats.tsx` | `src/components/` | 使用状況を表示するUIコンポーネント |
| `ChatInput.tsx` | `src/components/` | チャット入力と送信、制限確認を行うコンポーネント |
| `FileUpload.tsx` | `src/components/` | ファイルアップロードと制限確認を行うコンポーネント |

## 3. データフローと処理の流れ

### 3.1 使用状況の記録フロー

```
ユーザーアクション(チャット送信/ファイルアップロード)
    ↓
ChatInput.tsx/FileUpload.tsxで入力処理
    ↓
usage-actions.tsのAPIを呼び出し
    ↓
データベースに使用状況を記録
    ↓
使用状況UIを更新(UsageStats.tsx)
```

### 3.2 使用状況の確認フロー

```
ページロード/アクション実行前
    ↓
ChatInput.tsx/FileUpload.tsxで使用可否チェック
    ↓
usage-actions.ts: canUseChat()を呼び出し
    ↓
プラン種別と使用状況に基づいて判定
    ↓
UI上で適切な制限表示/入力制限
```

## 4. ファイル詳細

### 4.1 `usage-actions.ts`

このファイルは使用状況管理のコアロジックを提供します。

#### 主な機能

- `getCurrentMonthStart`: 今月の開始日を計算する関数
- `canUseChat`: チャット機能が使用可能かどうかを確認する関数
- `recordChatUsage`: チャット使用を記録する関数
- `recordFileUploadUsage`: ファイルアップロードを記録する関数
- `getUsageSummary`: 使用状況の概要を取得する関数

#### プラン制限の設定

```typescript
// 無料プランの制限
const FREE_PLAN_LIMITS = {
  MONTHLY_MESSAGES: 50,    // 月間チャットメッセージ制限
  MONTHLY_UPLOADS: 10,     // 月間ファイルアップロード制限
};

// Proプランの制限
const PRO_PLAN_LIMITS = {
  MONTHLY_MESSAGES: 1000,  // 月間チャットメッセージ制限 
  MONTHLY_UPLOADS: 50,     // 月間ファイルアップロード制限
  MAX_MONTHLY_COST: 8,     // 月間最大コスト(ドル)
};
```

### 4.2 `UsageStats.tsx`

このコンポーネントは、ユーザーの使用状況を視覚的に表示します。

#### 主な機能

- 使用状況データの取得と表示
- プログレスバーによる使用率の可視化
- プラン種別に応じた表示の切り替え
- アップグレード促進のUIの表示

### 4.3 `ChatInput.tsx`

このコンポーネントは、チャット入力と送信機能を提供し、使用制限に基づく入力制限を適用します。

#### 主な機能

- テキスト入力とファイル添付の管理
- 使用制限の確認と適用
- チャットメッセージの送信処理
- 使用状況に基づくUIの調整（警告表示、入力無効化など）

### 4.4 `FileUpload.tsx`

このコンポーネントは、ファイルのアップロード機能を提供し、使用制限を適用します。

#### 主な機能

- ドラッグ&ドロップによるファイル選択
- ファイル選択ダイアログの提供
- ファイルタイプとサイズの検証
- 使用制限に基づくアップロード制限の適用

## 5. 実装例: 使用状況の確認と記録

### 5.1 使用状況の確認例

```typescript
// ChatInput.tsxなどでの使用例
useEffect(() => {
  async function checkUsageStatus() {
    setCheckingUsage(true);
    try {
      // 使用可否をAPIで確認
      const result = await canUseChat();
      setUsageStatus(result);
    } catch (error) {
      console.error('使用状況のチェックに失敗しました:', error);
    } finally {
      setCheckingUsage(false);
    }
  }
  
  checkUsageStatus();
}, []);
```

### 5.2 使用状況の記録例

```typescript
// ChatInput.tsxでの使用例
// メッセージ送信後の処理
async function afterSendMessage(data) {
  // トークン使用量を記録
  await recordChatUsage(data.tokens_used || 0);
  
  // ファイルアップロードがある場合
  if (selectedFiles.length > 0) {
    await recordFileUploadUsage(selectedFiles.length, 0);
  }
}
```

## 6. 使用状況UIの実装例

```tsx
// UsageStats.tsxの一部
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
```

## 7. カスタマイズ方法

### 7.1 プラン制限の変更

プラン制限を変更する場合は、`src/lib/actions/usage-actions.ts`内の`FREE_PLAN_LIMITS`および`PRO_PLAN_LIMITS`オブジェクトを編集します。

### 7.2 新しい制限項目の追加

1. `usage-actions.ts`に新しい制限項目をプラン制限オブジェクトに追加
2. 新しい記録関数を作成 (例: `recordNewFeatureUsage`)
3. 新しい確認関数を作成 (例: `canUseNewFeature`)
4. UIコンポーネントに新しい制限の表示を追加

## 8. トラブルシューティング

### 8.1 使用状況の取得に失敗する場合

可能性のある原因:
- データベース接続の問題
- Prismaクライアントの初期化エラー
- ユーザー認証の問題

対処法:
1. コンソールログでエラーメッセージを確認
2. データベース接続を確認
3. ユーザー認証情報を確認

### 8.2 制限が正しく適用されない場合

可能性のある原因:
- 使用状況の記録処理の失敗
- 使用状況の確認処理の失敗
- プラン種別の判定エラー

対処法:
1. 使用状況の記録処理が正しく呼び出されているか確認
2. データベース内の使用記録を確認
3. プラン種別の判定ロジックを確認

## 9. 拡張と改善のためのヒント

- 使用状況の詳細履歴表示機能の追加
- 月次レポート機能の実装
- 使用量予測や警告通知の追加
- 使用状況に基づく自動プラン変更提案機能 