import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { tokens } from '../generated/tokens';

type ColorMode = keyof typeof tokens.color;
type ColorKey = keyof typeof tokens.color.light;

const TYPE_SCALE = [
  { label: 'Affichage', className: 'text-4xl font-bold' },
  { label: 'Titre', className: 'text-2xl font-semibold' },
  { label: 'Texte courant', className: 'text-base' },
  { label: 'Libellé', className: 'text-sm font-medium' },
  { label: 'Secondaire', className: 'text-sm text-muted-foreground' },
] as const;

const SPACING_STEPS = [
  { label: '1×', multiplier: 1 },
  { label: '2×', multiplier: 2 },
  { label: '3×', multiplier: 3 },
  { label: '4×', multiplier: 4 },
  { label: '6×', multiplier: 6 },
  { label: '8×', multiplier: 8 },
] as const;

const COLOR_GROUPS: { name: string; keys: ColorKey[] }[] = [
  {
    name: 'Marque et actions',
    keys: [
      'primary',
      'primaryForeground',
      'secondary',
      'secondaryForeground',
      'accent',
      'accentForeground',
    ],
  },
  {
    name: 'Surfaces et contenus',
    keys: [
      'background',
      'foreground',
      'card',
      'cardForeground',
      'popover',
      'popoverForeground',
      'muted',
      'mutedForeground',
      'border',
      'input',
      'ring',
    ],
  },
  {
    name: 'État destructif',
    keys: ['destructive', 'destructiveForeground'],
  },
  {
    name: 'Graphiques',
    keys: ['chart1', 'chart2', 'chart3', 'chart4', 'chart5'],
  },
  {
    name: 'Navigation',
    keys: [
      'sidebar',
      'sidebarForeground',
      'sidebarBorder',
      'sidebarPrimary',
      'sidebarPrimaryForeground',
      'sidebarAccent',
      'sidebarAccentForeground',
      'sidebarRing',
    ],
  },
];

const COLOR_LABELS: Partial<Record<ColorKey, string>> = {
  primary: 'Primaire',
  primaryForeground: 'Texte primaire',
  secondary: 'Secondaire',
  secondaryForeground: 'Texte secondaire',
  accent: 'Accent',
  accentForeground: 'Texte accentué',
  background: 'Arrière-plan',
  foreground: 'Texte',
  card: 'Carte',
  cardForeground: 'Texte de carte',
  popover: 'Fenêtre',
  popoverForeground: 'Texte de fenêtre',
  muted: 'Atténué',
  mutedForeground: 'Texte secondaire',
  destructive: 'Destructif',
  destructiveForeground: 'Texte destructif',
  border: 'Bordure',
  input: 'Champ',
  ring: 'Focus',
  chart1: 'Graphique 1',
  chart2: 'Graphique 2',
  chart3: 'Graphique 3',
  chart4: 'Graphique 4',
  chart5: 'Graphique 5',
  sidebar: 'Fond de navigation',
  sidebarForeground: 'Texte de navigation',
  sidebarBorder: 'Bordure de navigation',
  sidebarPrimary: 'Action de navigation',
  sidebarPrimaryForeground: 'Texte d’action',
  sidebarAccent: 'Accent de navigation',
  sidebarAccentForeground: 'Texte d’accent',
  sidebarRing: 'Focus de navigation',
};

function ColorSwatch({
  label,
  value,
  textColor,
  borderColor,
}: {
  label: string;
  value: string;
  textColor: string;
  borderColor: string;
}) {
  return (
    <div className="min-w-0">
      <div
        className="h-12 rounded-md border"
        style={{ backgroundColor: value, borderColor }}
      />
      <p className="mt-2 truncate text-xs font-medium" style={{ color: textColor }}>
        {label}
      </p>
      <p
        className="font-mono text-xs"
        style={{ color: textColor, opacity: 0.72 }}
      >
        {value}
      </p>
    </div>
  );
}

