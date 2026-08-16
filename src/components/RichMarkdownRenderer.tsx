import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal, Info, ExternalLink } from 'lucide-react';

interface RichMarkdownRendererProps {
  content: string;
}

export const RichMarkdownRenderer: React.FC<RichMarkdownRendererProps> = ({ content }) => {
  return (
    <div className="rich-markdown-container text-slate-200 leading-relaxed text-[15px] space-y-4 font-sans">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans mt-6 mb-3 pb-2 border-b border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-sky-400 rotate-45 shadow-[0_0_8px_#38bdf8]" />
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-sky-300 font-sans mt-5 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-sm bg-purple-400 rotate-45 shadow-[0_0_6px_#a855f7]" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-100 font-sans mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-slate-300 text-sm md:text-[15px] font-sans">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-sky-200">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-purple-300 hud-text text-xs not-italic px-1.5 py-0.5 rounded bg-purple-950/40 border border-purple-500/20">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 pl-4 pr-3 py-2.5 rounded-r-xl border-l-4 border-sky-400 glass-panel text-sky-100 text-sm flex items-start gap-2 backdrop-blur-md">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-sans">{children}</div>
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="my-3 space-y-1.5 pl-2 list-none font-sans">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-2 pl-2 list-decimal list-inside text-slate-300 text-sm font-sans">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-sm text-slate-300 font-sans">
              <span className="w-1.5 h-1.5 rounded-sm bg-sky-400 mt-2 shrink-0 rotate-45 shadow-[0_0_4px_#38bdf8]" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-white/10 glass-panel shadow-lg">
              <table className="w-full text-left text-xs md:text-sm text-slate-300 border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="glass-card border-b border-white/10 hud-text text-sky-200 uppercase text-xs">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 border-b border-white/5 text-slate-300">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-6 border-white/10 border-dashed" />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 underline underline-offset-4 decoration-sky-500/50 inline-flex items-center gap-1 transition-colors font-sans"
            >
              <span>{children}</span>
              <ExternalLink className="w-3 h-3 inline opacity-70" />
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-xs font-mono bg-sky-500/10 text-sky-300 border border-sky-500/30"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock language={match ? match[1] : 'code'} code={codeString} />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-2xl border border-white/10 bg-[#060810] overflow-hidden shadow-2xl">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 glass-panel border-b border-white/10 text-xs text-slate-400 hud-text">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span className="uppercase text-[10px] font-semibold text-sky-300">
            {language}
          </span>
        </div>
        <button
          id={`copy-code-btn-${language}`}
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass-card hover:bg-white/10 text-slate-300 hover:text-sky-200 border border-white/10 text-[10px] hud-text transition-all cursor-pointer"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">COPIED</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>COPY CODE</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-slate-200 selection:bg-sky-500/40">
        <pre className="m-0 font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
