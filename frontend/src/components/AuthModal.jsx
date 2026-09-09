import React, { useState } from 'react';
import axios from 'axios';
import { 
  X, 
  AtSign, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  BookOpen,
  Sparkles,
  Loader2,
  KeyRound
} from 'lucide-react';

// Validador de formato de correo estándar RFC 5322
const isValidEmailFormat = (val) => {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();
  if (clean.length > 254 || clean.length < 5) return false;
  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (local.length > 64 || local.length === 0) return false;
  if (!domain.includes('.')) return false;
  const domainParts = domain.split('.');
  if (domainParts.some(p => p.length === 0)) return false;
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(clean);
};

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login', // 'login' | 'register'
  onLoginSuccess
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [emailOrUser, setEmailOrUser] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // Cálculo visual de seguridad de contraseña
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
  const isCurrentEmailValid = isValidEmailFormat(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (mode === 'register') {
      if (!username.trim() || username.trim().length < 3) {
        setError('El nombre de usuario debe tener al menos 3 caracteres.');
        return;
      }

      if (!isValidEmailFormat(email)) {
        setError('Por favor ingresa un correo electrónico válido (ejemplo: usuario@correo.com con su dominio .com, .es, etc.).');
        return;
      }

      if (!password || password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden. Verifícalas por favor.');
        return;
      }

      setIsLoading(true);

      try {
        const response = await axios.post('/api/auth/register', {
          username: username.trim(),
          email: email.trim(),
          password
        });

        if (response.data?.success && response.data?.user) {
          const user = response.data.user;
          localStorage.setItem('tachiyomi_user', JSON.stringify(user));
          setSuccessMessage('¡Cuenta creada con éxito! Bienvenido a Yomori.');
          setTimeout(() => {
            if (onLoginSuccess) onLoginSuccess(user);
            onClose();
          }, 600);
        } else {
          setError(response.data?.message || 'No se pudo crear la cuenta.');
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        
        // Fallback local en caso de estar completamente offline
        if (err.code === 'ERR_NETWORK' || !err.response) {
          const localUser = {
            id: 'local_' + Date.now(),
            username: username.trim(),
            email: email.trim(),
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username.trim())}`,
            provider: 'local',
            createdAt: new Date().toISOString()
          };
          localStorage.setItem('tachiyomi_user', JSON.stringify(localUser));
          setSuccessMessage('¡Cuenta creada localmente!');
          setTimeout(() => {
            if (onLoginSuccess) onLoginSuccess(localUser);
            onClose();
          }, 600);
          return;
        }

        setError(msg);
      } finally {
        setIsLoading(false);
      }

    } else {
      // Modo LOGIN
      if (!emailOrUser.trim()) {
        setError('Por favor ingresa tu usuario o correo electrónico.');
        return;
      }

      if (!password) {
        setError('Por favor ingresa tu contraseña.');
        return;
      }

      setIsLoading(true);

      try {
        const response = await axios.post('/api/auth/login', {
          emailOrUsername: emailOrUser.trim(),
          password
        });

        if (response.data?.success && response.data?.user) {
          const user = response.data.user;
          localStorage.setItem('tachiyomi_user', JSON.stringify(user));
          setSuccessMessage(`¡Bienvenido de nuevo, ${user.username}!`);
          setTimeout(() => {
            if (onLoginSuccess) onLoginSuccess(user);
            onClose();
          }, 600);
        } else {
          setError(response.data?.message || 'Usuario o contraseña incorrectos.');
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Credenciales incorrectas o usuario no encontrado.';

        // Fallback local si el usuario ya estaba registrado en localStorage
        if (err.code === 'ERR_NETWORK' || !err.response) {
          const saved = localStorage.getItem('tachiyomi_user');
          if (saved) {
            try {
              const u = JSON.parse(saved);
              if (u.email === emailOrUser.trim() || u.username === emailOrUser.trim()) {
                setSuccessMessage(`¡Bienvenido, ${u.username}!`);
                setTimeout(() => {
                  if (onLoginSuccess) onLoginSuccess(u);
                  onClose();
                }, 600);
                return;
              }
            } catch (e) {}
          }
        }

        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      
      {/* Backdrop con Blur */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Contenedor del Modal con Colores Yomori */}
      <div className="relative w-full max-w-md bg-[#10141f] border border-purple-900/40 rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-purple-950/50 z-10 overflow-hidden transform transition-all">
        
        {/* Glow de fondo decorativo */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Controles Superiores: Botón Switch (Izquierda) y Botón Cerrar (Derecha) */}
        <div className="flex items-center justify-between mb-2 relative z-10">
          
          {/* Botón Switch Modo (Registrarse / Iniciar Sesión) */}
          <button
            type="button"
            onClick={() => {
              setMode(prev => prev === 'login' ? 'register' : 'login');
              setError('');
              setSuccessMessage('');
            }}
            className="px-4 py-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-700/50 text-purple-200 font-bold text-xs tracking-wide shadow-md transition transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>{mode === 'login' ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
          </button>

          {/* Botón Circular Cerrar (X) */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-gray-700/50"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Emblema Oficial Yomori */}
        <div className="flex justify-center my-3 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-600 p-0.5 shadow-xl shadow-purple-600/30 flex items-center justify-center">
            <div className="w-full h-full rounded-2xl bg-[#121622] border border-purple-500/50 flex items-center justify-center overflow-hidden">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-inner">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Títulos */}
        <div className="text-center mb-6 relative z-10">
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>{mode === 'login' ? '¡Bienvenido a Yomori!' : '¡Crea tu Cuenta!'}</span>
            <Sparkles className="w-5 h-5 text-purple-400" />
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'login' 
              ? 'Ingresa tus credenciales para sincronizar tus mangas y capítulos.' 
              : 'Regístrate para guardar tu progreso y favoritos en la nube.'}
          </p>
        </div>

        {/* Alertas */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
          
          {/* MODO REGISTRO: Campo Nombre de Usuario */}
          {mode === 'register' && (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <User className="w-4 h-4 text-purple-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de Usuario (Apodo)"
                required
                className="w-full bg-[#181d2a] border border-gray-700/80 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition select-text"
              />
            </div>
          )}

          {/* Campo Correo o Usuario */}
          {mode === 'register' ? (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <AtSign className="w-4 h-4 text-purple-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico (ej: usuario@gmail.com)"
                required
                className={`w-full bg-[#181d2a] border rounded-2xl pl-11 pr-11 py-3 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none transition select-text ${
                  email && isCurrentEmailValid 
                    ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                    : email && !isCurrentEmailValid 
                      ? 'border-amber-500/70 focus:border-amber-500 focus:ring-1 focus:ring-amber-500' 
                      : 'border-gray-700/80 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                }`}
              />
              {email && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isCurrentEmailValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-amber-400">@dominio.com</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <User className="w-4 h-4 text-purple-400" />
              </div>
              <input
                type="text"
                value={emailOrUser}
                onChange={(e) => setEmailOrUser(e.target.value)}
                placeholder="Correo o Nombre de Usuario"
                required
                className="w-full bg-[#181d2a] border border-gray-700/80 rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition select-text"
              />
            </div>
          )}

          {/* Campos Contraseña */}
          {mode === 'login' ? (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Lock className="w-4 h-4 text-purple-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                className="w-full bg-[#181d2a] border border-gray-700/80 rounded-2xl pl-11 pr-11 py-3.5 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition select-text"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-300 cursor-pointer p-1"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Lock className="w-4 h-4 text-purple-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                  className="w-full bg-[#181d2a] border border-gray-700/80 rounded-2xl pl-10 pr-3 py-3 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition select-text"
                />
              </div>

              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar"
                  required
                  className="w-full bg-[#181d2a] border border-gray-700/80 rounded-2xl pl-10 pr-3 py-3 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition select-text"
                />
              </div>
            </div>
          )}

          {/* Segmentos de Fuerza de Contraseña */}
          {mode === 'register' && (
            <div className="space-y-1 pt-1 px-1">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((seg) => (
                  <div
                    key={seg}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      seg <= strengthScore 
                        ? strengthScore >= 4 ? 'bg-emerald-500' : strengthScore >= 2 ? 'bg-purple-500' : 'bg-rose-500'
                        : 'bg-[#22293a]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-mono text-right">
                {strengthScore >= 4 ? 'Seguridad: Alta' : strengthScore >= 2 ? 'Seguridad: Media' : 'Seguridad: Básica'}
              </p>
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
                  className="w-4 h-4 rounded bg-[#181d2a] border-gray-600 text-purple-600 focus:ring-0 cursor-pointer accent-purple-600"
                />
                <span>Recordarme</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Para restablecer tu contraseña, contacta al soporte de Yomori o ingresa tu correo registrado.')}
                className="text-purple-400 hover:text-purple-300 font-medium transition cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {/* Botón Principal de Acción (Login / Registrar) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-purple-600/30 transition transform hover:scale-[1.01] active:scale-98 cursor-pointer mt-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'login' ? 'Iniciando sesión...' : 'Registrando cuenta...'}</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Iniciar Sesión' : 'Crear mi Cuenta'}</span>
            )}
          </button>

        </form>

      </div>

    </div>
  );
}
