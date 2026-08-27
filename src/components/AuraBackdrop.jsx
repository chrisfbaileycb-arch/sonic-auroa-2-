import { usePlayer } from '../hooks/usePlayer'

/**
 * Slow-moving liquid "gel" atmosphere that sits behind the whole app.
 * Breathes gently when idle and comes alive while a session is playing.
 */
export default function AuraBackdrop() {
  const { isPlaying } = usePlayer()

  const blobs = [
    {
      anim: 'gelA',
      idle: '38s',
      live: '20s',
      style: {
        top: '2%',
        left: '-12%',
        width: '78vmax',
        height: '78vmax',
        background:
          'radial-gradient(circle at 38% 34%, rgba(90,200,190,0.55) 0%, rgba(38,110,140,0.28) 45%, rgba(8,14,22,0) 72%)',
      },
    },
    {
      anim: 'gelB',
      idle: '46s',
      live: '26s',
      style: {
        top: '-14%',
        right: '-18%',
        width: '68vmax',
        height: '68vmax',
        background:
          'radial-gradient(circle at 55% 45%, rgba(212,175,120,0.42) 0%, rgba(150,96,180,0.24) 48%, rgba(8,14,22,0) 74%)',
      },
    },
    {
      anim: 'gelC',
      idle: '54s',
      live: '30s',
      style: {
        bottom: '-22%',
        left: '18%',
        width: '82vmax',
        height: '82vmax',
        background:
          'radial-gradient(circle at 48% 52%, rgba(80,120,220,0.38) 0%, rgba(90,200,190,0.2) 50%, rgba(8,14,22,0) 76%)',
      },
    },
  ]

  return (
    <>
      <div className="gel-layer" aria-hidden="true">
        {blobs.map((b) => (
          <div
            key={b.anim}
            className="gel-blob"
            style={{
              ...b.style,
              opacity: isPlaying ? 0.95 : 0.62,
              transition: 'opacity 2.5s ease',
              animation: `${b.anim} ${isPlaying ? b.live : b.idle} ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      <div className="gel-sheen" aria-hidden="true" style={{ opacity: isPlaying ? 0.26 : 0.14 }} />
      <div className="gel-veil" aria-hidden="true" />
    </>
  )
}
