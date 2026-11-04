import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth, authApi } from '@/features/auth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      login(res.token, res.user);
      navigate('/');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng nhập không thành công.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-[#13151d] border border-[#242733] rounded-3xl p-8 shadow-2xl">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-3.5 rounded-full bg-[#e6e2c1]/15 text-[#e6e2c1] mb-2">
            <Film className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Đăng nhập tài khoản</h1>
          <p className="text-sm text-zinc-400">Truy cập để quản lý vé và đặt vé xem phim</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-800 text-red-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-[#090a0f] border border-[#242733] text-zinc-200 text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#e6e2c1] focus:ring-1 focus:ring-[#e6e2c1] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#090a0f] border border-[#242733] text-zinc-200 text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#e6e2c1] focus:ring-1 focus:ring-[#e6e2c1] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-[#e6e2c1] hover:bg-[#dad6b2] active:scale-[0.98] disabled:opacity-50 text-black text-sm font-bold rounded-full shadow-lg transition-all cursor-pointer border-none"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-400">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-[#e6e2c1] hover:underline font-bold">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
