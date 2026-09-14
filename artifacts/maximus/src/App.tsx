ected)}
                  className="rounded-lg border p-2 hover:bg-[hsl(var(--muted))]"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  data-testid={`button-delete-module-${selected.id}`}
                  title="Supprimer le module"
                  onClick={() => setDeletingModule(selected)}
                  className="rounded-lg border p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))]"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{selected.description}</p>
            <div className="mt-6 space-y-3 border-t pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Fonctionnalités</span>
                <strong>{selected.features.length}</strong>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              <button
                data-testid={`button-test-module-${selected.id}`}
                onClick={() => {
                  setTestPack(null);
                  setTestModule(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"
              >
                Tester le module complet <ChevronRight size={14} />
              </button>
              <button
                data-testid={`button-detail-toggle-module-${selected.id}`}
                onClick={() => toggleModule(selected.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold ${isActive ? 'border border-[hsl(var(--destructive)/.35)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'}`}
              >
                {isActive ? 'Désactiver le module' : 'Activer le module'} <ChevronRight size={14} />
              </button>
            </div>
          </section>
          <section className="card-surface rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">
                  Configuration métier
                </p>
                <h2 className="mt-2 text-xl font-bold">Packs métiers du module</h2>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                  Créez des packs réutilisables en regroupant les fonctionnalités de ce module. Les secteurs pourront
                  ensuite les sélectionner.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Package size={19} className="text-[hsl(var(--primary))]" />
                <button
                  type="button"
                  data-testid={`button-add-role-pack-${selected.id}`}
                  onClick={openPackCreate}
                  className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-[10px] font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition hover:opacity-90"
                >
                  <Plus size={14} />
                  Ajouter un pack de rôle
                </button>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {(selected.featurePacks ?? []).map((pack) => (
                <div
                  data-testid={`row-module-pack-${selected.id}-${pack.id}`}
                  key={pack.id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <strong className="text-sm">{pack.name}</strong>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        {pack.description || 'Aucune description.'}
                      </p>
                      <p className="mt-2 text-[10px] font-semibold text-[hsl(var(--primary))]">
                        {pack.featureIds.length} fonctionnalité(s) avec droits configurés
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        data-testid={`button-test-module-pack-${pack.id}`}
                        onClick={() => setTestPack(pack)}
                        className="rounded-lg bg-[hsl(var(--primary))] px-2.5 py-2 text-[10px] font-bold text-[hsl(var(--primary-foreground))]"
                      >
                        Tester le pack
                      </button>
                      <button
                        type="button"
                        data-testid={`button-edit-module-pack-${pack.id}`}
                        onClick={() => openPackEdit(pack)}
                        className="rounded-lg p-2 text-xs font-bold hover:bg-[hsl(var(--muted))]"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        data-testid={`button-delete-module-pack-${pack.id}`}
                        onClick={() => deletePack(pack.id)}
                        className="rounded-lg p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(selected.featurePacks ?? []).length === 0 && (
                <p className="rounded-xl border border-dashed p-5 text-xs text-[hsl(var(--muted-foreground))]">
                  Aucun pack métier n’est encore configuré pour ce module.
                </p>
              )}
            </div>
          </section>
        </div>
        {packDialogOpen && (
          <Modal
            title={`${editingPackId ? 'Modifier' : 'Ajouter'} un pack de rôle`}
            onClose={closePackDialog}
            className="max-h-[86vh] w-[min(94vw,1120px)] max-w-[1120px] overflow-y-auto sm:p-8"
          >
            <div className="space-y-5">
              <div className="rounded-xl bg-[hsl(var(--muted)/.45)] p-4">
                <p className="text-xs font-bold text-[hsl(var(--primary))]">{selected.name}</p>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  Définissez un modèle de rôle réutilisable et choisissez les droits accordés à chaque fonctionnalité.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Nom du pack"
                  value={packForm.name}
                  onChange={(value) => setPackForm((current) => ({ ...current, name: value }))}
                  placeholder="Ex. Gestionnaire de stock"
                  testId="input-module-pack-name"
                />
                <Field
                  label="Description"
                  value={packForm.description}
                  onChange={(value) => setPackForm((current) => ({ ...current, description: value }))}
                  placeholder="À quoi sert ce pack ?"
                  testId="input-module-pack-description"
                />
              </div>
              <div className="overflow-hidden rounded-xl border">
                <div className="border-b bg-[hsl(var(--muted)/.45)] px-4 py-3">
                  <p className="text-xs font-bold">Droits par fonctionnalité</p>
                  <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                    Une fonctionnalité non incluse ne sera pas transmise au rôle.
                  </p>
                </div>
                <div className="max-h-[44vh] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-[hsl(var(--card))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <tr>
                        <th className="px-4 py-3 font-bold">Fonctionnalité</th>
                        <th className="px-4 py-3 text-right font-bold">Niveau d’accès</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {getModuleFeatureOptions(selected).map((feature) => (
                        <tr key={feature.id} className="transition hover:bg-[hsl(var(--muted)/.3)]">
                          <td className="px-4 py-3">
                            <span className="font-semibold">{feature.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <select
                              data-testid={`select-pack-permission-${selected.id}-${feature.id}`}
                              value={permissionLevelFor(packForm.featurePermissions[feature.id])}
                              onChange={(event) => setPackFeaturePermission(feature.id, event.target.value)}
                              className="rounded-md border bg-[hsl(var(--card))] px-2 py-2 text-[10px] font-semibold"
                            >
                              <option value="none">Non incluse</option>
                              <option value="view">Voir seulement</option>
                              <option value="create">Voir et créer</option>
                              <option value="edit">Voir, créer et modifier</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={closePackDialog}
                  className="rounded-lg border px-4 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  data-testid="button-save-module-pack"
                   disabled={!packForm.name.trim() || !packForm.description.trim() || packForm.featureIds.length === 0}
                  onClick={savePack}
                  className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {editingPackId ? 'Mettre à jour' : 'Créer le pack'}
                </button>
              </div>
            </div>
          </Modal>
        )}
        {editingModule && (
          <Modal
            title="Modifier le module"
            onClose={() => {
              setEditingModule(null);
              resetPackForm();
            }}
          >
            <div className="space-y-4">
              <Field
                label="Nom du module"
                value={moduleForm.name}
                onChange={(value) => setModuleForm((current) => ({ ...current, name: value }))}
                testId="input-module-name"
              />
              <Field
                label="Description"
                value={moduleForm.description}
                onChange={(value) => setModuleForm((current) => ({ ...current, description: value }))}
                testId="input-module-description"
              />
              <label className="block text-sm font-semibold">
                Fonctionnalités
                <textarea
                  data-testid="input-module-features"
                  value={moduleForm.features}
                  onChange={(event) => setModuleForm((current) => ({ ...current, features: event.target.value }))}
                  placeholder="Une fonctionnalité par ligne"
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-3 text-sm font-normal focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.14)]"
                />
              </label>
              <p className="rounded-lg bg-[hsl(var(--muted))] p-3 text-xs text-[hsl(var(--muted-foreground))]">
                Les fonctionnalités peuvent être séparées par des lignes ou des virgules.
              </p>
              <ModulePackDraftForm
                module={{
                  ...editingModule,
                  features: moduleForm.features
                    .split(/[\n,]/)
                    .map((feature) => feature.trim())
                    .filter(Boolean),
                }}
                packForm={packForm}
                onChange={setPackForm}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingModule(null);
                    resetPackForm();
                  }}
                  className="rounded-lg border px-4 py-2.5 text-xs font-bold"
                >
                  Annuler
                </button>
                <ActionButton primary testId="button-save-module" onClick={saveModule}>
                  Enregistrer les modifications
                </ActionButton>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CatalogWorkflowBar data={data} mutate={mutate} />
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">
              Catalogue des modules
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-.03em]">Vos modules métier</h2>
            <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
              Chaque module est une capacité métier partagée. Activez uniquement celles dont vos entreprises ont besoin.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <div className="rounded-xl bg-[hsl(var(--muted)/.65)] px-4 py-3">
              <p className="mono text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Actives</p>
              <p className="mt-1 text-xl font-bold">
                {activeCount}
                <span className="ml-1 text-xs font-normal text-[hsl(var(--muted-foreground))]">/ {modules.length}</span>
              </p>
            </div>
            <div className="rounded-xl bg-[hsl(var(--muted)/.65)] px-4 py-3">
              <p className="mono text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Bêta</p>
              <p className="mt-1 text-xl font-bold">{betaCount}</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t pt-5 xl:flex-row xl:items-center">
          <label className="relative block flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
              size={16}
            />
            <input
              data-testid="input-search-modules"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une application..."
              className="w-full rounded-xl border bg-transparent py-3 pl-10 pr-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
            />
          </label>
          <div className="flex shrink-0 rounded-xl bg-[hsl(var(--muted)/.65)] p-1">
            {(['TOUTES', 'ACTIFS', 'INACTIFS'] as const).map((filter) => (
              <button
                type="button"
                data-testid={`button-filter-modules-${filter.toLowerCase()}`}
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${statusFilter === filter ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'}`}
              >
                {filter === 'TOUTES' ? 'Toutes' : filter === 'ACTIFS' ? 'Actives' : 'Inactives'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              type="button"
              data-testid={`button-category-modules-${item.toLowerCase().replace(/\s+/g, '-')}`}
              key={item}
              onClick={() => setCategory(item)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${category === item ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)]'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-semibold">
          {visibleModules.length} application{visibleModules.length > 1 ? 's' : ''} affichée
          {visibleModules.length > 1 ? 's' : ''}
        </p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Cliquez sur une application pour voir ses détails et la tester.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visibleModules.map((module, index) => {
          const status = statusOf(module.id);
          const isActive = status !== 'INACTIF';
          const ModuleIcon = moduleIconById[module.id] ?? LayoutGrid;
          return (
            <article
              data-testid={`card-module-${module.id}`}
              key={module.id}
              className={`card-surface group relative flex min-h-[180px] flex-col rounded-2xl p-4 text-center transition hover:-translate-y-1 hover:border-[hsl(var(--primary)/.45)] hover:shadow-lg fade-up fade-up-delay-${Math.min(index + 1, 3)} ${isActive ? '' : 'opacity-65'}`}
            >
              <button
                type="button"
                data-testid={`button-open-module-${module.id}`}
                onClick={() => selectModule(module.id)}
                aria-label={`Ouvrir l’application ${module.name}`}
                className="flex flex-1 flex-col items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
              >
                <span
                  className={`absolute right-3 top-3 h-2 w-2 rounded-full ${isActive ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted-foreground)/.45)]'}`}
                  title={isActive ? 'Application active' : 'Application inactive'}
                />
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] transition group-hover:scale-105">
                  <ModuleIcon size={25} />
                </span>
                <span className="mt-4 line-clamp-2 text-sm font-bold leading-5">{module.name}</span>
                <span className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{categoryOf(module.id)}</span>
                <span className="mt-2 line-clamp-3 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{module.description}</span>
              </button>
              <div className="mt-3 flex justify-center gap-1 border-t pt-3">
                <button
                  type="button"
                  data-testid={`button-edit-module-${module.id}`}
                  title="Modifier le module"
                  onClick={() => openEdit(module)}
                  className="rounded-lg p-2 text-xs hover:bg-[hsl(var(--muted))]"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  data-testid={`button-delete-module-${module.id}`}
                  title="Supprimer le module"
                  onClick={() => setDeletingModule(module)}
                  className="rounded-lg p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          );
        })}
        {visibleModules.length === 0 && (
          <div className="card-surface col-span-full rounded-2xl p-10 text-center">
            <Package className="mx-auto text-[hsl(var(--muted-foreground))]" size={28} />
            <h2 className="mt-4 font-bold">Aucune application trouvée</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Modifiez votre recherche ou réinitialisez les filtres.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('Toutes');
                setStatusFilter('TOUTES');
              }}
              className="mt-4 text-xs font-bold text-[hsl(var(--primary))]"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
      {deletingModule && (
        <Modal title="Confirmer la suppression" onClose={() => setDeletingModule(null)}>
          <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Voulez-vous vraiment supprimer le module{' '}
            <strong className="text-[hsl(var(--foreground))]">{deletingModule.name}</strong> ? Il sera retiré du
            catalogue et désactivé pour tous les espaces.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              data-testid="button-cancel-delete-module"
              onClick={() => setDeletingModule(null)}
              className="rounded-lg border px-4 py-2.5 text-xs font-bold"
            >
              Annuler
            </button>
            <button
              type="button"
              data-testid="button-confirm-delete-module"
              onClick={() => removeModule(deletingModule)}
              className="rounded-lg bg-[hsl(var(--destructive))] px-4 py-2.5 text-xs font-bold text-white"
            >
              Supprimer le module
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ModulePackTestWorkbench({
  module,
  pack,
  data,
  mutate,
  onBack,
}: {
  module: (typeof modules)[number];
  pack?: ModuleFeaturePack;
  data: StoreData;
  mutate: (fn: (d: StoreData) => void, msg?: string) => void;
  onBack: () => void;
}) {
  const operationalModules: ModuleId[] = [
    'achats',
    'comptabilite',
    'paie',
    'crm',
    'fournisseurs',
    'logistique',
    'documents',
  ];
  const previewCompany = data.companies[0];
  const previewCompanyId = previewCompany?.id ?? '';
  const featureOptions = getModuleFeatureOptions(module);
  const fullFeatureIds = featureOptions.map((feature) => feature.id);
  const testFeatureIds = pack
    ? fullFeatureIds.filter((featureId) => pack.featureIds.includes(featureId))
    : fullFeatureIds;
  const configuredPermissions = pack
    ? defaultFeaturePermissions(testFeatureIds, pack.featurePermissions)
    : defaultFeaturePermissions(
        fullFeatureIds,
        Object.fromEntries(fullFeatureIds.map((featureId) => [featureId, ['voir', 'créer', 'modifier']])),
      );
  const authorizedFeatures = testFeatureIds.filter((featureId) => configuredPermissions[featureId]?.length);
  const featureLabelById = new Map(featureOptions.map((feature) => [feature.id, feature.label]));
  const canCreate = authorizedFeatures.some((featureId) => configuredPermissions[featureId]?.includes('créer'));
  const canModify = authorizedFeatures.some((featureId) => configuredPermissions[featureId]?.includes('modifier'));
  const stockPermissions = Object.fromEntries(
    authorizedFeatures.map((featureId) => [featureId, configuredPermissions[featureId] ?? ['voir']]),
  );
  const commerceFeatureToTab: Record<string, CommerceTabId> = {
    clients: 'clients',
    sales: 'sales',
    products: 'products',
    suppliers: 'suppliers',
    purchases: 'purchases',
    expenses: 'expenses',
    cash: 'cash',
    credit: 'credit',
    invoices: 'invoices',
    returns: 'returns',
    reports: 'reports',
    activity: 'activity',
    team: 'team',
    settings: 'settings',
    devis: 'sales',
    commandes: 'sales',
    facturation: 'invoices',
  };
  const allowedCommerceTabs = authorizedFeatures
    .map((featureId) => commerceFeatureToTab[featureId])
    .filter((tab): tab is CommerceTabId => Boolean(tab));
  const commerceTabPermissions = allowedCommerceTabs.reduce<Partial<Record<CommerceTabId, string[]>>>((all, tab) => {
    const permissions = authorizedFeatures
      .filter((featureId) => commerceFeatureToTab[featureId] === tab)
      .flatMap((featureId) => configuredPermissions[featureId] ?? []);
    all[tab] = [...new Set(permissions)];
    return all;
  }, {});
  return (
    <div data-testid="module-pack-workbench" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          data-testid="button-back-pack-test"
          onClick={onBack}
          className="text-xs font-bold text-[hsl(var(--primary))]"
        >
          ← Retour au module
        </button>
        <span className="rounded-full bg-[hsl(var(--accent)/.2)] px-3 py-1.5 text-[10px] font-bold">
          {pack ? 'TEST DU PACK MÉTIER' : 'TEST DU MODULE COMPLET'}
        </span>
      </div>
      <section className="card-surface rounded-2xl p-5">
        <div className="border-b pb-4">
          <p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Aperçu fonctionnel</p>
          <h2 className="mt-2 text-xl font-bold">
            {module.name}
            {pack ? ` avec le pack « ${pack.name} »` : ''}
          </h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {pack
              ? 'Les mêmes écrans que ceux utilisés par une entreprise sont ouverts avec le périmètre et les droits de ce pack.'
              : 'Le parcours complet du module est ouvert avec toutes ses fonctionnalités.'}
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.06)] px-4 py-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Aperçu administratif isolé : les données de production ne sont pas sollicitées et les actions d’écriture sont désactivées.
        </div>
        <div className="mt-4 rounded-xl border bg-[hsl(var(--muted)/.18)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold">Périmètre testé</p>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                Seules les fonctionnalités autorisées par ce pack sont affichées ci-dessous.
              </p>
            </div>
            <span className="rounded-full border px-2.5 py-1 text-[10px] font-bold">
              {authorizedFeatures.length} fonctionnalité{authorizedFeatures.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {authorizedFeatures.map((featureId) => (
              <span key={featureId} className="rounded-lg border bg-[hsl(var(--card))] px-2.5 py-1.5 text-[10px] font-semibold">
                {featureLabelById.get(featureId) ?? featureId}
                <span className="ml-1.5 text-[hsl(var(--muted-foreground))]">
                  · {(configuredPermissions[featureId] ?? []).join(' · ')}
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="mt-5">
          {module.id === 'stocks' && (
            <StockModulePage
              companyId={previewCompanyId || 'module-preview'}
              stockPermissions={stockPermissions}
              canCreate={false}
              canModify={false}
              preview
            />
          )}
          {(module.id === 'commerce' || module.id === 'ventes') && (
            <CommerceModulePage
              companyId={previewCompanyId}
              data={data}
              mutate={mutate}
              tabPermissions={commerceTabPermissions}
              allowedTabs={allowedCommerceTabs}
              initialTab={allowedCommerceTabs[0] ?? (module.id === 'ventes' ? 'sales' : 'dashboard')}
            />
          )}
           {module.id === 'finance' && <FinancePage data={data} />}
          {module.id === 'rh' && previewCompany && (
            <CompanyOrganizationAdmin company={previewCompany} data={data} mutate={mutate} />
          )}
            {module.id === 'presences' && <PresencesPage data={data} companyId={previewCompanyId} visibleFeatureIds={authorizedFeatures} preview />}
            {module.id === 'paie' && <PayrollModulePage companyId={previewCompanyId || 'module-preview'} employees={[]} canCreate={false} canModify={false} visibleFeatureIds={authorizedFeatures} preview />}
           {module.id === 'ecommerce' && (
             <EcommerceModulePage
               companyId={previewCompanyId || 'module-preview'}
               canCreate={false}
               canModify={false}
                allowedFeatureIds={authorizedFeatures}
               preview
             />
           )}
          {operationalModules.includes(module.id) && module.id !== 'paie' && (
            <OperationalModulePage
              moduleId={module.id}
              data={data}
              mutate={mutate}
              featurePermissions={configuredPermissions}
            />
          )}
          {module.id === 'rapports' && <OperationalReportsPage data={data} />}
           {!['stocks', 'commerce', 'ventes', 'ecommerce', 'finance', 'rh', 'presences', 'paie', 'rapports', ...operationalModules].includes(
            module.id,
          ) && (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              L’aperçu de ce module sera disponible quand son écran métier sera connecté.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function OperationalReportsPage({ data }: { data: StoreData }) {
  type ReportId = 'sales' | 'stock' | 'finance' | 'activity';
  const [report, setReport] = useState<ReportId>('sales');
  const [query, setQuery] = useState('');
  const definitions: Record<ReportId, { label: string; description: string; headers: string[]; rows: string[][] }> = {
    sales: {
      label: 'Ventes',
      description: 'Chiffre d’affaires et commandes clients.',
      headers: ['Référence', 'Client', 'Montant', 'Statut', 'Date'],
      rows: data.sales.map((item) => [item.reference, item.client, money(item.amount), item.status, item.date]),
    },
    stock: {
      label: 'Gestion de stock',
      description: 'Valorisation et niveaux des produits.',
      headers: ['Produit', 'SKU', 'Catégorie', 'Stock', 'Valeur'],
      rows: data.products.map((item) => [
        item.name,
        item.sku,
        item.category,
        String(item.stock),
        money(item.stock * item.price),
      ]),
    },
    finance: {
      label: 'Finance',
      description: 'Écritures comptables enregistrées.',
      headers: ['Référence', 'Journal', 'Libellé', 'Débit', 'Crédit', 'Date'],
      rows: data.accountingEntries.map((item) => [item.reference, item.journal, item.label, money(item.debit), money(item.credit), item.date]),
    },
    activity: {
      label: 'Activité',
      description: 'Traçabilité des actions réalisées.',
      headers: ['Utilisateur', 'Action', 'Module', 'Objet', 'Date'],
      rows: data.activities.map((item) => [item.user, item.action, item.module, item.object, item.date]),
    },
  };
  const active = definitions[report];
  const rows = active.rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase()));
  const exportCsv = () => {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [active.headers, ...rows].map((row) => row.map(escape).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-${report}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.entries(definitions) as [ReportId, typeof active][]).map(([id, item]) => (
          <button
            key={id}
            onClick={() => setReport(id)}
            className={`card-surface rounded-2xl p-5 text-left transition ${report === id ? 'ring-2 ring-[hsl(var(--primary))]' : 'hover:-translate-y-0.5'}`}
          >
            <FileBarChart size={18} className="text-[hsl(var(--primary))]" />
            <p className="mt-4 font-bold">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.description}</p>
          </button>
        ))}
      </div>
      <section className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold">Rapport {active.label}</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {rows.length} lignes calculées depuis les données de l’entreprise.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-lg border px-4 py-2.5 text-xs font-bold">
              Imprimer
            </button>
            <button
              onClick={exportCsv}
              className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"
            >
              Exporter CSV
            </button>
          </div>
        </div>
        <div className="p-5">
          <label className="relative block max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
              size={15}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrer le rapport..."
              className="w-full rounded-lg border bg-transparent py-2.5 pl-9 pr-3 text-sm"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[hsl(var(--muted)/.55)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <tr>
                {active.headers.map((header) => (
                  <th key={header} className="px-4 py-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, index) => (
                <tr key={`${report}-${index}`} className="hover:bg-[hsl(var(--muted)/.35)]">
                  {row.map((cell, cellIndex) => (
                    <td key={`${cellIndex}-${cell}`} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={active.headers.length}
                    className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]"
                  >
                    Aucune donnée pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function HumanResourcesWorkspace({
  data,
  mutate,
  companyAdmin,
  employee,
  companyId,
}: {
  data: StoreData;
  mutate: (fn: (d: StoreData) => void, msg?: string) => void;
  companyAdmin: boolean;
  employee: StoreData['employees'][number] | null;
  companyId: string;
}) {
  const company = data.companies.find((item) => item.id === companyId);
  if (companyAdmin && company) return <CompanyOrganizationAdmin company={company} data={data} mutate={mutate} />;
  return <RHPage data={data} companyId={companyId} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmDialogProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppContent />
          </WouterRouter>
        </TooltipProvider>
      </ConfirmDialogProvider>
    </QueryClientProvider>
  );
}

function AdminCreateCompanyPage({
  data,
  mutate,
  onComplete,
  onCancel,
}: {
  data: StoreData;
  mutate: (fn: (d: StoreData) => void, msg?: string) => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const fallbackPreset: SectorPreset = {
    id: 'default',
    name: 'Distribution',
    moduleIds: ['commerce', 'stocks', 'presences'],
  };
  const catalog = getCatalogSnapshot(data);
  const availableSectorPresets = catalog.sectorPresets.length > 0 ? catalog.sectorPresets : [fallbackPreset];
  const initialPreset = fallbackPreset;
  const [name, setName] = useState('');
  const [manager, setManager] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Sénégal');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [sector, setSector] = useState('');
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([...initialPreset.moduleIds]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const changeSector = (nextSector: string) => {
    const preset = availableSectorPresets.find((item) => item.name === nextSector);
    setSector(nextSector);
    setSelectedModules(preset ? [...preset.moduleIds] : [...initialPreset.moduleIds]);
    setError('');
  };

  const toggle = (id: ModuleId) => {
    setSelectedModules((previous) =>
      previous.includes(id) ? previous.filter((moduleId) => moduleId !== id) : [...previous, id],
    );
    setError('');
  };
  const save = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (
      !name.trim() ||
      !manager.trim() ||
      !normalizedEmail ||
      !country.trim() ||
      password.length < 8 ||
       password !== passwordConfirm
    ) {
      setError('Complétez les informations de l’entreprise et vérifiez le mot de passe.');
      return;
    }
    if (selectedModules.length === 0) {
      setError('Sélectionnez au moins un module.');
      return;
    }
    if (data.companies.some((company) => company.email.toLowerCase() === normalizedEmail)) {
      setError('Une entreprise utilise déjà cette adresse email.');
      return;
    }
    setSaving(true);
    try {
      const preset = availableSectorPresets.find((item) => item.name === sector);
      await companyRequestApi.create({
        name: name.trim(),
        manager: manager.trim(),
        email: normalizedEmail,
        password,
        phone: phone.trim(),
        country: country.trim(),
        sector,
        requestedModules: [...selectedModules],
        requestedModulePackIds: Object.fromEntries(
          Object.entries(preset?.modulePackIds ?? {})
            .filter(([moduleId]) => selectedModules.includes(moduleId as ModuleId))
            .map(([moduleId, packIds]) => [moduleId, [...(packIds ?? [])]]),
        ),
      });
      onComplete();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'La synchronisation des modules a échoué.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <section className="card-surface rounded-2xl p-6 sm:p-8">
        <div className="mb-8">
          <p className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">
            Création administrative
          </p>
          <h2 className="mt-3 text-2xl font-bold">Nouvelle entreprise</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Cette entreprise sera active immédiatement et ne passera pas par les demandes en attente.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nom de l’entreprise"
            value={name}
            onChange={setName}
            placeholder="Ex. votre entreprise"
            testId="input-admin-company-name"
          />
          <Field
            label="Responsable"
            value={manager}
            onChange={setManager}
            placeholder="Prénom Nom"
            testId="input-admin-company-manager"
          />
          <Field
            label="Email administrateur"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="admin@entreprise.com"
            testId="input-admin-company-email"
          />
          <Field
            label="Téléphone"
            value={phone}
            onChange={setPhone}
            placeholder="+221 77 000 00 00"
            testId="input-admin-company-phone"
          />
          <Field
            label="Pays"
            value={country}
            onChange={setCountry}
            placeholder="Sénégal"
            testId="input-admin-company-country"
          />
           <label className="block text-sm font-semibold">
             Secteur <span className="font-normal text-[hsl(var(--muted-foreground))]">(facultatif)</span>
            <select
              data-testid="select-admin-company-sector"
              value={sector}
              onChange={(event) => changeSector(event.target.value)}
              className="mt-2 w-full rounded-lg border bg-transparent px-3 py-3 text-sm font-normal"
            >
               <option value="">Aucun secteur — configurer manuellement</option>
              {availableSectorPresets.map((preset) => (
                <option key={preset.id} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Mot de passe administrateur"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="Au moins 8 caractères"
            testId="input-admin-company-password"
          />
          <Field
            label="Confirmer le mot de passe"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            type="password"
            placeholder="Répétez le mot de passe"
            testId="input-admin-company-password-confirm"
          />
        </div>
        <div className="mt-8 rounded-xl border border-dashed p-4 text-sm text-[hsl(var(--muted-foreground))]">
          L’organisation sera configurée après la création de l’entreprise. MAXIMUS ou l’entreprise pourra créer ses propres types d’unités, puis construire sa hiérarchie depuis la page Organisation.
        </div>
        <div className="mt-8 border-t pt-6">
          <h3 className="font-bold">Modules autorisés</h3>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Ces modules seront accessibles dès la première connexion.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <button
                type="button"
                data-testid={`button-admin-module-${module.id}`}
                key={module.id}
                onClick={() => toggle(module.id)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left ${selectedModules.includes(module.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.06)]' : 'border-[hsl(var(--border))]'}`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${selectedModules.includes(module.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))]'}`}
                >
                  {selectedModules.includes(module.id) && <Check size={13} />}
                </span>
                <span>
                  <strong className="block text-sm">{module.name}</strong>
                  <span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{module.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p
            data-testid="admin-create-error"
            className="mt-5 rounded-lg bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]"
          >
            {error}
          </p>
        )}
        <div className="mt-8 flex justify-end gap-3">
          <button
            data-testid="button-cancel-admin-company"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border px-5 py-3 text-sm font-bold"
          >
            Annuler
          </button>
          <button
            data-testid="button-save-admin-company"
            onClick={save}
            disabled={saving}
            className="btn rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
          >
            {saving ? 'Synchronisation…' : 'Créer l’entreprise'}
          </button>
        </div>
      </section>
    </div>
  );
}

function CompanyModulesDetail({
  company,
  data,
  mutate,
  onModuleAccess,
  onBack,
}: {
  company: Company;
  data: StoreData;
  mutate: (fn: (d: StoreData) => void, msg?: string) => void;
   onModuleAccess: (
     companyId: string,
     moduleId: ModuleId,
     status: ModuleAvailability,
     options?: { featureIds?: string[]; configuration?: Record<string, unknown> },
   ) => Promise<void>;
  onBack: () => void;
}) {
  const defaultStatuses = () =>
    Object.fromEntries(
      modules.map((module) => [module.id, company.allowedModules.includes(module.id) ? 'ACTIF' : 'INACTIF']),
    ) as Record<ModuleId, ModuleAvailability>;
  const [moduleStatuses, setModuleStatuses] = useState<Record<ModuleId, ModuleAvailability>>(defaultStatuses);
  const [savedStatuses, setSavedStatuses] = useState<Record<ModuleId, ModuleAvailability>>(defaultStatuses);
  const [featureSelections, setFeatureSelections] = useState<Record<ModuleId, string[]>>({});
  const [savedFeatureSelections, setSavedFeatureSelections] = useState<Record<ModuleId, string[]>>({});
  const [packSelections, setPackSelections] = useState<Record<ModuleId, string[]>>({});
  const [savedPackSelections, setSavedPackSelections] = useState<Record<ModuleId, string[]>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fallback = defaultStatuses();
    setModuleStatuses(fallback);
    setSavedStatuses(fallback);
    void loadCompanyModuleAccess(company.id)
      .then((access) => {
        if (cancelled) return;
        const next = {
          ...fallback,
          ...Object.fromEntries(access.filter((item) => item.id in fallback).map((item) => [item.id, item.status])),
        } as Record<ModuleId, ModuleAvailability>;
        setModuleStatuses(next);
        setSavedStatuses(next);
        const nextFeatures = Object.fromEntries(
          modules.map((module) => {
            const serverModule = access.find((item) => item.id === module.id);
            const serverHasExplicitSelection =
              Boolean(serverModule)
              && (serverModule?.featureIds?.length || serverModule?.configuration?.featureScope === 'explicit');
            const configured = serverHasExplicitSelection
              ? serverModule?.featureIds ?? []
              : company.requestedModuleFeatures?.[module.id];
            const featureIds = configured?.length
              ? configured
              : getModuleFeatureOptions(module).map((feature) => feature.id);
            return [module.id, [...new Set(featureIds)]];
          }),
        ) as Record<ModuleId, string[]>;
        const nextPacks = Object.fromEntries(
          modules.map((module) => [
            module.id,
            [...(company.requestedModulePackIds?.[module.id] ?? [])],
          ]),
        ) as Record<ModuleId, string[]>;
        setFeatureSelections(nextFeatures);
        setSavedFeatureSelections(nextFeatures);
        setPackSelections(nextPacks);
        setSavedPackSelections(nextPacks);
      })
      .catch(() => {
        // The local company model remains a safe fallback while the server is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [
    company.id,
    company.allowedModules.join('|'),
    JSON.stringify(company.requestedModuleFeatures ?? {}),
    JSON.stringify(company.requestedModulePackIds ?? {}),
  ]);

  const setModuleStatus = (id: ModuleId, status: ModuleAvailability) => {
    setModuleStatuses((previous) => ({ ...previous, [id]: status }));
  };

  const toggleFeature = (moduleId: ModuleId, featureId: string) => {
    setFeatureSelections((previous) => {
      const selected = new Set(previous[moduleId] ?? []);
      if (selected.has(featureId)) selected.delete(featureId);
      else selected.add(featureId);
      return { ...previous, [moduleId]: [...selected] };
    });
  };

  const setModulePacks = (moduleId: ModuleId, packIds: string[]) => {
    const module = modules.find((item) => item.id === moduleId);
    const featureIds = module
      ? [...new Set(
          (module.featurePacks ?? [])
            .filter((pack) => packIds.includes(pack.id))
            .flatMap((pack) => pack.featureIds),
        )]
      : [];
    setPackSelections((previous) => ({ ...previous, [moduleId]: packIds }));
    if (packIds.length > 0) {
      setFeatureSelections((previous) => ({ ...previous, [moduleId]: featureIds }));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const changes = modules
        .filter((module) =>
          moduleStatuses[module.id] !== savedStatuses[module.id]
          || JSON.stringify(featureSelections[module.id] ?? []) !== JSON.stringify(savedFeatureSelections[module.id] ?? [])
          || JSON.stringify(packSelections[module.id] ?? []) !== JSON.stringify(savedPackSelections[module.id] ?? []),
        )
        .map((module) => onModuleAccess(company.id, module.id, moduleStatuses[module.id], {
          featureIds: featureSelections[module.id] ?? [],
          configuration: {
            featureScope: 'explicit',
            packIds: packSelections[module.id] ?? [],
          },
        }));
      await Promise.all(changes);
      setSavedStatuses(moduleStatuses);
      setSavedFeatureSelections(featureSelections);
      setSavedPackSelections(packSelections);
    } catch (error) {
       setModuleStatuses(savedStatuses);
       setFeatureSelections(savedFeatureSelections);
       setPackSelections(savedPackSelections);
      window.alert(error instanceof Error ? error.message : 'La configuration n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        data-testid="button-back-companies"
        onClick={onBack}
        className="text-xs font-bold text-[hsl(var(--primary))]"
      >
        ← Retour aux entreprises
      </button>
      <div className="card-surface rounded-2xl p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div className="flex gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-lg font-black text-[hsl(var(--primary-foreground))]">
              {company.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h2 className="text-2xl font-bold">{company.name}</h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {company.sector} · {company.country}
              </p>
              <div className="mt-3">
                <StatusBadge status={company.status} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton testId="button-edit-company-detail" icon={Edit3} onClick={() => setEditing(true)}>
              Modifier
            </ActionButton>
            <ActionButton
              testId="button-suspend-company"
              icon={company.status === 'SUSPENDU' ? RefreshCw : ShieldCheck}
              onClick={() =>
                mutate(
                  (draft) => {
                    const target = draft.companies.find((item) => item.id === company.id);
                    if (target) target.status = target.status === 'SUSPENDU' ? 'ACTIF' : 'SUSPENDU';
                  },
                  company.status === 'SUSPENDU' ? 'Entreprise réactivée.' : 'Entreprise suspendue.',
                )
              }
            >
              {company.status === 'SUSPENDU' ? 'Réactiver' : 'Suspendre'}
            </ActionButton>
          </div>
        </div>
        <div className="mt-8 grid gap-4 border-t pt-5 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Responsable</p>
            <p className="mt-1 font-bold">{company.manager}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Email</p>
            <p className="mt-1 font-bold">{company.email}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Modules accessibles</p>
            <p className="mt-1 font-bold">
              {modules.filter((module) => moduleStatuses[module.id] !== 'INACTIF').length} / {modules.length}
            </p>
          </div>
        </div>
      </div>
      <section className="card-surface rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Modules autorisés</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Ajustez le périmètre de l’espace.</p>
          </div>
          <span className="mono text-xs text-[hsl(var(--muted-foreground))]">
            {modules.filter((module) => moduleStatuses[module.id] !== 'INACTIF').length} / {modules.length}
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {modules.map((module) => {
            const status = moduleStatuses[module.id] ?? 'INACTIF';
            return (
              <div
                data-testid={`card-company-module-${module.id}`}
                key={module.id}
                 className={`rounded-xl border p-4 ${status === 'INACTIF' ? 'bg-[hsl(var(--muted)/.4)] opacity-65' : 'border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.05)]'}`}
              >
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex min-w-0 items-center gap-3">
                     <span className="rounded-lg bg-[hsl(var(--muted))] p-2">
                       <LayoutGrid size={16} />
                     </span>
                     <div className="min-w-0">
                       <strong className="block text-sm">{module.name}</strong>
                       <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{module.description}</p>
                     </div>
                  </div>
                   <select
                     data-testid={`select-company-module-status-${module.id}`}
                     value={status}
                     onChange={(event) => setModuleStatus(module.id, event.target.value as ModuleAvailability)}
                     className="shrink-0 rounded-lg border bg-[hsl(var(--card))] px-2 py-2 text-xs font-bold"
                   >
                     <option value="ACTIF">Actif</option>
                     <option value="BETA">Bêta</option>
                     <option value="MAINTENANCE">Maintenance</option>
                     <option value="INACTIF">Désactivé</option>
                   </select>
                 </div>
                 {status !== 'INACTIF' && (module.featurePacks?.length || getModuleFeatureOptions(module).length) ? (
                   <div className="mt-4 space-y-3 border-t border-[hsl(var(--border)/.7)] pt-3">
                     {(module.featurePacks ?? []).length > 0 && (
                       <div>
                         <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Packs autorisés</p>
                         <div className="grid gap-2 sm:grid-cols-2">
                           {(module.featurePacks ?? []).map((pack) => (
                             <label key={pack.id} className="flex items-start gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] p-2 text-xs">
                               <input
                                 type="checkbox"
                                 checked={(packSelections[module.id] ?? []).includes(pack.id)}
                                 onChange={(event) => setModulePacks(
                                   module.id,
                                   event.target.checked
                                     ? [...new Set([...(packSelections[module.id] ?? []), pack.id])]
                                     : (packSelections[module.id] ?? []).filter((id) => id !== pack.id),
                                 )}
                                 className="mt-0.5"
                               />
                               <span><strong className="block">{pack.name}</strong><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{pack.description}</span></span>
                             </label>
                           ))}
                         </div>
                       </div>
                     )}
                     <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Fonctionnalités autorisées</p>
                        {module.id === 'ecommerce' && <p className="mb-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Pour autoriser les produits, cochez <strong>Vente de produits physiques</strong>, <strong>Vente de produits numériques</strong>, ou les deux.</p>}
                       <div className="grid gap-2 sm:grid-cols-2">
                         {getModuleFeatureOptions(module).map((feature) => (
                           <label key={feature.id} className="flex items-center gap-2 text-xs">
                             <input
                               type="checkbox"
                               checked={(featureSelections[module.id] ?? []).includes(feature.id)}
                               onChange={() => toggleFeature(module.id, feature.id)}
                               className="rounded"
                             />
                             <span>{feature.label}</span>
                           </label>
                         ))}
                       </div>
                     </div>
                   </div>
                 ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <ActionButton
            primary
            testId="button-save-company-modules"
            onClick={() => {
              if (!saving) void save();
            }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
          </ActionButton>
        </div>
      </section>
      {editing && <CompanyEditModal company={company} data={data} mutate={mutate} onClose={() => setEditing(false)} />}
    </div>
  );
}
export default App;
