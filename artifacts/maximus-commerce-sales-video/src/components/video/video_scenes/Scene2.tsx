import { motion } from 'framer-motion';

const logoImage = `${import.meta.env.BASE_URL}images/maximus-mark.svg`;

const products = [
  { tone: '#d9c19a', shape: 'rounded-[45%_45%_38%_38%]' },
  { tone: '#9da8a0', shape: 'rounded-[28%]' },
  { tone: '#c59d83', shape: 'rounded-full' },
];

export function Scene2() {
  return (
    <motion.section
      className="absolute inset-0 overflow-hidden bg-[#F3F0E7] text-[#121821]"
      initial={{ opacity: 0.98, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        x: -34,
        clipPath: 'inset(0 0 0 48%)',
      }}
      transition={{ duration: 0.52, ease: 'easeInOut' }}
    >
      <motion.div
        className="pointer-events-none absolute z-20 rounded-[7vmin] border-[0.55vmin] border-[#F4B20B]"
        initial={{
          left: '48%',
          top: '36%',
          x: '-50%',
          y: '-50%',
          width: '19vmin',
          height: '19vmin',
          borderRadius: '50%',
          opacity: 0.85,
        }}
        animate={{
          left: '16%',
          top: '39%',
          x: '0%',
          y: '0%',
          width: '68%',
          height: '43%',
          borderRadius: '7vmin',
          opacity: 0.3,
        }}
        transition={{ duration: 0.94, ease: [0.16, 1, 0.3, 1] }}
      />

      <div className="absolute left-[7vw] right-[7vw] top-[13%]">
        <motion.p
          className="film-kicker m-0 text-[#947018]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          UNE BOUTIQUE PUBLIQUE
        </motion.p>
        <motion.h2
          className="mt-[2.4vmin] max-w-[86vw] font-display text-[8.7vmin] font-bold leading-[0.93] tracking-[-0.06em]"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
        >
          Même sans
          <br />
          site web.
        </motion.h2>
      </div>
      <motion.p
        className="film-caption absolute left-[7vw] right-[7vw] top-[31%] m-0 text-[#696457]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.1, duration: 0.44 }}
      >
        Vos produits, présentés à vos clients.
      </motion.p>

      <motion.div
        className="absolute left-[16%] top-[39%] h-[43%] w-[68%] rounded-[7vmin] border-[0.8vmin] border-[#28303E] bg-[#121821] p-[1.6vmin] shadow-[0_2.5vmin_8vmin_rgba(18,24,33,.24)]"
        initial={{ y: 34, rotateY: 9, scale: 0.96 }}
        animate={{ y: [34, 0, 0, -8], rotateY: [9, 0, 0, -2], scale: [0.96, 1, 1, 1.035] }}
        transition={{ delay: 0.1, duration: 6.1, times: [0, 0.13, 0.82, 1], ease: 'easeOut' }}
        style={{ perspective: 1100 }}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[5.2vmin] bg-[#F3F0E7]">
          <div className="flex items-center justify-between px-[5vmin] pb-[2.2vmin] pt-[4vmin]">
            <div className="flex items-center gap-[2vmin]">
              <img src={logoImage} alt="" className="h-[7vmin] w-[7vmin] rounded-[1.2vmin]" />
              <div>
                <p className="m-0 font-display text-[2.7vmin] font-bold tracking-[-0.03em]">MAXIMUS</p>
                <p className="film-kicker m-0 mt-[0.5vmin] text-[1.55vmin] text-[#696457]">BOUTIQUE EN LIGNE</p>
              </div>
            </div>
            <div className="h-[1.3vmin] w-[8vmin] rounded-full bg-[#F4B20B]" />
          </div>

          <div className="mx-[5vmin] border-t border-[#d7d2c5] pt-[2.2vmin]">
            <p className="film-kicker m-0 text-[#696457]">CATALOGUE</p>
            <div className="mt-[2vmin] grid grid-cols-3 gap-[2vmin]">
              {products.map((product, index) => (
                <motion.div
                  key={product.tone}
                  className="overflow-hidden rounded-[2.4vmin] border border-[#d7d2c5] bg-white/80 p-[1.4vmin]"
                  initial={{ opacity: 0, y: 24, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.48 + index * 0.16, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex h-[18vmin] items-center justify-center rounded-[1.8vmin] bg-[#e7e1d4]">
                    <span className={`${product.shape} block h-[12vmin] w-[10vmin]`} style={{ backgroundColor: product.tone }} />
                  </div>
                  <div className="mt-[1.7vmin] h-[1.4vmin] w-[65%] rounded-full bg-[#28303E]/75" />
                  <div className="mt-[1.1vmin] h-[1vmin] w-[42%] rounded-full bg-[#bbb5a5]" />
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            className="mt-auto flex items-center justify-between border-t border-[#d7d2c5] px-[5vmin] py-[2.5vmin]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.38 }}
          >
            <p className="film-caption m-0 font-semibold">Boutique publique</p>
            <span className="h-[2vmin] w-[2vmin] rounded-full bg-[#F4B20B]" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="absolute left-[16%] top-[43%] h-[0.55vmin] w-[68%] origin-left bg-[#F4B20B]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 5.82, duration: 0.58, ease: 'easeOut' }}
      />
      <motion.div
        className="pointer-events-none absolute left-[21%] top-[55%] h-[18vmin] w-[58%] rounded-[2vmin] border-[0.5vmin] border-[#F4B20B]"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.98, 1.01, 1.04] }}
        transition={{ delay: 3.45, duration: 1.25, times: [0, 0.28, 1], ease: 'easeInOut' }}
      />
    </motion.section>
  );
}
