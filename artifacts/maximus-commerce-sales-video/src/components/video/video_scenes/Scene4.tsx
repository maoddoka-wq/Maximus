import { motion } from 'framer-motion';

const activity = [
  { label: 'Commandes', side: 'left' },
  { label: 'Ventes récentes', side: 'right' },
  { label: 'Synthèse du jour', side: 'left' },
] as const;

export function Scene4() {
  return (
    <motion.section
      className="absolute inset-0 overflow-hidden bg-[#1B212D] text-[#F3F0E7]"
      initial={{ opacity: 0.98, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.975,
        clipPath: 'circle(8% at 50% 35%)',
      }}
      transition={{ duration: 0.54, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute right-[-19vmin] top-[18%] h-[58vmin] w-[58vmin] rounded-full border-[0.55vmin] border-[#F4B20B]/25"
        initial={{ scale: 0.8, rotate: 34 }}
        animate={{ scale: [0.8, 1, 1.02], rotate: [34, -12, 5] }}
        transition={{ duration: 6.5, times: [0, 0.65, 1], ease: 'easeInOut' }}
      />

      <div className="absolute left-[7vw] right-[7vw] top-[13%]">
        <motion.p
          className="film-kicker m-0 text-[#F4B20B]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.35 }}
        >
          SUIVI DES VENTES
        </motion.p>
        <motion.h2
          className="mt-[2.2vmin] font-display text-[8.7vmin] font-bold leading-[0.94] tracking-[-0.06em]"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        >
          Gardez le fil
          <br />
          de l’activité.
        </motion.h2>
      </div>

      <motion.div
        className="absolute left-[7vw] top-[38%] w-[41vw] rounded-[2.4vmin] border border-white/12 bg-[#121821] px-[3vmin] py-[2.6vmin]"
        initial={{ opacity: 0, x: -42, rotate: -2 }}
        animate={{ opacity: 1, x: 0, rotate: 0 }}
        transition={{ delay: 0.34, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="film-kicker m-0 text-[#BBB5A5]">CANAL</p>
        <p className="film-caption m-0 mt-[1.2vmin] font-semibold">Boutique en ligne</p>
      </motion.div>
      <motion.div
        className="absolute right-[7vw] top-[38%] w-[41vw] rounded-[2.4vmin] border border-white/12 bg-[#121821] px-[3vmin] py-[2.6vmin] text-right"
        initial={{ opacity: 0, x: 42, rotate: 2 }}
        animate={{ opacity: 1, x: 0, rotate: 0 }}
        transition={{ delay: 0.52, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="film-kicker m-0 text-[#BBB5A5]">CANAL</p>
        <p className="film-caption m-0 mt-[1.2vmin] font-semibold">Vente comptoir</p>
      </motion.div>

      <motion.div
        className="absolute left-1/2 top-[49%] h-[7vmin] w-[0.55vmin] -translate-x-1/2 origin-top bg-[#F4B20B]"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.88, duration: 0.38 }}
      />

      <div className="absolute left-[12%] right-[12%] top-[56%]">
        <motion.div
          className="flex flex-col gap-[2.4vmin]"
          initial={{ y: 0, scaleY: 1 }}
          animate={{ y: [0, 0, -10], scaleY: [1, 1, 0.92] }}
          transition={{ delay: 4.75, duration: 1.1, times: [0, 0.45, 1], ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'center center' }}
        >
          {activity.map((item, index) => (
            <motion.div
              key={item.label}
              className="relative flex min-h-[9vmin] items-center rounded-[2.4vmin] border border-white/12 bg-[#121821]/95 px-[4vmin]"
              initial={{ opacity: 0, y: item.side === 'left' ? 30 : -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1.2 + index * 0.95, duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="mr-[3vmin] h-[2.2vmin] w-[2.2vmin] rounded-full bg-[#F4B20B]" />
              <span className="film-copy font-medium">{item.label}</span>
              <motion.span
                className="ml-auto h-[0.55vmin] w-[12vmin] bg-[#F4B20B]/65"
                initial={{ scaleX: 0, transformOrigin: 'left' }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.5 + index * 0.95, duration: 0.42 }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute left-[19%] top-[46%] h-[0.55vmin] w-[62%] origin-center bg-[#F4B20B]/75"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.72, duration: 0.5 }}
      />
      <motion.div
        className="absolute left-1/2 top-[49%] h-[2.4vmin] w-[2.4vmin] -translate-x-1/2 rounded-full bg-[#F4B20B]"
        initial={{ opacity: 0.9, top: '49%', scale: 1 }}
        animate={{
          opacity: [0.9, 1, 1, 0.9, 0.9],
          top: ['49%', '69%', '69%', '35%', '35%'],
          scale: [1, 1, 1, 0.85, 0.85],
        }}
        transition={{ duration: 6.3, times: [0, 0.34, 0.54, 0.85, 1], ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/2 top-[35%] h-[17vmin] w-[17vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.55vmin] border-[#F4B20B]"
        initial={{ scale: 0.45, opacity: 0 }}
        animate={{ scale: [0.45, 1.1, 1.18], opacity: [0, 0.9, 0.75] }}
        transition={{ delay: 5.45, duration: 0.95, times: [0, 0.68, 1], ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.section>
  );
}
