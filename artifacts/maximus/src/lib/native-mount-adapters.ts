export type NativeMount = {
  sourceModuleId: string;
  sourceFeatureId: string;
};

export type NativeMountAdapter = NativeMount & {
  id: string;
  label: string;
};

const adapters: readonly NativeMountAdapter[] = [
  {
    id: 'stocks/references',
    label: 'Référentiels Stocks',
    sourceModuleId: 'stocks',
    sourceFeatureId: 'references',
  },
  {
    id: 'stocks/products',
    label: 'Articles Stocks',
    sourceModuleId: 'stocks',
    sourceFeatureId: 'products',
  },
];

export function getNativeMountAdapter(sourceModuleId: string, sourceFeatureId: string) {
  return adapters.find(adapter =>
    adapter.sourceModuleId === sourceModuleId && adapter.sourceFeatureId === sourceFeatureId,
  );
}

export function isNativeMountSupported(sourceModuleId: string, sourceFeatureId: string) {
  return Boolean(getNativeMountAdapter(sourceModuleId, sourceFeatureId));
}

export function getNativeMountAdapters() {
  return [...adapters];
}