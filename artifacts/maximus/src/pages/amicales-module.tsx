import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardList,
  FileText,
  Megaphone,
  Plus,
  RefreshCw,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@workspace/maximus-design-system/components/ui/button';
import { Badge } from '@workspace/maximus-design-system/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/maximus-design-system/components/ui/card';
import { Input } from '@workspace/maximus-design-system/components/ui/input';
import { Textarea } from '@workspace/maximus-design-system/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@workspace/maximus-design-system/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/maximus-design-system/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/maximus-design-system/components/ui/select';
import { WorkspaceTabs } from '@workspace/maximus-design-system/components/ui/workspace-tabs';
import { showAppToast } from '@workspace/maximus-design-system/hooks/use-toast';
import {
  createAmicaleApi,
  type AmicaleActivity,
  type AmicaleActivityInput,
  type AmicaleAnnouncement,
  type AmicaleAnnouncementInput,
  type AmicaleBootstrap,
  type AmicaleContribution,
  type AmicaleContributionInput,
  type AmicaleDuesPeriod,
  type AmicaleExpense,
  type AmicaleExpenseInput,
  type AmicaleMember,
  type AmicaleMemberInput,
} from '@/lib/amicales-api';
import { amicaleFeatureDefinitions } from '@/lib/amicales-features';
import { getAmicaleDashboardSummary } from '@/lib/amicales-dashboard';

type FeatureId = (typeof amicaleFeatureDefinitions)[number]['id'];
type FormKind = 'member' | 'contribution' | 'dues' | 'expense' | 'activity' | 'announcement';
type FormValues = Record<string, string>;
const formFieldsByKind: Record<FormKind, string[]> = {
  member: ['name', 'studentIdentifier', 'email', 'phone', 'faculty', 'studyYear', 'joinedAt', 'office', 'mandateStart', 'mandateEnd', 'notes'],
  contribution: ['memberId', 'period', 'amount', 'paidOn', 'method', 'transactionReference', 'note'],
  dues: ['period', 'amount'],
  expense: ['title', 'category', 'amount', 'expenseDate', 'vendor', 'description'],
  activity: ['title', 'description', 'location', 'eventDate', 'participantCount', 'attendeeCount', 'status'],
  announcement: ['title', 'body', 'status'],
};

const featureCopy: Record<FeatureId, { title: string; description: string; eyebrow: string }> = {
  dashboard: { title: 'Vie de votre amicale', description: 'Un aperçu opérationnel des membres, des finances et de la vie étudiante.', eyebrow: 'Vue d’ensemble' },
  membres: { title: 'Membres', description: 'Suivez les adhésions, les coordonnées et les mandats des membres.', eyebrow: 'Adhérents' },
  cotisations: { title: 'Cotisations', description: 'Enregistrez les règlements et gardez une trace des reçus.', eyebrow: 'Trésorerie' },
  depenses: { title: 'Dépenses', description: 'Soumettez les dépenses et traitez les décisions de trésorerie.', eyebrow: 'Contrôle financier' },
  activites: { title: 'Activités', description: 'Planifiez les événements et suivez la participation.', eyebrow: 'Vie étudiante' },
  annonces: { title: 'Annonces', description: 'Préparez les messages et publiez les informations de l’amicale.', eyebrow: 'Communication' },
  bureau: { title: 'Bureau & mandats', description: 'Consultez et gérez la composition du bureau et les échéances de mandat.', eyebrow: 'Gouvernance' },
  rapports: { title: 'Rapports', description: 'Consultez les indicateurs disponibles sur les cotisations et les dépenses.', eyebrow: 'Pilotage' },
  'mes-cotisations': { title: 'Mes cotisations', description: 'Consultez votre situation et réglez le forfait d’une période par Wave ou Orange Money.', eyebrow: 'Espace membre' },
};

