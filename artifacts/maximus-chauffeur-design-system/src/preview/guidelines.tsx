import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Guidelines } from './parts';
import { tokens } from '../generated/tokens';

export function ChauffeurGuidelinesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Repères visuels</CardTitle>
          <p className="text-sm text-muted-foreground">
            Principes tirés des tokens partagés et des écrans Chauffeur
            existants.
          </p>
        </CardHeader>
        <CardContent>
          <Guidelines
            items={[
              {
                kind: 'do',
                text: `Utiliser ${tokens.fontFamily.sans[0]} pour la typographie principale et ${tokens.fontFamily.mono[0]} pour les contenus numériques alignés.`,
              },
              {
                kind: 'do',
                text: `Garder le rythme d’espacement sur la base ${tokens.spacing} et le rayon principal à ${tokens.radius}.`,
              },
              {
                kind: 'do',
                text: 'Limiter la couleur personnalisée de l’entreprise aux rôles primaire, accent et focus; conserver les autres rôles du thème.',
              },
              {
                kind: 'do',
                text: 'Quand la photo de l’entreprise manque, afficher son initiale plutôt qu’un emplacement vide.',
              },
              {
                kind: 'dont',
                text: 'Ne pas étendre une couleur d’entreprise à toute la palette : les surfaces, textes et états destructifs gardent leurs rôles dédiés.',
              },
            ]}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Palette à deux thèmes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Les tokens fournissent des valeurs séparées pour les interfaces
            claires et sombres.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accent contrôlé</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            L’accent de l’entreprise met en évidence les actions et le focus,
            sans remplacer les surfaces neutres.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">État lisible</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Le statut du chauffeur est présenté comme une information explicite
            dans l’interface, et non comme une couleur seule.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}