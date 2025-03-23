// src/lib/conversation.ts
import { prisma } from './prisma';
import { Prisma, MessageRole, FileType } from '@prisma/client';
import { ResourceInfo } from '@/store/chatStore';

interface FileAttachment {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
}

interface DifyResponse {
  message_id: string;
  conversation_id: string;
  answer: string;
  metadata?: {
    usage?: {
      total_tokens?: number;
      total_price?: number | string;
    };
    retriever_resources?: any[]; // より詳細な型情報を追加
  };
}

export async function createConversationAndMessages(
  query: string,
  difyResponse: DifyResponse,
  userId: string,
  attachments: FileAttachment[] = []
) {
  console.log('rawdifyResponse:', difyResponse)
  console.log('resources:', difyResponse.metadata?.retriever_resources)
  console.log('attachments:', attachments)
  
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

  // リソース情報を整形
  const resources: ResourceInfo[] = [];
  if (difyResponse.metadata?.retriever_resources && Array.isArray(difyResponse.metadata.retriever_resources)) {
    for (const resource of difyResponse.metadata.retriever_resources) {
      // リソース情報が適切な形式か確認
      if (resource && typeof resource === 'object') {
        resources.push({
          document_name: String(resource.document_name || ''),
          segment_position: Number(resource.segment_position || 0),
          content: String(resource.content || ''),
          score: Number(resource.score || 0)
        });
      }
    }
  }

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
      const userMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          content: query,
          role: MessageRole.USER,
          difyMessageId: difyResponse.message_id
        }
      });

      // ファイル添付情報をデータベースに保存
      if (attachments && attachments.length > 0) {
        // 各ファイルをデータベースに保存
        const fileUploads = await Promise.all(
          attachments.map(attachment => {
            // ファイルタイプを判断
            let fileType: FileType = FileType.DOCUMENT;
            if (attachment.fileType.startsWith('image/')) {
              fileType = FileType.IMAGE;
            } else if (attachment.fileType.startsWith('audio/')) {
              fileType = FileType.AUDIO;
            } else if (attachment.fileType.startsWith('video/')) {
              fileType = FileType.VIDEO;
            }

            // ファイル情報をデータベースに保存
            return tx.fileUpload.create({
              data: {
                userId,
                messageId: userMessage.id,
                type: fileType,
                name: attachment.fileName,
                path: attachment.fileUrl.replace(/^\/uploads\//, ''), // パスからプレフィックスを削除
                size: attachment.fileSize,
                mimeType: attachment.fileType,
                metadata: {
                  fileId: attachment.fileId,
                  originalUrl: attachment.fileUrl
                }
              }
            });
          })
        );
        
        console.log(`${fileUploads.length} files saved to database`);
      }

      const assistantMessage = await tx.message.create({
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
            // 標準化したリソース情報を保存
            resources: resources.length > 0 ? resources : undefined
          }
        }
      });

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