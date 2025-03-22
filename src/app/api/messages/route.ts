// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    //console.log('Messages API called');

    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversation_id');

    //console.log('Requested conversation ID:', conversationId);

    if (!conversationId) {
      return NextResponse.json({ 
        error: 'Conversation ID is required' 
      }, { 
        status: 400 
      });
    }

    // Prismaクエリの実行
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId, // キャメルケースに修正
      },
      orderBy: {
        createdAt: 'asc', // キャメルケースに修正
      },
      select: {
        id: true,
        conversationId: true,
        content: true,
        role: true,
        createdAt: true,
        metadata: true,
      },
    });

    //console.log('Found messages:', messages.length);

    // レスポンスデータの整形
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      conversation_id: msg.conversationId,
      content: msg.content,
      role: msg.role,
      created_at: msg.createdAt,
      metadata: msg.metadata
    }));

    return NextResponse.json({
      messages: formattedMessages
    });

  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}