const labels: Record<string, string> = {
  ACTIVE: 'Actif', ARCHIVED: 'Archivé', PENDING: 'À approuver', APPROVED: 'Approuvée',
  REJECTED: 'Refusée', PAID: 'Payée', PLANNED: 'Planifiée', COMPLETED: 'Terminée',
  CANCELLED: 'Annulée', DRAFT: 'Brouillon', PUBLISHED: 'Publiée',
  CASH: 'Espèces', MOBILE_MONEY: 'Mobile money', BANK_TRANSFER: 'Virement', OTHER: 'Autre',
  WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', FREE_MONEY: 'Free Money',
};
const money = (amount: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.trunc(amount))} XOF`;
const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)) : '—';
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const emptyData: AmicaleBootstrap = { members: [], contributions: [], expenses: [], activities: [], announcements: [], duesPeriods: [] };

export default function AmicalesModulePage({
  companyId,
  canCreate = true,
  canModify = true,
  allowedFeatureIds = [],
  featurePermissions,
  activeFeatureId = 'dashboard',
  onNavigate,
  preview = false,
}: {
  companyId: string;
  canCreate?: boolean;
  canModify?: boolean;
  allowedFeatureIds: string[];
  featurePermissions?: Partial<Record<string, string[]>>;
  activeFeatureId?: string;
  onNavigate?: (featureId: string) => void;
  preview?: boolean;
}) {
  const api = useMemo(() => createAmicaleApi(companyId), [companyId]);
  const [data, setData] = useState<AmicaleBootstrap>(emptyData);
  const [loading, setLoading] = useState(!preview);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [localFeature, setLocalFeature] = useState<FeatureId>('dashboard');
  const [formKind, setFormKind] = useState<FormKind | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visibleFeatures = amicaleFeatureDefinitions.filter(({ id }) => {
    if (!allowedFeatureIds.includes(id)) return false;
    const permissions = featurePermissions?.[id];
    return featurePermissions ? Boolean(permissions?.includes('voir')) : true;
  });
  const hasVisibleFeatures = visibleFeatures.length > 0;
  const activeFeature = visibleFeatures.some(({ id }) => id === activeFeatureId)
    ? activeFeatureId as FeatureId
    : visibleFeatures.some(({ id }) => id === localFeature) ? localFeature : (visibleFeatures[0]?.id ?? 'dashboard');
  const currentFeature = featureCopy[activeFeature];

  const canCreateFor = (feature: string) => featurePermissions
    ? Boolean(featurePermissions[feature]?.includes('voir') && featurePermissions[feature]?.includes('créer'))
    : canCreate;
  const canModifyFor = (feature: string) => featurePermissions
    ? Boolean(featurePermissions[feature]?.includes('voir') && featurePermissions[feature]?.includes('créer') && featurePermissions[feature]?.includes('modifier'))
    : canModify;

  useEffect(() => {
    if (preview || !hasVisibleFeatures) {
      setLoading(false);
      if (preview) setData(emptyData);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    void api.bootstrap().then((result) => {
      if (!cancelled) setData(result);
    }).catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : 'Les données de l’amicale ne sont pas disponibles.';
      setLoadError(message);
      showAppToast(message, 'error');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [api, hasVisibleFeatures, preview, reloadToken]);

  const openForm = (kind: FormKind, values: FormValues = {}, id: string | null = null) => {
    if (preview) return;
    setFormKind(kind);
    setFormValues(values);
    setEditingId(id);
  };
  const closeForm = () => {
    setFormKind(null);
    setFormValues({});
    setEditingId(null);
  };
  const submitForm = async (values: FormValues) => {
    if (!formKind || preview) return;
    setSaving(true);
    try {
      if (formKind === 'member') {
        const body: AmicaleMemberInput = {
          name: values.name.trim(),
          studentIdentifier: values.studentIdentifier?.trim(),
          email: values.email?.trim(),
          phone: values.phone?.trim(),
          faculty: values.faculty?.trim(),
          studyYear: values.studyYear?.trim(),
          joinedAt: values.joinedAt,
          office: values.office?.trim(),
          mandateStart: values.mandateStart,
          mandateEnd: values.mandateEnd,
          notes: values.notes?.trim(),
        };
        const result = editingId ? await api.updateMember(editingId, body) : await api.createMember(body);
        setData(current => ({ ...current, members: editingId
          ? current.members.map(item => item.id === result.member.id ? result.member : item)
          : [result.member, ...current.members] }));
        showAppToast(editingId ? 'Membre mis à jour.' : 'Membre ajouté.', 'success');
      } else if (formKind === 'contribution') {
        const body: AmicaleContributionInput = {
          memberId: values.memberId,
          period: values.period.trim(),
          amount: Math.trunc(Number(values.amount)),
          paidOn: values.paidOn,
          method: values.method as AmicaleContributionInput['method'],
          note: values.note?.trim(),
          transactionReference: values.transactionReference?.trim(),
        };
        const result = await api.createContribution(body);
        setData(current => ({ ...current, contributions: [result.contribution, ...current.contributions] }));
        showAppToast('Cotisation enregistrée. Le reçu est disponible dans son enregistrement.', 'success');
      } else if (formKind === 'dues') {
        const result = await api.createDuesPeriod({
          period: values.period.trim(),
          amount: Math.trunc(Number(values.amount)),
        });
        setData(current => ({ ...current, duesPeriods: [...current.duesPeriods, result.duesPeriod] }));
        showAppToast('Forfait de cotisation créé pour cette période.', 'success');
      } else if (formKind === 'expense') {
        const body: AmicaleExpenseInput = {
          title: values.title.trim(),
          category: values.category.trim(),
          amount: Math.trunc(Number(values.amount)),
          expenseDate: values.expenseDate,
          description: values.description?.trim(),
          vendor: values.vendor?.trim(),
        };
        const result = await api.createExpense(body);
        setData(current => ({ ...current, expenses: [result.expense, ...current.expenses] }));
        showAppToast('Dépense soumise pour décision.', 'success');
      } else if (formKind === 'activity') {
        const body: AmicaleActivityInput = {
          title: values.title.trim(),
          description: values.description?.trim(),
          location: values.location?.trim(),
          eventDate: values.eventDate,
          participantCount: Math.max(0, Math.trunc(Number(values.participantCount) || 0)),
          attendeeCount: Math.max(0, Math.trunc(Number(values.attendeeCount) || 0)),
          status: values.status as AmicaleActivityInput['status'],
        };
        const result = editingId ? await api.updateActivity(editingId, body) : await api.createActivity(body);
        setData(current => ({ ...current, activities: editingId
          ? current.activities.map(item => item.id === result.activity.id ? result.activity : item)
          : [result.activity, ...current.activities] }));
        showAppToast(editingId ? 'Activité mise à jour.' : 'Activité créée.', 'success');
      } else {
        const body: AmicaleAnnouncementInput = {
          title: values.title.trim(),
          body: values.body.trim(),
          status: values.status as AmicaleAnnouncementInput['status'],
        };
        const result = editingId ? await api.updateAnnouncement(editingId, body) : await api.createAnnouncement(body);
        setData(current => ({ ...current, announcements: editingId
          ? current.announcements.map(item => item.id === result.announcement.id ? result.announcement : item)
          : [result.announcement, ...current.announcements] }));
        showAppToast(editingId ? 'Annonce mise à jour.' : 'Annonce enregistrée.', 'success');
      }
      closeForm();
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'L’enregistrement a échoué.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const decideExpense = async (expense: AmicaleExpense, status: 'APPROVED' | 'REJECTED') => {
    if (preview) return;
    const promptText = status === 'REJECTED' ? 'Motif du refus (facultatif) :' : 'Note de décision (facultative) :';
    const decisionNote = window.prompt(`${promptText}\nL’API refuse l’auto-approbation : la personne ayant créé cette dépense ne peut pas la valider.`);
    if (decisionNote === null) return;
    try {
      const result = await api.decideExpense(expense.id, status, decisionNote || undefined);
      setData(current => ({ ...current, expenses: current.expenses.map(item => item.id === result.expense.id ? result.expense : item) }));
      showAppToast(status === 'APPROVED' ? 'Dépense approuvée.' : 'Dépense refusée.', 'success');
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'La décision n’a pas pu être enregistrée.', 'error');
    }
  };

  const markPaid = async (expense: AmicaleExpense) => {
    try {
      const result = await api.markExpensePaid(expense.id);
      setData(current => ({ ...current, expenses: current.expenses.map(item => item.id === result.expense.id ? result.expense : item) }));
      showAppToast('Dépense marquée comme payée.', 'success');
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Le paiement n’a pas pu être enregistré.', 'error');
    }
  };

  const createMemberCheckout = async (period: string, provider: 'WAVE' | 'ORANGE_MONEY') => {
    try {
      const result = await api.createMemberCheckout(period, provider);
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Le paiement en ligne n’a pas pu être ouvert.', 'error');
    }
  };

  const checkMemberPayment = async (id: string) => {
    try {
      const result = await api.checkMemberPayment(id);
      setData(current => ({ ...current, contributions: current.contributions.map(item => item.id === id ? result.contribution : item) }));
      showAppToast(result.contribution.status === 'PAID' ? 'Paiement confirmé.' : 'Le paiement est toujours en attente de confirmation.', result.contribution.status === 'PAID' ? 'success' : 'info');
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Le statut du paiement n’a pas pu être vérifié.', 'error');
    }
  };

  const archiveMember = async (member: AmicaleMember) => {
    if (preview || !window.confirm(`Archiver le membre « ${member.name} » ?`)) return;
    try {
      const result = await api.archiveMember(member.id);
      setData(current => ({ ...current, members: current.members.map(item => item.id === result.member.id ? result.member : item) }));
      showAppToast('Membre archivé. Les données financières sont conservées.', 'success');
    } catch (error) {
      showAppToast(error instanceof Error ? error.message : 'Le membre n’a pas pu être archivé.', 'error');
    }
  };

  const beginEditMember = (member: AmicaleMember) => openForm('member', {
    name: member.name, studentIdentifier: member.studentIdentifier, email: member.email, phone: member.phone,
    faculty: member.faculty, studyYear: member.studyYear, joinedAt: member.joinedAt.slice(0, 10),
    office: member.office, mandateStart: member.mandateStart?.slice(0, 10) ?? '',
    mandateEnd: member.mandateEnd?.slice(0, 10) ?? '', notes: member.notes,
  }, member.id);
  const beginEditActivity = (activity: AmicaleActivity) => openForm('activity', {
    title: activity.title, description: activity.description, location: activity.location,
    eventDate: activity.eventDate.slice(0, 10), participantCount: String(activity.participantCount),
    attendeeCount: String(activity.attendeeCount), status: activity.status,
  }, activity.id);
  const beginEditAnnouncement = (announcement: AmicaleAnnouncement) => openForm('announcement', {
    title: announcement.title, body: announcement.body, status: announcement.status,
  }, announcement.id);

  const members = activeFeature === 'bureau' ? data.members.filter(member => member.office && member.status === 'ACTIVE') : data.members;
  const activeMembers = data.members.filter(member => member.status === 'ACTIVE').length;
  const tabItems = visibleFeatures.map(feature => ({
    id: feature.id,
    label: feature.label,
    icon: ({ dashboard: Activity, membres: Users, cotisations: Banknote, 'mes-cotisations': Banknote, depenses: Wallet, activites: CalendarDays, annonces: Megaphone, bureau: Users, rapports: ClipboardList } as Record<string, typeof Activity>)[feature.id],
  }));

  return (
    <div className="page-pad space-y-5 fade-up" data-testid="page-amicales-module">
      <header className="page-header flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Amicale étudiante · {currentFeature.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight" data-testid="text-amicales-page-title">{currentFeature.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{currentFeature.description}</p>
        </div>
        {activeFeature !== 'dashboard' && actionButton()}
      </header>

      {preview ? (
        <EmptyPanel icon={<Activity size={22} />} title="Aperçu sans données" description="Le mode aperçu n’interroge pas l’API et n’enregistre aucune modification. Les données de l’entreprise apparaîtront ici une fois le module ouvert dans son espace réel." testId="empty-amicales-preview" />
      ) : !hasVisibleFeatures ? (
        <EmptyPanel icon={<CircleAlert size={22} />} title="Aucune fonctionnalité accessible" description="Les fonctionnalités de l’amicale disponibles pour votre rôle apparaîtront ici après attribution des accès." testId="empty-amicales-no-access" />
      ) : (
        <>
          {preview && visibleFeatures.length > 0 && <WorkspaceTabs
            items={tabItems}
            activeId={activeFeature}
            onChange={(id) => {
              if (!visibleFeatures.some(feature => feature.id === id)) return;
              setLocalFeature(id as FeatureId);
              onNavigate?.(id);
            }}
            ariaLabel="Fonctionnalités de l’amicale"
            testIdPrefix="tab-amicales"
            className="module-tabs"
          />}

          {loadError && <Alert variant="destructive" data-testid="alert-amicales-load-error">
            <CircleAlert size={16} />
            <AlertTitle>Impossible de charger les données</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{loadError}</span>
              <Button type="button" variant="outline" size="sm" data-testid="button-retry-amicales" onClick={() => setReloadToken(token => token + 1)}><RefreshCw size={14} />Réessayer</Button>
            </AlertDescription>
          </Alert>}

          {loading ? <LoadingPanel /> : !loadError && <section className="space-y-5" data-testid={`section-amicales-${activeFeature}`}>
            {activeFeature === 'dashboard' && <Dashboard
              data={data} onSelect={id => { setLocalFeature(id); onNavigate?.(id); }}
              canSee={id => visibleFeatures.some(feature => feature.id === id)}
            />}
            {activeFeature === 'membres' && <MemberList members={data.members} canCreate={canCreateFor('membres')} canModify={canModifyFor('membres')} onCreate={() => openForm('member', { joinedAt: today() })} onEdit={beginEditMember} onArchive={member => void archiveMember(member)} />}
            {activeFeature === 'bureau' && <MemberList bureau members={members} canCreate={canCreateFor('bureau')} canModify={canModifyFor('bureau')} onCreate={() => openForm('member', { joinedAt: today() })} onEdit={beginEditMember} onArchive={member => void archiveMember(member)} />}
            {activeFeature === 'cotisations' && <div className="space-y-5">
              <ContributionList contributions={data.contributions} canCreate={canCreateFor('cotisations') && activeMembers > 0} onCreate={() => openForm('contribution', { paidOn: today(), method: 'CASH' })} />
              <DuesPeriodList periods={data.duesPeriods} canCreate={canCreateFor('cotisations')} canModify={canModifyFor('cotisations')} onCreate={() => openForm('dues')} onUpdate={async (id, amount) => {
                try {
                  const result = await api.updateDuesPeriod(id, amount);
                  setData(current => ({ ...current, duesPeriods: current.duesPeriods.map(item => item.id === id ? result.duesPeriod : item) }));
                  showAppToast('Forfait mis à jour.', 'success');
                } catch (error) { showAppToast(error instanceof Error ? error.message : 'La modification a échoué.', 'error'); }
              }} />
            </div>}
            {activeFeature === 'mes-cotisations' && <MemberDuesList periods={data.duesPeriods} contributions={data.contributions} canPay={canCreateFor('mes-cotisations')} onPay={createMemberCheckout} onCheck={checkMemberPayment} />}
            {activeFeature === 'depenses' && <ExpenseList expenses={data.expenses} canCreate={canCreateFor('depenses')} canModify={canModifyFor('depenses')} onCreate={() => openForm('expense', { expenseDate: today() })} onDecide={decideExpense} onPaid={expense => void markPaid(expense)} />}
            {activeFeature === 'activites' && <ActivityList activities={data.activities} canCreate={canCreateFor('activites')} canModify={canModifyFor('activites')} onCreate={() => openForm('activity', { eventDate: today(), status: 'PLANNED', participantCount: '0', attendeeCount: '0' })} onEdit={beginEditActivity} />}
            {activeFeature === 'annonces' && <AnnouncementList announcements={data.announcements} canCreate={canCreateFor('annonces')} canModify={canModifyFor('annonces')} onCreate={() => openForm('announcement', { status: 'DRAFT' })} onEdit={beginEditAnnouncement} />}
            {activeFeature === 'rapports' && <Reports contributions={data.contributions} expenses={data.expenses} members={data.members} />}
          </section>}
        </>
      )}

      {formKind && <FormDialog
        kind={formKind}
        values={formValues}
        onSubmit={submitForm}
        onClose={closeForm}
        saving={saving}
        members={data.members.filter(member => member.status === 'ACTIVE')}
        editing={Boolean(editingId)}
        key={`${formKind}-${editingId ?? 'new'}`}
      />}
    </div>
  );

  function actionButton() {
    const action: Partial<Record<FeatureId, { label: string; kind: FormKind; feature: string }>> = {
      membres: { label: 'Ajouter un membre', kind: 'member', feature: 'membres' },
      bureau: { label: 'Ajouter un membre', kind: 'member', feature: 'bureau' },
      cotisations: { label: 'Enregistrer une cotisation', kind: 'contribution', feature: 'cotisations' },
      depenses: { label: 'Soumettre une dépense', kind: 'expense', feature: 'depenses' },
      activites: { label: 'Nouvelle activité', kind: 'activity', feature: 'activites' },
      annonces: { label: 'Nouvelle annonce', kind: 'announcement', feature: 'annonces' },
    };
    const selected = action[activeFeature];
    if (!selected || !canCreateFor(selected.feature) || (selected.kind === 'contribution' && activeMembers === 0)) return null;
    return <Button type="button" data-testid={`button-create-${selected.kind}`} onClick={() => openForm(selected.kind, selected.kind === 'member' ? { joinedAt: today() } : selected.kind === 'contribution' ? { paidOn: today(), method: 'CASH' } : selected.kind === 'expense' ? { expenseDate: today() } : selected.kind === 'activity' ? { eventDate: today(), status: 'PLANNED', participantCount: '0', attendeeCount: '0' } : { status: 'DRAFT' })}><Plus size={16} />{selected.label}</Button>;
  }
}

function Dashboard({ data, onSelect, canSee }: {
  data: AmicaleBootstrap; onSelect: (id: FeatureId) => void; canSee: (id: string) => boolean;
}) {
  const summary = getAmicaleDashboardSummary(data, today());
  const metricCards = [
    (canSee('membres') || canSee('bureau')) && <MetricCard key="members" label="Membres actifs" value={summary.activeMembers} detail={`${summary.totalMembers} fiches enregistrées`} icon={<Users size={18} />} />,
    canSee('cotisations') && <MetricCard key="contributions" label="Cotisations enregistrées" value={money(summary.totalContributions)} detail={`${summary.contributionCount} règlements`} icon={<ArrowDownLeft size={18} />} />,
    canSee('depenses') && <MetricCard key="expenses" label="Dépenses payées" value={money(summary.paidExpenseAmount)} detail={`${summary.approvedExpenseCount} approuvées · ${summary.pendingExpenses} en attente`} icon={<ArrowUpRight size={18} />} />,
    canSee('activites') && <MetricCard key="activities" label="Activités à venir" value={summary.upcomingActivities.length} detail="Activités planifiées à partir d’aujourd’hui" icon={<CalendarDays size={18} />} />,
    canSee('annonces') && <MetricCard key="announcements" label="Annonces publiées" value={summary.publishedAnnouncements} detail="Informations visibles aux membres" icon={<Megaphone size={18} />} />,
  ].filter(Boolean);
  const canShowData = ['membres', 'bureau', 'cotisations', 'depenses', 'activites', 'annonces']
    .some(featureId => canSee(featureId));

  return <div className="space-y-5">
    {metricCards.length > 0 && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metricCards}</div>}
    {!canShowData && <Card><CardContent className="pt-6">
      <EmptyInline title="Aucune rubrique de données accessible" description="Votre rôle ouvre le tableau de bord, mais ne donne pas encore accès aux indicateurs des membres, cotisations, dépenses ou activités." />
    </CardContent></Card>}
    <div className="grid gap-5 lg:grid-cols-2">
      {canSee('activites') && <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div><CardTitle>Activités à venir</CardTitle><p className="mt-1 text-sm text-muted-foreground">Prochains rendez-vous planifiés.</p></div>
          <Button type="button" variant="outline" size="sm" data-testid="button-open-activities" onClick={() => onSelect('activites')}>Toutes les activités</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.upcomingActivities.length ? summary.upcomingActivities.map(item => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3" data-testid={`item-upcoming-activity-${item.id}`}>
            <div className="min-w-0"><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.location || 'Lieu à confirmer'} · {dateLabel(item.eventDate)}</p></div>
            <Badge variant="secondary">{labels[item.status] ?? item.status}</Badge>
          </div>) : <EmptyInline title="Aucune activité à venir" description="Les activités futures apparaîtront ici." />}
        </CardContent>
      </Card>}
      {canSee('cotisations') && <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div><CardTitle>Dernières cotisations</CardTitle><p className="mt-1 text-sm text-muted-foreground">Encaissements récemment enregistrés.</p></div>
          <Button type="button" variant="outline" size="sm" data-testid="button-open-contributions" onClick={() => onSelect('cotisations')}>Voir les cotisations</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.latestContributions.length ? summary.latestContributions.map(item => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0" data-testid={`item-latest-contribution-${item.id}`}>
            <div><p className="font-semibold">{item.memberName}</p><p className="mt-1 text-xs text-muted-foreground">{item.period} · {dateLabel(item.paidOn)}</p></div>
            <span className="font-semibold tabular-nums">{money(item.amount)}</span>
          </div>) : <EmptyInline title="Aucune cotisation enregistrée" description="Les règlements apparaîtront ici après leur saisie." />}
        </CardContent>
      </Card>}
    </div>
    {canSee('depenses') && summary.pendingExpenses > 0 && <Alert data-testid="notice-pending-expenses">
      <CircleAlert size={16} /><AlertTitle>Décisions en attente</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{summary.pendingExpenses} dépense{summary.pendingExpenses > 1 ? 's' : ''} en attente d’approbation ou de refus.</span>
        <Button type="button" variant="outline" size="sm" data-testid="button-review-expenses" onClick={() => onSelect('depenses')}>Examiner les dépenses</Button>
      </AlertDescription>
    </Alert>}
  </div>;
}

function MemberList({ members, canCreate, canModify, onCreate, onEdit, onArchive, bureau = false }: {
  members: AmicaleMember[]; canCreate: boolean; canModify: boolean; onCreate: () => void;
  onEdit: (member: AmicaleMember) => void; onArchive: (member: AmicaleMember) => void; bureau?: boolean;
}) {
  const displayed = bureau ? members : members;
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <div><CardTitle>{bureau ? 'Membres du bureau' : 'Répertoire des membres'}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{displayed.length} membre{displayed.length === 1 ? '' : 's'} affiché{displayed.length === 1 ? '' : 's'}.</p></div>
      {canCreate && <Button type="button" data-testid={`button-create-member-${bureau ? 'bureau' : 'members'}`} onClick={onCreate}><Plus size={16} />Ajouter un membre</Button>}
    </CardHeader>
    <CardContent>
      {!displayed.length ? <EmptyInline title={bureau ? 'Aucun mandat de bureau renseigné' : 'Aucun membre enregistré'} description={bureau ? 'Ajoutez ou modifiez un membre pour renseigner son poste et son mandat.' : 'Les membres de cette entreprise apparaîtront ici.'} /> :
        <div className="table-scroll"><table className="w-full text-left text-sm" data-testid="table-amicale-members">
          <thead><tr><th className="px-4">Membre</th><th className="px-4">{bureau ? 'Fonction / mandat' : 'Identifiant'}</th><th className="px-4">Faculté</th><th className="px-4">Adhésion</th><th className="px-4">Statut</th><th className="px-4">Actions</th></tr></thead>
          <tbody className="divide-y divide-border">{displayed.map(member => <tr key={member.id} data-testid={`row-amicale-member-${member.id}`}>
            <td className="px-4 py-3"><strong className="block">{member.name}</strong><span className="text-xs text-muted-foreground">{member.email || member.phone || 'Coordonnées non renseignées'}</span></td>
            <td className="px-4 py-3"><strong>{bureau ? member.office || 'Fonction non renseignée' : member.studentIdentifier || '—'}</strong>{bureau && <span className="mt-1 block text-xs text-muted-foreground">{dateLabel(member.mandateStart)} – {dateLabel(member.mandateEnd)}</span>}</td>
            <td className="px-4 py-3">{member.faculty || '—'}<span className="mt-1 block text-xs text-muted-foreground">{member.studyYear}</span></td>
            <td className="px-4 py-3">{dateLabel(member.joinedAt)}</td>
            <td className="px-4 py-3"><StatusBadge value={member.status} testId={`status-member-${member.id}`} /></td>
            <td className="px-4 py-3"><div className="flex justify-end gap-2">
              {member.status === 'ACTIVE' && canModify && <Button type="button" variant="outline" size="sm" data-testid={`button-edit-member-${member.id}`} aria-label={`Modifier ${member.name}`} onClick={() => onEdit(member)}>Modifier</Button>}
              {member.status === 'ACTIVE' && canModify && <Button type="button" variant="outline" size="sm" data-testid={`button-archive-member-${member.id}`} aria-label={`Archiver ${member.name}`} onClick={() => onArchive(member)}>Archiver</Button>}
            </div></td>
          </tr>)}</tbody>
        </table></div>}
    </CardContent>
  </Card>;
}

function ContributionList({ contributions, canCreate, onCreate }: { contributions: AmicaleContribution[]; canCreate: boolean; onCreate: () => void }) {
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <div><CardTitle>Registre des cotisations</CardTitle><p className="mt-1 text-sm text-muted-foreground">Chaque règlement reste conservé et peut servir de reçu.</p></div>
      {canCreate && <Button type="button" data-testid="button-create-contribution" onClick={onCreate}><Plus size={16} />Enregistrer un règlement</Button>}
    </CardHeader>
    <CardContent>
      {!contributions.length ? <EmptyInline title="Aucune cotisation enregistrée" description="Les règlements et leurs références de reçu seront listés ici." /> :
        <div className="table-scroll"><table className="w-full text-left text-sm" data-testid="table-amicale-contributions">
          <thead><tr><th className="px-4">Reçu</th><th className="px-4">Membre</th><th className="px-4">Période</th><th className="px-4">Date</th><th className="px-4">Moyen / référence</th><th className="px-4">Statut</th><th className="px-4">Montant XOF</th></tr></thead>
          <tbody className="divide-y divide-border">{contributions.map(item => <tr key={item.id} data-testid={`row-amicale-contribution-${item.id}`}>
            <td className="px-4 py-3 font-semibold">{item.reference}</td><td className="px-4 py-3">{item.memberName}</td><td className="px-4 py-3">{item.period}</td>
            <td className="px-4 py-3">{dateLabel(item.paidOn)}</td><td className="px-4 py-3">{labels[item.method] ?? item.method}{item.transactionReference && <span className="block text-xs text-muted-foreground">{item.transactionReference}</span>}</td>
            <td className="px-4 py-3">{labels[item.status] ?? item.status}</td>
            <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(item.amount)}</td>
          </tr>)}</tbody>
        </table></div>}
    </CardContent>
  </Card>;
}

function DuesPeriodList({ periods, canCreate, canModify, onCreate, onUpdate }: {
  periods: AmicaleDuesPeriod[]; canCreate: boolean; canModify: boolean;
  onCreate: () => void; onUpdate: (id: string, amount: number) => void;
}) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  return <Card data-testid="card-amicale-dues-periods">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <div><CardTitle>Forfaits par période</CardTitle><p className="mt-1 text-sm text-muted-foreground">Le montant configuré est celui proposé au membre pour son paiement en ligne.</p></div>
      {canCreate && <Button type="button" variant="outline" data-testid="button-create-dues-period" onClick={onCreate}><Plus size={16} />Configurer une période</Button>}
    </CardHeader>
    <CardContent>
      {!periods.length ? <EmptyInline title="Aucun forfait configuré" description="Ajoutez une période et un montant fixe avant d’ouvrir le paiement en ligne." /> :
        <div className="space-y-3">{periods.map(period => <div key={period.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <strong>{period.period}</strong>
          <div className="flex items-center gap-2">
            {canModify ? <Input aria-label={`Montant ${period.period}`} type="number" min="1" step="1" className="w-36" value={amounts[period.id] ?? String(period.amount)} onChange={event => setAmounts(current => ({ ...current, [period.id]: event.target.value }))} /> : <span className="font-semibold tabular-nums">{money(period.amount)}</span>}
            {canModify && <Button type="button" variant="outline" size="sm" data-testid={`button-update-dues-${period.id}`} onClick={() => {
              const amount = Math.trunc(Number(amounts[period.id] ?? period.amount));
              if (amount > 0) onUpdate(period.id, amount);
            }}>Enregistrer</Button>}
          </div>
        </div>)}</div>}
    </CardContent>
  </Card>;
}

function MemberDuesList({ periods, contributions, canPay, onPay, onCheck }: {
  periods: AmicaleDuesPeriod[]; contributions: AmicaleContribution[]; canPay: boolean;
  onPay: (period: string, provider: 'WAVE' | 'ORANGE_MONEY') => void;
  onCheck: (id: string) => void;
}) {
  return <div className="space-y-5" data-testid="member-amicale-dues">
    <Card>
      <CardHeader><CardTitle>Forfaits à régler</CardTitle><p className="mt-1 text-sm text-muted-foreground">Le montant est fixé par le trésorier. Le paiement n’est confirmé qu’après validation de DiamanoPay.</p></CardHeader>
      <CardContent className="space-y-3">
        {!periods.length ? <EmptyInline title="Aucun forfait disponible" description="Le trésorier n’a pas encore configuré de période de cotisation." /> :
          periods.map(period => {
            const payment = contributions.find(item => item.period === period.period);
            const pendingProvider = payment?.status === 'PENDING'
              && (payment.method === 'WAVE' || payment.method === 'ORANGE_MONEY')
              ? payment.method
              : null;
            return <div key={period.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3" data-testid={`member-dues-${period.id}`}>
              <div><strong>{period.period}</strong><p className="text-sm text-muted-foreground">{money(period.amount)} · {payment ? labels[payment.status] ?? payment.status : 'À régler'}</p></div>
              <div className="flex flex-wrap gap-2">
                {payment?.status === 'PENDING' && <Button type="button" variant="outline" size="sm" onClick={() => onCheck(payment.id)}>Vérifier le paiement</Button>}
                {canPay && payment?.status !== 'PAID' && (pendingProvider
                  ? <Button type="button" size="sm" onClick={() => onPay(period.period, pendingProvider)}>Continuer avec {labels[pendingProvider]}</Button>
                  : <>
                      <Button type="button" size="sm" onClick={() => onPay(period.period, 'WAVE')}>Payer avec Wave</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => onPay(period.period, 'ORANGE_MONEY')}>Orange Money</Button>
                    </>)}
              </div>
            </div>;
          })}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Mes règlements</CardTitle></CardHeader>
      <CardContent>
        {!contributions.length ? <EmptyInline title="Aucun règlement pour le moment" description="Vos paiements confirmés ou en attente apparaîtront ici." /> :
          <div className="space-y-2">{contributions.map(item => <div key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 last:border-0" data-testid={`member-contribution-${item.id}`}>
            <span>{item.period} · {labels[item.status] ?? item.status} · {labels[item.method] ?? item.method}</span>
            <strong className="tabular-nums">{money(item.amount)}</strong>
          </div>)}</div>}
      </CardContent>
    </Card>
  </div>;
}

function ExpenseList({ expenses, canCreate, canModify, onCreate, onDecide, onPaid }: {
  expenses: AmicaleExpense[]; canCreate: boolean; canModify: boolean; onCreate: () => void;
  onDecide: (expense: AmicaleExpense, status: 'APPROVED' | 'REJECTED') => void; onPaid: (expense: AmicaleExpense) => void;
}) {
  return <div className="space-y-4">
    <Alert data-testid="notice-expense-self-approval"><CircleAlert size={16} /><AlertTitle>Règle de séparation des tâches</AlertTitle><AlertDescription>L’API refuse l’auto-approbation : la personne qui a créé une dépense ne peut pas approuver sa propre demande. Une autre personne autorisée doit prendre la décision.</AlertDescription></Alert>
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div><CardTitle>Suivi des dépenses</CardTitle><p className="mt-1 text-sm text-muted-foreground">Les enregistrements financiers ne peuvent pas être supprimés de cette page.</p></div>
        {canCreate && <Button type="button" data-testid="button-create-expense" onClick={onCreate}><Plus size={16} />Soumettre une dépense</Button>}
      </CardHeader>
      <CardContent>
        {!expenses.length ? <EmptyInline title="Aucune dépense enregistrée" description="Les demandes soumises pour décision seront suivies ici." /> :
          <div className="table-scroll"><table className="w-full text-left text-sm" data-testid="table-amicale-expenses">
            <thead><tr><th className="px-4">Dépense</th><th className="px-4">Date</th><th className="px-4">Montant XOF</th><th className="px-4">Statut</th><th className="px-4">Décision</th><th className="px-4">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">{expenses.map(item => <tr key={item.id} data-testid={`row-amicale-expense-${item.id}`}>
              <td className="px-4 py-3"><strong className="block">{item.title}</strong><span className="text-xs text-muted-foreground">{item.reference} · {item.category}{item.vendor ? ` · ${item.vendor}` : ''}</span></td>
              <td className="px-4 py-3">{dateLabel(item.expenseDate)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money(item.amount)}</td>
              <td className="px-4 py-3"><StatusBadge value={item.status} testId={`status-expense-${item.id}`} /></td><td className="px-4 py-3 text-xs text-muted-foreground">{item.decisionNote || '—'}</td>
              <td className="px-4 py-3"><div className="flex justify-end gap-2">
                {canModify && item.status === 'PENDING' && <><Button type="button" size="sm" data-testid={`button-approve-expense-${item.id}`} onClick={() => onDecide(item, 'APPROVED')}><Check size={14} />Approuver</Button><Button type="button" variant="outline" size="sm" data-testid={`button-reject-expense-${item.id}`} onClick={() => onDecide(item, 'REJECTED')}>Refuser</Button></>}
                {canModify && item.status === 'APPROVED' && <Button type="button" size="sm" data-testid={`button-mark-expense-paid-${item.id}`} onClick={() => onPaid(item)}>Marquer payée</Button>}
              </div></td>
            </tr>)}</tbody>
          </table></div>}
      </CardContent>
    </Card>
  </div>;
}

function ActivityList({ activities, canCreate, canModify, onCreate, onEdit }: {
  activities: AmicaleActivity[]; canCreate: boolean; canModify: boolean; onCreate: () => void; onEdit: (activity: AmicaleActivity) => void;
}) {
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <div><CardTitle>Agenda des activités</CardTitle><p className="mt-1 text-sm text-muted-foreground">Planification, lieu et suivi des participants.</p></div>
      {canCreate && <Button type="button" data-testid="button-create-activity" onClick={onCreate}><Plus size={16} />Nouvelle activité</Button>}
    </CardHeader>
    <CardContent>
      {!activities.length ? <EmptyInline title="Aucune activité enregistrée" description="Créez une activité pour commencer à organiser la vie étudiante." /> :
        <div className="grid gap-3 md:grid-cols-2">{activities.map(item => <article key={item.id} className="rounded-lg border border-border p-4" data-testid={`card-amicale-activity-${item.id}`}>
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.reference} · {dateLabel(item.eventDate)}</p></div><StatusBadge value={item.status} testId={`status-activity-${item.id}`} /></div>
          <p className="mt-3 text-sm text-muted-foreground">{item.description || 'Aucune description.'}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs"><span>{item.location || 'Lieu à confirmer'} · {item.attendeeCount}/{item.participantCount} participants</span>
            {canModify && <Button type="button" variant="outline" size="sm" data-testid={`button-edit-activity-${item.id}`} onClick={() => onEdit(item)}>Modifier</Button>}
          </div>
        </article>)}</div>}
    </CardContent>
  </Card>;
}

function AnnouncementList({ announcements, canCreate, canModify, onCreate, onEdit }: {
  announcements: AmicaleAnnouncement[]; canCreate: boolean; canModify: boolean; onCreate: () => void; onEdit: (announcement: AmicaleAnnouncement) => void;
}) {
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <div><CardTitle>Informations de l’amicale</CardTitle><p className="mt-1 text-sm text-muted-foreground">Le statut contrôle la visibilité : brouillon ou publiée.</p></div>
      {canCreate && <Button type="button" data-testid="button-create-announcement" onClick={onCreate}><Plus size={16} />Nouvelle annonce</Button>}
    </CardHeader>
    <CardContent>
      {!announcements.length ? <EmptyInline title="Aucune annonce" description="Créez un brouillon ou publiez une information à destination des membres." /> :
        <div className="space-y-3">{announcements.map(item => <article key={item.id} className="rounded-lg border border-border p-4" data-testid={`card-amicale-announcement-${item.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">{item.reference} · {item.status === 'PUBLISHED' ? `Publiée ${dateLabel(item.publishedAt)}` : `Créée ${dateLabel(item.createdAt)}`}</p></div><StatusBadge value={item.status} testId={`status-announcement-${item.id}`} /></div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.body}</p>
          {canModify && <div className="mt-3 flex justify-end"><Button type="button" variant="outline" size="sm" data-testid={`button-edit-announcement-${item.id}`} onClick={() => onEdit(item)}>Modifier</Button></div>}
        </article>)}</div>}
    </CardContent>
  </Card>;
}

