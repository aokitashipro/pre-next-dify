// app/api/dify/workflow-test/route.ts
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    const { mode, apiKey } = body;
    
    // 環境変数の設定
    const DIFY_API_KEY = apiKey || process.env.DIFY_API_KEY;
    const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
    
    // 必須設定のチェック
    if (!DIFY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'DIFY_API_KEY is not configured' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Dify APIエンドポイント
    const endpoint = `${DIFY_API_URL}/workflows/run`;
    
    // リクエストボディの構築
    const requestBody = {
      inputs: {
        query: 'テスト'
      },
      response_mode: mode === 'streaming' ? 'streaming' : 'blocking',
      user: 'debug-user-' + Date.now(),
    };

    console.log('Sending request to Dify API:', endpoint);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Dify ワークフローAPIを呼び出す
    const difyResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIFY_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    // レスポンスを処理
    const responseData = await difyResponse.text();
    console.log('Dify API response status:', difyResponse.status);
    console.log('Dify API response headers:', Object.fromEntries(difyResponse.headers.entries()));
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch (e) {
      parsedData = { raw: responseData };
    }
    
    return new Response(
      JSON.stringify({
        status: difyResponse.status,
        headers: Object.fromEntries(difyResponse.headers.entries()),
        body: parsedData,
        requestBody: requestBody,
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}