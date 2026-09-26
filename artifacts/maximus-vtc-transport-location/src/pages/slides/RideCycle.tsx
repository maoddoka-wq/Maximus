export default function RideCycle() {
  return (
    <div className='deck-bg deck-grid relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] font-body text-[1.45vw] font-semibold tracking-[0.14em] text-muted'>05 / 10</span>
      <main className='relative z-10 flex h-full flex-col px-[8vw] pb-[8vh] pt-[12vh]'>
        <h1 className='max-w-[78vw] font-display text-[3.8vw] font-semibold leading-[1.04] tracking-[-0.04em] text-balance'>Une course, de la demande à la clôture</h1>
        <div className='relative mt-[9vh] grid flex-1 grid-cols-4 gap-[1.3vw]'>
          <div className='absolute left-[4vw] right-[4vw] top-[5.5vh] h-[0.16vh] bg-accent/35' />
          <section className='relative flex flex-col border border-white/10 bg-surface/90 p-[1.8vw] pt-[3.4vh]'>
            <span className='absolute left-[1.8vw] top-[3.8vh] flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-full border border-accent/60 bg-bg font-display text-[1.6vw] font-bold text-accent'>01</span>
            <p className='mt-[9vh] font-display text-[1.9vw] font-medium leading-[1.28] text-pretty'>Demande : départ, destination, passager, téléphone et tarif.</p>
          </section>
          <section className='relative flex flex-col border border-white/10 bg-surface/90 p-[1.8vw] pt-[3.4vh]'>
            <span className='absolute left-[1.8vw] top-[3.8vh] flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-full border border-accent/60 bg-bg font-display text-[1.6vw] font-bold text-accent'>02</span>
            <p className='mt-[9vh] font-display text-[1.9vw] font-medium leading-[1.28] text-pretty'>Affectation : un chauffeur actif et un véhicule disponible.</p>
          </section>
          <section className='relative flex flex-col border border-white/10 bg-surface/90 p-[1.8vw] pt-[3.4vh]'>
            <span className='absolute left-[1.8vw] top-[3.8vh] flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-full border border-teal/60 bg-bg font-display text-[1.6vw] font-bold text-teal'>03</span>
            <p className='mt-[9vh] font-display text-[1.9vw] font-medium leading-[1.28] text-pretty'>Prise en charge confirmée par un code.</p>
          </section>
          <section className='relative flex flex-col border border-accent/30 bg-accent/10 p-[1.8vw] pt-[3.4vh]'>
            <span className='absolute left-[1.8vw] top-[3.8vh] flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-full border border-accent/70 bg-bg font-display text-[1.6vw] font-bold text-accent'>04</span>
            <p className='mt-[9vh] font-display text-[1.9vw] font-medium leading-[1.28] text-pretty'>À la fin, la course est clôturée et les ressources sont libérées; les annulations restent dans l’historique.</p>
          </section>
        </div>
      </main>
    </div>
  );
}