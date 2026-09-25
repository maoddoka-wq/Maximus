import { useState } from 'react';
import {
  BarChart3,
  CircleDollarSign,
  Package,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { ActionButton } from '../components/ui/action-button';
import { Field } from '../components/ui/app-field';
import { Input } from '../components/ui/input';
import { Metric } from '../components/ui/metric-card';
import {
  WorkspaceTabs,
  type WorkspaceTabItem,
} from '../components/ui/workspace-tabs';
import { Guidelines } from './parts';

const LOGO_URL = `${import.meta.env.BASE_URL}maximus-mark.png`;

const CORE_COLORS = [
  { name: 'Primaire · or MAXIMUS', variable: '--primary' },
  { name: 'Secondaire · sable chaud', variable: '--secondary' },
  { name: 'Accent · or MAXIMUS', variable: '--accent' },
] as const;

const COLOR_GROUPS = [
  {
    name: 'Surfaces et texte',
    colors: [
      ['Arrière-plan', '--background'],
      ['Texte principal', '--foreground'],
      ['Carte', '--card'],
      ['Texte de carte', '--card-foreground'],
      ['Menu contextuel', '--popover'],
      ['Texte du menu', '--popover-foreground'],
      ['Surface atténuée', '--muted'],
      ['Texte atténué', '--muted-foreground'],
    ],
  },
  {
    name: 'Actions et bordures',
    colors: [
      ['Primaire', '--primary'],
      ['Texte primaire', '--primary-foreground'],
      ['Secondaire', '--secondary'],
      ['Texte secondaire', '--secondary-foreground'],
      ['Accent', '--accent'],
      ['Texte accent', '--accent-foreground'],
      ['Destructif', '--destructive'],
      ['Texte destructif', '--destructive-foreground'],
      ['Bordure', '--border'],
      ['Champ', '--input'],
      ['Focus', '--ring'],
    ],
  },
  {
    name: 'Barre latérale',
    colors: [
      ['Fond', '--sidebar'],
      ['Texte', '--sidebar-foreground'],
      ['Bordure', '--sidebar-border'],
      ['Action active', '--sidebar-primary'],
      ['Texte actif', '--sidebar-primary-foreground'],
      ['Survol', '--sidebar-accent'],
      ['Texte au survol', '--sidebar-accent-foreground'],
      ['Focus', '--sidebar-ring'],
    ],
  },
  {
    name: 'Graphiques',
    colors: [
      ['Série 1', '--chart-1'],
      ['Série 2', '--chart-2'],
      ['Série 3', '--chart-3'],
      ['Série 4', '--chart-4'],
      ['Série 5', '--chart-5'],
    ],
  },
] as const;

const PREVIEW_TABS: WorkspaceTabItem[] = [
  { id: 'overview', label: 'Vue générale', icon: BarChart3 },
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'transport', label: 'Transport', icon: Truck },
];

function ColorSwatch({
  name,
  variable,
}: {
  name: string;
  variable: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <div
        aria-hidden="true"
        className="h-14 rounded-lg border border-[hsl(var(--border))]"
        style={{ backgroundColor: `hsl(var(${variable}))` }}
      />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{name}</span>
        <code className="truncate text-xs text-[hsl(var(--muted-foreground))]">
          {variable}
        </code>
      </div>
    </div>
  );
}

