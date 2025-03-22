'use client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation';
import { useChatStore } from '@/store'

// メッセージ追加時に型指定が必要
type Message = {
  role: 'user' | 'assistant'
  content: string
}


export default function ChatClientWrapper(userId: string) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // never[] 回避 
  // 空の配列を初期値としつつ、その型がMessage[]だと明示
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input}
    setMessages(prev => [...prev, userMessage]) // 既存のメッセージに新しいinput分を追加
    setInput('')
    setIsLoading(true) // ローディング開始

    // 新しい会話の場合は一時的なURLを設定
    if (!currentConversationId){
      router.push(`/chat?conversation_id=temp`)
    }

    // ルートハンドラーにアクセス
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: input,
          conversation_id: currentConversationId,
          user:userId
        })
      })

      const data = await response.json()

      // 会話IDを更新し、URLを更新
      if(data.conversaion_id && (!currentConversationId || currentConversationId === 'temp')){
        setCurrentConversationId(data.conversaion_id)
        router.replace(`/chat?conversation_id=${data.conversation_id}`)
      }

      // DifyAPIの応答を画面に表示
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer
      }

      setMessages(prev=> [...prev, assistantMessage])
    } catch (error){
      console.error('エラー:', error)
      // エラー時はDifyAPIからの返答をエラーと表示する
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'エラーが発生しました。'
        }
      ])
    } finally {
      setIsLoading(false)
    }

  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-88px)] text-base mx-4">
      ChatClientWrapper
      <div className="text-base mx-4 flex-grow overflow-y-auto py-4">
        <div className="bg-white border border-slate-300 rounded-md drop-shadow-md p-4 my-4">ユーザー投稿</div>
        <div className="bg-slate-50 border border-slate-200 rounded-md drop-shadow-md p-4 my-4">AI応答</div>
      </div>
      <div className="p-3 border-t w-full ">
        <form onSubmit={handleSubmit} className="flex text-base items-center gap-2 mx-auto">
          <Textarea 
            className="md:text-base bg-white" 
            placeholder="メッセージを入力してください" 
            value={input}
            onChange={(e)=> setInput(e.target.value)}
            disabled={isLoading}
            />
          <Button type="submit" disabled={isLoading || !input.trim()}>送信</Button>
        </form>
      </div>
      </div>
    
  )
}
