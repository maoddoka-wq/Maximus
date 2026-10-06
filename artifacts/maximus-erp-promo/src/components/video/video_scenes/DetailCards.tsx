import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { EASE } from './scene-shared';
import './DetailCards.css';

export type DetailCardItem = {
  title: string;
  detail: string;
  icon: LucideIcon;
};

export function DetailCards({
  items,
  className = '',
  delay = 0.45,
  stagger = 0.68,
}: {
  items: DetailCardItem[];
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  return (
    <div className={`detail-cards ${className}`} role="list">
      {items.map(({ title, detail, icon: Icon }, index) => (
        <motion.div
          className="detail-card"
          key={title}
          role="listitem"
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: delay + index * stagger, duration: 0.46, ease: EASE }}
        >
          <span className="detail-card-icon">
            <Icon aria-hidden="true" size="5.8vmin" strokeWidth={1.55} />
          </span>
          <span className="detail-card-copy">
            <strong>{title}</strong>
            <span>{detail}</span>
          </span>
          <span className="detail-card-index" aria-hidden="true">0{index + 1}</span>
        </motion.div>
      ))}
    </div>
  );
}
