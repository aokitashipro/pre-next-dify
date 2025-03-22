import WorkflowStreaming from "@/components/WorkflowStreaming";
// import DebugResponseComponent from "@/components/DebugResponseComponent";

export default function WorkflowPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-6">Dify workflow streaming API demo</h1>
        <WorkflowStreaming />
      </div>
    </main>
  )
}
