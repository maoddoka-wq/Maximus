import { motion } from 'framer-motion';

const logoImage = `${import.meta.env.BASE_URL}images/maximus-mark.svg`;

export function Scene5() {
  return (
    <motion.section
      className="absolute inset-0 overflow-hidden bg-[#F3F0E7] text-[#121821]"
      initial={{ opacity: 0.98, scale: 1.012 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 1,
        scale: 1,
        clipPath: 'circle(16vmin at 48% 36%)',
      }}
      transition={{ duration: 0.62, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute left-1/2 top-[45%] h-[24vmin] w-[24vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.65vmin] border-[#F4B20B]"
        initial={{ scale: 0.72, opacity: 0.92 }}
        animate={{ scale: [0.72, 1.15, 1.35], opacity: [0.92, 0.8, 0.25] }}
        transition={{ duration: 2.8, times: [0, 0.6, 1], ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute left-[7vw] right-[7vw] top-[14%] rounded-[3vmin] border border-[#d7d2c5] bg-white/70 p-[5vmin]"
        initial={{ y: 36, rotateX: 8, opacity: 0.95 }}
        animate={{ y: 0, rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="film-kicker m-0 text-[#947018]">RAPPORTS D’ACTIVITÉ</p>
        <div className="mt-[3.4vmin] grid grid-cols-2 gap-[2.5vmin]">
          {['PÉRIODE', 'SOURCE'].map((filter, index) => (
            <motion.div
              key={filter}
              className="rounded-[2vmin] border border-[#d7d2c5] bg-[#F3F0E7] p-[2.7vmin]"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + index * 0.24, duration: 0.36 }}
            >
              <p className="film-kicker m-0 text-[#696457]">{filter}</p>
              <motion.div
                className="mt-[2vmin] h-[0.55vmin] w-[76%] origin-left bg-[#F4B20B]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.53 + index * 0.24, duration: 0.42 }}
              />
            </motion.div>
          ))}
        </div>
        <motion.div
          className="mt-[3vmin] flex items-center justify-between border-t border-[#d7d2c5] pt-[3vmin]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.36 }}
        >
          <p className="film-copy m-0 font-semibold">Totaux par devise</p>
          <motion.span
            className="h-[2.2vmin] w-[2.2vmin] rounded-full bg-[#F4B20B]"
            initial={{ scale: 0.3 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.04, duration: 0.32, type: 'spring', stiffness: 400, damping: 28 }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#121821] px-[8vw] text-center text-[#F3F0E7]"
        initial={{ clipPath: 'inset(100% 0 0 0)' }}
        animate={{ clipPath: 'inset(0% 0 0 0)' }}
        transition={{ delay: 3.15, duration: 0.62, ease: [0.7, 0, 0.2, 1] }}
      >
        <motion.img
          src={logoImage}
          alt="Emblème MAXIMUS"
          className="h-[25vmin] w-[25vmin] rounded-[5vmin]"
          initial={{ opacity: 0, scale: 0.76, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 3.48, duration: 0.66, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.p
          className="film-kicker mt-[5vmin] text-[#F4B20B]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.95, duration: 0.42 }}
        >
          BOUTIQUE · COMPTOIR · RAPPORTS
        </motion.p>
        <motion.h2
          className="mt-[2.6vmin] font-display text-[10vmin] font-bold leading-none tracking-[-0.06em]"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 4.16, duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
        >
          MAXIMUS
        </motion.h2>
        <motion.p
          className="film-copy mt-[2.8vmin] max-w-[82vw] text-[#BBB5A5]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.62, duration: 0.36 }}
        >
          Le centre de pilotage de vos ventes
        </motion.p>
        <motion.p
          className="film-caption mt-[5vmin] max-w-[80vw] text-[#F3F0E7]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5.28, duration: 0.42 }}
        >
          Demandez une démonstration adaptée à votre commerce.
        </motion.p>

        <motion.div
          className="absolute left-[38%] top-[32%] h-[19vmin] w-[19vmin] rounded-full border-[0.55vmin] border-[#F4B20B]"
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 1, 1], scale: [0.2, 1.08, 1] }}
          transition={{ delay: 7.12, duration: 0.74, times: [0, 0.7, 1], ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.div>
    </motion.section>
  );
}
