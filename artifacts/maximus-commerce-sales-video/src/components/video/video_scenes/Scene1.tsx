import { motion } from 'framer-motion';

const heroImage = `${import.meta.env.BASE_URL}images/merchant-hero.png`;
const logoImage = `${import.meta.env.BASE_URL}images/maximus-mark.svg`;

export function Scene1() {
  return (
    <motion.section
      className="absolute inset-0 overflow-hidden bg-[#121821] text-[#F3F0E7]"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.025,
        clipPath: 'circle(8% at 48% 36%)',
      }}
      transition={{ duration: 0.55, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute inset-x-0 top-0 h-[62%] overflow-hidden"
        initial={{ scale: 1.045, y: 0 }}
        animate={{ scale: 1, y: -6 }}
        transition={{ duration: 5.5, ease: 'easeOut' }}
      >
        <img
          src={heroImage}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: '72% center' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,24,33,0)_48%,rgba(18,24,33,.42)_76%,#121821_100%)]" />
      </motion.div>

      <motion.div
        className="absolute left-[38%] top-[32%] h-[19vmin] w-[19vmin] rounded-full border-[0.55vmin] border-[#F4B20B]"
        initial={{ scale: 0.75, opacity: 0.4 }}
        animate={{ scale: [0.75, 1.12, 1, 1.08, 1, 1.14], opacity: [0.4, 1, 0.88, 0.98, 0.88, 1] }}
        transition={{ duration: 5.4, times: [0, 0.17, 0.22, 0.42, 0.5, 1], ease: 'easeInOut' }}
      >
        <motion.span
          className="absolute -right-[1.2vmin] top-1/2 h-[0.5vmin] -translate-y-1/2 bg-[#F4B20B]"
          initial={{ width: '5vmin' }}
          animate={{ width: ['5vmin', '9vmin', '5vmin', '16vmin', '5vmin'] }}
          transition={{ duration: 5.4, times: [0, 0.22, 0.5, 0.8, 1], ease: 'easeInOut' }}
        />
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 h-[47%] bg-[#121821]" />
      <motion.div
        className="absolute left-[7vw] top-[61%] flex items-center gap-[2.5vw]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 4.1, duration: 0.4 }}
      >
        <img src={logoImage} alt="" className="h-[8vmin] w-[8vmin] rounded-[1.5vmin]" />
        <p className="film-kicker m-0 text-[#F4B20B]">MAXIMUS · PRÉSENTATION COMMERCIALE</p>
      </motion.div>

      <div className="absolute left-[7vw] right-[7vw] top-[69%]">
        <motion.h1
          className="m-0 font-display text-[8.8vmin] font-bold leading-[0.94] tracking-[-0.055em]"
          initial={false}
        >
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            VOUS VENDEZ.
          </motion.span>
          <motion.span
            className="mt-[1.2vmin] block text-[#F4B20B]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            SANS SITE WEB ?
          </motion.span>
        </motion.h1>
      </div>
    </motion.section>
  );
}
