const base = import.meta.env.BASE_URL;

export default function VtcCover() {
  return (
    <div className='relative w-screen h-screen overflow-hidden bg-bg text-text'>
      <img src={base + 'vtc-cover.jpg'} crossOrigin='anonymous' className='absolute inset-0 h-full w-full object-cover object-[58%_center]' alt='Berline avec chauffeur dans un quartier urbain de Dakar au coucher du soleil' />
      <div className='absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/75 to-bg/10' />
      <div className='absolute inset-x-0 bottom-0 h-[42vh] bg-gradient-to-t from-bg/90 to-transparent' />
      <div className='absolute left-[7vw] top-[8vh] h-[84vh] w-[0.16vw] bg-accent/90' />
      <div className='relative z-10 flex h-full flex-col justify-between px-[10vw] py-[8vh]'>
        <div className='flex items-center gap-[1.4vw]'>
          <span className='font-display text-[1.8vw] font-bold tracking-[0.18em] text-text'>MAXIMUS</span>
          <span className='h-[0.15vh] w-[4vw] bg-accent' />
          <span className='font-body text-[1.45vw] font-semibold uppercase tracking-[0.18em] text-muted'>Transport &amp; Location</span>
        </div>
        <div className='max-w-[67vw] pb-[1vh]'>
          <h1 className='font-display text-[5.7vw] font-bold leading-[0.98] tracking-[-0.055em] text-balance'>
            <span className='block'>MAXIMUS ·</span>
            <span className='mt-[0.7vh] block text-accent'>Transport &amp; Location</span>
          </h1>
          <p className='mt-[4vh] max-w-[56vw] font-body text-[2.35vw] font-semibold leading-[1.22] text-pretty text-text'>Structurer les courses VTC et capter les demandes de location de véhicules.</p>
          <p className='mt-[3vh] font-body text-[1.75vw] font-semibold uppercase leading-[1.2] tracking-[0.12em] text-muted'>Proposition pour une grande entreprise de VTC.</p>
        </div>
        <div className='flex items-center gap-[1vw] text-[1.45vw] font-semibold uppercase tracking-[0.17em] text-text/75'>
          <span className='h-[0.3vh] w-[2.4vw] bg-accent' />
          <span>Présentation commerciale</span>
        </div>
      </div>
    </div>
  );
}