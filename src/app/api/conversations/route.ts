// app/api/conversations/route.ts
import { NextResponse } from 'next/server';
import { prisma }  from '@/lib/prisma';

// GETメソッドのみを実装
export async function GET() {
  try {
    // 標準的なPrismaクエリを使用して会話を取得
    const conversations = await prisma.message.findMany({
      where: {
        role: 'USER',
      },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['conversationId'],
      select: {
        conversationId: true,
        content: true,
        createdAt: true,
      },
    });

    // 会話が見つからない場合は空の配列を返す
    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        conversations: [],
        message: 'No conversations found'
      });
    }

    // 必要な形式に変換
    const formattedConversations = conversations.map(conv => ({
      id: conv.conversationId,
      title: conv.content.length > 30 
        ? `${conv.content.substring(0, 30)}...` 
        : conv.content,
      created_at: conv.createdAt,
    }));

    return NextResponse.json({
      conversations: formattedConversations,
    });
  } catch (error) {
    // エラーログの出力方法を修正
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    console.error('Error fetching conversations:', errorMessage);
    
    return NextResponse.json({
      error: 'Failed to fetch conversations',
      details: errorMessage
    }, {
      status: 500
    });
  }
}

// POSTリクエストのハンドリングを追加
export async function POST() {
  return NextResponse.json({
    error: 'Method not allowed'
  }, {
    status: 405
  });
}