function ColorPalette({ mode }: { mode: ColorMode }) {
  const palette = tokens.color[mode];
  const borderColor = palette.border;

  return (
    <section
      className="space-y-6 rounded-xl border p-5"
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
        borderColor,
      }}
    >
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">
            Thème {mode === 'light' ? 'clair' : 'sombre'}
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            Palette {mode === 'light' ? 'claire' : 'sombre'}
          </h2>
        </div>
        <span className="font-mono text-xs opacity-70">
          {palette.background} / {palette.foreground}
        </span>
      </header>

      {COLOR_GROUPS.map((group) => (
        <section key={group.name} className="space-y-3">
          <h3 className="text-sm font-semibold">{group.name}</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            {group.keys.map((key) => (
              <ColorSwatch
                key={key}
                label={COLOR_LABELS[key] ?? key}
                value={palette[key]}
                textColor={palette.foreground}
                borderColor={palette.border}
              />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

function Swatch({
  name,
  value,
}: {
  name: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <div
        className="h-16 rounded-lg border"
        style={{ backgroundColor: value, borderColor: tokens.color.light.border }}
      />
      <p className="text-sm font-medium">{name}</p>
      <p className="font-mono text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border bg-card text-card-foreground">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="space-y-4">
            <Badge variant="secondary">MAXIMUS Chauffeur</Badge>
            <div>
              <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Une base visuelle pensée pour l’usage mobile.
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Couleurs, typographie, espacements et composants réunis pour
                documenter les écrans Chauffeur.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Action principale</Button>
              <Button size="sm" variant="outline">
                Action secondaire
              </Button>
            </div>
          </div>

          <Card className="self-end">
            <CardHeader>
              <CardDescription>Exemple de composant</CardDescription>
              <CardTitle className="flex items-center justify-between gap-3">
                Disponibilité
                <Badge variant="secondary">Disponible</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Prochaine course</p>
                  <p className="text-sm text-muted-foreground">
                    Plateau <span aria-hidden="true">→</span> Aéroport
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Détails
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Couleur principale
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Swatch name="Or MAXIMUS" value={tokens.color.light.primary} />
            <Swatch name="Fond clair" value={tokens.color.light.background} />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Typographie
          </h2>
          <p className="mt-4 text-2xl font-semibold">DM Sans</p>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Space Mono · 0123456789
          </p>
        </section>

        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rythme
          </h2>
          <p className="mt-4 text-2xl font-semibold">4 px</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Base d’espacement · rayon {tokens.radius}
          </p>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Échelle typographique
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TYPE_SCALE.map((entry) => (
            <div key={entry.label} className="border-l-2 border-primary pl-4">
              <p className="text-xs text-muted-foreground">{entry.label}</p>
              <p className={entry.className}>Lisible en déplacement</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ColorsPage() {
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Valeurs issues des tokens MAXIMUS Chauffeur. Chaque thème conserve ses
        propres rôles de marque, de surface, de navigation et de graphique.
      </p>
      <ColorPalette mode="light" />
      <ColorPalette mode="dark" />
    </div>
  );
}

export function FontsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Famille principale
        </p>
        <p
          className="mt-4 text-4xl font-semibold"
          style={{ fontFamily: tokens.fontFamily.sans.join(', ') }}
        >
          DM Sans
        </p>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Utilisée pour les titres, les textes courants et les libellés de
          l’interface.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Famille monospace
        </p>
        <p
          className="mt-4 text-2xl"
          style={{ fontFamily: tokens.fontFamily.mono.join(', ') }}
        >
          Space Mono · 0123456789
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Prévue pour les contenus numériques qui gagnent à être alignés.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Échelle
        </h2>
        <div className="mt-5 space-y-5">
          {TYPE_SCALE.map((entry) => (
            <div key={entry.label} className="grid gap-2 sm:grid-cols-[120px_1fr]">
              <span className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {entry.label}
              </span>
              <p className={entry.className}>Une interface facile à lire</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function LayoutPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Espacement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le pas de base des tokens est de {tokens.spacing} (4 px).
        </p>
        <div className="mt-6 space-y-4">
          {SPACING_STEPS.map((step) => (
            <div key={step.label} className="flex items-center gap-4">
              <span className="w-10 text-xs text-muted-foreground">
                {step.label}
              </span>
              <div
                className="h-3 rounded-full bg-primary"
                style={{
                  width: `calc(${tokens.spacing} * ${step.multiplier})`,
                }}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {step.multiplier * 4} px
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Rayons</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le rayon de base est de {tokens.radius}; les formes d’interface en
          dérivent.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Compact', className: 'rounded-sm' },
            { label: 'Standard', className: 'rounded-md' },
            { label: 'Confort', className: 'rounded-lg' },
            { label: 'Conteneur', className: 'rounded-xl' },
          ].map((radius) => (
            <div
              key={radius.label}
              className={`flex h-24 items-end border bg-muted p-3 ${radius.className}`}
            >
              <span className="text-xs font-medium">{radius.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
