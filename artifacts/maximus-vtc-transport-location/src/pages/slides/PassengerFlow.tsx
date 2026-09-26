export default function PassengerFlow() {
  return (
    <div className='deck-bg deck-grid relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] font-body text-[1.5vw] font-semibold tracking-[0.14em] text-muted'>06 / 10</span>
      <main className='relative z-10 flex h-full flex-col px-[8vw] pb-[7vh] pt-[12vh]'>
        <h1 className='max-w-[80vw] font-display text-[3.65vw] font-semibold leading-[1.04] tracking-[-0.04em] text-balance'>Un parcours public conçu pour le passager</h1>
        <div className='mt-[4vh] flex flex-1 flex-col justify-center'>
          <div className='grid grid-cols-[0.12fr_1fr] items-stretch gap-[1.7vw]'>
            <div className='relative flex flex-col items-center justify-between py-[1.2vh]'>
              <span className='absolute bottom-[2vh] top-[2vh] w-[0.12vw] bg-accent/35' />
              <span className='relative h-[1.5vw] w-[1.5vw] rounded-full border-[0.22vw] border-accent bg-bg' />
              <span className='relative h-[1.5vw] w-[1.5vw] rounded-full border-[0.22vw] border-teal bg-bg' />
              <span className='relative h-[1.5vw] w-[1.5vw] rounded-full border-[0.22vw] border-accent bg-bg' />
              <span className='relative h-[1.5vw] w-[1.5vw] rounded-full border-[0.22vw] border-teal bg-bg' />
              <span className='relative h-[1.5vw] w-[1.5vw] rounded-full border-[0.22vw] border-accent bg-bg' />
            </div>
            <div className='grid gap-[0.5vh]'>
              <p className='border-b border-white/10 py-[0.65vh] font-body text-[2vw] font-medium leading-[1.2] text-pretty'>Le client partage sa position GPS et choisit sa destination.</p>
              <p className='border-b border-white/10 py-[0.65vh] font-body text-[2vw] font-medium leading-[1.2] text-pretty'>Un devis est présenté avant l’envoi de la demande.</p>
              <p className='border-b border-white/10 py-[0.65vh] font-body text-[2vw] font-medium leading-[1.2] text-pretty'>Après affectation, il consulte l’état de sa course et les informations du chauffeur et du véhicule.</p>
              <p className='border-b border-white/10 py-[0.65vh] font-body text-[2vw] font-medium leading-[1.2] text-pretty'>Il peut appeler, contacter le chauffeur sur WhatsApp ou annuler une demande encore active.</p>
              <p className='py-[0.65vh] font-body text-[2vw] font-medium leading-[1.2] text-pretty'>L’affectation exige un chauffeur disponible, un véhicule disponible et une position GPS récente.</p>
            </div>
          </div>
        </div>
        <p className='mt-[1.5vh] border-t border-accent/30 pt-[1.2vh] font-body text-[1.5vw] font-semibold uppercase tracking-[0.15em] text-accent'>Demande · devis · affectation · suivi</p>
      </main>
    </div>
  );
}