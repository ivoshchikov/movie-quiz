/** Deliberately schematic: these shapes explain optics, not a verified film/lens sample. */
export default function OpticsIllustration() {
  return <figure className="hq-optics">
    <div className="hq-optics-pair" role="img" aria-label="Schematic comparison: round out-of-focus lights with spherical optics, and vertically oval lights with some anamorphic optics">
      <div><p>Round blur highlights</p><div className="hq-optics-lights" aria-hidden="true"><span /><span /><span /></div></div>
      <div><p>Oval blur highlights</p><div className="hq-optics-lights hq-optics-ovals" aria-hidden="true"><span /><span /><span /></div></div>
    </div>
    <div className="hq-flare-schematic" role="img" aria-label="Schematic bright light with a horizontal streak flare"><span aria-hidden="true" /></div>
    <figcaption>Schematic illustrations of bokeh and a horizontal streak flare, not film frames or measured lens tests. The appearance depends on the lens, light and focus.</figcaption>
  </figure>;
}
