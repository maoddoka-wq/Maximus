export type SubscriptionCountdown = {
  remainingSeconds: number;
  expired: boolean;
  label: string;
};

export function getSubscriptionCountdown(
  periodEndsAt: string | null,
  nowMs = Date.now(),
): SubscriptionCountdown {
  if (!periodEndsAt) {
    return { remainingSeconds: 0, expired: true, label: 'Aucune échéance active' };
  }

  const endMs = Date.parse(periodEndsAt);
  if (!Number.isFinite(endMs)) {
    return { remainingSeconds: 0, expired: true, label: 'Échéance indisponible' };
  }

  const remainingSeconds = Math.max(0, Math.ceil((endMs - nowMs) / 1000));
  if (remainingSeconds === 0) {
    return { remainingSeconds, expired: true, label: 'Expiré' };
  }

  const days = Math.floor(remainingSeconds / 86_400);
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const seconds = remainingSeconds % 60;

  return {
    remainingSeconds,
    expired: false,
    label: `${days} j ${String(hours).padStart(2, '0')} h ${String(minutes).padStart(2, '0')} min ${String(seconds).padStart(2, '0')} s`,
  };
}