export function OverviewPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [email, setEmail] = useState('');
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="space-y-6">
      <section className="card-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <img
            src={LOGO_URL}
            alt="Symbole MAXIMUS"
            className="h-14 w-14 rounded-xl bg-[hsl(var(--sidebar))] p-2"
          />
          <div className="min-w-0 flex-1">
            <p className="mono text-xs uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
              ERP · système de design
            </p>
            <h2 className="mt-1 text-xl font-bold">Une interface, une source</h2>
            <p className="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
              Les fondations reprennent les couleurs et composants de MAXIMUS.
              Les entreprises gardent leurs couleurs de marque grâce aux
              remplacements appliqués à l’exécution.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {CORE_COLORS.map((color) => (
            <ColorSwatch key={color.variable} {...color} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Composants du pilote</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Cinq familles issues de l’application, présentées avec leurs états
            interactifs principaux.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card-surface space-y-4 p-5">
            <h3 className="text-sm font-semibold">Navigation · WorkspaceTabs</h3>
            <WorkspaceTabs
              items={PREVIEW_TABS}
              activeId={activeTab}
              onChange={setActiveTab}
              ariaLabel="Exemple de navigation par module"
            />
          </section>

          <section className="card-surface space-y-4 p-5">
            <h3 className="text-sm font-semibold">Action · ActionButton</h3>
            <div className="flex flex-wrap gap-2">
              <ActionButton>Ajouter</ActionButton>
              <ActionButton primary icon={Users}>
                Inviter
              </ActionButton>
            </div>
          </section>

          <section className="card-surface space-y-4 p-5">
            <h3 className="text-sm font-semibold">Formulaire · Field</h3>
            <Field
              label="Adresse e-mail"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="nom@entreprise.sn"
              help="L’aide reste visible sous le champ."
            />
          </section>

          <section className="card-surface space-y-4 p-5">
            <h3 className="text-sm font-semibold">Saisie · Input</h3>
            <Input
              aria-label="Recherche d’un produit"
              placeholder="Rechercher un produit…"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
          </section>

          <section className="card-surface space-y-4 p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold">Donnée · Metric</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                label="Ventes du jour"
                value="1 284 500"
                suffix=" F"
                detail="12 transactions"
                icon={CircleDollarSign}
                accent
              />
              <Metric
                label="Commandes à traiter"
                value="8"
                detail="3 en retard"
                icon={Wallet}
                warning
              />
              <Metric
                label="Clients actifs"
                value="146"
                detail="Sur les 30 derniers jours"
                icon={Users}
              />
            </div>
          </section>
        </div>
      </section>

      <section className="card-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Règles visuelles</h2>
        <div className="mt-4">
          <Guidelines
            items={[
              {
                kind: 'do',
                text: 'Réserver l’or aux actions, accents et états actifs; garder le bleu nuit pour les surfaces de navigation.',
              },
              {
                kind: 'dont',
                text: 'Remplacer les couleurs propres à une entreprise par les couleurs globales de MAXIMUS.',
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

export function BrandPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card-surface flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
        <img src={LOGO_URL} alt="Symbole MAXIMUS" className="h-24 w-24" />
        <div>
          <p className="text-2xl font-bold tracking-tight">MAXIMUS</p>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Identité de l’ERP
          </p>
        </div>
      </section>
      <section className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl bg-[hsl(var(--sidebar))] p-8 text-center text-[hsl(var(--sidebar-foreground))]">
        <img src={LOGO_URL} alt="" className="h-24 w-24" />
        <div>
          <p className="text-2xl font-bold tracking-tight">MAXIMUS</p>
          <p className="mt-1 text-sm text-[hsl(var(--sidebar-foreground)/.7)]">
            Variante sur fond sombre
          </p>
        </div>
      </section>
      <section className="card-surface p-5 lg:col-span-2">
        <h2 className="font-semibold">Logo source</h2>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          Le symbole affiché est le fichier MAXIMUS conservé dans les références
          du package. Il n’est ni redessiné ni remplacé par un caractère
          typographique.
        </p>
      </section>
    </div>
  );
}

export function ColorsPage() {
  return (
    <div className="space-y-6">
      <section className="card-surface space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">Palette de marque</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Primaire, secondaire et accent sont affichés dans cet ordre, en
            clair comme en sombre.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {CORE_COLORS.map((color) => (
            <ColorSwatch key={color.variable} {...color} />
          ))}
        </div>
      </section>

      {COLOR_GROUPS.slice(0, 1).map((group) => (
        <section key={group.name} className="card-surface space-y-5 p-5 sm:p-6">
          <h2 className="font-semibold">{group.name}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {group.colors.map(([name, variable]) => (
              <ColorSwatch key={variable} name={name} variable={variable} />
            ))}
          </div>
        </section>
      ))}

      {COLOR_GROUPS.slice(1).map((group) => (
        <section key={group.name} className="card-surface space-y-5 p-5 sm:p-6">
          <h2 className="font-semibold">{group.name}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {group.colors.map(([name, variable]) => (
              <ColorSwatch key={variable} name={name} variable={variable} />
            ))}
          </div>
        </section>
      ))}

      <section className="card-surface p-5 sm:p-6">
        <h2 className="font-semibold">Surcharge par entreprise</h2>
        <p className="mt-2 max-w-3xl text-sm text-[hsl(var(--muted-foreground))]">
          Ces couleurs sont les valeurs globales par défaut. Le thème d’une
          entreprise est appliqué à l’exécution par MAXIMUS et garde la priorité
          sur les rôles de marque correspondants.
        </p>
        <div className="mt-4">
          <Guidelines
            items={[
              {
                kind: 'do',
                text: 'Importer le thème du package avant la feuille locale, puis appliquer le thème de l’entreprise après son chargement.',
              },
              {
                kind: 'dont',
                text: 'Écraser les variables CSS d’entreprise avec une couleur de marque codée en dur.',
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

export function FontsPage() {
  return (
    <div className="space-y-6">
      <section className="card-surface space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Sans-serif · DM Sans
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight">
            Le texte qui structure MAXIMUS.
          </p>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Titres, valeurs et textes d’interface utilisent la famille sans-serif
            de l’application source.
          </p>
        </div>
        <div className="border-t border-[hsl(var(--border))] pt-5">
          <p className="mono text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Monospace · Space Mono
          </p>
          <p className="mono mt-3 text-lg">F-2026 · 1 284 500 F CFA</p>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Réservée aux références, codes et indicateurs compacts.
          </p>
        </div>
      </section>
      <section className="card-surface space-y-4 p-5 sm:p-6">
        <h2 className="font-semibold">Échelle typographique</h2>
        {[
          ['Affichage', 'text-4xl font-bold tracking-tight'],
          ['Titre', 'text-2xl font-semibold'],
          ['Corps', 'text-base'],
          ['Libellé', 'text-sm font-medium'],
          ['Légende', 'text-xs text-[hsl(var(--muted-foreground))]'],
        ].map(([label, className]) => (
          <div key={label} className="grid gap-2 sm:grid-cols-[112px_1fr]">
            <span className="pt-1 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              {label}
            </span>
            <p className={className}>Des repères lisibles pour chaque niveau.</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export function LayoutPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card-surface p-5 sm:p-6">
        <h2 className="font-semibold">Espacement</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Pas de base : 0,25 rem (4 px).
        </p>
        <div className="mt-6 space-y-4">
          {[
            ['4 px', 'w-1'],
            ['8 px', 'w-2'],
            ['12 px', 'w-3'],
            ['16 px', 'w-4'],
            ['24 px', 'w-6'],
          ].map(([label, width]) => (
            <div key={label} className="flex items-center gap-4">
              <span className="w-12 text-xs text-[hsl(var(--muted-foreground))]">
                {label}
              </span>
              <div className={`h-3 rounded-full bg-primary ${width}`} />
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface p-5 sm:p-6">
        <h2 className="font-semibold">Rayons</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Rayon de base MAXIMUS : 0,8 rem.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            ['Petit', 'rounded-sm'],
            ['Moyen', 'rounded-md'],
            ['Grand', 'rounded-lg'],
            ['Extra-large', 'rounded-xl'],
          ].map(([label, radius]) => (
            <div
              key={label}
              className={`flex h-24 items-end border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3 ${radius}`}
            >
              <span className="text-xs font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card-surface p-5 sm:p-6 lg:col-span-2">
        <h2 className="font-semibold">Principes de composition</h2>
        <div className="mt-4">
          <Guidelines
            items={[
              {
                kind: 'do',
                text: 'Garder les onglets de module sur une ligne et permettre leur défilement horizontal sur les petits écrans.',
              },
              {
                kind: 'dont',
                text: 'Ajouter une ombre lourde aux cartes; la source utilise une ombre douce et une bordure dédiée.',
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}