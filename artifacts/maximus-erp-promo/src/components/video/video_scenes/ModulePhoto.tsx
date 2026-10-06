import { motion } from 'framer-motion';
import { EASE } from './scene-shared';
import './ModulePhoto.css';

type ModulePhotoProps = {
  src: string;
  alt: string;
};

export function ModulePhoto({ src, alt }: ModulePhotoProps) {
  const imageSrc = `${import.meta.env.BASE_URL}${src}`;

  return (
    <motion.figure
      className="module-photo"
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.18, duration: 0.64, ease: EASE }}
    >
      <motion.img
        src={imageSrc}
        alt={alt}
        initial={{ scale: 1.02, x: '0%' }}
        animate={{ scale: 1.09, x: '-1.2%' }}
        transition={{ delay: 0.82, duration: 5.8, ease: 'linear' }}
      />
      <figcaption>ILLUSTRATION PHOTORÉALISTE</figcaption>
    </motion.figure>
  );
}
