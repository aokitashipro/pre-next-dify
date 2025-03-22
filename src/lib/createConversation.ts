// src/lib/conversation.ts
import { prisma } from './prisma';
import { Prisma, MessageRole } from '@prisma/client';

interface DifyResponse {
  message_id: string;
  conversation_id: string;
  answer: string;
  metadata?: {
    usage?: {
      total_tokens?: number;
      total_price?: number | string;
    };
    retriever_resources?: string[];
  };
}

export async function createConversationAndMessages(
  query: string,
  difyResponse: DifyResponse,
  userId: string
) {
  console.log('rawdifyResponse:', difyResponse)
  console.log('resources:', difyResponse.metadata?.retriever_resources)
  
  // 数値の変換処理を改善
  // トークン数を数値型に変換。値がなければ0
  const totalTokens = Number(difyResponse.metadata?.usage?.total_tokens || 0);
  // コスト情報(metadata.usage.total_price)を一時変数に格納 文字か数値
  const priceValue = difyResponse.metadata?.usage?.total_price;
  // priceValueがあれば計算する
  // String(priceValue) どんな型でも文字列に変換
  // parseFloat() 文字から浮動小数点数に変換
  // .toFixed(10) 小数点以下10桁に制限
  // Number() 最終的に数値型に戻す
  const totalCost = priceValue ? Number(parseFloat(String(priceValue)).toFixed(10)) : 0;

//   この複雑な処理が必要な理由は：

// APIからの値が文字列または数値のどちらで返ってくるか一貫性がない可能性がある
// 浮動小数点数の精度の問題を解決するため（特に金額計算では重要）
// データベースに保存する前に一貫した形式に正規化するため

// この処理によって、どのような形式でデータが返ってきても、常に正確な数値としてデータベースに保存できることが保証されます。

  try {
    return await prisma.$transaction(async (tx) => {
      // 会話の作成または更新
      const conversation = await tx.conversation.upsert({
        // whereの複合ユニーク制約で検索
        where: {
          difyConversationId_userId: {
            difyConversationId: difyResponse.conversation_id,
            userId
          }
        }, // 条件があればupdate
        update: {
          totalTokens: {
            increment: totalTokens
          },
          totalCost: {
            increment: totalCost
          }
        }, // なければcreate
        create: {
          difyConversationId: difyResponse.conversation_id,
          userId,
          title: query.substring(0, 50),
          type: 'TEXT',
          totalTokens,
          totalCost
        }
      });

      // メッセージの作成
      const [userMessage, assistantMessage] = await Promise.all([
        tx.message.create({
          data: {
            conversationId: conversation.id,
            content: query,
            role: MessageRole.USER,
            difyMessageId: difyResponse.message_id
          }
        }),
        tx.message.create({
          data: {
            conversationId: conversation.id,
            content: difyResponse.answer,
            role: MessageRole.ASSISTANT,
            difyMessageId: difyResponse.message_id,
            metadata: {
              usage: {
                ...difyResponse.metadata?.usage,
                total_price: totalCost // 変換後の数値を使用
              },
              resources: difyResponse.metadata?.retriever_resources || []
            }
          }
        })
      ]);

      return {
        conversation,
        messages: [userMessage, assistantMessage]
      };
    });
  } catch (error) {
    console.error('Database operation failed:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error details:', {
        code: error.code,
        meta: error.meta
      });
    }
    throw error
  }
}