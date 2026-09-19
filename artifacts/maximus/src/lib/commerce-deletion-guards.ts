type NamedReference = { client?: string; partner?: string };
type ProductReference = { productId?: string };

const sameName = (left: string | undefined, right: string) =>
  left?.trim().toLocaleLowerCase('fr') === right.trim().toLocaleLowerCase('fr');

export function productDeletionBlockReason(
  productId: string,
  dependencies: {
    sales: Array<{ items: ProductReference[] }>;
    purchaseOrders: ProductReference[];
    returns: ProductReference[];
  },
) {
  if (dependencies.sales.some(sale => sale.items.some(item => item.productId === productId))) {
    return 'Ce produit est référencé par une vente et ne peut pas être supprimé.';
  }
  if (dependencies.purchaseOrders.some(order => order.productId === productId)) {
    return 'Ce produit est référencé par une commande fournisseur et ne peut pas être supprimé.';
  }
  if (dependencies.returns.some(record => record.productId === productId)) {
    return 'Ce produit est référencé par un retour et ne peut pas être supprimé.';
  }
  return null;
}

export function clientDeletionBlockReason(
  clientName: string,
  dependencies: {
    sales: NamedReference[];
    credits: NamedReference[];
    returns: NamedReference[];
  },
) {
  if (dependencies.sales.some(sale => sameName(sale.client, clientName))) {
    return 'Ce client figure dans l’historique des ventes et des factures et ne peut pas être supprimé.';
  }
  if (dependencies.credits.some(credit => sameName(credit.client, clientName))) {
    return 'Ce client possède un dossier de crédit ou de règlement et ne peut pas être supprimé.';
  }
  if (dependencies.returns.some(record => sameName(record.partner, clientName))) {
    return 'Ce client est référencé par un retour et ne peut pas être supprimé.';
  }
  return null;
}

export function supplierDeletionBlockReason(
  supplierName: string,
  dependencies: {
    purchaseOrders: Array<{ supplier: string }>;
    returns: NamedReference[];
  },
) {
  if (dependencies.purchaseOrders.some(order => sameName(order.supplier, supplierName))) {
    return 'Ce fournisseur est lié à une commande et ne peut pas être supprimé.';
  }
  if (dependencies.returns.some(record => sameName(record.partner, supplierName))) {
    return 'Ce fournisseur est référencé par un avoir et ne peut pas être supprimé.';
  }
  return null;
}