'use server';

/**
 * 使用状況管理モジュール
 * 
 * このモジュールでは、ユーザーのチャット使用回数やファイルアップロード数を
 * 追跡し、プランに応じた制限を適用するための関数を提供します。
 */

import { UsageType, PlanType } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ======== プラン別制限設定 ========

/**
 * 無料プランのユーザーに適用される制限
 */
const FREE_PLAN_LIMITS = {
  /** 月間メッセージ送信上限 */
  MONTHLY_MESSAGES: 50,
  /** 月間ファイルアップロード上限 */
  MONTHLY_UPLOADS: 10,
  /** 1ファイルあたりの最大サイズ (MB) */
  MAX_UPLOAD_SIZE_MB: 5,
};

/**
 * プロプランのユーザーに適用される制限
 */
const PRO_PLAN_LIMITS = {
  /** 月間メッセージ送信上限 */
  MONTHLY_MESSAGES: 500,
  /** 月間ファイルアップロード上限 */
  MONTHLY_UPLOADS: 100,
  /** 1ファイルあたりの最大サイズ (MB) */
  MAX_UPLOAD_SIZE_MB: 25,
};

// ======== ユーティリティ関数 ========

/**
 * 現在の月の開始日を取得
 * 使用状況は月単位でリセットされるため、期間の開始日が必要
 * @returns {Date} 今月の1日の日付
 */
function getCurrentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ======== メイン機能 ========

/**
 * ユーザーがチャット機能を使用できるか確認する
 * 
 * この関数は、ユーザーの現在の使用状況をチェックし、
 * プランごとの制限に達していないかを確認します。
 * 
 * @returns {Object} 使用可能かどうかと、制限に関する情報
 */
export async function canUseChat() {
  // ユーザー認証情報の取得
  const session = await auth();
  
  // 未ログイン時の処理
  if (!session || !session.user || !session.user.id) {
    return { 
      canUse: false, 
      reason: 'ログインが必要です。'
    };
  }
  
  const userId = session.user.id;
  const currentMonthStart = getCurrentMonthStart();
  
  try {
    // ユーザー情報とサブスクリプション情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });
    
    // ユーザーが存在しない場合
    if (!user) {
      return { 
        canUse: false, 
        reason: 'ユーザー情報が見つかりません。'
      };
    }
    
    // チャット使用状況を取得
    const chatUsageStats = await prisma.usageStat.findUnique({
      where: { 
        userId_type_period: {
          userId,
          type: UsageType.TEXT_CHAT,
          period: currentMonthStart
        }
      }
    });
    
    // ファイルアップロード使用状況を取得
    const fileUploadStats = await prisma.usageStat.findUnique({
      where: { 
        userId_type_period: {
          userId,
          type: UsageType.FILE_UPLOAD,
          period: currentMonthStart
        }
      }
    });
    
    // 使用回数の集計（利用履歴がない場合は0）
    const chatCount = chatUsageStats?.count || 0;
    const uploadCount = fileUploadStats?.count || 0;
    
    // ユーザーのプランに応じた制限を適用
    const limits = user.subscription?.plan === PlanType.PREMIUM 
      ? PRO_PLAN_LIMITS  // プロプラン
      : FREE_PLAN_LIMITS; // 無料プラン
    
    // チャットメッセージ数の制限チェック
    if (chatCount >= limits.MONTHLY_MESSAGES) {
      return { 
        canUse: false, 
        reason: `今月のメッセージ制限(${limits.MONTHLY_MESSAGES}件)に達しました。プランをアップグレードすると続けて利用できます。`,
        stats: { chatCount, uploadCount }
      };
    }
    
    // ファイルアップロード数の制限チェック
    if (uploadCount >= limits.MONTHLY_UPLOADS) {
      return { 
        canUse: true, // チャットメッセージ自体は送信可能
        uploadDisabled: true, // ファイルアップロードのみ無効
        reason: `今月のファイルアップロード制限(${limits.MONTHLY_UPLOADS}件)に達しました。`,
        stats: { chatCount, uploadCount }
      };
    }
    
    // 制限に達していない場合
    return { 
      canUse: true, 
      stats: { chatCount, uploadCount },
      limits
    };
  } catch (error) {
    // エラー発生時はデフォルトで使用可能に
    console.error('使用状況のチェックに失敗しました:', error);
    return { 
      canUse: true, // エラー時はデフォルトで許可（UXのため）
      error: 'システムエラーが発生しました。'
    };
  }
}

/**
 * チャット使用回数を記録する
 * 
 * ユーザーがチャットを送信したときに、使用回数とトークン使用量を
 * データベースに記録します。
 * 
 * @param {number} tokenCount 使用されたトークン数
 * @returns {Object} 記録結果と使用統計情報
 */
