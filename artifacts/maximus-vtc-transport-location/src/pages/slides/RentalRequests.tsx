const base = import.meta.env.BASE_URL;

export default function RentalRequests() {
  return (
    <div className='deck-bg relative w-screen h-screen overflow-hidden text-text'>
      <div className='absolute left-[7vw] top-[7vh] h-[0.22vh] w-[4vw] bg-accent' />
      <span className='absolute right-[7vw] top-[6.8vh] z-20 font-body text-[1.5vw] font-semibold tracking-[0.14em] text-text'>07 / 10</span>
      <img src={base + 'rental-car.jpg'} crossOrigin='anonymous' className='absolute bottom-[8vh] left-[8vw] top-[14vh] w-[33vw] object-cover' alt='Véhicule de location présenté dans un espace urbain, sans marque' />
      <div className='absolute bottom-[8vh] left-[8vw] top-[14vh] w-[33vw] bg-gradient-to-t from-bg/55 via-transparent to-transparent' />
      <main className='relative z-10 ml-[42vw] flex h-full flex-col justify-center pl-[3vw] pr-[8vw] py-[8vh]'>
        <h1 className='font-display text-[3.35vw] font-semibold leading-[1.03] tracking-[-0.04em] text-balance'>Location : présenter les véhicules et recevoir des demandes</h1>
        <div className='mt-[3vh] space-y-[1.5vh]'>
          <p className='border-b border-white/10 pb-[1vh] font-body text-[2vw] font-medium leading-[1.2] text-pretty'>Fiches avec photos, caractéristiques et tarif journalier.</p>
          <p className='border-b border-white/10 pb-[1vh] font-body text-[2vw] font-medium leading-[1.2] text-pretty'>Le client indique ses dates, son usage et ses coordonnées; départ et destination sont facultatifs.</p>
          <p className='border-b border-white/10 pb-[1vh] font-body text-[2vw] font-medium leading-[1.2] text-pretty'>La demande WhatsApp est préremplie avec le véhicule et les informations fournies.</p>
          <p className='font-body text-[2vw] font-medium leading-[1.2] text-pretty text-muted'>L’entreprise confirme directement la disponibilité et les conditions.</p>
        </div>
      </main>
    </div>
  );
}