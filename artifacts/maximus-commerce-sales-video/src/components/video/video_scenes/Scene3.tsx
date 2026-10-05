import { motion } from 'framer-motion';

const paymentMethods = ['Espèces', 'Wave', 'Orange Money'];

export function Scene3() {
  return (
    <motion.section
      className="absolute inset-0 overflow-hidden bg-[#121821] text-[#F3F0E7]"
      initial={{ opacity: 0.98, scale: 1.015 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        y: -32,
        clipPath: 'inset(0 0 46% 0)',
      }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute left-[-18vmin] top-[34%] h-[57vmin] w-[57vmin] rounded-full border-[0.7vmin] border-[#F4B20B]/35"
        initial={{ scale: 0.72, rotate: 24 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
      />

      <div className="absolute left-[7vw] right-[7vw] top-[13%]">
        <motion.p
          className="film-kicker m-0 text-[#F4B20B]"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.38 }}
        >
          CAISSE COMPTOIR
        </motion.p>
        <motion.h2
          className="mt-[2.2vmin] font-display text-[9.1vmin] font-bold leading-[0.92] tracking-[-0.06em]"
          initial={{ opacity: 0, x: -26 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.22, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        >
          Vendez
          <br />
          au comptoir.
        </motion.h2>
        <motion.p
          className="film-copy mt-[2.5vmin] max-w-[82vw] text-[#BBB5A5]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.62, duration: 0.42 }}
        >
          Enregistrez vos ventes et choisissez le moyen d’encaissement.
        </motion.p>
      </div>

      <motion.div
        className="absolute left-[13%] top-[43%] h-[42%] w-[74%] overflow-hidden rounded-[4vmin] bg-[#F3F0E7] text-[#121821] shadow-[0_2.2vmin_7vmin_rgba(0,0,0,.3)]"
        initial={{ scaleY: 0.72, y: 56, transformOrigin: 'top' }}
        animate={{ scaleY: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="px-[5vmin] pt-[4vmin]">
          <p className="film-kicker m-0 text-[#947018]">MOYEN D’ENCAISSEMENT</p>
          <div className="mt-[2.2vmin] h-[0.35vmin] w-full bg-[#d7d2c5]" />
        </div>
        <div className="flex flex-col gap-[1.7vmin] px-[4vmin] pt-[2vmin]">
          {paymentMethods.map((method, index) => (
            <motion.div
              key={method}
              className="flex min-h-[8.5vmin] items-center gap-[3vmin] rounded-[2.4vmin] border border-[#d7d2c5] bg-white/80 px-[3vmin]"
              initial={{ opacity: 0, x: 36, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 2.75 + index * 0.72, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.span
                className="flex h-[5.4vmin] w-[5.4vmin] shrink-0 items-center justify-center rounded-full bg-[#F4B20B]"
                initial={{ scale: 0.55 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2.92 + index * 0.72, duration: 0.34, type: 'spring', stiffness: 420, damping: 28 }}
              >
                <span className="h-[1.3vmin] w-[1.3vmin] rounded-full bg-[#121821]" />
              </motion.span>
              <span className="film-copy font-semibold">{method}</span>
              <span className="ml-auto h-[0.5vmin] w-[7vmin] bg-[#28303E]/25" />
            </motion.div>
          ))}
        </div>
        <motion.div
          className="absolute bottom-[4vmin] left-[7vmin] right-[7vmin] h-[0.5vmin] origin-left bg-[#F4B20B]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 5.15, duration: 0.58, ease: 'easeOut' }}
        />
      </motion.div>
      <motion.div
        className="absolute left-[13%] top-[43%] h-[0.55vmin] w-[74%] origin-left bg-[#F4B20B]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' }}
      />
      <motion.div
        className="pointer-events-none absolute left-[17%] top-[50%] z-10 h-[0.55vmin] w-[66%] origin-left bg-[#F4B20B]"
        initial={{ opacity: 0, y: 0, scaleX: 0.3 }}
        animate={{ opacity: [0, 0.85, 0], y: [0, 100, 132], scaleX: [0.3, 1, 1] }}
        transition={{ delay: 1.55, duration: 1.1, times: [0, 0.18, 1], ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/2 top-[50%] h-[5vmin] w-[5vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.6vmin] border-[#F4B20B]"
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.16, 1], opacity: [0, 1, 0.9] }}
        transition={{ delay: 5.58, duration: 0.72, times: [0, 0.64, 1], ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.section>
  );
}
