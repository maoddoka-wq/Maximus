import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import maximusMark from '../../docs/references/logos/maximus-mark.png';
import { tokens } from '../generated/tokens';

export function BrandPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Signature officielle
          </p>
          <CardTitle>MAXIMUS</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex min-h-48 items-center justify-center rounded-lg border bg-background p-8">
            <img
              src={maximusMark}
              alt="Logo MAXIMUS"
              className="h-auto max-h-24 w-full max-w-64 object-contain"
            />
          </div>
          <div className="dark flex min-h-48 items-center justify-center rounded-lg border bg-background p-8">
            <img
              src={maximusMark}
              alt="Logo MAXIMUS sur fond sombre"
              className="h-auto max-h-24 w-full max-w-64 object-contain"
            />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identité du produit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Le signe MAXIMUS porte l’identité du produit et s’affiche dans
              cette documentation.
            </p>
            <p>
              Les écrans Chauffeur peuvent aussi afficher l’identité de
              l’entreprise, avec son initiale en repli lorsqu’aucune photo n’est
              disponible.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Couleur de marque</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <span
              className="size-14 shrink-0 rounded-lg border"
              style={{
                backgroundColor: tokens.color.light.primary,
                borderColor: 'var(--border)',
              }}
              aria-hidden="true"
            />
            <div>
              <p className="font-medium">Or MAXIMUS</p>
              <p className="font-mono text-sm text-muted-foreground">
                {tokens.color.light.primary}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}