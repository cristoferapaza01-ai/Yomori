import React, { useState } from 'react';
import { Eye } from 'lucide-react';

export function SpoilerBlock({ text }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(prev => !prev);
      }}
      title={revealed ? 'Clic para ocultar spoiler' : 'Spoiler: Clic para ver'}
      className={`inline-block transition-all duration-200 cursor-pointer rounded px-1.5 py-0.5 mx-0.5 select-none font-medium ${
        revealed
          ? 'bg-purple-950/80 text-purple-200 border border-purple-700/50 shadow-inner'
          : 'bg-[#2a2e3d] text-transparent hover:bg-[#34394d] border border-gray-700/60 shadow-sm relative group'
      }`}
    >
      <span className={revealed ? 'opacity-100' : 'opacity-0 filter blur-sm select-none'}>
        {text}
      </span>
      {!revealed && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-400 group-hover:text-purple-300 font-mono pointer-events-none">
          <Eye className="w-3 h-3 inline mr-1 opacity-70" /> Spoiler
        </span>
      )}
    </span>
  );
}

export default function FormattedMessage({ text }) {
  if (!text) return null;

  const parseFormatting = (input) => {
    if (!input || typeof input !== 'string') return input;

    const spoilerRegex = /(?:\|\|([\s\S]+?)\|\||\[spoiler\]([\s\S]+?)\[\/spoiler\])/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = spoilerRegex.exec(input)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderInlineMarkdown(input.substring(lastIndex, match.index), `txt-${lastIndex}`));
      }
      const spoilerContent = match[1] || match[2] || '';
      parts.push(
        <SpoilerBlock key={`spoiler-${match.index}`} text={spoilerContent} />
      );
      lastIndex = spoilerRegex.lastIndex;
    }

    if (lastIndex < input.length) {
      parts.push(renderInlineMarkdown(input.substring(lastIndex), `txt-${lastIndex}`));
    }

    return parts.length > 0 ? parts : input;
  };

  const renderInlineMarkdown = (str, keyPrefix) => {
    if (!str) return null;

    const lines = str.split('\n');
    return lines.map((line, lineIdx) => {
      let content = line;
      const isQuote = content.startsWith('> ');
      if (isQuote) {
        content = content.slice(2);
      }

      const formattedParts = parseInlineStyles(content);

      if (isQuote) {
        return (
          <div 
            key={`${keyPrefix}-line-${lineIdx}`} 
            className="border-l-2 border-purple-500 pl-2.5 my-1 text-gray-400 italic bg-purple-950/20 py-0.5 rounded-r-md text-xs sm:text-sm"
          >
            {formattedParts}
          </div>
        );
      }

      return (
        <React.Fragment key={`${keyPrefix}-line-${lineIdx}`}>
          {lineIdx > 0 && <br />}
          {formattedParts}
        </React.Fragment>
      );
    });
  };

  const parseInlineStyles = (lineStr) => {
    if (!lineStr) return '';

    const tokens = [];
    let tokenIdx = 0;

    const pattern = /(\*\*[^*]+?\*\*|~~[^~]+?~~|\*[^*]+?\*|__[^_]+?__|<u>[\s\S]+?<\/u>|https?:\/\/[^\s]+)/g;
    let match;
    let lastPos = 0;

    while ((match = pattern.exec(lineStr)) !== null) {
      if (match.index > lastPos) {
        tokens.push(lineStr.substring(lastPos, match.index));
      }
      const raw = match[0];
      if (raw.startsWith('**') && raw.endsWith('**')) {
        tokens.push(<strong key={tokenIdx++} className="font-bold text-white">{raw.slice(2, -2)}</strong>);
      } else if (raw.startsWith('~~') && raw.endsWith('~~')) {
        tokens.push(<del key={tokenIdx++} className="line-through text-gray-400">{raw.slice(2, -2)}</del>);
      } else if (raw.startsWith('__') && raw.endsWith('__')) {
        tokens.push(<u key={tokenIdx++} className="underline decoration-purple-400">{raw.slice(2, -2)}</u>);
      } else if (raw.startsWith('<u>') && raw.endsWith('</u>')) {
        tokens.push(<u key={tokenIdx++} className="underline decoration-purple-400">{raw.slice(3, -4)}</u>);
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        tokens.push(<em key={tokenIdx++} className="italic text-purple-200">{raw.slice(1, -1)}</em>);
      } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
        tokens.push(
          <a 
            key={tokenIdx++} 
            href={raw} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-purple-400 hover:text-purple-300 underline break-all"
          >
            {raw}
          </a>
        );
      }
      lastPos = pattern.lastIndex;
    }

    if (lastPos < lineStr.length) {
      tokens.push(lineStr.substring(lastPos));
    }

    return tokens.length > 0 ? tokens : lineStr;
  };

  return <>{parseFormatting(text)}</>;
}
