import { NextRequest, NextResponse } from "next/server";

const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_WORKFLOW_KEY;
const DIFY_WORKFLOW_ID = process.env.DIFY_WORKFLOW_ID;

// クライアントは通常GETリクエストを使用してSSE接続を確立するため、
// GETメソッドをサポートします
export async function GET(request: NextRequest) {
  try {
    // 環境変数のチェックを追加
    if (!DIFY_API_KEY) {
      console.error('DIFY_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      );
    }

    // クエリパラメータの検証を追加
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const userId = searchParams.get('userId') || `anonymous-${Date.now()}`;
    
    // Dify APIリクエストの作成
    const response = await fetchDifyAPI(query, userId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Dify API error: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `Dify API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    // レスポンスボディの存在確認
    if (!response.body) {
      throw new Error('No response body received from Dify API');
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    console.error('Error streaming from Dify:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Dify APIを呼び出す共通関数
async function fetchDifyAPI(query: string, userId: string) {
  if (!DIFY_API_KEY) {
    throw new Error('DIFY_API_KEY is not configured');
  }

  const endpoint = DIFY_WORKFLOW_ID 
    ? `${DIFY_API_URL}/workflows/${DIFY_WORKFLOW_ID}/run`
    : `${DIFY_API_URL}/workflows/run`;

  const requestBody = {
    inputs: {
      query: query
    },
    response_mode: "streaming",
    user: userId
  };

  console.log('Dify API request:', {
    endpoint,
    userId,
    hasApiKey: !!DIFY_API_KEY,
    requestBody: { ...requestBody, inputs: { query: query.substring(0, 50) + '...' } }
  });

  return await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DIFY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });
}
