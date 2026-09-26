export default function Fleet() {
  return (
    <div className='deck-bg deck-grid relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] font-body text-[1.5vw] font-semibold tracking-[0.14em] text-muted'>04 / 10</span>
      <main className='relative z-10 flex h-full flex-col px-[8vw] pb-[8vh] pt-[12vh]'>
        <h1 className='max-w-[78vw] font-display text-[3.8vw] font-semibold leading-[1.04] tracking-[-0.04em] text-balance'>Structurer les équipes et la flotte</h1>
        <div className='mt-[8vh] grid flex-1 grid-cols-3 gap-[1.5vw]'>
          <section className='flex flex-col justify-between border border-white/10 bg-surface/85 p-[2.1vw]'>
            <span className='font-body text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent'>ÉQUIPE</span>
            <p className='font-display text-[2.05vw] font-medium leading-[1.25] text-pretty'>Chauffeurs : employés qualifiés, permis renseigné avant affectation.</p>
            <div className='mt-[2vh] flex items-center gap-[1vw] border-t border-white/10 pt-[1.5vh] text-[1.5vw] font-semibold text-muted'><span className='h-[1.2vh] w-[1.2vh] rounded-full bg-teal' />Qualification</div>
          </section>
          <section className='flex flex-col justify-between border border-white/10 bg-surface/85 p-[2.1vw]'>
            <span className='font-body text-[1.5vw] font-bold uppercase tracking-[0.16em] text-teal'>PARC</span>
            <p className='font-display text-[2.05vw] font-medium leading-[1.25] text-pretty'>Véhicules : immatriculation, modèle, photo et chauffeur rattaché.</p>
            <div className='mt-[2vh] flex items-center gap-[1vw] border-t border-white/10 pt-[1.5vh] text-[1.5vw] font-semibold text-muted'><span className='h-[1.2vh] w-[1.2vh] rounded-full bg-accent' />Données de flotte</div>
          </section>
          <section className='flex flex-col justify-between border border-accent/30 bg-accent/10 p-[2.1vw]'>
            <span className='font-body text-[1.5vw] font-bold uppercase tracking-[0.16em] text-accent'>DISPONIBILITÉ</span>
            <p className='font-display text-[2.05vw] font-medium leading-[1.25] text-pretty'>États suivis : disponible, en course ou en maintenance.</p>
            <div className='mt-[2vh] flex flex-wrap gap-[0.8vw] border-t border-accent/25 pt-[1.5vh] text-[1.5vw] font-semibold text-muted'><span className='border border-white/15 px-[0.8vw] py-[0.5vh]'>Disponible</span><span className='border border-white/15 px-[0.8vw] py-[0.5vh]'>En course</span><span className='border border-white/15 px-[0.8vw] py-[0.5vh]'>Maintenance</span></div>
          </section>
        </div>
      </main>
    </div>
  );
}