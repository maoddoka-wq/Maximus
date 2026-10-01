import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  LayoutDashboard,
  Network,
  Package2,
  ShieldCheck,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card } from '@workspace/maximus-design-system/components/ui/card';
import {
  loadAnaPreview,
  type AnaPreviewPayload,
  type AnaPreviewProfile,
  type AnaPreviewProfileKind,
  type AnaPreviewSectionId,
} from '@/lib/ana-preview-api';
import { buildWorkspaceHomeHref } from '@/lib/ana-preview-path';

const sectionDefinitions: Array<{
  id: AnaPreviewSectionId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'organization', label: 'Organisation', icon: Network },
  { id: 'presences', label: 'Présences', icon: CalendarClock },
  { id: 'stocks', label: 'Gestion de stock', icon: Warehouse },
];

function profileIcon(kind: AnaPreviewProfileKind): LucideIcon {
  if (kind === 'platform-admin') return ShieldCheck;
  if (kind === 'company-admin') return Building2;
  if (kind === 'director') return Users;
  if (kind === 'manager') return ClipboardCheck;
  return Activity;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('fr-FR') ?? '')
    .join('');
}

function moduleLabel(moduleId: string): string {
  if (moduleId === 'presences') return 'Présences';
  if (moduleId === 'stocks') return 'Gestion de stock';
  return moduleId;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`));
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}

function ProfileButton({
  profile,
  onChoose,
}: {
  profile: AnaPreviewProfile;
  onChoose: (profileId: string) => void;
}) {
  const Icon = profileIcon(profile.kind);

  return (
    <Button
      type="button"
      variant="outline"
      data-testid={`preview-profile-${profile.id}`}
      onClick={() => onChoose(profile.id)}
      className="h-full min-h-36 w-full justify-start whitespace-normal rounded-xl p-4 text-left"
    >
      <div className="flex w-full items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {initials(profile.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">{profile.name}</span>
          <span className="mt-1 block text-xs font-medium text-muted-foreground">{profile.roleTitle}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{profile.group}</span>
          <span className="mt-3 flex flex-wrap gap-1.5">
            {profile.moduleIds.map((moduleId) => (
              <Badge key={moduleId} variant="secondary" className="text-[10px]">
                {moduleLabel(moduleId)}
              </Badge>
            ))}
          </span>
        </span>
      </div>
    </Button>
  );
}

function SectionTitle({ children, description }: { children: ReactNode; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold tracking-tight text-foreground">{children}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function AnaPreviewApp() {
  const [payload, setPayload] = useState<AnaPreviewPayload | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(
    () => new URLSearchParams(window.location.search).get('profile') ?? '',
  );
  const [activeSection, setActiveSection] = useState<AnaPreviewSectionId>('overview');

  useEffect(() => {
    let current = true;
    void loadAnaPreview()
      .then((result) => {
        if (current) setPayload(result);
      })
      .catch((error: unknown) => {
        if (!current) return;
        setLoadError(error instanceof Error ? error.message : 'Les données de prévisualisation sont indisponibles.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setSelectedProfileId(new URLSearchParams(window.location.search).get('profile') ?? '');
      setActiveSection('overview');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectedProfile = payload?.profiles.find((profile) => profile.id === selectedProfileId);
  const visibleSections = selectedProfile
    ? sectionDefinitions.filter((section) => selectedProfile.sectionIds.includes(section.id))
    : [];
  const activeSectionDefinition = sectionDefinitions.find((section) => section.id === activeSection);
  const previewHomeHref = buildWorkspaceHomeHref(import.meta.env.BASE_URL);

  function openProfile(profileId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('profile', profileId);
    url.searchParams.delete('section');
    window.history.pushState({ profileId }, '', `${url.pathname}${url.search}${url.hash}`);
    setSelectedProfileId(profileId);
    setActiveSection('overview');
  }

  function returnToProfiles() {
    const url = new URL(window.location.href);
    url.searchParams.delete('profile');
    url.searchParams.delete('section');
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setSelectedProfileId('');
    setActiveSection('overview');
  }

  const pageTitle = selectedProfile && activeSectionDefinition
    ? activeSectionDefinition.label
    : 'Choisissez un profil';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <a href={previewHomeHref} className="text-base font-black tracking-[0.12em] text-foreground">
              MAXIMUS
            </a>
            <span className="hidden h-6 border-l border-border sm:block" />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-foreground">Prévisualisation ANA</p>
              <p className="text-[11px] text-muted-foreground">Espace local de démonstration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <ShieldCheck size={13} aria-hidden="true" />
              Lecture seule
            </Badge>
            {selectedProfile && (
              <Button type="button" variant="outline" size="sm" onClick={returnToProfiles}>
                <ArrowLeft size={15} aria-hidden="true" />
                Profils
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {loading && (
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center" role="status">
            <div className="mx-auto mb-4 size-8 animate-pulse rounded-full bg-primary/15" />
            <p className="font-semibold">Chargement de l’aperçu ANA…</p>
            <p className="mt-1 text-sm text-muted-foreground">Lecture des données locales de démonstration.</p>
          </div>
        )}

        {!loading && loadError && (
          <Card className="mx-auto max-w-xl border-border bg-card p-6 text-center">
            <p className="font-semibold text-foreground">L’aperçu ANA n’est pas disponible</p>
            <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
            <a href={previewHomeHref} className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
              Retour à MAXIMUS
            </a>
          </Card>
        )}

        {!loading && payload && !selectedProfile && (
          <ProfilePicker payload={payload} onChoose={openProfile} />
        )}

        {!loading && payload && selectedProfile && (
          <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <Card className="border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initials(selectedProfile.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{selectedProfile.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{selectedProfile.roleTitle}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{selectedProfile.group}</Badge>
                  {selectedProfile.moduleIds.map((moduleId) => (
                    <Badge key={moduleId} variant="secondary">{moduleLabel(moduleId)}</Badge>
                  ))}
                </div>
              </Card>

              <Card className="border-border bg-card p-2">
                <nav className="space-y-1" aria-label="Pages de prévisualisation">
                  {visibleSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <Button
                        key={section.id}
                        type="button"
                        variant={activeSection === section.id ? 'secondary' : 'ghost'}
                        aria-current={activeSection === section.id ? 'page' : undefined}
                        onClick={() => setActiveSection(section.id)}
                        className="w-full justify-start"
                      >
                        <Icon size={16} aria-hidden="true" />
                        {section.label}
                      </Button>
                    );
                  })}
                </nav>
              </Card>

              <Card className="border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accès du profil</p>
                <ul className="mt-3 space-y-2">
                  {selectedProfile.accessLabels.map((label) => (
                    <li key={label} className="flex items-start gap-2 text-xs leading-5 text-foreground">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      {label}
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>

            <section className="min-w-0">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {payload.company.name} · {selectedProfile.roleTitle}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
                </div>
                <Badge variant="outline" className="gap-1.5">
                  <ShieldCheck size={13} aria-hidden="true" />
                  Démonstration sans écriture
                </Badge>
              </div>

              {activeSection === 'overview' && (
                <OverviewSection payload={payload} profile={selectedProfile} />
              )}
              {activeSection === 'organization' && (
                <OrganizationSection payload={payload} />
              )}
              {activeSection === 'presences' && (
                <PresenceSection payload={payload} profile={selectedProfile} />
              )}
              {activeSection === 'stocks' && (
                <StockSection payload={payload} profile={selectedProfile} />
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <span>Données fictives · base de prévisualisation Replit</span>
          <span>Aucun compte, mot de passe ou accès Render n’est utilisé.</span>
        </div>
      </footer>
    </div>
  );
}

function ProfilePicker({
  payload,
  onChoose,
}: {
  payload: AnaPreviewPayload;
  onChoose: (profileId: string) => void;
}) {
  const groups = [...new Set(payload.profiles.map((profile) => profile.group))];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 max-w-3xl">
        <Badge variant="secondary">Entreprise fictive · {payload.company.name}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Choisissez un profil
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Ouvrez directement un espace pour voir les menus et informations accessibles à chaque rôle.
          Aucun identifiant ni mot de passe n’est demandé.
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Cette démonstration est en lecture seule. Les données sont conservées dans la base locale de prévisualisation et ne sont pas envoyées à Render.
        </p>
      </div>

      <div className="space-y-8">
        {groups.map((group) => {
          const profiles = payload.profiles.filter((profile) => profile.group === group);
          return (
            <section key={group} aria-label={group}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">{group}</h2>
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  {profiles.length} profil{profiles.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {profiles.map((profile) => (
                  <ProfileButton key={profile.id} profile={profile} onChoose={onChoose} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-start gap-3 border-border bg-card p-4">
          <Building2 size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">{payload.company.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{payload.company.sector} · {payload.company.country}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 border-border bg-card p-4">
          <Users size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">{payload.employees.length} employés</p>
            <p className="mt-1 text-xs text-muted-foreground">Répartis entre la direction, la DAF, le stock et les Présences.</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 border-border bg-card p-4">
          <Package2 size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">{payload.company.modules.length} modules actifs</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {payload.company.modules.map((module) => module.name).join(' · ')}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function OverviewSection({
  payload,
  profile,
}: {
  payload: AnaPreviewPayload;
  profile: AnaPreviewProfile;
}) {
  const visibleAttendance = profile.presenceAccess === 'self' && profile.employeeId
    ? payload.attendance.filter((entry) => entry.employeeId === profile.employeeId)
    : payload.attendance;
  const presentCount = visibleAttendance.filter((entry) => entry.status !== 'Absent').length;
  const lowStockCount = payload.products.filter((product) => product.quantity <= product.minimumQuantity).length;

  return (
    <div className="space-y-5">
      <Card className="border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {profile.kind === 'platform-admin' ? 'Vue centrale MAXIMUS' : `Espace ${payload.company.name}`}
            </p>
            <h2 className="mt-2 text-xl font-bold text-foreground">Bonjour, {profile.name.split(' ')[0]}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Vous consultez une représentation de l’espace selon le rôle « {profile.roleTitle} ».
              Les actions de création et de modification sont volontairement désactivées.
            </p>
          </div>
          <Badge variant="outline">{payload.company.status}</Badge>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Collaborateurs"
          value={payload.employees.length}
          description="Équipe ANA"
          icon={Users}
        />
        <MetricCard
          label="Unités"
          value={payload.units.length}
          description="Organisation configurée"
          icon={Network}
        />
        <MetricCard
          label="Présences suivies"
          value={presentCount}
          description={visibleAttendance[0] ? formatDate(visibleAttendance[0].date) : 'Aucun pointage'}
          icon={CalendarClock}
        />
        <MetricCard
          label="Articles à surveiller"
          value={lowStockCount}
          description="Au seuil minimum ou en dessous"
          icon={Package2}
        />
      </div>

      <Card className="border-border bg-card p-5">
        <SectionTitle description="Modules compris dans l’espace ANA. Leur visibilité dépend du profil choisi.">
          Modules activés
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {payload.company.modules.map((module) => (
            <div key={module.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
              {module.id === 'stocks'
                ? <Warehouse size={19} className="text-primary" aria-hidden="true" />
                : <CalendarClock size={19} className="text-primary" aria-hidden="true" />}
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{module.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {profile.moduleIds.includes(module.id) ? 'Accessible à ce profil' : 'Non visible pour ce profil'}
                </p>
              </div>
              <Badge variant={profile.moduleIds.includes(module.id) ? 'secondary' : 'outline'} className="ml-auto">
                {profile.moduleIds.includes(module.id) ? 'ACTIF' : 'MASQUÉ'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-border bg-card p-5">
        <SectionTitle description="Résumé des unités et de leurs responsables.">
          Organisation ANA
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {payload.units.map((unit) => (
            <div key={unit.id} className="rounded-lg border border-border p-4">
              <p className="font-semibold text-foreground">{unit.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">Responsable · {unit.managerName}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {unit.moduleIds.map(moduleLabel).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OrganizationSection({ payload }: { payload: AnaPreviewPayload }) {
  return (
    <div className="space-y-5">
      <Card className="border-border bg-card p-5">
        <SectionTitle description="La hiérarchie associe chaque unité à son responsable et aux modules qu’elle utilise.">
          Structure & unités
        </SectionTitle>
        <div className="space-y-3">
          {payload.units.map((unit, index) => (
            <div
              key={unit.id}
              className={`rounded-lg border border-border bg-card p-4 ${unit.parentId ? 'ml-4 sm:ml-8' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{unit.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {unit.parentId ? 'Unité rattachée à la Direction générale' : 'Unité principale'}
                  </p>
                </div>
                <Badge variant="outline">{index === 0 ? 'Direction' : 'Unité'}</Badge>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Responsable</p>
                  <p className="mt-1 font-medium text-foreground">{unit.managerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Modules attribués</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {unit.moduleIds.map((moduleId) => (
                      <Badge key={moduleId} variant="secondary">{moduleLabel(moduleId)}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-border bg-card p-5">
        <SectionTitle description="Employés fictifs, rattachés à leur unité et à leurs modules de travail.">
          Équipe ANA
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nom</th>
                <th className="px-3 py-2 font-medium">Poste</th>
                <th className="px-3 py-2 font-medium">Unité</th>
                <th className="px-3 py-2 font-medium">Modules</th>
                <th className="px-3 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {payload.employees.map((employee) => (
                <tr key={employee.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 font-semibold text-foreground">{employee.name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{employee.roleTitle}</td>
                  <td className="px-3 py-3 text-muted-foreground">{employee.unitName}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {employee.moduleIds.map((moduleId) => (
                        <Badge key={moduleId} variant="secondary">{moduleLabel(moduleId)}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline">{employee.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PresenceSection({
  payload,
  profile,
}: {
  payload: AnaPreviewPayload;
  profile: AnaPreviewProfile;
}) {
  const entries = profile.presenceAccess === 'self' && profile.employeeId
    ? payload.attendance.filter((entry) => entry.employeeId === profile.employeeId)
    : payload.attendance;
  const latestDate = entries[0]?.date;
  const present = entries.filter((entry) => entry.status !== 'Absent').length;
  const absent = entries.filter((entry) => entry.status === 'Absent').length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Présents" value={present} description="Présents ou en retard" icon={CheckCircle2} />
        <MetricCard label="Absents" value={absent} description="Pointages attendus" icon={Users} />
        <MetricCard label="Date" value={latestDate ? formatDate(latestDate) : '—'} description="Relevé de démonstration" icon={CalendarClock} />
      </div>

      <Card className="border-border bg-card p-5">
        <SectionTitle description={profile.presenceAccess === 'self'
          ? 'Votre historique personnel de présence.'
          : 'Suivi des présences de l’équipe ANA.'}>
          Présences du jour
        </SectionTitle>
        {entries.length === 0 ? (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Aucun pointage fictif n’est associé à ce profil.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Employé</th>
                  <th className="px-3 py-2 font-medium">Unité</th>
                  <th className="px-3 py-2 font-medium">Arrivée</th>
                  <th className="px-3 py-2 font-medium">Départ</th>
                  <th className="px-3 py-2 font-medium">État</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-semibold text-foreground">{entry.employeeName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{entry.unitName}</td>
                    <td className="px-3 py-3 text-foreground">{entry.arrival || '—'}</td>
                    <td className="px-3 py-3 text-foreground">{entry.departure || '—'}</td>
                    <td className="px-3 py-3">
                      <Badge variant={entry.status === 'Absent' ? 'destructive' : 'secondary'}>{entry.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Les actions de pointage, correction, validation et export sont désactivées dans cette démonstration.
        </p>
      </Card>
    </div>
  );
}

function StockSection({
  payload,
  profile,
}: {
  payload: AnaPreviewPayload;
  profile: AnaPreviewProfile;
}) {
  const lowStock = payload.products.filter((product) => product.quantity <= product.minimumQuantity).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Références" value={payload.products.length} description="Articles suivis" icon={Package2} />
        <MetricCard label="Stock à surveiller" value={lowStock} description="Sous le seuil défini" icon={Activity} />
        <MetricCard label="Mouvements récents" value={payload.movements.length} description="Entrées et sorties" icon={Warehouse} />
      </div>

      {profile.stockAccess === 'request' && (
        <Card className="border-border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">Accès employé</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Ce profil consulte les articles et peut préparer des demandes dans l’application réelle.
            Les demandes sont désactivées ici.
          </p>
        </Card>
      )}

      <Card className="border-border bg-card p-5">
        <SectionTitle description="Quantités et seuils conservés dans les données fictives ANA.">
          Articles en stock
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Article</th>
                <th className="px-3 py-2 font-medium">Référence</th>
                <th className="px-3 py-2 font-medium">Quantité</th>
                <th className="px-3 py-2 font-medium">Seuil</th>
                <th className="px-3 py-2 font-medium">État</th>
              </tr>
            </thead>
            <tbody>
              {payload.products.map((product) => {
                const belowThreshold = product.quantity <= product.minimumQuantity;
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{product.reference}</td>
                    <td className="px-3 py-3 font-semibold text-foreground">{product.quantity} {product.unit}</td>
                    <td className="px-3 py-3 text-muted-foreground">{product.minimumQuantity} {product.unit}</td>
                    <td className="px-3 py-3">
                      <Badge variant={belowThreshold ? 'destructive' : 'secondary'}>
                        {belowThreshold ? 'À réapprovisionner' : 'Disponible'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-border bg-card p-5">
        <SectionTitle description="Exemples d’opérations enregistrées dans le scénario de démonstration.">
          Derniers mouvements
        </SectionTitle>
        <div className="space-y-2">
          {payload.movements.map((movement) => (
            <div key={movement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{movement.productName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {movement.reference} · {movement.reason} · {movement.employeeName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={movement.type === 'ENTRÉE' ? 'secondary' : 'outline'}>{movement.type}</Badge>
                <span className="text-sm font-bold text-foreground">{movement.quantity}</span>
                <span className="text-xs text-muted-foreground">{formatDate(movement.date)}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Les créations, entrées, sorties et corrections de stock sont désactivées dans cette démonstration.
        </p>
      </Card>
    </div>
  );
}