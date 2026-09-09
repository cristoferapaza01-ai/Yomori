import React, { useState } from 'react';
import { 
  X, 
  AtSign, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login', // 'login' | 'register'
  onLoginSuccess
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // Cálculo de fuerza de contraseña para los 5 segmentos visuales
  const calculateStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strengthScore = calculateStrength(password);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }

      // Registro exitoso
      const username = email.split('@')[0];
      const newUser = {
        email,
        name: username.charAt(0).toUpperCase() + username.slice(1),
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
        provider: 'local',
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('tachiyomi_user', JSON.stringify(newUser));
      setSuccessMessage('¡Cuenta creada con éxito!');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(newUser);
        onClose();
      }, 700);
    } else {
      // Login exitoso
      const username = email.split('@')[0];
      const loggedUser = {
        email,
        name: username.charAt(0).toUpperCase() + username.slice(1),
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
        provider: 'local',
        loggedInAt: new Date().toISOString()
      };

      localStorage.setItem('tachiyomi_user', JSON.stringify(loggedUser));
      setSuccessMessage('¡Inicio de sesión correcto!');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(loggedUser);
        onClose();
      }, 700);
    }
  };

  const handleGoogleAuth = () => {
    const googleUser = {
      email: 'lector.tachiyomi@gmail.com',
      name: 'Google Reader',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      provider: 'google',
      loggedInAt: new Date().toISOString()
    };

    localStorage.setItem('tachiyomi_user', JSON.stringify(googleUser));
    setSuccessMessage('¡Autenticado con Google!');
    setTimeout(() => {
      if (onLoginSuccess) onLoginSuccess(googleUser);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      
      {/* Backdrop con Blur */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Contenedor del Modal */}
      <div className="relative w-full max-w-md bg-[#181e2b] border border-gray-700/80 rounded-[32px] p-6 sm:p-8 shadow-2xl z-10 overflow-hidden transform transition-all">
        
        {/* Controles Superiores: Botón Switch (Izquierda) y Botón Cerrar (Derecha) */}
        <div className="flex items-center justify-between mb-2">
          
          {/* Botón Switch Modo (Registrar / Login) */}
          <button
            type="button"
            onClick={() => {
              setMode(prev => prev === 'login' ? 'register' : 'login');
              setError('');
              setSuccessMessage('');
            }}
            className="px-5 py-2 rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs tracking-wide shadow-lg shadow-amber-500/20 transition transform active:scale-95 cursor-pointer"
          >
            {mode === 'login' ? 'Registrar' : 'Login'}
          </button>

          {/* Botón Circular Cerrar (X) */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#262f40] hover:bg-[#323c52] text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer border border-gray-600/40"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emblema / Logo Central */}
        <div className="flex justify-center my-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 p-0.5 shadow-xl shadow-orange-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-[#1c2230] border-2 border-amber-500/80 flex items-center justify-center overflow-hidden">
              {/* Icono de Templo / Portal en Escudo Dorado */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-500 to-orange-600 flex items-center justify-center text-black font-black shadow-inner">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-[#141822]">
                  <path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h2v-9H4zm5 0v9h2v-9H9zm5 0v9h2v-9h-2zm5 0v9h2v-9h-2zM2 20v2h20v-2H2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Títulos */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white tracking-tight">
            {mode === 'login' ? '¡Bienvenido de nuevo!' : '¡Crea tu cuenta!'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'login' 
              ? 'Ingresa tus credenciales para acceder a tu cuenta.' 
              : 'Completa tus datos para disfrutar de lectura ilimitada.'}
          </p>
        </div>

        {/* Alertas */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Campo Correo */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <AtSign className="w-5 h-5" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo"
              required
              className="w-full bg-[#242b3b] border border-gray-700/80 rounded-2xl pl-12 pr-4 py-3.5 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition select-text"
            />
          </div>

          {/* Campos Contraseña */}
          {mode === 'login' ? (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                className="w-full bg-[#242b3b] border border-gray-700/80 rounded-2xl pl-12 pr-11 py-3.5 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition select-text"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                  className="w-full bg-[#242b3b] border border-gray-700/80 rounded-2xl pl-10 pr-3 py-3 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition select-text"
                />
              </div>

              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar"
                  required
                  className="w-full bg-[#242b3b] border border-gray-700/80 rounded-2xl pl-10 pr-3 py-3 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition select-text"
                />
              </div>
            </div>
          )}

          {/* Segmentos de Fuerza de Contraseña (Como en Imagen 2) */}
          {mode === 'register' && (
            <div className="flex items-center gap-1.5 pt-1 px-1">
              {[1, 2, 3, 4, 5].map((seg) => (
                <div
                  key={seg}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    seg <= strengthScore 
                      ? strengthScore >= 4 ? 'bg-emerald-500' : strengthScore >= 2 ? 'bg-amber-500' : 'bg-rose-500'
                      : 'bg-[#283144]'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Recordarme y Recuperar Contraseña */}
          {mode === 'login' && (
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#242b3b] border-gray-600 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span>Recordarme</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Se ha enviado un enlace de recuperación a tu correo.')}
                className="text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer"
              >
                Recuperar contraseña
              </button>
            </div>
          )}

          {/* Botón Principal de Acción (Login / Registrar) */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-sm tracking-wide shadow-xl shadow-amber-500/20 transition transform active:scale-98 cursor-pointer mt-2"
          >
            {mode === 'login' ? 'Login' : 'Registrar'}
          </button>

          {/* Separador */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-gray-700/80 w-full" />
            <span className="bg-[#181e2b] px-3 text-[11px] text-gray-400 uppercase tracking-wider font-semibold absolute">
              O
            </span>
          </div>

          {/* Botón de Autenticación con Google */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full py-3 rounded-2xl bg-[#242b3b] hover:bg-[#2e374a] border border-gray-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition cursor-pointer shadow-md"
          >
            {/* SVG Oficial de Google */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
            <span>{mode === 'login' ? 'Iniciar sesión con Google' : 'Registrarse con Google'}</span>
          </button>

        </form>

      </div>

    </div>
  );
}
