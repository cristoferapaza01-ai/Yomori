import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Quote, 
  Eye, 
  Image as ImageIcon, 
  Send, 
  Loader2, 
  X 
} from 'lucide-react';

export default function RichCommentEditor({
  placeholder = 'Escribe algo...',
  onSend,
  isSending = false,
  replyingTo = null,
  onCancelReply,
  showPageTag = false,
  currentPage = null,
  includePageTag = true,
  onTogglePageTag
}) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachedImages, setAttachedImages] = useState([]);
  const [isEmpty, setIsEmpty] = useState(true);
  
  // Estados activos de los botones de la barra
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false
  });

  // Comprobar estado activo de negrita/cursiva según la posición del cursor
  const checkActiveFormats = () => {
    try {
      setActiveStates({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough')
      });
    } catch (e) {}

    if (editorRef.current) {
      const text = editorRef.current.innerText.trim();
      setIsEmpty(text.length === 0 && attachedImages.length === 0);
    }
  };

  useEffect(() => {
    const handleSelection = () => {
      if (document.activeElement === editorRef.current) {
        checkActiveFormats();
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [attachedImages]);

  // Ejecutar comando de formato nativo (B, I, U, S)
  const execFormat = (command) => {
    editorRef.current?.focus();
    document.execCommand(command, false, null);
    checkActiveFormats();
  };

  // Manejar el formato de SPOILER (👁️)
  const handleSpoiler = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (selectedText && selectedText.trim().length > 0) {
      // Si hay texto seleccionado: envolver en un span de spoiler tapado
      const span = document.createElement('span');
      span.className = 'yomori-editor-spoiler';
      span.setAttribute('data-spoiler', 'true');
      span.setAttribute('title', 'Spoiler: Pasa el cursor para ver');
      span.innerText = selectedText;

      range.deleteContents();
      range.insertNode(span);

      // Mover el cursor después del spoiler
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      // Si no hay texto seleccionado: insertar un bloque de spoiler editable
      const span = document.createElement('span');
      span.className = 'yomori-editor-spoiler';
      span.setAttribute('data-spoiler', 'true');
      span.setAttribute('title', 'Spoiler: Pasa el cursor para ver');
      span.innerText = 'spoiler';

      range.insertNode(span);
      
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    checkActiveFormats();
  };

  // Manejar Cita (> 99)
  const handleQuote = () => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, 'blockquote');
    checkActiveFormats();
  };

  // Subir fotos
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64 = loadEvt.target.result;
        setAttachedImages(prev => [...prev, base64].slice(0, 4));
        setIsEmpty(false);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeImage = (idx) => {
    setAttachedImages(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length === 0 && (!editorRef.current || editorRef.current.innerText.trim().length === 0)) {
        setIsEmpty(true);
      }
      return updated;
    });
  };

  // Convertir contenido HTML del contentEditable a texto limpio / markdown para el backend
  const serializeEditorContent = (node) => {
    if (!node) return '';

    let result = '';
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        const isSpoiler = child.getAttribute('data-spoiler') === 'true' || child.classList.contains('yomori-editor-spoiler');
        
        if (isSpoiler) {
          result += `||${child.innerText}||`;
        } else if (tag === 'b' || tag === 'strong') {
          result += `**${serializeEditorContent(child)}**`;
        } else if (tag === 'i' || tag === 'em') {
          result += `*${serializeEditorContent(child)}*`;
        } else if (tag === 'u') {
          result += `<u>${serializeEditorContent(child)}</u>`;
        } else if (tag === 's' || tag === 'strike' || tag === 'del') {
          result += `~~${serializeEditorContent(child)}~~`;
        } else if (tag === 'blockquote') {
          result += `> ${serializeEditorContent(child)}\n`;
        } else if (tag === 'div' || tag === 'p') {
          result += `\n${serializeEditorContent(child)}`;
        } else if (tag === 'br') {
          result += '\n';
        } else {
          result += serializeEditorContent(child);
        }
      }
    });
    return result;
  };

  // Enviar mensaje
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!editorRef.current || isSending) return;

    const serializedText = serializeEditorContent(editorRef.current).trim();
    if (!serializedText && attachedImages.length === 0) return;

    onSend({
      text: serializedText,
      images: attachedImages
    });

    // Limpiar editor
    editorRef.current.innerHTML = '';
    setAttachedImages([]);
    setIsEmpty(true);
    setActiveStates({ bold: false, italic: false, underline: false, strike: false });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2 font-sans select-none">
      
      {/* Banner de respuesta */}
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs text-purple-200 animate-fade-in">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold">Respondiendo a @{replyingTo.username}:</span>
            <span className="text-gray-400 truncate italic">"{replyingTo.text}"</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 text-gray-400 hover:text-white transition cursor-pointer"
            title="Cancelar respuesta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Previsualización de imágenes adjuntas */}
      {attachedImages.length > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0d101a] border border-gray-800 overflow-x-auto">
          {attachedImages.map((imgData, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-purple-500/50 shrink-0 group">
              <img src={imgData} alt="Adjunto" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-rose-400 hover:bg-rose-600 hover:text-white transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Etiqueta de página de manga si aplica */}
      {showPageTag && currentPage && (
        <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer pl-1">
          <input
            type="checkbox"
            checked={includePageTag}
            onChange={(e) => onTogglePageTag && onTogglePageTag(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-purple-600 bg-gray-800 border-gray-700"
          />
          <span>Etiquetar viñeta actual (Página {currentPage})</span>
        </label>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Contenedor Principal del Editor */}
      <div className="rounded-2xl bg-[#111420] border border-gray-800 focus-within:border-purple-500/80 transition shadow-inner overflow-hidden flex flex-col">
        
        {/* Área de texto WYSIWYG interactiva con contentEditable */}
        <div className="relative min-h-[58px] max-h-[160px] overflow-y-auto custom-scrollbar px-3.5 pt-3 pb-2 text-xs sm:text-sm text-white select-text">
          <div
            ref={editorRef}
            contentEditable
            onInput={checkActiveFormats}
            onKeyUp={checkActiveFormats}
            onMouseUp={checkActiveFormats}
            onKeyDown={handleKeyDown}
            className="w-full outline-none focus:outline-none min-h-[40px] whitespace-pre-wrap break-words leading-relaxed"
            style={{ caretColor: '#a855f7' }}
          />

          {/* Placeholder visual cuando está vacío */}
          {isEmpty && (
            <div 
              onClick={() => editorRef.current?.focus()}
              className="absolute top-3 left-3.5 text-gray-500 text-xs sm:text-sm pointer-events-none select-none"
            >
              {placeholder}
            </div>
          )}
        </div>

        {/* Barra de Herramientas WYSIWYG */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-gray-800/80 bg-[#0d101a]">
          
          <div className="flex items-center gap-1">
            
            {/* Negrita (B) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }}
              className={`p-1.5 rounded-lg transition cursor-pointer font-bold text-xs ${
                activeStates.bold 
                  ? 'bg-purple-600 text-white shadow-md border border-purple-400' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/70'
              }`}
              title="Negrita (B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Cursiva (I) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }}
              className={`p-1.5 rounded-lg transition cursor-pointer italic text-xs ${
                activeStates.italic 
                  ? 'bg-purple-600 text-white shadow-md border border-purple-400' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/70'
              }`}
              title="Cursiva (I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            {/* Subrayado (U) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execFormat('underline'); }}
              className={`p-1.5 rounded-lg transition cursor-pointer text-xs ${
                activeStates.underline 
                  ? 'bg-purple-600 text-white shadow-md border border-purple-400' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/70'
              }`}
              title="Subrayado (U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            {/* Tachado (S) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execFormat('strikeThrough'); }}
              className={`p-1.5 rounded-lg transition cursor-pointer text-xs ${
                activeStates.strike 
                  ? 'bg-purple-600 text-white shadow-md border border-purple-400' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/70'
              }`}
              title="Tachado (S)"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            {/* Cita (99) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleQuote(); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/70 transition cursor-pointer text-xs"
              title="Cita (>)"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            {/* SPOILER (👁️ Ojito) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSpoiler(); }}
              className="p-1.5 rounded-lg text-purple-400 hover:text-purple-200 hover:bg-purple-950/60 border border-purple-800/40 transition cursor-pointer text-xs"
              title="Spoiler: Selecciona texto y pulsa el ojo para taparlo"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Subir Fotos (🖼️ Galería) */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-gray-800/70 transition cursor-pointer text-xs"
              title="Subir fotos o imágenes"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botón Enviar / Responder */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isEmpty || isSending}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            title="Enviar mensaje (Enter)"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>{replyingTo ? 'Responder' : 'Enviar'}</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </div>

      </div>

      {/* Estilos CSS Globales para Spoilers en el Editor WYSIWYG */}
      <style>{`
        .yomori-editor-spoiler {
          background-color: #5c637a !important;
          color: transparent !important;
          border-radius: 4px;
          padding: 1px 6px;
          margin: 0 2px;
          user-select: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-block;
        }
        .yomori-editor-spoiler:hover {
          color: #ffffff !important;
          background-color: #434858 !important;
        }
      `}</style>
    </div>
  );
}
