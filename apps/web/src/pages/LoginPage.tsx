import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, MailCheck, Plus, RotateCcw, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import gsap from 'gsap';
import { api } from '@/services/api';
import { getInitials, getRememberedIdentities, rememberIdentity, RememberedIdentity, useAuthStore, validateRememberedIdentities } from '@/store/authStore';

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const modeTitle = {
  login: 'Welcome to SK Auth',
  register: 'Create your SK identity',
  verify: 'Verify your email',
  forgot: 'Recover this account',
  reset: 'Create a new password'
};

const modeIcon = { login: LockKeyhole, register: UserPlus, verify: MailCheck, forgot: RotateCcw, reset: KeyRound };

export default function LoginPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [remembered, setRemembered] = useState<RememberedIdentity[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<RememberedIdentity | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [canResetPassword, setCanResetPassword] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const login = useAuthStore((state) => state.login);
  const loadSession = useAuthStore((state) => state.loadSession);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const requestedMode = params.get('mode');
  const returnTo = params.get('returnTo') || '/';
  const Icon = modeIcon[mode];
  const hasRemembered = remembered.length > 0;
  const showAccountPicker = mode === 'login' && hasRemembered && !selectedIdentity;

  useEffect(() => {
    const localIdentities = getRememberedIdentities();
    setRemembered(localIdentities);
    if (requestedMode === 'register' || (!requestedMode && localIdentities.length === 0)) setMode('register');
    void validateRememberedIdentities().then((validIdentities) => {
      setRemembered(validIdentities);
      if (!requestedMode && validIdentities.length === 0) setMode('register');
    });
    void loadSession();
  }, [loadSession, requestedMode]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timeout = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [resendSeconds]);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-auth-panel]', { y: 30, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out' });
      gsap.fromTo('[data-auth-field]', { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.045, ease: 'power2.out' });
      gsap.to('[data-auth-orbit]', { rotate: 360, duration: 22, repeat: -1, ease: 'none' });
      gsap.to('[data-auth-float]', { y: -12, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.22 });
    }, rootRef);
    return () => ctx.revert();
  }, [mode, showAccountPicker]);

  useEffect(() => {
    if (!user) return;
    if (returnTo.startsWith('http')) window.location.replace(returnTo);
    else void navigate(returnTo, { replace: true });
  }, [navigate, returnTo, user]);

  const subtitle = useMemo(() => {
    if (showAccountPicker) return 'Choose an account to continue instantly on this browser.';
    if (mode === 'register') return 'Register once, verify by email OTP, and use every SK application with one identity.';
    if (mode === 'verify') return 'Enter the OTP sent to your email to activate your SK Auth account.';
    if (mode === 'forgot' || mode === 'reset') return 'Verify the OTP for this account before setting a fresh password.';
    return selectedIdentity ? `Unlock ${selectedIdentity.email}` : 'Create a new SK Auth account for this browser.';
  }, [mode, selectedIdentity, showAccountPicker]);

  const finish = () => {
    if (returnTo.startsWith('http')) window.location.href = returnTo;
    else void navigate(returnTo, { replace: true });
  };

  const chooseIdentity = async (identity: RememberedIdentity) => {
    setError('');
    setMessage('Checking active SK Auth session...');
    const current = await loadSession();
    if (current?.email === identity.email) {
      finish();
      return;
    }
    setSelectedIdentity(identity);
    setEmail(identity.email);
    setPassword('');
    setConfirmPassword('');
    setMessage('Your remembered account is signed out. Enter its password to refresh SK Auth.');
    setError('');
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setOtp('');
    setError('');
    setMessage('');
    setCanResetPassword(false);
    if (nextMode === 'register') {
      setSelectedIdentity(null);
      setEmail('');
      setName('');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const beginForgotPassword = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Choose or enter an email first.');
      return;
    }
    await api.post('/auth/forgot-password', { email });
    setMode('reset');
    setResendSeconds(30);
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setMessage('Password reset OTP sent if this account exists.');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        await login(email, password);
        finish();
      }
      if (mode === 'register') {
        setMode('verify');
        setResendSeconds(30);
        setOtp('');
        setMessage('Sending verification OTP...');
        await api.post('/auth/register', { name, email, password, confirmPassword });
        setMessage('Verification OTP sent to your email.');
      }
      if (mode === 'verify') {
        const response = await api.post('/auth/verify-email', { email, otp });
        rememberIdentity(response.data.data.user);
        useAuthStore.setState({ user: response.data.data.user, initialized: true });
        finish();
      }
      if (mode === 'forgot') {
        await beginForgotPassword();
      }
      if (mode === 'reset') {
        await api.post('/auth/reset-password', { email, otp, password, confirmPassword });
        setMode('login');
        setSelectedIdentity(null);
        setOtp('');
        setPassword('');
        setConfirmPassword('');
        setRemembered(getRememberedIdentities());
        setMessage('Password updated. Sign in with your new password.');
      }
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      const nextError = apiError.response?.data?.message ?? 'Something went wrong.';
      setError(nextError);
      if (mode === 'register') setMode('register');
      if (mode === 'login') setCanResetPassword(true);
      if (mode === 'login' && nextError.includes('verification')) setMode('verify');
    }
  };

  return (
    <main ref={rootRef} className="relative grid min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.28),transparent_32%),linear-gradient(135deg,#f8fafc,#eef6ff_48%,#fff7ed)] px-3 py-3 sm:px-4 sm:py-8">
      <div data-auth-orbit className="pointer-events-none absolute -left-28 top-12 h-72 w-72 rounded-full border border-cyan-300/40" />
      <div data-auth-orbit className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full border border-amber-300/40" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-5 lg:grid-cols-[0.9fr_1fr]">
        <section data-auth-panel className="order-2 relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-[0_30px_120px_rgba(15,23,42,0.32)] lg:order-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-950">
            <Sparkles size={14} /> SK Auth
          </span>
          <h1 className="mt-8 max-w-lg text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl">One login for every SK app.</h1>
          <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-slate-300">
            Secure identity, email OTP verification, remembered device accounts, and seamless handoff into SK Quiz, SK Central, and future applications.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['Email OTP', 'Single session', 'Global logout'].map((item) => (
              <div key={item} data-auth-float className="rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-black text-white backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={submit} data-auth-panel className="glass order-1 w-full rounded-[2rem] p-5 shadow-2xl sm:p-7 lg:order-2">
          <div className="mb-6 flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white"><ShieldCheck size={22} /></span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">SK Auth</p>
              <h2 className="text-2xl font-black text-slate-950">{modeTitle[mode]}</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{subtitle}</p>
            </div>
          </div>

          {showAccountPicker ? (
            <div className="grid gap-3">
              {remembered.map((identity) => (
                <button
                  key={identity.email}
                  type="button"
                  data-auth-field
                  onClick={() => void chooseIdentity(identity)}
                  className="flex items-center gap-3 rounded-3xl border border-slate-900/10 bg-white/85 p-3 text-left shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl"
                >
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-200 via-amber-100 to-rose-200 text-base font-black text-slate-950">
                    {identity.avatarUrl ? <img src={identity.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(identity.name || identity.email)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-950">{identity.name}</span>
                    <span className="block truncate text-xs font-bold text-slate-500">{identity.email}</span>
                  </span>
                  <ArrowRight size={18} className="text-slate-400" />
                </button>
              ))}
              <button type="button" data-auth-field onClick={() => switchMode('register')} className="ml-auto inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
                <Plus size={17} /> Add new account
              </button>
            
            </div>
          ) : (
            <>
              {mode === 'register' ? (
                <label data-auth-field className="grid gap-1 text-xs font-black uppercase text-slate-500">
                  Full name
                  <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="rounded-2xl border-slate-200 text-sm font-bold normal-case" />
                </label>
              ) : null}

              <label data-auth-field className="mt-4 grid gap-1 text-xs font-black uppercase text-slate-500">
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="rounded-2xl border-slate-200 text-sm font-bold normal-case" readOnly={(Boolean(selectedIdentity) && mode === 'login') || mode === 'verify'} />
              </label>

              {mode === 'login' ? (
                <label data-auth-field className="mt-4 grid gap-1 text-xs font-black uppercase text-slate-500">
                  Password
                  <PasswordField value={password} onChange={setPassword} autoComplete="current-password" visible={showPassword} onToggle={() => setShowPassword((current) => !current)} />
                </label>
              ) : null}

              {mode === 'register' || mode === 'reset' ? (
                <div data-auth-field className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                    {mode === 'reset' ? 'New password' : 'Password'}
                    <PasswordField value={password} onChange={setPassword} autoComplete="new-password" visible={showPassword} onToggle={() => setShowPassword((current) => !current)} />
                  </label>
                  <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                    Confirm password
                    <PasswordField value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} />
                  </label>
                </div>
              ) : null}

              {mode === 'verify' || mode === 'reset' ? (
                <label data-auth-field className="mt-4 grid gap-1 text-xs font-black uppercase text-slate-500">
                  Email OTP
                  <input value={otp} onChange={(event) => setOtp(event.target.value)} className="rounded-2xl border-slate-200 text-sm font-bold normal-case" inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
                </label>
              ) : null}
            </>
          )}

          {message ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}

          {!showAccountPicker ? (
            <>
              <button disabled={loading} className="ml-auto mt-5 flex w-fit items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-60">
                <Icon size={18} /> {mode === 'login' ? 'Continue' : mode === 'register' ? 'Send verification OTP' : mode === 'verify' ? 'Verify and continue' : mode === 'forgot' ? 'Send reset OTP' : 'Reset password'}
              </button>
              {mode === 'verify' ? (
                <button type="button" disabled={resendSeconds > 0} onClick={() => void api.post('/auth/resend-verification', { email }).then(() => setResendSeconds(30))} className="ml-auto mt-2 flex w-fit rounded-2xl bg-white/80 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-60">
                  {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : 'Resend OTP'}
                </button>
              ) : null}
              {canResetPassword && mode === 'login' ? (
                <button type="button" onClick={() => void beginForgotPassword()} className="ml-auto mt-3 flex w-fit rounded-2xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-900">
                  Forgot password? Send OTP to this email
                </button>
              ) : null}
              {mode === 'register' ? (
                <button type="button" onClick={() => switchMode('login')} className="ml-auto mt-3 flex w-fit rounded-2xl bg-white/80 px-4 py-2 text-xs font-black text-slate-600">
                  Already registered? Sign in
                </button>
              ) : null}
              {mode === 'login' && !hasRemembered && !selectedIdentity ? (
                <button type="button" onClick={() => switchMode('register')} className="ml-auto mt-3 flex w-fit rounded-2xl bg-white/80 px-4 py-2 text-xs font-black text-slate-600">
                  New here? Create account
                </button>
              ) : null}
            </>
          ) : null}
        </form>
      </div>
    </main>
  );
}
function PasswordField({
  value,
  onChange,
  autoComplete,
  visible,
  onToggle
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <span className="relative">
      <input
        value={value}
        type={visible ? 'text' : 'password'}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border-slate-200 pr-11 text-sm font-bold normal-case"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  );
}

