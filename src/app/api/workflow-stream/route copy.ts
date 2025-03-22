import { NextRequest, NextResponse } from "next/server";

const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_WORKFLOW_KEY;
const DIFY_WORKFLOW_ID = process.env.DIFY_WORKFLOW_ID;

// クライアントは通常GETリクエストを使用してSSE接続を確立するため、
// GETメソッドをサポートします
export async function GET(request: NextRequest) {
  try {
    // クエリパラメータから入力を取得
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const userId = searchParams.get('userId') || 'anonymous-user';
    
    // Dify APIにはPOSTリクエストを送信
    const response = await fetchDifyAPI(query, userId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Dify API error: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `Dify API error: ${response.status}` },
        { status: response.status }
      );
    }

    // ストリームのデータをそのまま転送
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POSTメソッドも引き続きサポート
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    const { query, userId } = body;

    // 入力チェック
    if (!query || !userId) {
      return NextResponse.json(
        { error: 'Query and userId are required' },
        { status: 400 }
      );
    }
    
    // Dify APIにPOSTリクエストを送信
    const response = await fetchDifyAPI(query, userId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Dify API error: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `Dify API error: ${response.status}` },
        { status: response.status }
      );
    }

    // ストリームのデータをそのまま転送
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Dify APIを呼び出す共通関数
async function fetchDifyAPI(query: string, userId: string) {
  // エンドポイントの決定
  const endpoint = DIFY_WORKFLOW_ID 
    ? `${DIFY_API_URL}/workflows/${DIFY_WORKFLOW_ID}/run`
    : `${DIFY_API_URL}/workflows/run`;

  // API仕様に基づいたリクエストボディ
  const requestBody = {
    // API仕様によれば、inputsパラメータには少なくとも1つのキー/値ペアが必要
    inputs: {
      query: query  // ワークフローの設定に応じたパラメータ名を使用
    },
    response_mode: "streaming",  // ストリーミングモードを指定
    user: userId  // ユーザー識別子を設定
  };

  console.log(`Sending request to Dify API: ${endpoint}`);
  
  return await fetch(endpoint, {
    method: "POST",  // Dify APIはPOSTメソッドのみをサポート
    headers: {
      "Authorization": `Bearer ${DIFY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });
}
