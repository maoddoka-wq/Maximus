import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Package,
  RefreshCw,
  Search,
  Warehouse,
} from 'lucide-react';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/maximus-design-system/components/ui/card';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/maximus-design-system/components/ui/select';
import { Textarea } from '@workspace/maximus-design-system/components/ui/textarea';
import type {
  CreateEcommerceInventoryAdjustment,
  EcommerceInventoryBootstrap,
  EcommerceInventoryMovement,
  EcommerceInventoryProduct,
} from '@/lib/ecommerce-api';

type EcommerceInventoryPanelProps = {
  data: EcommerceInventoryBootstrap;
  canAdjust: boolean;
  refreshing?: boolean;
  busy?: boolean;
  onRefresh: () => void;
  onAdjust: (input: CreateEcommerceInventoryAdjustment) => Promise<EcommerceInventoryMovement | undefined>;
};

type InventoryDirection = CreateEcommerceInventoryAdjustment['direction'];

const movementSourceLabels: Record<EcommerceInventoryMovement['sourceType'], string> = {
  OPENING_BALANCE: 'Stock d’ouverture',
  MANUAL_ADJUSTMENT: 'Ajustement manuel',
  POS_SALE: 'Vente comptoir',
  ONLINE_ORDER: 'Commande en ligne',
  ONLINE_RETURN: 'Retour en ligne',
};

const productStatusLabels: Record<EcommerceInventoryProduct['status'], string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
};

function formatDateTime(value: string | null): string {
  if (!value) return 'Date non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatUnits(value: number): string {
  return `${value} unité${value === 1 ? '' : 's'}`;
}

function InventoryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString('fr-FR')}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}

function ProductStatusBadge({ status }: { status: EcommerceInventoryProduct['status'] }) {
  const variant = status === 'PUBLISHED' ? 'secondary' : status === 'ARCHIVED' ? 'outline' : 'default';
  return <Badge variant={variant}>{productStatusLabels[status]}</Badge>;
}

