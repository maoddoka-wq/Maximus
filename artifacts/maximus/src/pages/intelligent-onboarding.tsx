import React, { useState, useEffect } from 'react';
import { onboardingApi, type OnboardingProposal, type OnboardingDraft } from '@/lib/onboarding-api';
import { 
  Building2, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Package,
  Settings,
  HelpCircle,
  Briefcase,
  Users,
  MapPin,
  Mail,
  Lock,
  Phone,
  Store,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export type CompanyIdentity = {
  name: string;
  manager: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  country: string;
  sector: string;
};

export type IntelligentOnboardingPageProps = {
  data?: any;
  onComplete: () => void;
  onManual: () => void;
  onSubmitRequest: (payload: { draftId: string; proposal: OnboardingProposal; identity: CompanyIdentity }) => Promise<void>;
};

type Step = 'describe' | 'generating' | 'review' | 'refining' | 'identity' | 'submitting';

const draftStorageKey = 'maximus:onboarding-draft';

export function IntelligentOnboardingPage({ onComplete, onManual, onSubmitRequest }: IntelligentOnboardingPageProps) {
  const [step, setStep] = useState<Step>('describe');
  const [description, setDescription] = useState('');
  const [refinement, setRefinement] = useState('');
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [identity, setIdentity] = useState<CompanyIdentity>({
    name: '',
    manager: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    country: 'Sénégal',
    sector: '',
  });

  useEffect(() => {
    const savedDraftId = window.localStorage.getItem(draftStorageKey);
    if (!savedDraftId) return;

    void onboardingApi.getDraft(savedDraftId)
      .then(response => {
        setDraft(response);
        setIdentity(prev => ({ ...prev, sector: response.proposal.companyProfile.sector }));
        setStep('review');
      })
      .catch(() => {
        window.localStorage.removeItem(draftStorageKey);
      });
  }, []);

  const handleCreateDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!description.trim()) return;

    setStep('generating');
    setErrorMsg(null);
    try {
      const response = await onboardingApi.createDraft({ description });
      setDraft(response);
      window.localStorage.setItem(draftStorageKey, response.draftId);
      setIdentity(prev => ({ ...prev, sector: response.proposal.companyProfile.sector }));
      setStep('review');
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de l’analyse.');
      setStep('describe');
    }
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinement.trim() || !draft) return;

    setStep('refining');
    setErrorMsg(null);
    try {
      const response = await onboardingApi.updateDraft(draft.draftId, {
        description: refinement,
        proposal: draft.proposal
      });
      setDraft(response);
      setRefinement('');
      setStep('review');
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la mise à jour.');
      setStep('review');
    }
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    
    setStep('submitting');
    try {
      await onSubmitRequest({ draftId: draft.draftId, proposal: draft.proposal, identity });
      window.localStorage.removeItem(draftStorageKey);
      onComplete();
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la création.');
      setStep('identity');
    }
  };

  const passwordMismatch = identity.password !== identity.passwordConfirm;

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="flex-none px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">MAXIMUS</span>
        </div>
        <div className="text-sm font-medium text-slate-500">
          Configuration Intelligente
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-4xl">
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-none mt-0.5" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {step === 'describe' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 animate-in fade-in zoom-in-95 duration-300">
              <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Parlez-nous de votre entreprise
                </h1>
                <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                  Décrivez votre activité, la taille de votre équipe, et vos processus actuels. 
                  MAXIMUS analysera vos besoins pour concevoir un espace de travail sur mesure, 
                  avec les modules adaptés.
                </p>

                <form onSubmit={handleCreateDraft} className="space-y-6">
                  <div className="relative group">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Nous sommes une entreprise de distribution avec 15 employés. Nous avons besoin de gérer nos stocks, facturer nos clients B2B et suivre les présences de nos techniciens..."
                      className="w-full h-48 p-5 bg-slate-50 border-2 border-slate-200 rounded-xl text-base placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-0 transition-colors resize-none"
                      autoFocus
                    />
                    <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-400">
                      Plus vous êtes précis, plus la configuration sera exacte.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={!description.trim()}
                      className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl font-medium text-base hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      Générer ma configuration
                    </button>
                    <button
                      type="button"
                      onClick={onManual}
                      className="w-full sm:w-auto px-8 py-4 bg-white text-slate-600 rounded-xl font-medium text-base hover:bg-slate-50 border border-slate-200 active:scale-[0.98] transition-all"
                    >
                      Configuration manuelle
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {(step === 'generating' || step === 'refining') && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-16 flex flex-col items-center justify-center text-center min-h-[400px] animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 border-2 border-slate-900 rounded-full border-t-transparent animate-spin" />
                <Sparkles className="w-8 h-8 text-slate-900" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">
                {step === 'generating' ? 'Analyse de votre activité' : 'Ajustement de la proposition'}
              </h2>
              <p className="text-slate-500 max-w-md mx-auto">
                MAXIMUS cartographie vos processus métier et sélectionne les modules les plus pertinents pour votre structure.
              </p>
              
              <div className="mt-12 w-full max-w-sm space-y-4">
                <div className="h-12 bg-slate-50 rounded-lg animate-pulse" />
                <div className="h-24 bg-slate-50 rounded-lg animate-pulse" />
                <div className="h-12 bg-slate-50 rounded-lg animate-pulse" />
              </div>
            </div>
          )}

          {step === 'review' && draft && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-8 sm:px-10 sm:py-10 border-b border-slate-100 bg-slate-900 text-white">
                  <h1 className="text-3xl font-bold tracking-tight mb-3">
                    Proposition de configuration
                  </h1>
                  <p className="text-slate-300 text-lg max-w-2xl">
                    Nous avons analysé votre demande. Voici les modules et paramètres recommandés pour {draft.proposal.companyProfile.businessType.toLowerCase()}.
                  </p>
                </div>
                
                <div className="p-8 sm:p-10 space-y-12">
                  {/* Modules Section */}
                  <div>
                    <h3 className="text-xl font-bold tracking-tight flex items-center gap-2 mb-6">
                      <Package className="w-6 h-6 text-slate-400" />
                      Modules recommandés
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {draft.proposal.recommendedModules.map(mod => (
                        <div key={mod.moduleId} className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCircle2 className="w-24 h-24" />
                          </div>
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-bold text-lg">{mod.moduleName}</h4>
                              <div className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm">
                                {Math.round(mod.confidence * 100)}% de pertinence
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-4">
                              {mod.reason}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {mod.packIds.map(pack => (
                                <span key={pack} className="px-2 py-1 bg-slate-200/50 text-slate-700 text-xs font-medium rounded">
                                  {pack}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Settings & Profile interpretation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4">
                        <Briefcase className="w-5 h-5 text-slate-400" />
                        Profil identifié
                      </h3>
                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                        <div>
                          <div className="text-sm font-medium text-slate-500 mb-1">Secteur</div>
                          <div className="font-semibold">{draft.proposal.companyProfile.sector}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-500 mb-1">Type d'activité</div>
                          <div className="font-semibold">{draft.proposal.companyProfile.businessType}</div>
                        </div>
                        {draft.proposal.companyProfile.employeeEstimate && (
                          <div>
                            <div className="text-sm font-medium text-slate-500 mb-1">Effectif estimé</div>
                            <div className="font-semibold">{draft.proposal.companyProfile.employeeEstimate} collaborateurs</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {Object.keys(draft.proposal.suggestedSettings).length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4">
                          <Settings className="w-5 h-5 text-slate-400" />
                          Paramètres suggérés
                        </h3>
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                          {Object.entries(draft.proposal.suggestedSettings).map(([key, setting]) => (
                            <div key={key} className="flex flex-col">
                              <span className="text-sm font-medium text-slate-500">{key}</span>
                              <span className="font-semibold">{setting.value}</span>
                              <span className="text-xs text-slate-400 mt-0.5">Basé sur: {setting.source}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unknowns / Clarifications */}
                  {draft.proposal.unknowns.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                      <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-3">
                        <HelpCircle className="w-5 h-5" />
                        Points à clarifier
                      </h3>
                      <ul className="space-y-2">
                        {draft.proposal.unknowns.map((u, i) => (
                          <li key={i} className="flex items-start gap-2 text-amber-700 text-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-none" />
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </div>

              {/* Refinement or Accept */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                  <h3 className="font-bold tracking-tight mb-4">Une modification à apporter ?</h3>
                  <form onSubmit={handleRefine} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={refinement}
                      onChange={(e) => setRefinement(e.target.value)}
                      placeholder="Ex: Ajoutez aussi la gestion des RH pour 5 personnes..."
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 focus:ring-0 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!refinement.trim()}
                      className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      Ajuster
                    </button>
                  </form>
                </div>
                <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 sm:p-8 flex flex-col justify-center">
                  <h3 className="font-bold tracking-tight text-white mb-2">Tout est correct ?</h3>
                  <p className="text-slate-400 text-sm mb-6">Passez à la création de votre compte pour activer cet espace.</p>
                  <button
                    onClick={() => setStep('identity')}
                    className="w-full px-6 py-3 bg-white text-slate-900 rounded-xl font-medium text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 group"
                  >
                    Valider et continuer
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'identity' && draft && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="px-8 py-8 sm:px-12 sm:py-10 border-b border-slate-100">
                <h2 className="text-3xl font-bold tracking-tight mb-2">Dernière étape</h2>
                <p className="text-slate-500 text-lg">
                  Créez le compte administrateur pour votre espace MAXIMUS configuré sur mesure.
                </p>
              </div>

              <form onSubmit={handleIdentitySubmit} className="p-8 sm:p-12 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Store className="w-4 h-4 text-slate-400" />
                      Nom de l'entreprise
                    </label>
                    <input
                      required
                      type="text"
                      value={identity.name}
                      onChange={e => setIdentity(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                      placeholder="Acme Corp"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      Nom du dirigeant / administrateur
                    </label>
                    <input
                      required
                      type="text"
                      value={identity.manager}
                      onChange={e => setIdentity(prev => ({ ...prev, manager: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                      placeholder="Jean Dupont"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      Email professionnel
                    </label>
                    <input
                      required
                      type="email"
                      value={identity.email}
                      onChange={e => setIdentity(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                      placeholder="jean@acme.fr"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" />
                      Mot de passe administrateur
                    </label>
                    <input
                      required
                      type="password"
                      value={identity.password}
                      onChange={e => setIdentity(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                      placeholder="••••••••"
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" />
                      Confirmer le mot de passe
                    </label>
                    <input
                      required
                      type="password"
                      value={identity.passwordConfirm}
                      onChange={e => setIdentity(prev => ({ ...prev, passwordConfirm: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                      placeholder="Répétez le mot de passe"
                      minLength={8}
                    />
                    {passwordMismatch && (
                      <p className="text-xs font-semibold text-red-700">Les mots de passe ne correspondent pas.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      Téléphone
                    </label>
                    <input
                      required
                      type="tel"
                      value={identity.phone}
                      onChange={e => setIdentity(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      Pays
                    </label>
                    <select
                      required
                      value={identity.country}
                      onChange={e => setIdentity(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition-colors appearance-none"
                    >
                      <option value="France">France</option>
                      <option value="Belgique">Belgique</option>
                      <option value="Suisse">Suisse</option>
                      <option value="Canada">Canada</option>
                      <option value="Sénégal">Sénégal</option>
                      <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                      <option value="Maroc">Maroc</option>
                    </select>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4 justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('review')}
                    className="text-slate-500 hover:text-slate-900 font-medium text-sm px-4 py-2 transition-colors"
                  >
                    Retour à la proposition
                  </button>
                  <button
                    type="submit"
                    disabled={passwordMismatch || identity.password.length < 8}
                    className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl font-medium text-base hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Créer mon espace MAXIMUS
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 'submitting' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-6" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">Création de l'espace...</h2>
              <p className="text-slate-500">
                Veuillez patienter pendant que MAXIMUS déploie votre environnement configuré.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
