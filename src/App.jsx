import{ useEffect, useRef} from "react"
import gsap from "gsap"


import "./App.css"

function App() {
  const circleRef=useRef()
  useEffect(()=>{
    gsap.to(circleRef.current,{
    x:400,
    duration:2,
    ease:"power2.inOut"
  })

}, [])

  return (
    <div className="app">

      <header className="topbar">
        <h1>Motion Studio</h1>
        <button>▶ Preview</button>
      </header>

      <main className="workspace">

        <aside className="layers">
          <h2>Layers</h2>

          <div>○ Circle</div>
          <div>T Text</div>
          <div>□ Cube</div>
          <div>✦ Particles</div>
        </aside>

        <section className="canvas-area">
          <div className="canvas">
            <div ref={circleRef} className="circle"></div>
          </div>
        </section>

        <aside className="properties">
          <h2>Properties</h2>

          <p>Position</p>
          <p>X: 120</p>
          <p>Y: 200</p>

          <p>Scale: 1</p>
          <p>Rotation: 0°</p>
          <p>Opacity: 100%</p>
        </aside>

      </main>

      <footer className="timeline">
        Timeline
      </footer>

    </div>
  )
}

export default App