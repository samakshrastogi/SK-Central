import { BadgeCheck, Bell, CalendarDays, Mail, MapPin, Palette, Shield, Sparkles, UserRound } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useApplicationStore } from '@/store/applicationStore';

const permissions = ['Application Admin', 'Documentation Manager', 'Analytics Viewer', 'AI Assistant Access'];

export default function ProfilePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const profile = useApplicationStore((state) => state.profile);
  const updateProfile = useApplicationStore((state) => state.updateProfile);
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

  return (
    <div ref={rootRef} className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <section data-profile className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_30px_100px_rgba(15,23,42,0.28)]">
        <div data-orbit className="absolute -right-24 -top-24 h-56 w-56 rounded-full border border-cyan-300/30" />
        <div className="relative">
          <span className="grid h-24 w-24 place-items-center rounded-[2rem] bg-gradient-to-br from-cyan-300 via-amber-200 to-rose-300 text-3xl font-black text-slate-950">
            {profile.avatar}
          </span>
          <div className="mt-6 flex items-center gap-2">
            <h1 className="text-3xl font-black">{profile.name}</h1>
            <BadgeCheck className="text-cyan-300" size={22} />
          </div>
          <p className="mt-2 text-sm text-slate-300">{profile.role}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{profile.bio}</p>
          <div className="mt-6 grid gap-3">
            {[
              [Mail, profile.email],
              [MapPin, profile.location],
              [CalendarDays, 'Joined 2026']
            ].map(([Icon, value]) => (
              <div key={value as string} className="flex items-center gap-3 rounded-2xl bg-white/8 p-3 text-sm">
                <Icon size={17} className="text-cyan-300" />
                {value as string}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div data-profile className="glass rounded-[2rem] p-3">
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
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black ${section === id ? 'bg-slate-950 text-white' : 'bg-white/75 text-slate-600'}`}
              >
                <Icon size={16} /> {label as string}
              </button>
            ))}
          </div>
        </div>

        {section === 'profile' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div data-profile className="glass rounded-[2rem] p-5">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-950"><Shield size={19} /> Permissions</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <span key={permission} className="rounded-full bg-cyan-100 px-3 py-1.5 text-xs font-black text-cyan-800">{permission}</span>
                ))}
              </div>
            </div>
            <div data-profile className="glass rounded-[2rem] p-5">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-950"><Sparkles size={19} /> Workspace</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Theme', profile.theme],
                  ['AI Mode', 'Scoped'],
                  ['Docs', 'Enabled'],
                  ['Status', 'Active']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/75 p-3">
                    <dt className="text-xs font-bold text-slate-500">{label}</dt>
                    <dd className="mt-1 font-black capitalize text-slate-950">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div data-profile className="glass rounded-[2rem] p-5 md:col-span-2">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-950"><Bell size={19} /> Recent Profile Activity</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {['Opened SK Central overview', 'Reviewed application documentation', 'Checked admin analytics'].map((item) => (
                  <div key={item} className="rounded-2xl bg-white/75 p-4 text-sm font-bold text-slate-700">{item}</div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {section === 'settings' ? (
          <div data-profile className="glass rounded-[2rem] p-5">
            <h2 className="text-xl font-black text-slate-950">Settings</h2>
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
            </div>
          </div>
        ) : null}

        {section === 'more' ? (
          <div data-profile className="glass rounded-[2rem] p-5">
            <h2 className="text-xl font-black text-slate-950">Tell SK Central More About You</h2>
            <p className="mt-1 text-sm text-slate-600">This helps personalize application recommendations, docs, and admin workflows.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-slate-700">Name<input value={profile.name} onChange={onInput('name')} className="rounded-2xl border-slate-200" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Role<input value={profile.role} onChange={onInput('role')} className="rounded-2xl border-slate-200" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Email<input value={profile.email} onChange={onInput('email')} className="rounded-2xl border-slate-200" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">Location<input value={profile.location} onChange={onInput('location')} className="rounded-2xl border-slate-200" /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-700 md:col-span-2">Project Bio<textarea value={profile.bio} onChange={onInput('bio')} rows={4} className="rounded-2xl border-slate-200" /></label>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
