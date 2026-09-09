import React, { useState } from 'react';
import { 
  Settings, 
  Eye, 
  Layout, 
  Space, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Trash2, 
  HardDrive,
  Database,
  Puzzle,
  Tag,
  Plus,
  Bookmark
} from 'lucide-react';
import axios from 'axios';

export default function SettingsView({
  settings,
  onUpdateSettings,
  onOpenExtensions,
  categories = ['Todos'],
  onAddCategory,
  onRemoveCategory
}) {
  const [newCatName, setNewCatName] = useState('');

  const handleCreateCategory = (e) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      alert('Esta categoría ya existe.');
      return;
    }
    if (onAddCategory) onAddCategory(clean);
    setNewCatName('');
  };
  const handleClearServerCache = async () => {
    try {
      await axios.post('/api/cache/clear');
      alert('¡Caché del servidor vaciada con éxito!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleExportBackup = () => {
    const backup = {
      library: JSON.parse(localStorage.getItem('tachiyomi_library') || '[]'),
      history: JSON.parse(localStorage.getItem('tachiyomi_history') || '[]'),
      settings: JSON.parse(localStorage.getItem('tachiyomi_settings') || '{}'),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tachiyomi-web-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <span>Ajustes de Tachiyomi Web</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Personalización del lector, extensiones y almacenamiento
          </p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* 1. LECTOR */}
        <div className="p-6 rounded-3xl bg-[#121622] border border-gray-800 space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>Comportamiento del Lector</span>
          </h3>

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-2">Modo de Lectura Predeterminado</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: 'Webtoon (Vertical Continuo)', value: 'webtoon' },
                { label: 'Manga (Paginado RTL)', value: 'paginated-rtl' },
                { label: 'Cómic (Paginado LTR)', value: 'paginated-ltr' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdateSettings({ readingMode: opt.value })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                    (settings.readingMode || 'webtoon') === opt.value
                      ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                      : 'bg-gray-800/60 border-gray-700/60 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-2">Ancho de Lectura (Webtoon)</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '650px', value: '600px' },
                { label: '850px', value: '800px' },
                { label: '1050px', value: '1000px' },
                { label: '100% (Ancho Completo)', value: '100%' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdateSettings({ readerWidth: opt.value })}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition ${
                    settings.readerWidth === opt.value
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300 font-bold'
                      : 'bg-gray-800/60 border-gray-700/60 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-2 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Brillo de Viñetas ({settings.brightness || 100}%)</span>
            </label>
            <input
              type="range"
              min={50}
              max={150}
              value={settings.brightness || 100}
              onChange={(e) => onUpdateSettings({ brightness: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>

        {/* 2. CATEGORÍAS DE LA BIBLIOTECA */}
        <div className="p-6 rounded-3xl bg-[#121622] border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              <span>Categorías de la Biblioteca (Botones Flotantes)</span>
            </h3>
          </div>
          
          <p className="text-xs text-gray-400">
            Crea botones personalizados que aparecerán flotando en la biblioteca para organizar tus mangas (por ejemplo: "Leyendo", "Favoritos", "Pendientes", "Completados", etc.).
          </p>

          {/* Formulario para añadir nueva categoría */}
          <form onSubmit={handleCreateCategory} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nombre del nuevo botón (ej. Favoritos)..."
              className="flex-1 bg-[#0a0c10] border border-gray-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
            />
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </form>

          {/* Lista de categorías activas */}
          <div className="pt-2">
            <label className="text-[11px] font-semibold text-gray-400 block mb-2 uppercase tracking-wide">
              Botones Activos en la Biblioteca
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isDefault = cat === 'Todos';
                return (
                  <div
                    key={cat}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border ${
                      isDefault
                        ? 'bg-purple-950/80 border-purple-800 text-purple-300 font-bold'
                        : 'bg-[#181d28] border-gray-700 text-gray-200'
                    }`}
                  >
                    <span>{cat}</span>
                    {!isDefault && onRemoveCategory && (
                      <button
                        onClick={() => onRemoveCategory(cat)}
                        className="p-0.5 rounded-full hover:bg-red-950 text-gray-400 hover:text-red-400 transition"
                        title={`Eliminar categoría "${cat}"`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. EXTENSIONES */}
        <div className="p-6 rounded-3xl bg-[#121622] border border-gray-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <Puzzle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Repositorios & Extensiones Keiyoushi</h4>
              <p className="text-xs text-gray-400 mt-0.5">Gestiona las fuentes descargadas en disco local.</p>
            </div>
          </div>
          <button
            onClick={onOpenExtensions}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-md transition"
          >
            Gestionar
          </button>
        </div>

        {/* 3. ALMACENAMIENTO & COPIAS DE SEGURIDAD */}
        <div className="p-6 rounded-3xl bg-[#121622] border border-gray-800 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <Database className="w-4 h-4" />
            <span>Almacenamiento y Copia de Seguridad</span>
          </h3>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-xs font-bold text-white">Copia de Seguridad de la Biblioteca</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Exporta tu biblioteca y capítulos leídos a un archivo JSON.</p>
            </div>
            <button
              onClick={handleExportBackup}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Exportar Backup</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-800/60">
            <div>
              <p className="text-xs font-bold text-white">Caché del Servidor de Scraping</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Libera la memoria RAM del backend.</p>
            </div>
            <button
              onClick={handleClearServerCache}
              className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar Caché RAM</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
