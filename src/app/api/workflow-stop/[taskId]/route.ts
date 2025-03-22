import { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId;
    const body = await request.json();
    const { userId } = body;

    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Dify APIのベースURL
    const DIFY_API_BASE_URL = process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1';
    // Dify APIキー
    const DIFY_API_KEY = process.env.DIFY_API_KEY;

    if (!DIFY_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Dify APIにリクエストを転送
    const difyResponse = await fetch(`${DIFY_API_BASE_URL}/workflows/stop/${taskId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: userId,
      }),
    });

    if (!difyResponse.ok) {
      const errorData = await difyResponse.json();
      return new Response(JSON.stringify(errorData), {
        status: difyResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await difyResponse.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error stopping workflow:', error);
    return new Response(JSON.stringify({ error: 'Failed to stop workflow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}