function MovementCard({ movement }: { movement: EcommerceInventoryMovement }) {
  const inbound = movement.direction === 'IN';
  return (
    <article
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
      data-testid={`card-inventory-movement-${movement.id}`}
    >
      <div className="flex min-w-0 gap-3">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
            inbound ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          }`}
        >
          {inbound ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{movement.productName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {movement.sku || 'Sans référence'} · {movementSourceLabels[movement.sourceType]}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(movement.createdAt)}
            {movement.createdBy ? ` · ${movement.createdBy}` : ''}
          </p>
          {(movement.reason || movement.reference) && (
            <p className="mt-2 break-words text-sm text-muted-foreground">
              {movement.reason}
              {movement.reason && movement.reference ? ' · ' : ''}
              {movement.reference ? `Réf. ${movement.reference}` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
        <span className={`font-semibold tabular-nums ${inbound ? 'text-primary' : 'text-foreground'}`}>
          {inbound ? '+' : '−'}{movement.quantity}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {movement.stockBefore ?? '—'} → {movement.stockAfter ?? '—'} en stock
        </span>
      </div>
    </article>
  );
}

export default function EcommerceInventoryPanel({
  data,
  canAdjust,
  refreshing = false,
  busy = false,
  onRefresh,
  onAdjust,
}: EcommerceInventoryPanelProps) {
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [direction, setDirection] = useState<InventoryDirection>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completedMovement, setCompletedMovement] = useState<EcommerceInventoryMovement | null>(null);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr-FR');
    if (!query) return data.products;
    return data.products.filter(product =>
      `${product.name} ${product.sku} ${product.category}`.toLocaleLowerCase('fr-FR').includes(query),
    );
  }, [data.products, search]);
  const selectedProduct = data.products.find(product => product.id === productId);
  const parsedQuantity = Number(quantity);
  const quantityIsValid = Number.isSafeInteger(parsedQuantity)
    && parsedQuantity > 0
    && !(direction === 'OUT' && selectedProduct && parsedQuantity > selectedProduct.stock);
  const formIsDisabled = !canAdjust || busy || submitting || data.products.length === 0;

  const submitAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAdjust || busy || submitting || !selectedProduct || !quantityIsValid || !reason.trim()) return;

    setSubmitting(true);
    setSubmitError('');
    setCompletedMovement(null);
    const requestKey = idempotencyKey ?? globalThis.crypto.randomUUID();
    setIdempotencyKey(requestKey);
    try {
      const movement = await onAdjust({
        productId: selectedProduct.id,
        direction,
        quantity: parsedQuantity,
        reason: reason.trim(),
        idempotencyKey: requestKey,
      });
      if (movement) {
        setCompletedMovement(movement);
        setIdempotencyKey(null);
        setProductId('');
        setDirection('IN');
        setQuantity('');
        setReason('');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'L’ajustement n’a pas pu être enregistré. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="panel-ecommerce-inventory" aria-busy={busy || submitting}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Inventaire</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Suivez les quantités disponibles et comprenez chaque entrée ou sortie de stock.
          </p>
        </div>
        <Button
          aria-label="Actualiser l’inventaire"
          data-testid="button-inventory-refresh"
          disabled={refreshing || busy}
          onClick={onRefresh}
          type="button"
          variant="outline"
        >
          <RefreshCw aria-hidden="true" className={`mr-2 size-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualisation…' : 'Actualiser'}
        </Button>
      </header>

      <section aria-label="Résumé de l’inventaire" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <InventoryMetric label="Références" value={data.summary.productCount} detail="Produits suivis" />
        <InventoryMetric label="Unités en stock" value={data.summary.totalUnits} detail="Quantité totale déclarée" />
        <InventoryMetric label="En rupture" value={data.summary.outOfStockCount} detail="Produits sans unité disponible" />
      </section>

      {!canAdjust && (
        <div
          className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground"
          data-testid="status-inventory-permission"
          role="status"
        >
          Vous pouvez consulter l’inventaire, mais vous n’êtes pas autorisé à ajuster les quantités.
        </div>
      )}

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <Card className="min-w-0">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package aria-hidden="true" className="size-4 text-primary" />
                  Stock par produit
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Les quantités partagées avec les ventes comptoir et la boutique en ligne.</p>
              </div>
              <Badge variant="outline">{data.products.length} référence{data.products.length === 1 ? '' : 's'}</Badge>
            </div>
            {data.products.length > 0 && (
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher un produit par nom, référence ou catégorie"
                  className="pl-9"
                  data-testid="input-inventory-search"
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Rechercher un produit"
                  type="search"
                  value={search}
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {data.products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-5 py-10 text-center" data-testid="empty-inventory-products">
                <Warehouse aria-hidden="true" className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="font-medium">Aucun produit à suivre</p>
                <p className="mt-1 text-sm text-muted-foreground">Les produits physiques du catalogue apparaîtront ici.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground" data-testid="empty-inventory-search">
                Aucun produit ne correspond à « {search} ».
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[38rem] text-left text-sm">
                  <caption className="sr-only">Produits et quantités actuelles en stock</caption>
                  <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 font-medium sm:px-4" scope="col">Produit</th>
                      <th className="px-3 py-3 font-medium" scope="col">Catégorie</th>
                      <th className="px-3 py-3 text-right font-medium" scope="col">Stock</th>
                      <th className="px-3 py-3 text-right font-medium sm:px-4" scope="col">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => (
                      <tr className="border-t border-border" key={product.id} data-testid={`row-inventory-product-${product.id}`}>
                        <td className="px-3 py-3 sm:px-4">
                          <p className="max-w-64 truncate font-medium">{product.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{product.sku || 'Sans référence'}</p>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{product.category || 'Sans catégorie'}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatUnits(product.stock)}</td>
                        <td className="px-3 py-3 text-right sm:px-4">
                          <ProductStatusBadge status={product.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownToLine aria-hidden="true" className="size-4 text-primary" />
              Ajuster le stock
            </CardTitle>
            <p className="text-sm text-muted-foreground">Enregistrez une entrée ou une sortie avec son motif.</p>
          </CardHeader>
          <CardContent>
            {data.products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground" data-testid="empty-inventory-adjustment">
                Ajoutez d’abord un produit au catalogue pour enregistrer un ajustement.
              </div>
            ) : (
              <form className="space-y-4" onSubmit={submitAdjustment}>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="inventory-product">Produit</label>
                  <Select
                    disabled={formIsDisabled}
                    onValueChange={value => {
                      setProductId(value);
                      setIdempotencyKey(null);
                      setSubmitError('');
                      setCompletedMovement(null);
                    }}
                    value={productId}
                  >
                    <SelectTrigger data-testid="select-inventory-product" id="inventory-product">
                      <SelectValue placeholder="Choisir un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} · {product.sku || 'Sans référence'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProduct && (
                    <p className="text-xs text-muted-foreground">Stock actuel : {formatUnits(selectedProduct.stock)}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="inventory-direction">Type de mouvement</label>
                  <Select
                    disabled={formIsDisabled}
                    onValueChange={value => {
                      setDirection(value as InventoryDirection);
                      setIdempotencyKey(null);
                      setSubmitError('');
                    }}
                    value={direction}
                  >
                    <SelectTrigger data-testid="select-inventory-direction" id="inventory-direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Entrée de stock</SelectItem>
                      <SelectItem value="OUT">Sortie de stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="inventory-quantity">Quantité</label>
                  <Input
                    data-testid="input-inventory-quantity"
                    disabled={formIsDisabled}
                    id="inventory-quantity"
                    min="1"
                    max={direction === 'OUT' && selectedProduct ? selectedProduct.stock : undefined}
                    onChange={event => {
                      setQuantity(event.target.value);
                      setIdempotencyKey(null);
                      setSubmitError('');
                    }}
                    placeholder="Saisir un nombre entier"
                    step="1"
                    type="number"
                    value={quantity}
                  />
                  {direction === 'OUT' && selectedProduct && parsedQuantity > selectedProduct.stock && (
                    <p className="text-xs text-destructive" role="alert">
                      La sortie ne peut pas dépasser le stock disponible ({selectedProduct.stock}).
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="inventory-reason">Motif</label>
                  <Textarea
                    data-testid="input-inventory-reason"
                    disabled={formIsDisabled}
                    id="inventory-reason"
                    onChange={event => {
                      setReason(event.target.value);
                      setIdempotencyKey(null);
                      setSubmitError('');
                    }}
                    placeholder="Expliquez la raison de cet ajustement"
                    required
                    rows={3}
                    value={reason}
                  />
                </div>

                {submitError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-inventory-error" role="alert">
                    {submitError}
                  </div>
                )}
                {completedMovement && (
                  <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm" data-testid="status-inventory-success" role="status">
                    <p className="font-semibold">Ajustement enregistré</p>
                    <p className="mt-1 text-muted-foreground">
                      {completedMovement.productName} : {completedMovement.stockBefore ?? '—'} → {completedMovement.stockAfter ?? '—'} en stock.
                    </p>
                  </div>
                )}
                {!canAdjust && (
                  <p className="text-xs text-muted-foreground">Un droit d’ajustement est requis pour modifier le stock.</p>
                )}
                <Button
                  className="w-full"
                  data-testid="button-inventory-adjust"
                  disabled={
                    formIsDisabled
                    || !productId
                    || !quantityIsValid
                    || !reason.trim()
                  }
                  type="submit"
                >
                  {submitting || busy ? 'Enregistrement…' : 'Enregistrer l’ajustement'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History aria-hidden="true" className="size-4 text-primary" />
              Historique des mouvements
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Historique limité aux 100 mouvements les plus récents fournis par l’API.
            </p>
          </div>
          <Badge variant="outline">{data.movements.length}</Badge>
        </CardHeader>
        <CardContent className="pt-0">
          {data.movements.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center" data-testid="empty-inventory-movements">
              <History aria-hidden="true" className="mx-auto mb-3 size-7 text-muted-foreground" />
              <p className="font-medium">Aucun mouvement récent</p>
              <p className="mt-1 text-sm text-muted-foreground">Les ventes et ajustements de stock apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.movements.map(movement => <MovementCard key={movement.id} movement={movement} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}