import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Execution } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Clock, Database, Info } from 'lucide-react';

interface OutputViewerProps {
  execution: Execution;
  agentName?: string;
  onClose: () => void;
}

export function OutputViewer({ execution, agentName, onClose }: OutputViewerProps) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(execution.output);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 border-b flex-row items-center justify-between bg-muted/30 space-y-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-lg leading-none">Execution Output</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                ID: {execution.id} • {agentName || 'Unknown Agent'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="px-4 py-2 border-b bg-muted/10 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {execution.duration ? `${(execution.duration / 1000).toFixed(1)}s` : 'N/A'}
          </div>
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            Started: {new Date(execution.startedAt).toLocaleString()}
          </div>
          {execution.finishedAt && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Finished: {new Date(execution.finishedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4 min-h-[200px] max-h-[60vh]">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeHighlight]}
            >
              {execution.output}
            </ReactMarkdown>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/10 text-[10px] text-center text-muted-foreground">
          End of output.
        </div>
      </DialogContent>
    </Dialog>
  );
}
