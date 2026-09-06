import { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  FileText,
  FolderOpen,
  Handshake,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Truck,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import {
  money,
  shortMoney,
  uid,
  type AccountingEntry,
  type BusinessDocument,
  type CrmOpportunity,
  type Delivery,
  type ModuleId,
  type PayrollSlip,
  type PurchaseOrder,
  type Status,
  type StoreData,
  type SupplierRecord,
} from '@/lib/store';
import { useAppDialog } from '@/components/confirm-dialog';

type Mutate = (fn: (draft: StoreData) => void, message?: string) => void;
type RecordItem =
  | PurchaseOrder
  | AccountingEntry
  | PayrollSlip
  | CrmOpportunity
  | SupplierRecord
  | Delivery
  | BusinessDocument;
type RecordKey =
  | 'purchaseOrders'
  | 'accountingEntries'
  | 'payrollSlips'
  | 'crmOpportunities'
  | 'supplierRecords'
  | 'deliveries'
  | 'businessDocuments';
type OperationalModuleId = Extract<
  ModuleId,
  'achats' | 'comptabilite' | 'paie' | 'crm' | 'fournisseurs' | 'logistique' | 'documents'
>;

type Field = {
  key: string;
  label: string;
  type?: 'number' | 'select';
  options?: string[];
};

type Column = {
  label: string;
  value: (item: RecordItem) => string | number;
};

type Config = {
  id: OperationalModuleId;
  key: RecordKey;
  title: string;
  description: string;
  noun: string;
  icon: typeof ReceiptText;
  fields: Field[];
  columns: Column[];
  search: (item: RecordItem) => string;
  amount?: (item: RecordItem) => number;
  create: (values: Record<string, string>) => RecordItem;
};

const statuses: Status[] = [
  'BROUILLON',
  'EN ATTENTE',
  'ACTIF',
  'VALIDÉ',
  'CONFIRMÉ',
  'ARCHIVÉ',
];

const configs: Config[] = [
  {
    id: 'achats',
    key: 'purchaseOrders',
    title: 'Achats & approvisionnements',
    description: 'Préparez, validez et suivez les commandes fournisseurs.',
    noun: 'commande',
    icon: PackageCheck,
    fields: [
      { key: 'supplier', label: 'Fournisseur' },
      { key: 'subject', label: 'Objet de l’achat' },
      { key: 'amount', label: 'Montant TTC (FCFA)', type: 'number' },
    ],
    columns: [
      { label: 'Référence', value: item => (item as PurchaseOrder).reference },
      { label: 'Fournisseur', value: item => (item as PurchaseOrder).supplier },
      { label: 'Objet', value: item => (item as PurchaseOrder).subject },
      { label: 'Montant', value: item => money((item as PurchaseOrder).amount) },
      { label: 'Date', value: item => (item as PurchaseOrder).date },
    ],
    search: item => {
      const purchaseOrder = item as PurchaseOrder;
      return `${purchaseOrder.reference} ${purchaseOrder.supplier} ${purchaseOrder.subject}`;
    },
    amount: item => (item as PurchaseOrder).amount,
    create: values => ({
      id: uid('po'),
      reference: `BC-${Date.now().toString().slice(-6)}`,
      supplier: values.supplier,
      subject: values.subject,
      amount: Number(values.amount),
      date: 'À l’instant',
      status: 'BROUILLON',
    }),
  },
  {
    id: 'comptabilite',
    key: 'accountingEntries',
    title: 'Comptabilité',
    description: 'Centralisez les écritures et sécurisez la validation des journaux.',
    noun: 'écriture',
    icon: ReceiptText,
    fields: [
      {
        key: 'journal',
        label: 'Journal',
        type: 'select',
        options: ['Banque', 'Achats', 'Ventes', 'Opérations diverses'],
      },
      { key: 'label', label: 'Libellé' },
      { key: 'debit', label: 'Débit (FCFA)', type: 'number' },
      { key: 'credit', label: 'Crédit (FCFA)', type: 'number' },
    ],
    columns: [
      { label: 'Pièce', value: item => (item as AccountingEntry).reference },
      { label: 'Journal', value: item => (item as AccountingEntry).journal },
      { label: 'Libellé', value: item => (item as AccountingEntry).label },
      { label: 'Débit', value: item => money((item as AccountingEntry).debit) },
      { label: 'Crédit', value: item => money((item as AccountingEntry).credit) },
      { label: 'Date', value: item => (item as AccountingEntry).date },
    ],
    search: item => {
      const entry = item as AccountingEntry;
      return `${entry.reference} ${entry.journal} ${entry.label}`;
    },
    amount: item => (item as AccountingEntry).debit,
    create: values => ({
      id: uid('acc'),
      reference: `OD-${Date.now().toString().slice(-6)}`,
      journal: values.journal,
      label: values.label,
      debit: Number(values.debit),
      credit: Number(values.credit),
      date: 'À l’instant',
      status: 'BROUILLON',
    }),
  },
  {
    id: 'paie',
    key: 'payrollSlips',
    title: 'Paie',
    description: 'Préparez les bulletins et contrôlez les montants nets à payer.',
    noun: 'bulletin',
    icon: WalletCards,
    fields: [
      { key: 'employee', label: 'Collaborateur' },
      { key: 'period', label: 'Période', type: 'select', options: ['Juin 2024', 'Juillet 2024'] },
      { key: 'gross', label: 'Brut (FCFA)', type: 'number' },
      { key: 'net', label: 'Net à payer (FCFA)', type: 'number' },
    ],
    columns: [
      { label: 'Bulletin', value: item => (item as PayrollSlip).reference },
      { label: 'Collaborateur', value: item => (item as PayrollSlip).employee },
      { label: 'Période', value: item => (item as PayrollSlip).period },
      { label: 'Brut', value: item => money((item as PayrollSlip).gross) },
      { label: 'Net', value: item => money((item as PayrollSlip).net) },
    ],
    search: item => {
      const slip = item as PayrollSlip;
      return `${slip.reference} ${slip.employee} ${slip.period}`;
    },
    amount: item => (item as PayrollSlip).net,
    create: values => ({
      id: uid('payroll'),
      reference: `PAIE-${Date.now().toString().slice(-6)}`,
      employee: values.employee,
      period: values.period,
      gross: Number(values.gross),
      net: Number(values.net),
      status: 'BROUILLON',
    }),
  },
  {
    id: 'crm',
    key: 'crmOpportunities',
    title: 'CRM / Clients',
    description: 'Transformez les contacts en opportunités suivies par votre équipe.',
    noun: 'opportunité',
    icon: UsersRound,
    fields: [
      { key: 'client', label: 'Client' },
      { key: 'contact', label: 'Contact' },
      { key: 'subject', label: 'Opportunité' },
      { key: 'amount', label: 'Potentiel (FCFA)', type: 'number' },
      { key: 'nextAction', label: 'Prochaine action' },
    ],
    columns: [
      { label: 'Client', value: item => (item as CrmOpportunity).client },
      { label: 'Contact', value: item => (item as CrmOpportunity).contact },
      { label: 'Opportunité', value: item => (item as CrmOpportunity).subject },
      { label: 'Potentiel', value: item => money((item as CrmOpportunity).amount) },
      { label: 'Prochaine action', value: item => (item as CrmOpportunity).nextAction },
    ],
    search: item => {
      const opportunity = item as CrmOpportunity;
      return `${opportunity.client} ${opportunity.contact} ${opportunity.subject}`;
    },
    amount: item => (item as CrmOpportunity).amount,
    create: values => ({
      id: uid('crm'),
      client: values.client,
      contact: values.contact,
      subject: values.subject,
      amount: Number(values.amount),
      nextAction: values.nextAction,
      status: 'ACTIF',
    }),
  },
  {
    id: 'fournisseurs',
    key: 'supplierRecords',
    title: 'Fournisseurs',
    description: 'Maintenez un référentiel qualifié pour vos achats au Sénégal.',
    noun: 'fournisseur',
    icon: Handshake,
    fields: [
      { key: 'name', label: 'Raison sociale' },
      { key: 'contact', label: 'Contact principal' },
      { key: 'phone', label: 'Téléphone' },
      { key: 'category', label: 'Catégorie' },
      { key: 'score', label: 'Score qualité / 100', type: 'number' },
    ],
    columns: [
      { label: 'Fournisseur', value: item => (item as SupplierRecord).name },
      { label: 'Contact', value: item => (item as SupplierRecord).contact },
      { label: 'Téléphone', value: item => (item as SupplierRecord).phone },
      { label: 'Catégorie', value: item => (item as SupplierRecord).category },
      { label: 'Score', value: item => `${(item as SupplierRecord).score}/100` },
    ],
    search: item => {
      const supplier = item as SupplierRecord;
      return `${supplier.name} ${supplier.contact} ${supplier.category}`;
    },
    create: values => ({
      id: uid('sup'),
      name: values.name,
      contact: values.contact,
      phone: values.phone,
      category: values.category,
      score: Number(values.score),
      status: 'ACTIF',
    }),
  },
  {
    id: 'logistique',
    key: 'deliveries',
    title: 'Logistique',
    description: 'Planifiez les tournées et confirmez chaque livraison client.',
    noun: 'livraison',
    icon: Truck,
    fields: [
      { key: 'recipient', label: 'Destinataire' },
      { key: 'destination', label: 'Destination' },
      { key: 'driver', label: 'Chauffeur' },
      { key: 'date', label: 'Créneau de livraison' },
    ],
    columns: [
      { label: 'Référence', value: item => (item as Delivery).reference },
      { label: 'Destinataire', value: item => (item as Delivery).recipient },
      { label: 'Destination', value: item => (item as Delivery).destination },
      { label: 'Chauffeur', value: item => (item as Delivery).driver },
      { label: 'Créneau', value: item => (item as Delivery).date },
    ],
    search: item => {
      const delivery = item as Delivery;
      return `${delivery.reference} ${delivery.recipient} ${delivery.destination} ${delivery.driver}`;
    },
    create: values => ({
      id: uid('del'),
      reference: `LIV-${Date.now().toString().slice(-6)}`,
      recipient: values.recipient,
      destination: values.destination,
      driver: values.driver,
      date: values.date,
      status: 'EN ATTENTE',
    }),
  },
  {
    id: 'documents',
    key: 'businessDocuments',
    title: 'Documents métier',
    description: 'Classez les pièces utiles et contrôlez leur cycle de validation.',
    noun: 'document',
    icon: FolderOpen,
    fields: [
      { key: 'name', label: 'Nom du document' },
      {
        key: 'category',
        label: 'Catégorie',
        type: 'select',
        options: ['Contrats', 'Factures', 'Procédures', 'RH'],
      },
      { key: 'owner', label: 'Responsable' },
    ],
    columns: [
      { label: 'Document', value: item => (item as BusinessDocument).name },
      { label: 'Catégorie', value: item => (item as BusinessDocument).category },
      { label: 'Responsable', value: item => (item as BusinessDocument).owner },
      { label: 'Mise à jour', value: item => (item as BusinessDocument).updatedAt },
      { label: 'Version', value: item => `v${(item as BusinessDocument).version}` },
    ],
    search: item => {
      const document = item as BusinessDocument;
      return `${document.name} ${document.category} ${document.owner}`;
    },
    create: values => ({
      id: uid('doc'),
      name: values.name,
      category: values.category,
      owner: values.owner,
      updatedAt: 'À l’instant',
      version: 1,
      status: 'BROUILLON',
    }),
  },
];

export function OperationalModulePage({
  moduleId,
  data,
  mutate,
  canCreate = true,
  canModify = true,
  featurePermissions,
}: {
  moduleId: ModuleId;
  data: StoreData;
  mutate: Mutate;
  canCreate?: boolean;
  canModify?: boolean;
  featurePermissions?: Partial<Record<string, string[]>>;
}) {
  const config = configs.find(item => item.id === moduleId);
  if (!config) return null;

  const scopedCanCreate = featurePermissions
    ? Object.values(featurePermissions).some(permissions => permissions?.includes('créer'))
    : canCreate;
  const scopedCanModify = featurePermissions
    ? Object.values(featurePermissions).some(permissions => permissions?.includes('modifier'))
    : canModify;

  return (
    <ModuleScreen
      config={config}
      data={data}
      mutate={mutate}
      canCreate={scopedCanCreate}
      canModify={scopedCanModify}
    />
  );
}

function ModuleScreen({
  config,
  data,
  mutate,
  canCreate,
  canModify,
}: {
  config: Config;
  data: StoreData;
  mutate: Mutate;
  canCreate: boolean;
  canModify: boolean;
}) {
  const { confirm } = useAppDialog();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Tous');
  const [editor, setEditor] = useState<RecordItem | 'new' | null>(null);
  const records = recordsFor(data, config.key);
  const filtered = useMemo(
    () =>
      records
        .filter(item => config.search(item).toLowerCase().includes(query.toLowerCase()))
        .filter(item => filter === 'Tous' || item.status === filter),
    [config, filter, query, records],
  );
  const total = config.amount
    ? records
        .filter(item => item.status !== 'ARCHIVÉ')
        .reduce((sum, item) => sum + config.amount!(item), 0)
    : records.filter(item => item.status === 'ACTIF').length;
  const Icon = config.icon;

  const setStatus = (id: string, status: Status) => {
    mutate(
      draft => {
        const item = recordsFor(draft, config.key).find(record => record.id === id);
        if (item) item.status = status;
      },
      `Statut de la ${config.noun} mis à jour.`,
    );
  };

  const remove = (item: RecordItem) => {
    mutate(draft => {
      const collection = recordsFor(draft, config.key);
      const index = collection.findIndex(record => record.id === item.id);
      if (index >= 0) collection.splice(index, 1);
    }, `${capitalize(config.noun)} supprimée.`);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={Icon}
          label={`${capitalize(config.noun)}s actives`}
          value={String(records.filter(item => item.status !== 'ARCHIVÉ').length)}
          detail="dans le suivi opérationnel"
        />
        <Metric
          icon={Check}
          label="Validées / confirmées"
          value={String(
            records.filter(item => item.status === 'VALIDÉ' || item.status === 'CONFIRMÉ').length,
          )}
          detail="dossiers finalisés"
        />
        <Metric
          icon={WalletCards}
          label={config.amount ? 'Montant suivi' : 'Dossiers actifs'}
          value={config.amount ? shortMoney(total) : String(total)}
          detail={config.amount ? 'FCFA hors archives' : 'statut ACTIF'}
        />
      </div>

      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold">{config.title}</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {config.description}
            </p>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => setEditor('new')}
              className="btn flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"
            >
              <Plus size={15} />
              Nouvelle {config.noun}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 p-5 sm:flex-row">
          <label className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
              size={15}
            />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={`Rechercher une ${config.noun}...`}
              className="w-full rounded-lg border bg-transparent py-2.5 pl-9 pr-3 text-sm"
            />
          </label>
          <select
            value={filter}
            onChange={event => setFilter(event.target.value)}
            className="rounded-lg border bg-transparent px-3 py-2 text-sm"
          >
            <option>Tous</option>
            {statuses.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <RecordsTable
          config={config}
          records={filtered}
          canModify={canModify}
          onStatusChange={setStatus}
          onEdit={setEditor}
          onRemove={item => {
            void confirm({
              title: `Supprimer cette ${config.noun} ?`,
              description: 'Cette action est irréversible.',
              confirmLabel: 'Supprimer',
              tone: 'danger',
            }).then(confirmed => {
              if (confirmed) remove(item);
            });
          }}
        />
      </section>

      {editor && (
        <Editor
          config={config}
          item={editor}
          mutate={mutate}
          canCreate={canCreate}
          canModify={canModify}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function RecordsTable({
  config,
  records,
  canModify,
  onStatusChange,
  onEdit,
  onRemove,
}: {
  config: Config;
  records: RecordItem[];
  canModify: boolean;
  onStatusChange: (id: string, status: Status) => void;
  onEdit: (item: RecordItem) => void;
  onRemove: (item: RecordItem) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table w-full min-w-[850px] text-left text-sm">
        <thead className="bg-[hsl(var(--muted)/.55)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          <tr>
            {config.columns.map(column => (
              <th key={column.label} className="px-4 py-3">
                {column.label}
              </th>
            ))}
            <th className="px-4 py-3">Statut</th>
            {canModify && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map(item => {
            const locked = ['VALIDÉ', 'CONFIRMÉ', 'ARCHIVÉ'].includes(item.status);
            return (
              <tr key={item.id} className="hover:bg-[hsl(var(--muted)/.35)]">
                {config.columns.map(column => (
                  <td key={column.label} className="px-4 py-3">
                    {column.value(item)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <Status status={item.status} />
                </td>
                {canModify && (
                  <td className="px-4 py-3">
                    {locked ? (
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        Dossier finalisé
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <select
                          aria-label="Changer le statut"
                          value={item.status}
                          onChange={event =>
                            onStatusChange(item.id, event.target.value as Status)
                          }
                          className="rounded border bg-transparent px-2 py-1 text-[10px]"
                        >
                          {transitionOptions(item.status).map(status => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          title={`Modifier la ${config.noun}`}
                          aria-label={`Modifier la ${config.noun}`}
                          onClick={() => onEdit(item)}
                          className="inline-flex items-center gap-1 rounded border px-2 py-1.5 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"
                        >
                          <Edit3 size={13} />
                          <span>Modifier</span>
                        </button>
                        <button
                          type="button"
                          title={`Supprimer la ${config.noun}`}
                          aria-label={`Supprimer la ${config.noun}`}
                          onClick={() => onRemove(item)}
                          className="inline-flex items-center gap-1 rounded border px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"
                        >
                          <Trash2 size={13} />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {records.length === 0 && (
            <tr>
              <td
                colSpan={config.columns.length + (canModify ? 2 : 1)}
                className="px-4 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
              >
                Aucun résultat pour ces filtres.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Editor({
  config,
  item,
  mutate,
  canCreate,
  canModify,
  onClose,
}: {
  config: Config;
  item: RecordItem | 'new';
  mutate: Mutate;
  canCreate: boolean;
  canModify: boolean;
  onClose: () => void;
}) {
  const existing = item === 'new' ? {} : itemValues(item);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map(field => [field.key, String(existing[field.key] ?? '')])),
  );
  const [error, setError] = useState('');
  const canSave = item === 'new' ? canCreate : canModify;

  const save = () => {
    const validation = validate(config, values);
    if (validation) {
      setError(validation);
      return;
    }

    mutate(draft => {
      const records = recordsFor(draft, config.key);
      if (item === 'new') {
        records.unshift(config.create(values));
        return;
      }

      const target = records.find(record => record.id === item.id);
      if (!target) return;
      Object.assign(
        target,
        config.fields.reduce<Record<string, string | number>>((result, field) => {
          result[field.key] =
            field.type === 'number' ? Number(values[field.key]) : values[field.key];
          return result;
        }, {}),
      );
    }, item === 'new' ? `${capitalize(config.noun)} créée.` : `${capitalize(config.noun)} mise à jour.`);
    onClose();
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/.35)] backdrop-blur-sm">
      <div className="modal-panel card-surface w-full max-w-lg rounded-2xl p-6">
        <div className="modal-header mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {item === 'new' ? `Nouvelle ${config.noun}` : `Modifier la ${config.noun}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-[hsl(var(--destructive)/.1)] p-3 text-sm font-semibold text-[hsl(var(--destructive))]"
            >
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map(field => (
              <label key={field.key} className="block text-sm font-semibold">
                {field.label}
                {field.type === 'select' ? (
                  <select
                    disabled={!canSave}
                    value={values[field.key]}
                    onChange={event =>
                      setValues(previous => ({ ...previous, [field.key]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm"
                  >
                    {(field.options ?? []).map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    disabled={!canSave}
                    type={field.type ?? 'text'}
                    value={values[field.key]}
                    onChange={event =>
                      setValues(previous => ({ ...previous, [field.key]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm"
                  />
                )}
                <span className="mt-1 block text-[10px] font-normal leading-4 text-[hsl(var(--muted-foreground))]">
                  Saisissez ou sélectionnez {field.label.toLowerCase()} pour cette nouvelle fiche.
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="modal-footer mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2.5 text-xs font-bold">
            Annuler
          </button>
          {canSave && (
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold"
            >
              Enregistrer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function recordsFor(data: StoreData, key: RecordKey): RecordItem[] {
  switch (key) {
    case 'purchaseOrders':
      return data.purchaseOrders;
    case 'accountingEntries':
      return data.accountingEntries;
    case 'payrollSlips':
      return data.payrollSlips;
    case 'crmOpportunities':
      return data.crmOpportunities;
    case 'supplierRecords':
      return data.supplierRecords;
    case 'deliveries':
      return data.deliveries;
    case 'businessDocuments':
      return data.businessDocuments;
  }
}

function itemValues(item: RecordItem): Record<string, unknown> {
  return item as unknown as Record<string, unknown>;
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
}

function transitionOptions(status: Status): Status[] {
  if (status === 'ARCHIVÉ' || status === 'VALIDÉ' || status === 'CONFIRMÉ') return [status];
  if (status === 'BROUILLON') {
    return ['BROUILLON', 'EN ATTENTE', 'ACTIF', 'VALIDÉ', 'ARCHIVÉ'];
  }
  if (status === 'EN ATTENTE') {
    return ['EN ATTENTE', 'ACTIF', 'VALIDÉ', 'CONFIRMÉ', 'ARCHIVÉ'];
  }
  return ['ACTIF', 'EN ATTENTE', 'VALIDÉ', 'CONFIRMÉ', 'ARCHIVÉ'];
}

function validate(config: Config, values: Record<string, string>): string {
  const missing = config.fields.find(field => !values[field.key]?.trim());
  if (missing) return `Le champ « ${missing.label} » est obligatoire.`;

  for (const field of config.fields.filter(field => field.type === 'number')) {
    const value = Number(values[field.key]);
    if (!Number.isFinite(value) || value < 0) {
      return `Le champ « ${field.label} » doit être un nombre positif ou nul.`;
    }
  }

  if (config.id === 'achats' || config.id === 'crm') {
    if (Number(values.amount) <= 0) return 'Le montant doit être strictement supérieur à zéro.';
  }
  if (config.id === 'comptabilite') {
    const debit = Number(values.debit);
    const credit = Number(values.credit);
    if (debit <= 0 || credit <= 0) {
      return 'Une écriture comptable doit comporter un débit et un crédit strictement positifs.';
    }
    if (debit !== credit) return 'Le débit et le crédit doivent être strictement égaux.';
  }
  if (config.id === 'paie') {
    const gross = Number(values.gross);
    const net = Number(values.net);
    if (gross <= 0 || net <= 0) {
      return 'Les montants brut et net doivent être strictement positifs.';
    }
    if (net > gross) return 'Le net à payer ne peut pas dépasser le salaire brut.';
  }
  if (config.id === 'fournisseurs' && (Number(values.score) < 0 || Number(values.score) > 100)) {
    return 'Le score fournisseur doit être compris entre 0 et 100.';
  }
  return '';
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="metric-card card-surface rounded-2xl p-5">
      <Icon size={18} className="text-[hsl(var(--primary))]" />
      <p className="mt-5 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-bold">{label}</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</p>
    </section>
  );
}

function Status({ status }: { status: Status }) {
  const tone =
    status === 'VALIDÉ' || status === 'CONFIRMÉ' || status === 'ACTIF'
      ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]'
      : status === 'ARCHIVÉ'
        ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
        : 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]';

  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>{status}</span>;
}