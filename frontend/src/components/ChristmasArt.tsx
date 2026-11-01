// Original vector decorations: no remote images, film stills or asset requests.
function TreeShape() {
  return <g>
    <path d="M46 104h9v22h-9z" fill="#815841" />
    <path d="m50 14 27 37H65l24 35H75l22 32H3l22-32H11l24-35H23Z" fill="#2e6650" />
    <path d="m50 14 27 37H65l24 35H75l22 32H50Z" fill="#245140" />
    <path d="M34 46q13 12 35 14M23 79q22 13 59 15" fill="none" stroke="#d4b66b" strokeWidth="2" />
    <path d="m50 2 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" fill="#f1d391" />
    <circle cx="42" cy="44" r="4" fill="#dc6d68" /><circle cx="64" cy="76" r="4" fill="#f1d391" />
    <circle cx="33" cy="94" r="4" fill="#dc6d68" /><circle cx="75" cy="108" r="3" fill="#ead9a8" />
    <path d="M8 118h84" stroke="#b9cfca" strokeWidth="3" strokeLinecap="round" />
  </g>;
}
export function WinterTree({ className = "" }: { className?: string }) {
  return <svg className={`hq-winter-art ${className}`} viewBox="0 0 100 130" aria-hidden="true" focusable="false"><TreeShape /></svg>;
}
function SantaShape() {
  return <g>
    <path d="m26 80-2 14h18l2-14m12 0 2 14h18l-2-14" fill="#263335" />
    <path d="M28 42Q12 47 12 71l13 2v12h50V73l13-2Q86 47 72 42Z" fill="#b84348" stroke="#e17e79" strokeWidth="1.5" />
    <path d="M25 72h50M50 56v27" stroke="#f0eadc" strokeWidth="6" />
    <path d="M25 70h50" stroke="#293537" strokeWidth="7" /><path d="M45 66h10v8H45z" fill="none" stroke="#e7c675" strokeWidth="2" />
    <circle cx="17" cy="71" r="7" fill="#f0eadc" /><circle cx="83" cy="71" r="7" fill="#f0eadc" />
    <circle cx="50" cy="31" r="19" fill="#eac2a1" />
    <path d="M30 30q-1 32 20 35 22-4 21-35-6 9-12 7-9-5-17 0-6 2-12-7" fill="#f0eadc" />
    <path d="M30 20Q45-10 72 14l5 12-15-7-13 3Z" fill="#b84348" stroke="#e17e79" strokeWidth="1.5" />
    <path d="M30 24q20-8 40 0" fill="none" stroke="#f0eadc" strokeWidth="8" strokeLinecap="round" /><circle cx="78" cy="25" r="6" fill="#f0eadc" />
    <circle cx="43" cy="31" r="1.5" fill="#263335" /><circle cx="57" cy="31" r="1.5" fill="#263335" /><circle cx="50" cy="37" r="4" fill="#e7ac91" />
    <path d="m42 41 8-3 8 3-8 3Z" fill="#fff7e7" /><path d="M46 49q4 3 8 0" fill="none" stroke="#a97364" strokeWidth="1.3" />
  </g>;
}
export function WinterSanta() {
  return <svg className="hq-winter-art hq-winter-santa" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><SantaShape /></svg>;
}
export function WinterGifts() {
  return <svg className="hq-winter-art hq-winter-gifts" viewBox="0 0 100 90" aria-hidden="true" focusable="false">
    <rect x="6" y="45" width="49" height="39" rx="2" fill="#a74349" /><path d="M5 45h51v9H5z" fill="#cf6d69" />
    <path d="M26 45h8v39h-8z" fill="#e9cc8c" /><path d="M30 44C3 40 18 18 30 44c13-28 29-5 0 0" fill="none" stroke="#e9cc8c" strokeWidth="3" />
    <rect x="58" y="27" width="35" height="57" rx="2" fill="#2e6650" /><path d="M56 27h39v9H56z" fill="#48836c" />
    <path d="M72 27h7v57h-7z" fill="#e9cc8c" /><path d="M75 26c-23-4-10-24 0 0 10-24 23-4 0 0" fill="none" stroke="#e9cc8c" strokeWidth="2.5" />
  </svg>;
}
export function WinterGarland({ className = "" }: { className?: string }) {
  return <svg className={`hq-winter-art hq-winter-garland ${className}`} viewBox="0 0 180 110" aria-hidden="true" focusable="false">
    <path d="M0 2q65 5 175 95" fill="none" stroke="#254e41" strokeWidth="12" />
    {[0, 1, 2, 3, 4, 5, 6].map(i => <g key={i} transform={`translate(${i * 24} ${i * i * 1.6}) rotate(${i * 7})`}>
      <path d="m0 0 23 13M0 0l24-4M5 2l11 16M9 4l18 5" fill="none" stroke="#3c6d54" strokeWidth="3" strokeLinecap="round" />
    </g>)}
    <path d="M25 11v29m48-6v32m47-3v30" stroke="#bca976" strokeWidth="1" />
    <circle cx="25" cy="49" r="10" fill="#b64b50" /><path d="M22 39h6" stroke="#efcf8c" strokeWidth="4" />
    <circle cx="73" cy="74" r="9" fill="#d6b975" /><path d="M70 65h6" stroke="#efcf8c" strokeWidth="4" />
    <circle cx="120" cy="100" r="8" fill="#b64b50" />
    {[12, 44, 78, 109, 143].map((x, i) => <circle className="hq-winter-bulb" key={x} cx={x} cy={8 + i * i * 5} r="3" fill="#f7d99d" />)}
  </svg>;
}
function HouseWindow({ x, y, width = 25 }: { x: number; y: number; width?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d={`M-6-2h4v35h-4zM${width + 2}-2h4v35h-4z`} fill="#254e41" />
    <rect width={width} height="32" fill="#e9c98b" stroke="#c3c9bd" strokeWidth="2" />
    <path d={`M0 16h${width}m-${width / 2}-16v32`} stroke="#64716a" strokeWidth="1.5" />
    <path d={`M-3 35h${width + 6}`} stroke="#e6e9df" strokeWidth="3" />
  </g>;
}
export function McCallisterHouse({ className = "" }: { className?: string }) {
  return <svg className={`hq-winter-house ${className}`} viewBox="0 0 600 320" aria-hidden="true" focusable="false" data-motif="mccallister-house">
    <path d="M3 298q62-38 145-17 130-31 233-9 141-12 217 26" fill="#9bbab1" opacity=".18" />
    <path d="M110 180h78v99h-78Z" fill="#70423f" /><path d="m100 182 15-36h64l14 36Z" fill="#293d3c" />
    <path d="M111 149h65m-74 33h89" stroke="#d4e1d9" strokeWidth="5" strokeLinecap="round" />
    <path d="M122 213h48v64h-48Z" fill="#8d9b8f" /><path d="M126 223h40m-40 15h40m-40 15h40" stroke="#506a60" strokeWidth="2" />
    <path d="M182 130h330v150H182Z" fill="#804b45" /><path d="M182 146h330m-330 65h330" stroke="#ad7865" strokeWidth="2" opacity=".55" />
    {[165, 185, 228, 248, 267].map(y => <path key={y} d={`M184 ${y}h326`} stroke="#b17e6c" opacity=".22" />)}
    <path d="M211 54h24v50h-24zM453 50h24v53h-24z" fill="#804b45" /><path d="M207 54h32m210-4h32" stroke="#d4e1d9" strokeWidth="5" />
    <path d="m165 138 37-61h289l36 61Z" fill="#293b3d" />
    <path d="M202 78h287m-321 60q37-5 63 0t63 0 64 0 63 0 63 0h37" fill="none" stroke="#d7e3dd" strokeWidth="6" strokeLinecap="round" />
    {[255, 427].map(x => <g key={x} transform={`translate(${x} 78)`}>
      <path d="m-20 15 20-20 20 20v29h-40Z" fill="#a1afa3" /><path d="m-22 15 22-22 22 22" fill="none" stroke="#d7e3dd" strokeWidth="4" />
      <path d="M-9 15H9v24H-9Z" fill="#e9c98b" stroke="#506a60" strokeWidth="2" /><path d="M0 15v24" stroke="#506a60" />
    </g>)}
    {[206, 260, 408, 462].map(x => <g key={x}><HouseWindow x={x} y={157} /><HouseWindow x={x} y={226} /></g>)}
    <HouseWindow x={335} y={151} width={24} />
    <path d="m309 215 38-25 39 25Z" fill="#cedace" /><path d="M312 216h70m-65 5v53m60-53v53" fill="none" stroke="#dce6da" strokeWidth="7" />
    <path d="M333 223h29v54h-29Z" fill="#4a292c" /><circle cx="356" cy="253" r="2" fill="#e9c98b" />
    <circle cx="347" cy="239" r="8" fill="none" stroke="#3f7757" strokeWidth="5" /><path d="m343 243 4-3 4 3-4 4Z" fill="#c4605c" />
    <path d="M308 280h79m-84 7h89m-94 7h99" stroke="#bdcec2" strokeWidth="5" />
    {Array.from({ length: 19 }, (_, i) => <circle className="hq-winter-bulb" key={i} cx={180 + i * 18} cy="143" r="2" fill={i % 3 === 0 ? "#d87269" : i % 3 === 1 ? "#efd095" : "#8fba91"} />)}
    <g transform="translate(20 145) scale(1.05)"><TreeShape /></g><g transform="translate(505 193) scale(.65)"><TreeShape /></g>
    <path d="M572 213v75m-7-75h14l-3-17h-8Z" stroke="#a2b8a6" strokeWidth="2" fill="#e9c98b" />
    <path d="M14 298q56-12 101-7m325 4q70-8 148 4" stroke="#c4d8cb" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55" />
  </svg>;
}
export function SantaSleigh() {
  return <svg className="hq-winter-sleigh-art" viewBox="0 0 300 110" aria-hidden="true" focusable="false">
    {[0, 75].map((x, i) => <g key={x} transform={`translate(${x + 20} ${i * 9})`} fill="none" stroke="#c6a57a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 54q22-12 40 0l7-5m-41 10-10 21m24-22 1 23m-21-30-10-24-12 8-9-2m16-5 3-18m-1 8 10-6m-12 8-10-9" />
      {i === 0 && <circle cx="-9" cy="33" r="3" fill="#cd6b62" stroke="none" />}
    </g>)}
    <path d="M76 52q80 43 148 17M147 59q33 22 66 12" fill="none" stroke="#d6bd83" strokeWidth="1" />
    <path d="M200 63q-5-39 24-35 22-1 20 39Z" fill="#367058" />
    <g transform="translate(222 15) scale(.55)"><SantaShape /></g>
    <path d="M200 70h73l8-13q13-8 10 7l-12 24h-58q-17-1-21-18Z" fill="#b84348" stroke="#e8bd7c" strokeWidth="2" />
    <path d="m217 88-4 12h65q15 0 16-11m-66-1-2 12m43-12-2 12" fill="none" stroke="#e8bd7c" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}
