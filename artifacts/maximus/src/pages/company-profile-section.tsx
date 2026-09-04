import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import type { Company, StoreData } from '@/lib/store';
import {
  companyThemePresets,
  defaultCompanyTheme,
  Field,
  isHexColor,
} from './organization-shared';

type Mutate = (fn: (data: StoreData) => void, message?: string) => void;

export function CompanyProfileSection({
  company,
  data,
  mutate,
}: {
  company: Company;
  data: StoreData;
  mutate: Mutate;
}) {
  type ProfileForm = Pick<
    Company,
    'name' | 'manager' | 'email' | 'phone' | 'country' | 'sector'
  > & {
    profilePhoto: string;
    primaryColor: string;
    accentColor: string;
    sidebarColor: string;
  };
  const [form, setForm] = useState<ProfileForm>({
    name: company.name,
    manager: company.manager,
    email: company.email,
    phone: company.phone,
    country: company.country,
    sector: company.sector,
    profilePhoto: company.profilePhoto ?? '',
    primaryColor: company.primaryColor ?? defaultCompanyTheme.primaryColor,
    accentColor: company.accentColor ?? defaultCompanyTheme.accentColor,
    sidebarColor: company.sidebarColor ?? defaultCompanyTheme.sidebarColor,
  });
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const setField = (field: keyof ProfileForm) => (value: string) =>
    setForm(current => ({ ...current, [field]: value }));

  useEffect(() => {
    setForm({
      name: company.name,
      manager: company.manager,
      email: company.email,
      phone: company.phone,
      country: company.country,
      sector: company.sector,
      profilePhoto: company.profilePhoto ?? '',
      primaryColor: company.primaryColor ?? defaultCompanyTheme.primaryColor,
      accentColor: company.accentColor ?? defaultCompanyTheme.accentColor,
      sidebarColor: company.sidebarColor ?? defaultCompanyTheme.sidebarColor,
    });
    setNewPassword('');
    setPasswordConfirm('');
    setError('');
  }, [
    company.id,
    company.name,
    company.manager,
    company.email,
    company.phone,
    company.country,
    company.sector,
    company.profilePhoto,
    company.primaryColor,
    company.accentColor,
    company.sidebarColor,
  ]);

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Sélectionnez un fichier image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('La photo doit faire 2 Mo maximum.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm(current => ({ ...current, profilePhoto: reader.result as string }));
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    const name = form.name.trim();
    const manager = form.manager.trim();
    const email = form.email.trim().toLowerCase();
    const password = newPassword.trim();
    const primaryColor = form.primaryColor.trim().toUpperCase();
    const accentColor = form.accentColor.trim().toUpperCase();
    const sidebarColor = form.sidebarColor.trim().toUpperCase();

    if (!name || !manager || !email) {
      setError('Le nom de l’entreprise, le responsable et l’email sont obligatoires.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Saisissez une adresse email valide.');
      return;
    }
    if (data.companies.some(item => item.id !== company.id && item.email.toLowerCase() === email)) {
      setError('Une autre entreprise utilise déjà cette adresse email.');
      return;
    }
    if (password && password.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!isHexColor(primaryColor) || !isHexColor(accentColor) || !isHexColor(sidebarColor)) {
      setError('Les couleurs doivent être au format hexadécimal, par exemple #F2B705.');
      return;
    }

    mutate(draft => {
      const target = draft.companies.find(item => item.id === company.id);
      if (!target) return;
      target.name = name;
      target.manager = manager;
      target.email = email;
      target.phone = form.phone.trim();
      target.country = form.country.trim();
      target.sector = form.sector.trim();
      target.profilePhoto = form.profilePhoto;
      target.primaryColor = primaryColor;
      target.accentColor = accentColor;
      target.sidebarColor = sidebarColor;
      if (password) target.adminPassword = password;
    }, password ? 'Profil, couleurs, photo et mot de passe mis à jour.' : 'Profil, couleurs et photo mis à jour.');
    setNewPassword('');
    setPasswordConfirm('');
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr] fade-up">
      <section className="card-surface rounded-2xl p-6">
        <div className="mb-7">
          <p className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Profil entreprise</p>
          <h2 className="mt-2 text-2xl font-bold">{company.name}</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Mettez à jour les informations, la photo et les accès de votre entreprise.</p>
        </div>
        <div className="mb-7 flex flex-wrap items-center gap-5 rounded-xl border border-dashed p-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[hsl(var(--primary)/.1)] text-xl font-black text-[hsl(var(--primary))]">
            {form.profilePhoto ? <img src={form.profilePhoto} alt={`Photo de profil de ${form.name}`} className="h-full w-full object-cover" /> : company.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-[220px] flex-1">
            <h3 className="font-bold">Photo de profil</h3>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">PNG, JPG ou WebP · 2 Mo maximum. Elle sera affichée dans votre espace entreprise.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]">
                <UserRound size={14} />Choisir une photo
                <input data-testid="input-profile-photo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => handlePhoto(event.target.files?.[0])} />
              </label>
              {form.profilePhoto && <button type="button" data-testid="button-remove-profile-photo" onClick={() => setForm(current => ({ ...current, profilePhoto: '' }))} className="rounded-lg border px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))]">Supprimer</button>}
            </div>
          </div>
        </div>
        <div className="mb-7 rounded-xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.04)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-bold">Couleurs de votre espace</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-[hsl(var(--muted-foreground))]">Choisissez une couleur principale et une couleur d’accent. Elles seront visibles par tous les comptes de cette entreprise.</p></div>
            <div className="rounded-lg border bg-[hsl(var(--card))] px-3 py-2 text-right text-[10px] font-bold"><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ backgroundColor: form.primaryColor }} /><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ backgroundColor: form.accentColor }} /><span className="inline-block h-3 w-3 rounded-full align-middle" style={{ backgroundColor: form.sidebarColor }} /> <span className="ml-1 text-[hsl(var(--muted-foreground))]">Aperçu</span></div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([
              ['primaryColor', 'Couleur principale', 'Boutons, liens et éléments actifs.'],
              ['accentColor', 'Couleur d’accent', 'Surbrillances et détails secondaires.'],
              ['sidebarColor', 'Couleur du menu latéral', 'Fond de la barre de navigation et de ses états actifs.'],
            ] as const).map(([field, label, help]) => <label key={field} className="block text-sm font-semibold">
              {label}
              <div className="mt-2 flex items-center gap-2">
                <input aria-label={label} data-testid={`input-${field}`} type="color" value={isHexColor(form[field]) ? form[field] : defaultCompanyTheme[field]} onChange={event => setForm(current => ({ ...current, [field]: event.target.value.toUpperCase() }))} className="h-11 w-14 cursor-pointer rounded-lg border bg-[hsl(var(--card))] p-1" />
                <input aria-label={`${label} hexadécimale`} data-testid={`input-${field}-hex`} value={form[field]} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border bg-[hsl(var(--card))] px-3 py-2.5 font-mono text-sm uppercase" placeholder="#F2B705" />
              </div>
              <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">{help}</span>
            </label>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Palettes</span>
            {companyThemePresets.map(preset => <button key={preset.name} type="button" onClick={() => setForm(current => ({ ...current, primaryColor: preset.primaryColor, accentColor: preset.accentColor, sidebarColor: preset.sidebarColor }))} className="inline-flex items-center gap-2 rounded-lg border bg-[hsl(var(--card))] px-2.5 py-2 text-[10px] font-bold hover:border-[hsl(var(--primary))]">
              <span className="flex gap-0.5"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.primaryColor }} /><span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.accentColor }} /></span>{preset.name}
            </button>)}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom de l’entreprise *" value={form.name} onChange={setField('name')} testId="input-profile-company-name" help="Nom affiché dans MAXIMUS et dans l’espace de travail." />
          <Field label="Responsable *" value={form.manager} onChange={setField('manager')} testId="input-profile-manager" help="Nom de la personne responsable de l’entreprise." />
          <Field label="Email administrateur *" value={form.email} onChange={setField('email')} type="email" testId="input-profile-email" help="Adresse utilisée pour la connexion du compte entreprise." />
          <Field label="Téléphone" value={form.phone} onChange={setField('phone')} testId="input-profile-phone" help="Numéro de contact professionnel de l’entreprise." />
          <Field label="Pays" value={form.country} onChange={setField('country')} testId="input-profile-country" help="Pays dans lequel l’entreprise exerce principalement." />
          <Field label="Secteur" value={form.sector} onChange={setField('sector')} testId="input-profile-sector" help="Secteur d’activité utilisé pour contextualiser l’espace." />
        </div>
        <div className="mt-7 border-t pt-6">
          <h3 className="font-bold">Modifier le mot de passe</h3>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Laissez ces champs vides pour conserver le mot de passe actuel.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} type="password" placeholder="Au moins 8 caractères" testId="input-profile-password" help="Utilisez au moins 8 caractères. Laissez vide pour conserver le mot de passe actuel." />
            <Field label="Confirmer le mot de passe" value={passwordConfirm} onChange={setPasswordConfirm} type="password" placeholder="Répétez le mot de passe" testId="input-profile-password-confirm" help="Saisissez exactement le même mot de passe pour confirmer le changement." />
          </div>
        </div>
        {error && <p data-testid="profile-error" className="mt-5 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
        <div className="mt-7 flex justify-end"><button data-testid="button-save-profile" onClick={save} className="btn rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Enregistrer le profil</button></div>
      </section>
      <section className="card-surface h-fit rounded-2xl p-6"><h2 className="font-bold">Accès de votre espace</h2><div className="mt-5 space-y-4 text-sm"><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Statut</p><p className="mt-1 font-bold">{company.status}</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Connexion</p><p className="mt-1 leading-6">Utilisez l’email administrateur et votre mot de passe depuis « Espace KORA ».</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Modules autorisés</p><p className="mt-1 font-bold">{company.allowedModules.length} module(s)</p></div></div></section>
    </div>
  );
}