function Reports({ contributions, expenses, members }: { contributions: AmicaleContribution[]; expenses: AmicaleExpense[]; members: AmicaleMember[] }) {
  const paidContributions = contributions.filter(item => item.status === 'PAID');
  const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0);
  const paidExpenses = expenses.filter(item => item.status === 'PAID');
  const waiting = expenses.filter(item => item.status === 'PENDING');
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Cotisations cumulées" value={money(sum(paidContributions))} detail={`${paidContributions.length} règlements confirmés`} icon={<ArrowDownLeft size={18} />} />
      <MetricCard label="Dépenses payées" value={money(sum(paidExpenses))} detail={`${paidExpenses.length} dépenses`} icon={<ArrowUpRight size={18} />} />
      <MetricCard label="En attente de décision" value={money(sum(waiting))} detail={`${waiting.length} demandes`} icon={<ClipboardList size={18} />} />
      <MetricCard label="Membres actifs" value={members.filter(item => item.status === 'ACTIVE').length} detail={`${members.length} fiches au total`} icon={<Users size={18} />} />
    </div>
    <Card><CardHeader><CardTitle>Historique financier</CardTitle><p className="text-sm text-muted-foreground">Montants exacts en XOF, sans arrondi monétaire.</p></CardHeader>
      <CardContent>
        {!contributions.length && !expenses.length ? <EmptyInline title="Aucune donnée financière" description="Les rapports apparaîtront après l’enregistrement de cotisations ou de dépenses." /> : <div className="grid gap-5 md:grid-cols-2">
          <div><h3 className="mb-3 text-sm font-semibold">Cotisations par période</h3>{groupAmounts(paidContributions.map(item => ({ period: item.period, amount: item.amount }))).map(item => <div key={item.period} className="flex justify-between border-b border-border py-2 text-sm" data-testid={`report-period-${item.period}`}><span>{item.period}</span><strong className="tabular-nums">{money(item.amount)}</strong></div>)}</div>
          <div><h3 className="mb-3 text-sm font-semibold">Dépenses par statut</h3>{groupAmounts(expenses.map(item => ({ period: labels[item.status] ?? item.status, amount: item.amount }))).map(item => <div key={item.period} className="flex justify-between border-b border-border py-2 text-sm" data-testid={`report-expense-status-${item.period}`}><span>{item.period}</span><strong className="tabular-nums">{money(item.amount)}</strong></div>)}</div>
        </div>}
      </CardContent>
    </Card>
  </div>;
}