export async function recordChatUsage(tokenCount: number) {
  // ユーザー認証情報の取得
  const session = await auth();
  
  // 未ログイン時の処理
  if (!session || !session.user || !session.user.id) {
    return { success: false, error: 'ログインが必要です。' };
  }
  
  const userId = session.user.id;
  const currentMonthStart = getCurrentMonthStart();
  
  try {
    // 今月のチャット使用統計を取得
    let chatStats = await prisma.usageStat.findUnique({
      where: { 
        userId_type_period: {
          userId,
          type: UsageType.TEXT_CHAT,
          period: currentMonthStart
        }
      }
    });
    
    if (!chatStats) {
      // 使用統計が存在しない場合は新規作成
      chatStats = await prisma.usageStat.create({
        data: {
          userId,
          type: UsageType.TEXT_CHAT,
          count: 1, // 初回は1から開始
          tokensUsed: tokenCount,
          period: currentMonthStart
        }
      });
    } else {
      // 既存の使用統計を更新
      chatStats = await prisma.usageStat.update({
        where: { id: chatStats.id },
        data: {
          count: { increment: 1 }, // 使用回数を1増やす
          tokensUsed: { increment: tokenCount } // トークン使用量を加算
        }
      });
    }
    
    // キャッシュを更新して最新の使用状況を反映
    revalidatePath('/chat');
    revalidatePath('/dashboard');
    
    return { success: true, stats: chatStats };
  } catch (error) {
    console.error('チャット使用状況の記録に失敗しました:', error);
    return { success: false, error: 'システムエラーが発生しました。' };
  }
}

/**
 * ファイルアップロード使用回数を記録する
 * 
 * ユーザーがファイルをアップロードしたときに、
 * アップロード回数をデータベースに記録します。
 * 
 * @param {number} fileCount アップロードされたファイル数
 * @param {number} totalSizeMB 合計サイズ（MB）- 将来の使用のために保存
 * @returns {Object} 記録結果と使用統計情報
 */
export async function recordFileUploadUsage(fileCount: number, totalSizeMB: number) {
  // ユーザー認証情報の取得
  const session = await auth();
  
  // 未ログイン時の処理
  if (!session || !session.user || !session.user.id) {
    return { success: false, error: 'ログインが必要です。' };
  }
  
  const userId = session.user.id;
  const currentMonthStart = getCurrentMonthStart();
  
  try {
    // 今月のファイルアップロード使用統計を取得
    let fileStats = await prisma.usageStat.findUnique({
      where: { 
        userId_type_period: {
          userId,
          type: UsageType.FILE_UPLOAD,
          period: currentMonthStart
        }
      }
    });
    
    if (!fileStats) {
      // 使用統計が存在しない場合は新規作成
      fileStats = await prisma.usageStat.create({
        data: {
          userId,
          type: UsageType.FILE_UPLOAD,
          count: fileCount, // 初回はアップロードしたファイル数
          tokensUsed: 0,    // ファイルアップロードではトークンは使用しない
          period: currentMonthStart
        }
      });
    } else {
      // 既存の使用統計を更新
      fileStats = await prisma.usageStat.update({
        where: { id: fileStats.id },
        data: {
          count: { increment: fileCount } // アップロードしたファイル数を加算
        }
      });
    }
    
    // キャッシュを更新して最新の使用状況を反映
    revalidatePath('/chat');
    revalidatePath('/dashboard');
    
    return { success: true, stats: fileStats };
  } catch (error) {
    console.error('ファイルアップロード使用状況の記録に失敗しました:', error);
    return { success: false, error: 'システムエラーが発生しました。' };
  }
}

/**
 * ユーザーの使用状況サマリーを取得する
 * 
 * ダッシュボードなどで表示するためのユーザーの使用状況の概要を取得します。
 * チャット使用回数、ファイルアップロード回数、トークン使用量などを含みます。
 * 
 * @returns {Object} ユーザーの使用状況サマリー
 */
export async function getUsageSummary() {
  // ユーザー認証情報の取得
  const session = await auth();
  
  // 未ログイン時の処理
  if (!session || !session.user || !session.user.id) {
    return { success: false, error: 'ログインが必要です。' };
  }
  
  const userId = session.user.id;
  const currentMonthStart = getCurrentMonthStart();
  
  try {
    // ユーザー情報とサブスクリプション情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });
    
    // ユーザーが存在しない場合
    if (!user) {
      return { success: false, error: 'ユーザー情報が見つかりません。' };
    }
    
    // 今月のすべての使用状況を取得
    const usageStats = await prisma.usageStat.findMany({
      where: {
        userId,
        period: {
          gte: currentMonthStart
        }
      }
    });
    
    // 各種使用状況の集計
    const chatCount = usageStats.find(stat => stat.type === UsageType.TEXT_CHAT)?.count || 0;
    const uploadCount = usageStats.find(stat => stat.type === UsageType.FILE_UPLOAD)?.count || 0;
    const totalTokens = usageStats.reduce((sum, stat) => sum + stat.tokensUsed, 0);
    
    // プラン情報
    const isProPlan = user.subscription?.plan === PlanType.PREMIUM;
    const limits = isProPlan ? PRO_PLAN_LIMITS : FREE_PLAN_LIMITS;
    
    // 使用状況サマリーを返す
    return {
      success: true,
      stats: {
        chatCount,
        uploadCount,
        totalTokens,
      },
      subscription: user.subscription,
      limits,
      isProPlan
    };
  } catch (error) {
    console.error('使用状況の取得に失敗しました:', error);
    return { success: false, error: 'システムエラーが発生しました。' };
  }
} 