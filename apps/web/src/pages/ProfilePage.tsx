import { BadgeCheck, Bell, CalendarDays, Camera, CheckCircle2, LogOut, Mail, MapPin, Palette, Shield, Sparkles, UserRound } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { useApplicationStore } from '@/store/applicationStore';
import { getInitials, useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const profile = useApplicationStore((state) => state.profile);
  const updateProfile = useApplicationStore((state) => state.updateProfile);
  const applications = useApplicationStore((state) => state.applications);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [section, setSection] = useState<'profile' | 'settings' | 'more'>('profile');

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-profile]', { y: 28, opacity: 0, rotateX: -8 }, { y: 0, opacity: 1, rotateX: 0, duration: 0.75, stagger: 0.08, ease: 'power3.out' });
      gsap.to('[data-orbit]', { rotate: 360, duration: 18, repeat: -1, ease: 'none' });
    }, rootRef);
    return () => ctx.revert();
  }, [section]);

  const onInput = (key: keyof typeof profile) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    updateProfile({ [key]: event.target.value });
  };

  const signOut = async () => {
    await logout(true);
    void navigate('/login');
  };

  const displayName = profile.name || user?.name || 'SK User';
  const displayEmail = user?.email || profile.email;
  const displayBio = profile.bio || 'Manage your SK applications, documents, analytics, and connected sessions from one secure identity.';
  const displayAvatar = profile.avatar || getInitials(displayName || displayEmail);
  const permissions = user?.permissions?.length ? user.permissions : ['apps:read'];
  const profileFields = [displayName, displayEmail, profile.location, profile.role, profile.bio, profile.avatarUrl || profile.avatar];
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);
  const onAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateProfile({ avatarUrl: String(reader.result), avatar: '' });
    reader.readAsDataURL(file);
  };

  return (
    <div ref={rootRef} className="grid h-full min-h-0 gap-3 overflow-hidden xl:grid-cols-[360px_1fr]">
      <section data-profile className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_30px_100px_rgba(15,23,42,0.28)]">
        <div data-orbit className="absolute -right-24 -top-24 h-56 w-56 rounded-full border border-cyan-300/30" />
        <div className="relative">
          <label className="group relative block h-24 w-24 cursor-pointer overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-300 via-amber-200 to-rose-300 text-slate-950 shadow-2xl">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-4xl font-black">{displayAvatar}</span>
            )}
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-slate-950/75 py-2 text-xs font-black text-white opacity-0 transition group-hover:opacity-100">
              <Camera size={14} /> Upload
            </span>
            <input type="file" accept="image/*" onChange={onAvatarUpload} className="hidden" />
          </label>
          <div className="mt-4 flex items-center gap-2">
            <h1 className="text-2xl font-black">{displayName}</h1>
            <BadgeCheck className="text-cyan-300" size={22} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-black text-cyan-200">{user?.role ?? 'user'} account</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-black text-emerald-200"><CheckCircle2 size={13} /> Active</span></div>
          <p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-300">{displayBio}</p>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center justify-between text-xs font-black"><span>Profile strength</span><span className="text-cyan-300">{profileCompletion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-amber-200 to-rose-300 transition-all" style={{ width: `${profileCompletion}%` }} /></div><p className="mt-2 text-xs text-slate-400">Complete your details to personalize SK Auth across every connected app.</p></div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50"
          >
            <LogOut size={17} /> Logout
          </button>
          <div className="mt-3 grid gap-2">
            {[
              [Mail, displayEmail],
              [MapPin, profile.location],
              [CalendarDays, 'Joined 2026']
            ].map(([Icon, value]) => (
              <div key={value as string} className="flex items-center gap-3 rounded-xl bg-white/8 p-2.5 text-xs">
                <Icon size={17} className="text-cyan-300" />
                {value as string}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="h-full min-h-0 space-y-3 overflow-hidden">
        <div data-profile className="glass rounded-[1.5rem] p-2">
          <div className="flex flex-wrap gap-2">
            {[
              ['profile', 'Profile', UserRound],
              ['settings', 'Settings', Palette],
              ['more', 'More Info', Sparkles]
            ].map(([id, label, Icon]) => (
              <button
                key={id as string}
                type="button"
                onClick={() => setSection(id as 'profile' | 'settings' | 'more')}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${section === id ? 'bg-slate-950 text-white' : 'bg-white/75 text-slate-600'}`}
              >
                <Icon size={16} /> {label as string}
              </button>
            ))}
          </div>
        </div>

        {section === 'profile' ? (
          <div className="grid min-h-0 gap-3 md:grid-cols-2">
            <div data-profile className="glass rounded-[1.5rem] p-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Shield size={19} /> Permissions</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <span key={permission} className="rounded-full bg-cyan-100 px-3 py-1.5 text-xs font-black text-cyan-800">{permission.replace(':', ' ')}</span>
                ))}
              </div>
            </div>
            <div data-profile className="glass rounded-[1.5rem] p-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Sparkles size={19} /> Workspace</h2>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Theme', profile.theme],
                  ['AI Mode', 'Scoped'],
                  ['Docs', 'Enabled'],
                  ['Status', 'Active']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/75 p-2.5">
                    <dt className="text-xs font-bold text-slate-500">{label}</dt>
                    <dd className="mt-1 font-black capitalize text-slate-950">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div data-profile className="glass rounded-[1.5rem] p-4 md:col-span-2">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Bell size={19} /> Smart Profile Insights</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {[
                  [`${applications.length} connected app${applications.length === 1 ? '' : 's'}`, 'Your SK identity is ready across managed platforms.'],
                  [`${permissions.length} permission${permissions.length === 1 ? '' : 's'}`, user?.role === 'admin' ? 'Admin controls and analytics are available.' : 'Access expands automatically with your role.'],
                  [profileCompletion === 100 ? 'Profile optimized' : `${100 - profileCompletion}% left to complete`, profileCompletion === 100 ? 'Your personalized workspace is fully configured.' : 'Add your title, bio, or avatar in More Info.']
                ].map(([title, hint]) => (
                  <div key={title} className="rounded-xl border border-slate-900/5 bg-white/75 p-3"><strong className="block text-sm text-slate-900">{title}</strong><span className="mt-1 block text-xs font-semibold leading-4 text-slate-500">{hint}</span></div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {section === 'settings' ? (
          <div data-profile className="glass rounded-[1.5rem] p-4">
            <h2 className="text-lg font-black text-slate-950">Settings</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                Theme
                <select value={profile.theme} onChange={onInput('theme')} className="rounded-2xl border-slate-200">
                  <option value="light">Light</option>
                  <option value="soft">Soft</option>
                  <option value="vibrant">Vibrant</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                Profile Icon Initials
                <input value={profile.avatar} onChange={onInput('avatar')} maxLength={3} className="rounded-2xl border-slate-200" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-700 md:col-span-2">
                Profile Image
                <input type="file" accept="image/*" onChange={onAvatarUpload} className="rounded-2xl border border-slate-200 bg-white p-3" />
              </label>
            </div>
          </div>
        ) : null}

        {section === 'more' ? (
          <div data-profile className="glass rounded-[1.5rem] p-4">
            <h2 className="text-lg font-black text-slate-950">Tell SK Central More About You</h2>
            <p className="mt-1 text-sm text-slate-600">This helps personalize application recommendations, docs, and admin workflows.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-slate-700">Name<input value={profile.name || user?.name || ''} onChange={onInput('name')} className="rounded-2xl border-slate-200" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Title<input value={profile.role} onChange={onInput('role')} className="rounded-2xl border-slate-200" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Email<input value={displayEmail} readOnly className="rounded-2xl border-slate-200 bg-slate-50 text-slate-500" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Location<input value={profile.location} onChange={onInput('location')} className="rounded-2xl border-slate-200" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700 md:col-span-2">Project Bio<textarea value={profile.bio || displayBio} onChange={onInput('bio')} rows={3} className="rounded-2xl border-slate-200" /></label>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