function FormDialog({ kind, values, onSubmit, onClose, saving, members, editing }: {
  kind: FormKind; values: FormValues; onSubmit: (values: FormValues) => void;
  onClose: () => void; saving: boolean; members: AmicaleMember[]; editing: boolean;
}) {
  const defaultValues = Object.fromEntries(formFieldsByKind[kind].map(name => [name, values[name] ?? ''])) as FormValues;
  const form = useForm<FormValues>({ defaultValues });
  useEffect(() => { form.reset(defaultValues); }, [form, values, kind]);
  const title: Record<FormKind, string> = {
    member: editing ? 'Modifier le membre' : 'Ajouter un membre',
    contribution: 'Enregistrer une cotisation', expense: 'Soumettre une dépense',
    activity: editing ? 'Modifier l’activité' : 'Nouvelle activité',
    announcement: editing ? 'Modifier l’annonce' : 'Nouvelle annonce',
    dues: 'Configurer une cotisation',
  };
  const submitLabel = kind === 'expense' ? 'Soumettre' : kind === 'contribution' ? 'Enregistrer le règlement' : editing ? 'Enregistrer' : 'Créer';
  const field = (name: string, label: string, required = false, type = 'text', placeholder?: string) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      rules={required ? { required: `${label} est obligatoire.` } : undefined}
      render={({ field: control }) => <FormItem>
        <FormLabel>{label}{required ? ' *' : ''}</FormLabel>
        <FormControl>
          <Input
            {...control}
            type={type}
            placeholder={placeholder}
            required={required}
            min={type === 'number' ? '0' : undefined}
            step={type === 'number' ? '1' : undefined}
            data-testid={`input-${kind}-${name}`}
          />
        </FormControl>
        <FormMessage />
      </FormItem>}
    />
  );
  const select = (name: string, label: string, options: { value: string; label: string }[], required = true) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      rules={required ? { required: `${label} est obligatoire.` } : undefined}
      render={({ field: control }) => <FormItem>
        <FormLabel>{label}{required ? ' *' : ''}</FormLabel>
        <Select value={control.value ?? ''} onValueChange={control.onChange}>
          <FormControl>
            <SelectTrigger data-testid={`select-${kind}-${name}`}>
              <SelectValue placeholder={`Choisir ${label.toLocaleLowerCase('fr-FR')}`} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
        <FormMessage />
      </FormItem>}
    />
  );
  const area = (name: string, label: string, required = false) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      rules={required ? { required: `${label} est obligatoire.` } : undefined}
      render={({ field: control }) => <FormItem>
        <FormLabel>{label}{required ? ' *' : ''}</FormLabel>
        <FormControl>
          <Textarea {...control} required={required} data-testid={`textarea-${kind}-${name}`} rows={3} />
        </FormControl>
        <FormMessage />
      </FormItem>}
    />
  );
  const amount = field('amount', 'Montant exact en XOF', true, 'number', 'Ex. 5000');
  let fields: ReactNode;
  if (kind === 'member') fields = <>
    {field('name', 'Nom complet', true)}{field('studentIdentifier', 'Identifiant étudiant', true)}
    {field('email', 'Adresse e-mail', false, 'email')}{field('phone', 'Téléphone')}
    {field('faculty', 'Faculté')}{field('studyYear', 'Année d’étude')}
    {field('joinedAt', 'Date d’adhésion', true, 'date')}
    {field('office', 'Fonction au bureau')}
    {field('mandateStart', 'Début du mandat', false, 'date')}{field('mandateEnd', 'Fin du mandat', false, 'date')}
    <div className="sm:col-span-2">{area('notes', 'Notes')}</div>
  </>;
  else if (kind === 'contribution') fields = <>
    {select('memberId', 'Membre', members.map(member => ({ value: member.id, label: `${member.name} · ${member.studentIdentifier}` })))}
    {field('period', 'Période de cotisation', true, 'text', 'Ex. 2025–2026')}{amount}
    {field('paidOn', 'Date du règlement', true, 'date')}
    {select('method', 'Moyen de paiement', [{ value: 'CASH', label: 'Espèces' }, { value: 'WAVE', label: 'Wave' }, { value: 'ORANGE_MONEY', label: 'Orange Money' }, { value: 'FREE_MONEY', label: 'Free Money' }, { value: 'BANK_TRANSFER', label: 'Virement bancaire' }, { value: 'MOBILE_MONEY', label: 'Autre mobile money' }, { value: 'OTHER', label: 'Autre' }])}
    {field('transactionReference', 'Référence du paiement externe')}
    <div className="sm:col-span-2">{field('note', 'Note pour le reçu')}</div>
  </>;
  else if (kind === 'dues') fields = <>
    {field('period', 'Période de cotisation', true, 'text', 'Ex. 2026–2027')}
    {field('amount', 'Forfait fixe (XOF)', true, 'number')}
  </>;
  else if (kind === 'expense') fields = <>
    {field('title', 'Intitulé', true)}{field('category', 'Catégorie', true)}
    {amount}{field('expenseDate', 'Date de la dépense', true, 'date')}
    {field('vendor', 'Fournisseur / bénéficiaire')}
    <div className="sm:col-span-2">{area('description', 'Description')}</div>
  </>;
  else if (kind === 'activity') fields = <>
    {field('title', 'Nom de l’activité', true)}{field('eventDate', 'Date de l’activité', true, 'date')}
    {field('location', 'Lieu')}
    {select('status', 'Statut', [{ value: 'PLANNED', label: 'Planifiée' }, { value: 'COMPLETED', label: 'Terminée' }, { value: 'CANCELLED', label: 'Annulée' }])}
    {field('participantCount', 'Participants attendus', false, 'number')}{field('attendeeCount', 'Participants présents', false, 'number')}
    <div className="sm:col-span-2">{area('description', 'Description')}</div>
  </>;
  else fields = <>
    {field('title', 'Titre', true)}
    {select('status', 'Publication', [{ value: 'DRAFT', label: 'Brouillon' }, { value: 'PUBLISHED', label: 'Publiée' }])}
    <div className="sm:col-span-2">{area('body', 'Message', true)}</div>
  </>;

  return <div className="app-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-3 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} role="dialog" aria-modal="true" aria-labelledby="amicale-form-title" className="app-dialog-panel max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl sm:p-6" data-testid={`form-dialog-${kind}`}>
      <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div><h2 id="amicale-form-title" className="text-xl font-bold">{title[kind]}</h2><p className="mt-1 text-sm text-muted-foreground">Les montants sont saisis en XOF entier. Les données financières restent non destructives.</p></div>
        <Button type="button" variant="ghost" size="icon" aria-label="Fermer le formulaire" data-testid="button-close-amicale-form" onClick={onClose} disabled={saving}><X size={18} /></Button>
      </header>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{fields}</div>
      {kind === 'announcement' && <p className="mt-3 text-xs text-muted-foreground">Le statut Publiée publie l’annonce via l’API ; Brouillon la conserve sans publication.</p>}
      <footer className="modal-footer mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" data-testid="button-cancel-amicale-form" onClick={onClose} disabled={saving}>Annuler</Button>
        <Button type="submit" data-testid={`button-submit-${kind}`} disabled={saving}>{saving ? 'Enregistrement…' : submitLabel}</Button>
      </footer>
      </form>
    </Form>
  </div>;
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon: ReactNode }) {
  return <Card className="metric-card" data-testid={`metric-${label.toLocaleLowerCase('fr-FR').replaceAll(' ', '-')}`}>
    <CardContent className="p-5">
      <div className="flex items-center justify-between gap-3 text-primary"><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>{icon}</div>
      <p className="mt-4 break-words text-2xl font-bold tabular-nums" data-testid={`value-${label.toLocaleLowerCase('fr-FR').replaceAll(' ', '-')}`}>{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </CardContent>
  </Card>;
}

function StatusBadge({ value, testId = `status-${value.toLocaleLowerCase('fr-FR')}` }: { value: string; testId?: string }) {
  const variant = value === 'ACTIVE' || value === 'APPROVED' || value === 'PAID' || value === 'PUBLISHED' || value === 'COMPLETED' ? 'default'
    : value === 'REJECTED' || value === 'ARCHIVED' || value === 'CANCELLED' ? 'destructive' : 'secondary';
  return <Badge variant={variant} data-testid={testId}>{labels[value] ?? value}</Badge>;
}

function EmptyPanel({ icon, title, description, testId }: { icon: ReactNode; title: string; description: string; testId: string }) {
  return <Card className="border-dashed" data-testid={testId}><CardContent className="flex flex-col items-center px-6 py-12 text-center">
    <span className="mb-4 grid size-12 place-items-center rounded-full bg-secondary text-primary">{icon}</span><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
  </CardContent></Card>;
}

function EmptyInline({ title, description }: { title: string; description: string }) {
  return <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center" data-testid="empty-amicales-data"><FileText size={20} className="mx-auto text-muted-foreground" /><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function LoadingPanel() {
  return <div className="space-y-4" aria-label="Chargement des données de l’amicale" data-testid="loading-amicales">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(item => <div key={item} className="h-32 animate-pulse rounded-xl border border-border bg-muted" />)}</div>
    <div className="h-64 animate-pulse rounded-xl border border-border bg-muted" />
  </div>;
}

function groupAmounts(items: { period: string; amount: number }[]) {
  const grouped = new Map<string, number>();
  items.forEach(item => grouped.set(item.period, (grouped.get(item.period) ?? 0) + item.amount));
  return [...grouped].map(([period, amount]) => ({ period, amount })).sort((a, b) => a.period.localeCompare(b.period));
}
