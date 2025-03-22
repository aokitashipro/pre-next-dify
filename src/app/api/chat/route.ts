import { NextRequest, NextResponse } from 'next/server';
import { createConversationAndMessages } from '@/lib/createConversation';

export async function POST(request: NextRequest) {
  try {
    const { query, conversation_id, userId } = await request.json();

    // 入力バリデーション
    if (!query) {
      return NextResponse.json(({ error: 'Query is required' }),{ status: 400 }
      );
    }

    // API設定チェック
    if (!process.env.DIFY_API_KEY) {
      console.error('DIFY_API_KEY is not configured');
      return NextResponse.json({ error: 'API configuration error' },{ status: 500 })}

    // Dify APIリクエスト
    const difyResponse = await fetch(`${process.env.DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        conversation_id: conversation_id || undefined,
        user: userId,
        inputs: {},
        response_mode: 'blocking'
      }),
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      console.error('Dify API Error:', {
        status: difyResponse.status,
        body: errorText
        })
      return NextResponse.json({ error: 'Dify API request failed', details: errorText },
        {status: difyResponse.status}) 
    }

    const difyData = await difyResponse.json();
    
    console.log('Dify Response:', difyData); // デバッグログ追加

    try {
      // 会話とメッセージをデータベースに保存
      await createConversationAndMessages(query, difyData, userId);

      // レスポンス形式を修正
      return NextResponse.json({
        message_id: difyData.message_id,
        conversation_id: difyData.conversation_id,
        answer: difyData.answer,
        resources: difyData.metadata?.retriever_resources || [] // resourcesを直接返す
      });
    } catch (dbError) {
      console.error('Database error details:', dbError);
      // データベースエラーが発生しても、チャットの応答は返す
      return NextResponse.json({
          message_id: difyData.message_id,
          conversation_id: difyData.conversation_id,
          answer: difyData.answer,
          error: 'Failed to save conversation',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        })}
  } catch (error) {
    console.error('Unexpected error in chat API:', error);
    return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
  }
}