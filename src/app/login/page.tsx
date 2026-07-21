"use client";

import { useState } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { loginUser } from '@/app/actions/user';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const res = await loginUser(username, password);
    
    if (res.success && res.user) {
      login(res.user);
    } else {
      setError(res.error || 'ورود ناموفق بود.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header / Logo */}
        <div className="bg-blue-600 px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full -ml-8 -mb-8"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 transform rotate-12">
              <span className="text-2xl font-black text-blue-600 transform -rotate-12">OS</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Restaurant OS</h1>
            <p className="text-blue-100 text-sm mt-2 font-medium">سیستم جامع مدیریت هوشمند رستوران</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-800">ورود به سیستم</h2>
            <p className="text-sm text-gray-500 mt-1">لطفاً نام کاربری و رمز عبور خود را وارد کنید.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">نام کاربری</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-left font-sans"
                placeholder="admin"
                dir="ltr"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">رمز عبور</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-left font-sans tracking-widest"
                placeholder="••••"
                dir="ltr"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'درحال بررسی...' : 'ورود به پنل کاربری'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-medium">
              &copy; ۲۰۲۶ تمامی حقوق برای پلتفرم Restaurant OS محفوظ است.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
