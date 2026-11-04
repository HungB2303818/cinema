import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { useAuth, authApi } from '@/features/auth';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
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
      const res = await authApi.register({ fullName, email, password });
      login(res.token, res.user);
      navigate('/');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng ký không thành công.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-3 rounded-xl bg-rose-600/10 text-rose-500 mb-2">
            <Film className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Tạo tài khoản mới</h1>
          <p className="text-sm text-slate-400">Đăng ký thành viên để nhận ưu đãi và đặt vé tiện lợi</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Họ và tên</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {loading ? 'Đang khởi tạo tài khoản...' : 'Đăng ký tài khoản'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-rose-400 hover:text-rose-300 font-semibold">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
