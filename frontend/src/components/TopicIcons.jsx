// Line icons for the three conference topics (24 x 24, stroke = currentColor, same look as the lucide icons used elsewhere).

const base = (size, props) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...props,
})

/** Data governance / AI: a head in profile with circuit traces ending in nodes. */
export function AiHeadIcon({ size = 24, ...props }) {
  return (
    <svg {...base(size, props)}>
      <path d="M9.6 21v-3.1C7.2 16.6 5.7 14.4 5.7 11.7 5.7 7.4 8.9 3.9 13 3.9c3.4 0 6 2.2 6.5 5.4" />
      <path d="M5.7 11.6 4.2 14.1c-.2.4 0 .8.5.8h1.2" />
      <path d="M9 7.6h2.6l1.4-1.4h2.4" />
      <circle cx="17.2" cy="6.2" r="1.15" />
      <path d="M9 11h6" />
      <circle cx="17.2" cy="11" r="1.15" />
      <path d="M9 14.2h2.6l1.4 1.4h2.4" />
      <circle cx="17.2" cy="15.6" r="1.15" />
      <path d="M15.2 21v-2.1" />
    </svg>
  )
}

/** Geospatial: a globe inside a map pin, with an orbit and a ground shadow. */
export function GeoPinIcon({ size = 24, ...props }) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 19.2c-2.2-2-6.2-5.6-6.2-9.6a6.2 6.2 0 0 1 12.4 0c0 4-4 7.6-6.2 9.6z" />
      <circle cx="12" cy="9.7" r="3.1" />
      <path d="M8.9 9.7h6.2M12 6.6c-1.5 1.7-1.5 4.5 0 6.2M12 6.6c1.5 1.7 1.5 4.5 0 6.2" />
      <path d="M4.6 14.4c-1.4.6-2.2 1.3-2.2 2 0 1.5 4.4 2.7 9.6 2.7s9.6-1.2 9.6-2.7c0-.7-.8-1.4-2.2-2" />
    </svg>
  )
}

/** Microbiome: a petri dish with rod, bean and branched bacteria. */
export function PetriIcon({ size = 24, ...props }) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="9.2" />
      <rect x="6.6" y="7.7" width="5.2" height="2.3" rx="1.15" transform="rotate(-28 9.2 8.85)" />
      <path d="M14.4 7.2h2.1a1.2 1.2 0 0 1 0 2.4h-2.1a1.2 1.2 0 0 1 0-2.4z" />
      <path d="M7.4 13.4l2.2 1.6M9.6 15v2.3M9.6 15l2.5-1.5" />
      <circle cx="16.1" cy="12.6" r="1" />
      <path d="M12.6 17.4c1.9.4 3.6-.2 4.6-1.5" />
    </svg>
  )
}
