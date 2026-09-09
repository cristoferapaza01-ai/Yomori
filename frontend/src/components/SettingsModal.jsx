import React from 'react';
import { X, Sliders, Layout, Sun, ShieldCheck, Trash2, Moon } from 'lucide-react';
import axios from 'axios';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) {
  if (!isOpen) return null;

  const currentWidth = settings.readerWidth || '850px';
  const currentBg = settings.backgroundColor || '#07080b';
  const currentSpeed = settings.autoScrollSpeed || 3;
  const currentControlsMode = settings.floatingControlsMode || 'visible';

  const widthOptions = [
    { label: 'Estrecho', value: '650px' },
    { label: 'Normal', value: '850px' },
    { label: 'Ancho', value: '1050px' },
    { label: 'Completo', value: '100%' }
  ];

  const colorOptions = [
    { color: '#07080b', title: 'Negro Puro' },
    { color: '#111422', title: 'Azul Marino / Navy' },
    { color: '#201815', title: 'Sepia Oscuro' },
    { color: '#f4ede2', title: 'Sepia Claro / Crema' },
    { color: '#ffffff', title: 'Blanco' }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs select-none transition-opacity animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed top-0 right-0 bottom-0 w-72 sm:w-80 bg-[#0c101a] border-l border-gray-800/90 p-5 shadow-2xl shadow-black z-50 flex flex-col justify-between overflow-y-auto animate-slideLeft text-gray-200"
      >
        <div>
          {/* Encabezado */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-800/80">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Ajustes</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/80 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        {/* Opciones */}
        <div className="py-4 space-y-5">
          
          {/* 1. ANCHO DE LECTURA */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2.5">
              ANCHO DE LECTURA
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#090c14] border border-gray-800/90 rounded-2xl">
              {widthOptions.map((opt) => {
                const isSelected = currentWidth === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onUpdateSettings({ readerWidth: opt.value })}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold transition text-center ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. FONDO */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2.5">
              FONDO
            </label>
            <div className="flex items-center gap-3">
              {colorOptions.map((opt) => {
                const isSelected = currentBg.toLowerCase() === opt.color.toLowerCase();
                return (
                  <button
                    key={opt.color}
                    onClick={() => onUpdateSettings({ backgroundColor: opt.color })}
                    className={`w-9 h-9 rounded-full transition-all transform hover:scale-105 ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-offset-[#0c101a] ring-purple-500 scale-110 shadow-lg'
                        : 'border border-gray-700/80'
                    }`}
                    style={{ backgroundColor: opt.color }}
                    title={opt.title}
                  />
                );
              })}
            </div>
          </div>

          {/* 3. VELOCIDAD DE AUTO-SCROLL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                VELOCIDAD DE AUTO-SCROLL
              </label>
              <span className="text-xs font-mono font-bold text-purple-400">
                {currentSpeed}
              </span>
            </div>
            
            <input
              type="range"
              min={1}
              max={10}
              value={currentSpeed}
              onChange={(e) => onUpdateSettings({ autoScrollSpeed: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            
            <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-medium">
              <span>Lento</span>
              <span>Rápido</span>
            </div>
          </div>

          {/* 4. CONTROLES FLOTANTES */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2.5">
              CONTROLES FLOTANTES
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#090c14] border border-gray-800/90 rounded-2xl">
              {[
                { label: 'Visibles', value: 'visible' },
                { label: 'Ocultar', value: 'auto-hide' }
              ].map((opt) => {
                const isSelected = currentControlsMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onUpdateSettings({ floatingControlsMode: opt.value })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition text-center ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          </div>
        </div>

        {/* Botón Guardar / Cerrar */}
        <div className="pt-3 border-t border-gray-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30 active:scale-95"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
