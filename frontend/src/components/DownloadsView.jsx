import React from 'react';
import { Download, CheckCircle, HardDrive, ShieldCheck, Zap } from 'lucide-react';

export default function DownloadsView({ onExplore }) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-purple-400" />
            <span>Descargas & Caché Offline</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Gestión de lectura offline y precarga de viñetas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-5 rounded-3xl bg-[#121622] border border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Precarga Inteligente</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              El lector descarga 4 páginas por adelantado para lectura instantánea.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#121622] border border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Caché en Disco Backend</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Las viñetas se almacenan en caché durante 24h para no re-descargar.
            </p>
          </div>
        </div>
      </div>

      <div className="py-16 text-center text-gray-500 max-w-sm mx-auto flex flex-col items-center">
        <Download className="w-12 h-12 text-gray-700 mb-3" />
        <h3 className="text-base font-bold text-gray-300">Cola de descargas vacía</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          Los capítulos que abras se guardan en caché automáticamente para lectura fluida.
        </p>
      </div>
    </div>
  );
}
