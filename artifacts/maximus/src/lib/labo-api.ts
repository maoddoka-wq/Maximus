import { requestJson } from './api-request';
import type { LaboFeatureBootstrap, LaboRecord } from './labo-composer';

const request = <T>(path: string, init?: RequestInit) =>
  requestJson<T>(path, init, {
    fallbackMessage: 'Les fonctionnalités LABO sont momentanément indisponibles.',
  });

const featurePath = (moduleId: string, featureId: string) =>
  `/api/labo/modules/${encodeURIComponent(moduleId)}/features/${encodeURIComponent(featureId)}`;

export const laboApi = {
  bootstrap(moduleId: string, featureId: string) {
    return request<LaboFeatureBootstrap>(`${featurePath(moduleId, featureId)}/bootstrap`);
  },

  createRecord(moduleId: string, featureId: string, data: LaboRecord['data']) {
    return request<{ record: LaboRecord }>(`${featurePath(moduleId, featureId)}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
  },

  updateRecord(
    moduleId: string,
    featureId: string,
    recordId: string,
    data: LaboRecord['data'],
    version: number,
  ) {
    return request<{ record: LaboRecord }>(
      `${featurePath(moduleId, featureId)}/records/${encodeURIComponent(recordId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, version }),
      },
    );
  },

  deleteRecord(moduleId: string, featureId: string, recordId: string, version: number) {
    return request<{ ok: true }>(
      `${featurePath(moduleId, featureId)}/records/${encodeURIComponent(recordId)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      },
    );
  },

  transitionRecord(
    moduleId: string,
    featureId: string,
    recordId: string,
    targetStageId: string,
    version: number,
  ) {
    return request<{ record: LaboRecord }>(
      `${featurePath(moduleId, featureId)}/records/${encodeURIComponent(recordId)}/transition`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStageId, version }),
      },
    );
  },
};