export default function RideCycle() {
  return (
    <div className='deck-bg deck-grid relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] font-body text-[1.5vw] font-semibold tracking-[0.14em] text-muted'>05 / 10</span>
      <main className='relative z-10 flex h-full flex-col px-[8vw] pb-[8vh] pt-[12vh]'>
        <h1 className='max-w-[78vw] font-display text-[3.8vw] font-semibold leading-[1.04] tracking-[-0.04em] text-balance'>Une course, de la demande à la clôture</h1>
        <div className='mt-[6vh] grid flex-1 grid-cols-2 grid-rows-2 gap-[1.4vw]'>
          <section className='flex flex-col border border-white/10 bg-surface/90 p-[2vw]'>
            <div className='mb-[2vh] flex items-center gap-[1.2vw]'><span className='flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-full border border-accent/60 bg-bg font-display text-[1.6vw] font-bold text-accent'>01</span><span className='h-[0.16vh] w-[8vw] bg-accent/45' /></div>
            <p className='font-display text-[2vw] font-medium leading-[1.25] text-pretty'>Demande : départ, destination, passager, téléphone et tarif.</p>
          </section>
          <section className='flex flex-col border border-white/10 bg-surface/90 p-[2vw]'>
            <div className='mb-[2vh] flex items-center gap-[1.2vw]'><span className='flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-full border border-accent/60 bg-bg font-display text-[1.6vw] font-bold text-accent'>02</span><span className='h-[0.16vh] w-[8vw] bg-accent/45' /></div>
            <p className='font-display text-[2vw] font-medium leading-[1.25] text-pretty'>Affectation : un chauffeur actif et un véhicule disponible.</p>
          </section>
          <section className='flex flex-col border border-white/10 bg-surface/90 p-[2vw]'>
            <div className='mb-[2vh] flex items-center gap-[1.2vw]'><span className='flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-full border border-teal/60 bg-bg font-display text-[1.6vw] font-bold text-teal'>03</span><span className='h-[0.16vh] w-[8vw] bg-teal/45' /></div>
            <p className='font-display text-[2vw] font-medium leading-[1.25] text-pretty'>Prise en charge confirmée par un code.</p>
          </section>
          <section className='flex flex-col border border-accent/30 bg-accent/10 p-[2vw]'>
            <div className='mb-[2vh] flex items-center gap-[1.2vw]'><span className='flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-full border border-accent/70 bg-bg font-display text-[1.6vw] font-bold text-accent'>04</span><span className='h-[0.16vh] w-[8vw] bg-accent/55' /></div>
            <p className='font-display text-[2vw] font-medium leading-[1.25] text-pretty'>À la fin, la course est clôturée et les ressources sont libérées; les annulations restent dans l’historique.</p>
          </section>
        </div>
      </main>
    </div>
  );
}