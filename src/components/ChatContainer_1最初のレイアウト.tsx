'use client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"

export default function ChatClientWrapper() {

  return (
    <div className="relative flex flex-col h-[calc(100vh-88px)] text-base mx-4">
      ChatClientWrapper
      <div className="text-base mx-4 flex-grow overflow-y-auto py-4">
        <div className="bg-white border border-slate-300 rounded-md drop-shadow-md p-4 my-4">ユーザー投稿</div>
        <div className="bg-slate-50 border border-slate-200 rounded-md drop-shadow-md p-4 my-4">AI応答</div>
      </div>
      <div className="p-3 border-t w-full ">
        <form className="flex items-center gap-2 mx-auto">
          <Textarea className="md:text-base bg-white" placeholder="メッセージを入力してください" />
          <Button>送信</Button>
        </form>
      </div>
      </div>
    
  )
}
