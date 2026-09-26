import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

const logoUrl = `${import.meta.env.BASE_URL}maximus-mark.png`;

export function LogoPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Marque MAXIMUS</CardTitle>
          <CardDescription>
            Le signe existant, conservé sans redessin ni déformation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-56 items-center justify-center rounded-b-xl bg-muted p-8">
          <img
            src={logoUrl}
            alt="Emblème MAXIMUS, un M doré dans un écu bleu nuit"
            className="h-36 w-36 rounded-2xl object-cover"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilisation sur les surfaces</CardTitle>
          <CardDescription>
            La version fournie contient déjà son fond bleu nuit et son emblème
            ambre ; la garder entière et à proportions égales.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="flex min-h-36 items-center justify-center rounded-lg bg-card p-4">
            <img src={logoUrl} alt="" className="h-20 w-20 rounded-xl" />
          </div>
          <div className="flex min-h-36 items-center justify-center rounded-lg bg-accent p-4">
            <img src={logoUrl} alt="" className="h-20 w-20 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}