import React, { useState, useEffect } from 'react';
import { 
  X, 
  Puzzle, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Download, 
  Check, 
  Globe, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  FileCode,
  Loader2
} from 'lucide-react';
import axios from 'axios';

export default function ExtensionsModal({
  isOpen,
  onClose,
  repositories = [],
  onAddRepository,
  onRemoveRepository,
  installedExtensions = [],
  onRefreshInstalled
}) {
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [installingId, setInstallingId] = useState(null);
  const [repoExtensions, setRepoExtensions] = useState([]);
  const [activeTab, setActiveTab] = useState('installed');

  if (!isOpen) return null;

  const handleSyncRepos = async () => {
    setSyncing(true);
    const allExts = [];
    for (const repo of repositories) {
      try {
        const targetUrl = repo.url.endsWith('.json') ? repo.url : `${repo.url.replace(/\/+$/, '')}/index.json`;
        const res = await axios.get(targetUrl);
        if (Array.isArray(res.data)) {
          res.data.forEach(ext => {
            allExts.push({
              ...ext,
              sourceRepo: repo.name || repo.url
            });
          });
        }
      } catch (err) {
        console.error(`Error sincronizando repo ${repo.url}:`, err);
      }
    }
    setRepoExtensions(allExts);
    setSyncing(false);
  };

  const handleInstallClick = async (ext) => {
    setInstallingId(ext.id);
    try {
      // Petición al backend de Tachiyomi para descargar con fs el script .js
      const res = await axios.post('/api/extensions/install', {
        id: ext.id,
        name: ext.name,
        version: ext.version,
        scriptUrl: ext.scriptUrl,
        baseUrl: ext.baseUrl,
        icon: ext.icon,
        lang: ext.lang
      });

      if (res.data?.success) {
        await onRefreshInstalled();
      }
    } catch (err) {
      alert(`Error al descargar e instalar script: ${err.response?.data?.message || err.message}`);
    } finally {
      setInstallingId(null);
    }
  };

  const handleUninstallClick = async (extId) => {
    try {
      const res = await axios.post('/api/extensions/uninstall', { id: extId });
      if (res.data?.success) {
        await onRefreshInstalled();
      }
    } catch (err) {
      alert(`Error al desinstalar: ${err.message}`);
    }
  };

  const isInstalled = (extId) => installedExtensions.some(e => e.id === extId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] bg-[#121622] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col relative text-gray-200 overflow-hidden"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Puzzle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Extensiones Yomori (Scripts .js)</h3>
              <p className="text-xs text-gray-400">Descarga y carga dinámica vía Node.js (fs + import)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 pb-2">
          <div className="flex items-center bg-[#0d1017] p-1 rounded-xl border border-gray-800 text-xs">
            <button
              onClick={() => setActiveTab('installed')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'installed' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Instaladas ({installedExtensions.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('available');
                if (repoExtensions.length === 0) handleSyncRepos();
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'available' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Disponibles en Repo
            </button>
            <button
              onClick={() => setActiveTab('repos')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'repos' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Repositorios ({repositories.length})
            </button>
          </div>

          <button
            onClick={handleSyncRepos}
            disabled={syncing}
            className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs font-medium flex items-center gap-1.5 transition"
            title="Sincronizar repositorios"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-purple-400' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {/* TAB 1: INSTALADAS */}
          {activeTab === 'installed' && (
            <div className="space-y-2.5">
              {installedExtensions.length > 0 ? (
                installedExtensions.map((ext) => (
                  <div
                    key={ext.id}
                    className="p-3.5 rounded-2xl bg-[#171b26] border border-gray-800 hover:border-purple-800/50 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center font-bold text-sm text-purple-300 shrink-0">
                        <FileCode className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white truncate">{ext.name}</h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50 font-mono">
                            v{ext.version}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          Archivo local: <code className="text-purple-300/80 font-mono">installed-extensions/{ext.id}.js</code>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUninstallClick(ext.id)}
                      className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Desinstalar</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-gray-500">
                  <Puzzle className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-400">No hay extensiones descargadas en disco</p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Ve a la pestaña "Disponibles en Repo" e instala el script .js de Olympus Scanlation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISPONIBLES EN EL REPOSITORIO KEIYOUSHI */}
          {activeTab === 'available' && (
            <div className="space-y-2.5">
              {repoExtensions.length > 0 ? (
                repoExtensions.map((ext) => {
                  const installed = isInstalled(ext.id);
                  const isDownloading = installingId === ext.id;

                  return (
                    <div
                      key={ext.id}
                      className="p-3.5 rounded-2xl bg-[#171b26] border border-gray-800 hover:border-purple-800/50 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700/60 flex items-center justify-center font-bold text-sm text-purple-400 shrink-0">
                          {ext.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white truncate">{ext.name}</h4>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50 font-mono">
                              v{ext.version}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{ext.description || ext.baseUrl}</p>
                          <p className="text-[10px] text-gray-500 font-mono truncate mt-0.5">
                            scriptUrl: {ext.scriptUrl}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => !installed && handleInstallClick(ext)}
                        disabled={installed || isDownloading}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                          installed
                            ? 'bg-purple-950 text-purple-300 border border-purple-700'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                        }`}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Descargando fs...</span>
                          </>
                        ) : installed ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Instalada en Disco</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar e Instalar</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-gray-500">
                  <RefreshCw className="w-10 h-10 text-gray-700 mx-auto mb-2 animate-spin text-purple-400" />
                  <p className="text-xs font-semibold text-gray-400">Consultando index.json de los repositorios...</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONFIGURACIÓN DE REPOSITORIOS */}
          {activeTab === 'repos' && (
            <div className="space-y-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (newRepoUrl.trim()) {
                  onAddRepository(newRepoUrl.trim());
                  setNewRepoUrl('');
                  handleSyncRepos();
                }
              }} className="flex gap-2">
                <input
                  type="url"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  placeholder="http://localhost:5000/index.json"
                  className="flex-1 bg-[#0b0e14] border border-gray-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!newRepoUrl.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </form>

              <div className="space-y-2">
                {repositories.map((repo, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#171b26] border border-gray-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{repo.name || 'Repositorio Yomori'}</h4>
                      <p className="text-[11px] text-gray-400 font-mono truncate">{repo.url}</p>
                    </div>
                    {repositories.length > 1 && (
                      <button
                        onClick={() => onRemoveRepository(repo.url)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5 text-purple-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Mapeo Real scriptUrl ➔ fs.writeFileSync ➔ import()</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
