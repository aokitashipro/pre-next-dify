import ChatContainer from "@/components/ChatContainer";
import ChatSidebar from "@/components/ChatSidebar";
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export default async function ChatPage() {
  const session = await auth()
  const userId = session?.user?.id
  if(!session?.user?.email || !userId){
    throw new Error('不正なリクエストです')
  }

   // サーバーで会話一覧を取得
    const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50
  });

  // クライアントに渡す形式に変換
  const formattedConversations = conversations.map(c => ({
    conversationId: c.difyConversationId || '',
    title: c.title || '無題の会話',
    updatedAt: c.updatedAt.toISOString()
  }));

  return (
      <div className="bg-slate-50 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
        <div className="w-full md:w-80 order-2 md:order-1 h-20 md:h-full border-t md:border-r md:border-t-0 bg-slate-100 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <ChatSidebar initialConversations={formattedConversations} />
        </div>
        </div>
        <div className="flex-1 p-4 order-1 md:order-2">
          <ChatContainer userId={userId} />
      </div>
      </div>  
    
  );
}