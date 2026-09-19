import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { installationAccessApi, ErpAddress, Installation } from '@/lib/installation-access-api';
import { getInstallationAccessPresentation, type InstallationAccessPresentation } from '@/lib/installation-access-presentation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Copy, ExternalLink, Trash2, CheckCircle2, AlertCircle, Clock, Server, HardDrive, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CompanyInstallationAccessProps {
  companyId: string;
  companyName: string;
  refreshKey?: number;
  onPresentationChange?: (presentation: InstallationAccessPresentation) => void;
}

export function CompanyInstallationAccess({ companyId, companyName, refreshKey, onPresentationChange }: CompanyInstallationAccessProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['installation-access', companyId, refreshKey];

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => installationAccessApi.get(companyId),
  });
  const presentation = data ? getInstallationAccessPresentation(data) : null;

  React.useEffect(() => {
    if (presentation) onPresentationChange?.(presentation);
  }, [presentation?.state, presentation?.installationId, presentation?.endpointUrl, presentation?.mode]);

  const [addDialogInstallationId, setAddDialogInstallationId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');

  const addAddress = useMutation({
    mutationFn: ({ installationId, url }: { installationId: string; url: string }) =>
      installationAccessApi.addAddress(companyId, installationId, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Adresse ajoutée', description: 'La nouvelle adresse a été ajoutée avec succès.' });
      setAddDialogInstallationId(null);
      setNewUrl('');
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message || 'Impossible d\'ajouter l\'adresse.', variant: 'destructive' });
    }
  });

  const verifyAddress = useMutation({
    mutationFn: ({ installationId, addressId }: { installationId: string; addressId: string }) =>
      installationAccessApi.verifyAddress(companyId, installationId, addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Vérification lancée', description: 'L\'état de l\'adresse a été mis à jour.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message || 'Échec de la vérification.', variant: 'destructive' });
    }
  });

  const activateAddress = useMutation({
    mutationFn: ({ installationId, addressId }: { installationId: string; addressId: string }) =>
      installationAccessApi.activateAddress(companyId, installationId, addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Adresse activée', description: 'L\'adresse est maintenant configurée comme principale. Assurez-vous que votre DNS et serveur (TLS) sont correctement paramétrés.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message || 'Impossible d\'activer l\'adresse.', variant: 'destructive' });
    }
  });

  const removeAddress = useMutation({
    mutationFn: ({ installationId, addressId }: { installationId: string; addressId: string }) =>
      installationAccessApi.removeAddress(companyId, installationId, addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Adresse supprimée', description: 'L\'adresse a été supprimée avec succès.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message || 'Impossible de supprimer l\'adresse.', variant: 'destructive' });
    }
  });

  const useAsPrimary = useMutation({
    mutationFn: ({ installationId }: { installationId: string }) =>
      installationAccessApi.useAsPrimary(companyId, installationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Accès principal défini', description: 'Cette installation est maintenant l\'accès principal des employés.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message || 'Impossible de définir l\'installation comme accès principal.', variant: 'destructive' });
    }
  });

  const removePrimary = useMutation({
    mutationFn: () => installationAccessApi.removePrimary(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Accès restauré', description: 'L\'accès central mutualisé a été restauré avec succès.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message || 'Impossible de restaurer l\'accès central mutualisé.', variant: 'destructive' });
    }
  });

  const downloadToken = (bootstrap: any, mode: string) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bootstrap, null, 2));
      const anchor = document.createElement('a');
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", `installation-bootstrap-${mode}.json`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de télécharger le fichier.', variant: 'destructive' });
    }
  };

  const rotateToken = useMutation({
    mutationFn: ({ installationId, mode }: { installationId: string; mode: 'dedicated' | 'on_premise' }) =>
      installationAccessApi.rotateInstallationToken(companyId, installationId, mode),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Jeton régénéré', description: 'Le nouveau jeton de bootstrap a été téléchargé.' });
      downloadToken(res.bootstrap, variables.mode);
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message || 'Impossible de régénérer le jeton.', variant: 'destructive' });
    }
  });

  const revokeInstallation = useMutation({
    mutationFn: ({ installationId }: { installationId: string }) =>
      installationAccessApi.revokeInstallation(companyId, installationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Installation révoquée', description: 'L\'accès de cette installation a été révoqué.' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message || 'Impossible de révoquer l\'installation.', variant: 'destructive' });
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDialogInstallationId || !newUrl.trim()) return;
    let finalUrl = newUrl.trim();
    if (!finalUrl.startsWith('http')) {
      finalUrl = `https://${finalUrl}`;
    }
    addAddress.mutate({ installationId: addDialogInstallationId, url: finalUrl });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copié', description: 'L\'adresse a été copiée dans le presse-papiers.' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de copier l\'adresse.', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: ErpAddress['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'VERIFIED':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Vérifiée</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="text-orange-500 border-orange-500"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case 'ERROR':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Erreur</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border p-8 text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Chargement de l’accès ERP…
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
        <CardContent className="pt-6">
          <p className="text-sm text-red-600 dark:text-red-400">
            Impossible de charger les accès à l'installation: {error instanceof Error ? error.message : 'Erreur inconnue'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.installations || data.installations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Accès ERP et installations</CardTitle>
          <CardDescription>Accès principal : MAXIMUS central mutualisé.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune installation dédiée ou locale n’est en préparation pour {companyName}. Les réglages centralisés
            décrivent le registre, le catalogue et la configuration ; les données métier restent dans l’ERP utilisé.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Accès ERP et installations</h2>
        <p className="text-sm text-muted-foreground">
          Gérez les adresses d'accès sécurisées à l'ERP pour les employés. L'adresse de la boutique publique se configure séparément.
        </p>
      </div>
      
      <Card className={`${presentation?.state === 'primary' ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20' : presentation?.state === 'unavailable' ? 'border-red-300 bg-red-50/60 dark:bg-red-950/20' : 'border-primary/20 bg-primary/5'}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Accès principal des employés</p>
              <p className="mt-1 text-lg font-bold">
                {presentation?.state === 'primary'
                  ? `ERP ${presentation.mode === 'dedicated' ? 'dédié' : 'local'}`
                  : presentation?.state === 'unavailable'
                    ? 'ERP dédié ou local indisponible'
                    : 'MAXIMUS central mutualisé'}
              </p>
              {presentation?.state === 'prepared' && <p className="mt-1 text-sm text-muted-foreground">Une installation est en préparation, mais aucune bascule n’a été effectuée.</p>}
              {presentation?.state === 'unavailable' && <p className="mt-1 text-sm text-red-700 dark:text-red-300">La bascule reste enregistrée, mais aucune adresse ERP validée ne peut être proposée. Aucun lien central de remplacement n’est affiché.</p>}
              {presentation?.state === 'primary' && <p className="mt-1 break-all font-mono text-sm">{presentation.endpointUrl}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
            {presentation?.state === 'primary' && (
              <Button asChild>
                <a href={presentation.endpointUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Ouvrir l’ERP</a>
              </Button>
            )}
            {data.primaryInstallationId !== null && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-background">
                    Restaurer l'accès central
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restaurer l'accès mutualisé central ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Les employés utiliseront de nouveau la plateforme centrale pour se connecter. Vérifiez que la base de données centrale est bien à jour (synchronisée) avant de procéder.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => removePrimary.mutate()}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {removePrimary.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Confirmer la restauration
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            </div>
          </div>
          <div className="mt-5 grid gap-3 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-2">
            <p><strong className="text-foreground">MAXIMUS central</strong><br />Conserve le registre de l’entreprise, le catalogue, les modules, permissions et adresses validées.</p>
            <p><strong className="text-foreground">ERP dédié ou local</strong><br />Conserve les comptes employés et les données métier utilisées au quotidien.</p>
          </div>
        </CardContent>
      </Card>

      {data.installations.map((installation) => {
        const isRevoked = !!installation.revokedAt || installation.status === 'REVOKED';
        const isPrimaryInstallation = data.primaryInstallationId === installation.id;
        const hasActiveAddress = installation.addresses.some(a => a.status === 'ACTIVE');
        const canBePrimary = !isRevoked && hasActiveAddress && !isPrimaryInstallation;
        
        return (
        <Card key={installation.id} className={`overflow-hidden ${isRevoked ? 'opacity-75' : ''} ${isPrimaryInstallation ? 'border-primary shadow-sm ring-1 ring-primary/20' : ''}`}>
          <CardHeader className="bg-muted/50 border-b">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {installation.mode === 'dedicated' ? (
                    <Server className="w-5 h-5 text-blue-500" />
                  ) : (
                    <HardDrive className="w-5 h-5 text-purple-500" />
                  )}
                  Installation {installation.mode === 'dedicated' ? 'Dédiée' : 'Sur Site'}
                </CardTitle>
                <CardDescription className="mt-1">
                  Statut : <span className="font-medium text-foreground">{installation.status}</span>
                  {installation.configurationVersion > 0 && ` • Version : ${installation.configurationVersion}`}
                  {installation.lastSeenAt && ` • Vu le : ${new Date(installation.lastSeenAt).toLocaleString()}`}
                  {installation.lastSyncAt && ` • Sync le : ${new Date(installation.lastSyncAt).toLocaleString()}`}
                  {isRevoked && <Badge variant="destructive" className="ml-2">Révoquée</Badge>}
                  {isPrimaryInstallation && <Badge variant="default" className="ml-2 bg-primary">Accès principal des employés</Badge>}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canBePrimary && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90">
                        Définir comme accès ERP principal
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Bascule de l'accès principal</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir définir cette installation comme accès principal ? 
                          <br/><br/>
                          <strong>Attention :</strong> Les connexions et sessions des employés sur la plateforme centrale seront bloquées. 
                          Vérifiez que les comptes locaux fonctionnent correctement avant de valider. Aucune donnée ne sera supprimée. Les administrateurs MAXIMUS conserveront leur accès global.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => useAsPrimary.mutate({ installationId: installation.id })}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {useAsPrimary.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Confirmer la bascule
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {!isRevoked && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Régénérer jeton
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Régénérer le jeton de bootstrap ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir régénérer le jeton pour cette installation ? <br/><br/>
                          <strong>Attention :</strong> l'ancien jeton ne pourra plus être utilisé pour synchroniser l'installation. Un nouveau fichier sera téléchargé.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => rotateToken.mutate({ installationId: installation.id, mode: installation.mode })}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {rotateToken.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Régénérer et télécharger
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {!isRevoked && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Révoquer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Révoquer cette installation ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir révoquer cette installation ? <br/><br/>
                          <strong>Note :</strong> Cela n'arrêtera pas le service immédiatement, mais l'installation perdra ses droits de synchronisation et d'accès central.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => revokeInstallation.mutate({ installationId: installation.id })}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {revokeInstallation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Révoquer l'installation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {!isRevoked && (
                  <Dialog open={addDialogInstallationId === installation.id} onOpenChange={(open) => { 
                    if (!open) {
                      setAddDialogInstallationId(null);
                      setNewUrl('');
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => {
                        setNewUrl('');
                        setAddDialogInstallationId(installation.id);
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une adresse
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ajouter une adresse ERP</DialogTitle>
                        <DialogDescription>
                          Ajoutez une nouvelle adresse pour accéder à cette installation. 
                          {installation.mode === 'dedicated' && " Un enregistrement DNS vous sera demandé pour valider la propriété du domaine."}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddSubmit}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <label htmlFor="url" className="text-sm font-medium leading-none">URL de l'adresse</label>
                            <Input
                              id="url"
                              placeholder="ex: https://erp.monentreprise.sn"
                              value={newUrl}
                              onChange={(e) => setNewUrl(e.target.value)}
                            />
                            {installation.mode === 'on_premise' && (
                              <p className="text-xs text-muted-foreground">
                                Pour une installation sur site, les URL HTTP locales (ex: http://192.168.1.100) sont autorisées.
                              </p>
                            )}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="ghost" onClick={() => setAddDialogInstallationId(null)}>Annuler</Button>
                          <Button type="submit" disabled={addAddress.isPending || !newUrl.trim()}>
                            {addAddress.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Ajouter
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {installation.addresses.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Aucune adresse configurée pour cette installation.
              </div>
            ) : (
              <div className="divide-y">
                {installation.addresses.map((address) => (
                  <div key={address.id} className="p-6 flex flex-col md:flex-row gap-6 md:items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-base">{address.hostname}</span>
                        {getStatusBadge(address.status)}
                        {address.isPrimary && (
                          <Badge variant="default" className="bg-primary">Principale</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground font-mono break-all">
                        {address.url}
                      </div>

                      {(address.status === 'PENDING' || address.status === 'ERROR') && address.validationMethod === 'public' && address.verificationName && address.verificationValue && (
                        <div className="bg-muted p-4 rounded-md mt-4 space-y-2">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            Configuration DNS requise
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Ajoutez l'enregistrement TXT suivant à votre zone DNS pour valider le domaine :
                          </p>
                          <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 mt-2 text-sm font-mono bg-background p-3 rounded border">
                            <span className="text-muted-foreground">Nom:</span>
                            <span className="break-all">{address.verificationName}</span>
                            <span className="text-muted-foreground">Valeur:</span>
                            <span className="break-all">{address.verificationValue}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            La propagation DNS peut prendre jusqu'à 24 heures.
                          </p>
                        </div>
                      )}

                      {address.status === 'ERROR' && address.lastError && (
                        <p className="text-sm text-red-500 mt-2">Erreur: {address.lastError}</p>
                      )}

                      {(address.status === 'PENDING' || address.status === 'ERROR') && address.validationMethod === 'local' && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Configuration locale (non vérifiée publiquement).
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mt-4 md:mt-0">
                      {(address.status === 'PENDING' || address.status === 'ERROR') && address.validationMethod === 'public' && !isRevoked && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => verifyAddress.mutate({ installationId: installation.id, addressId: address.id })}
                          disabled={verifyAddress.isPending}
                        >
                          {verifyAddress.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Vérifier DNS
                        </Button>
                      )}
                      
                      {((address.status === 'VERIFIED' && address.validationMethod === 'public') || 
                        (address.status === 'PENDING' && address.validationMethod === 'local') ||
                        (address.status === 'ACTIVE')) && !address.isPrimary && !isRevoked && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => activateAddress.mutate({ installationId: installation.id, addressId: address.id })}
                          disabled={activateAddress.isPending}
                        >
                          {activateAddress.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Activer
                        </Button>
                      )}

                      {address.status === 'ACTIVE' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(address.url)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copier
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={address.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ouvrir
                            </a>
                          </Button>
                        </>
                      )}

                      {(!address.isPrimary || isRevoked) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette adresse ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer l'adresse <span className="font-medium">{address.hostname}</span> ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => removeAddress.mutate({ installationId: installation.id, addressId: address.id })}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                {removeAddress.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        );
      })}

      {data.centralLoginUrl && presentation?.state === 'primary' && (
        <details className="rounded-xl border border-dashed bg-muted/30">
          <summary className="cursor-pointer px-6 py-4 text-sm font-semibold">Accès central historique et options secondaires</summary>
        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Lien mutualisé historique</p>
                <p className="text-xs text-muted-foreground mt-1">L'environnement des comptes centraux est séparé de l'accès direct ERP.</p>
                {data.primaryInstallationId !== null && (
                  <p className="text-xs text-destructive mt-1 font-medium">
                    Désactivé pour l'accès employé pendant qu'une installation est principale.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(data.centralLoginUrl)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={data.centralLoginUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ouvrir
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </details>
      )}
    </div>
  );
}
