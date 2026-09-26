import type { CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  Clock3,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { Button } from "@workspace/maximus-transport-public/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/maximus-transport-public/components/ui/card";
import { Input } from "@workspace/maximus-transport-public/components/ui/input";
import { Label } from "@workspace/maximus-transport-public/components/ui/label";
import { tokens } from "@workspace/maximus-transport-public/tokens";

const transportPrimary = "#161d27";
const transportAccent = "#f2b705";

function hexToHslChannels(hex: string): string {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;
  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return `${Math.round(hue * 10) / 10} ${Math.round(saturation * 1000) / 10}% ${Math.round(lightness * 1000) / 10}%`;
}

function getThemeStyle(): CSSProperties {
  const palette = tokens.color.light;
  const variables = {
    "--background": hexToHslChannels(palette.background),
    "--foreground": hexToHslChannels(palette.foreground),
    "--border": hexToHslChannels(palette.border),
    "--input": hexToHslChannels(palette.input),
    "--card": hexToHslChannels(palette.card),
    "--card-foreground": hexToHslChannels(palette.cardForeground),
    "--popover": hexToHslChannels(palette.popover),
    "--popover-foreground": hexToHslChannels(palette.popoverForeground),
    "--secondary": hexToHslChannels(palette.secondary),
    "--secondary-foreground": hexToHslChannels(palette.secondaryForeground),
    "--muted": hexToHslChannels(palette.muted),
    "--muted-foreground": hexToHslChannels(palette.mutedForeground),
    "--destructive": hexToHslChannels(palette.destructive),
    "--destructive-foreground": hexToHslChannels(palette.destructiveForeground),
    "--sidebar": hexToHslChannels(palette.sidebar),
    "--sidebar-foreground": hexToHslChannels(palette.sidebarForeground),
    "--primary": hexToHslChannels(transportAccent),
    "--primary-foreground": hexToHslChannels(transportPrimary),
    "--primary-border": transportAccent,
    "--accent": hexToHslChannels(transportPrimary),
    "--accent-foreground": hexToHslChannels(palette.sidebarForeground),
    "--accent-border": transportPrimary,
    "--ring": hexToHslChannels(transportAccent),
    "--font-sans": tokens.fontFamily.sans.join(", "),
    "--font-mono": tokens.fontFamily.mono.join(", "),
  };

  return {
    ...variables,
    "--transport-primary": transportPrimary,
    "--transport-accent": transportAccent,
  } as CSSProperties;
}

function JourneySteps() {
  return (
    <nav aria-label="Progression de la commande" className="mt-5 flex items-center gap-2">
      {["Départ", "Destination", "Confirmation"].map((label, index) => (
        <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
              index === 0
                ? "border-primary bg-primary text-primary-foreground"
                : index === 1
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground"
            }`}
          >
            {index === 0 ? <Check size={14} /> : index + 1}
          </span>
          <span
            className={`truncate text-xs font-semibold ${
              index === 1 ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
          {index < 2 && <span className="ml-auto h-px w-3 bg-border" />}
        </div>
      ))}
    </nav>
  );
}

function RoutePreview() {
  return (
    <div
      role="img"
      aria-label="Aperçu statique de l’itinéraire entre le départ et Plateau"
      className="relative mt-3 h-52 overflow-hidden rounded-md border border-border bg-muted"
    >
      <div className="absolute inset-y-0 left-1/3 w-px bg-border" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <div className="absolute inset-y-0 right-1/4 w-px rotate-12 bg-border" />
      <div className="absolute left-[23%] top-[62%] h-3 w-3 rounded-full bg-destructive ring-4 ring-background" />
      <div className="absolute left-[27%] top-[56%] h-1 w-[45%] -rotate-[25deg] rounded-full bg-primary" />
      <div className="absolute right-[22%] top-[22%] flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-sm">
        <MapPin size={15} />
      </div>
      <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-border bg-card/95 px-3 py-2 text-[10px] font-semibold text-muted-foreground">
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-destructive" />
          Départ GPS
        </span>
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
          Destination
        </span>
        <span className="ml-auto">Aperçu indicatif</span>
      </div>
    </div>
  );
}

export function TransportJourney() {
  return (
    <section
      style={getThemeStyle()}
      className="mx-auto min-h-screen w-full max-w-5xl overflow-hidden border border-border bg-background text-foreground shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Button type="button" variant="ghost" size="sm" className="gap-2">
          <ArrowLeft size={16} />
          Taxi Urbain
        </Button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Dakar
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <MapPin size={13} />
            GPS actif · 18 m
          </span>
        </div>
      </header>

      <div className="relative h-40 overflow-hidden border-b border-border sm:h-60">
        <img
          src="/__mockup/images/taxi-transport-hero.jpg"
          alt="Taxi Urbain à Dakar"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar/80 via-transparent to-sidebar/10" />
        <p className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-sidebar-foreground sm:bottom-5 sm:left-6">
          Taxi Urbain · Dakar
        </p>
      </div>

      <div className="px-4 pb-24 pt-5 sm:px-8 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Taxi Urbain · Dakar
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Commander un taxi
            </h1>
          </div>
          <CarFront size={24} className="mt-1 text-muted-foreground" aria-hidden="true" />
        </div>
        <JourneySteps />

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <Card aria-label="Coordonnées passager">
              <CardHeader className="gap-1 p-4 pb-3">
                <div>
                  <CardTitle>Coordonnées passager</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Le chauffeur pourra vous joindre pour confirmer la prise en charge.
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-primary">
                  Requis
                </span>
              </CardHeader>
              <CardContent className="grid gap-3 border-t border-border p-4 pt-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="journey-phone">
                    Téléphone
                  </Label>
                  <Input id="journey-phone" type="tel" placeholder="+221 77 000 00 00" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="journey-name">
                    Prénom
                  </Label>
                  <Input id="journey-name" placeholder="Ex. Awa" />
                </div>
              </CardContent>
            </Card>

            <Card aria-label="Détails du trajet">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
                <CardTitle>Votre trajet</CardTitle>
                <span className="text-xs font-semibold text-primary">GPS précis · 18 m</span>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <MapPin size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Départ
                    </p>
                    <p className="mt-1 text-sm font-semibold">Position actuelle · Dakar</p>
                  </div>
                </div>
                <div className="ml-4 h-4 border-l border-dashed border-border" />
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <MapPin size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="journey-destination">
                      Destination
                    </Label>
                    <Input
                      id="journey-destination"
                      className="mt-1"
                      defaultValue="Plateau, Dakar"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Lieu confirmé depuis les résultats de recherche.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader className="border-b border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Estimation</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Position actuelle → Plateau, Dakar
                  </p>
                </div>
                <p className="text-2xl font-bold">2 850 XOF</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="flex gap-4 border-b border-border pb-3 text-xs font-medium text-muted-foreground">
                <span>
                  <Clock3 size={14} className="mr-1 inline" />
                  18 min
                </span>
                <span>
                  <CarFront size={14} className="mr-1 inline" />
                  6,2 km
                </span>
                <span className="ml-auto">Tarif indicatif</span>
              </div>
              <RoutePreview />
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground lg:col-span-2">
            Vos coordonnées sont partagées uniquement avec le chauffeur affecté par MAXIMUS.
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-8">
        <Button type="button" size="lg" className="w-full gap-2">
          <CarFront />
          Commander un taxi
          <ArrowRight />
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <RefreshCw size={11} />
          Le devis est recalculé si l’itinéraire change.
        </p>
      </div>
    </section>
  );
}