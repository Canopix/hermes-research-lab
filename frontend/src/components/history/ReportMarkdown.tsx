'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { ExternalLink } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline decoration-primary/30 underline-offset-[3px] transition-colors hover:decoration-primary"
    >
      {children}
      <ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-60" aria-hidden />
    </a>
  ),
  h1: ({ children }) => (
    <h1 className="scroll-mt-20 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 scroll-mt-20 border-b border-border/60 pb-2 text-xl font-semibold tracking-tight text-foreground first:mt-0 sm:text-2xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 scroll-mt-20 text-lg font-semibold text-foreground">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="leading-[1.75] text-foreground/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 marker:text-primary/70">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 marker:font-medium marker:text-primary/70">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed text-foreground/90">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-primary/40 bg-muted/40 py-1 pl-5 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-border/60" />,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="text-muted-foreground">{children}</em>,
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
      {children}
    </pre>
  ),
};

interface ReportMarkdownProps {
  content: string;
  className?: string;
}

export function ReportMarkdown({ content, className = '' }: ReportMarkdownProps) {
  return (
    <article className={`report-prose ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
