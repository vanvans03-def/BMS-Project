/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'

type ShapeType = 'circle' | 'square' | 'hexagon' | 'triangle' | 'mixed'

interface ParticleBackgroundProps {
  shape?: ShapeType
}

export const ParticleBackground = ({ shape = 'circle' }: ParticleBackgroundProps) => {
  const sceneRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const renderRef = useRef<Matter.Render | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const barriersRef = useRef<Matter.Body[]>([]) 

  // State สำหรับเก็บขนาดหน้าจอ (ใช้เพื่อสั่ง Re-render)
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  // 1. useEffect สำหรับดักจับการย่อขยายหน้าจอ (Debounce Resize)
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout

    const handleResize = () => {
      // เคลียร์ timer เก่าทิ้ง ถ้ามีการขยับจอซ้ำๆ
      clearTimeout(resizeTimer)
      
      // รอ 300ms หลังจากหยุดขยับจอ ค่อยสั่งอัปเดต state
      resizeTimer = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        })
      }, 300)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    }
  }, [])

  // 2. useEffect หลักสำหรับรัน Matter.js (จะรันใหม่ทุกครั้งที่ windowSize เปลี่ยน)
  useEffect(() => {
    if (!sceneRef.current) return

    const { Engine, Render, Runner, Bodies, Composite, Events, Body, Mouse } = Matter

    const PARTICLE_COLOR = '#1890ff' 

    // --- Config ---
    const isSmallScreen = windowSize.width < 768
    const density = isSmallScreen ? 12000 : 18000 
    const screenArea = windowSize.width * windowSize.height
    const calculatedCount = Math.floor(screenArea / density)
    const COUNT = Math.max(15, Math.min(calculatedCount, 50)) 
    const BASE_SIZE = isSmallScreen ? 4 : 6 

    /* Engine */
    const engine = Engine.create()
    engine.world.gravity.y = 0
    engine.world.gravity.x = 0
    engineRef.current = engine

    /* Render */
    const render = Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width: windowSize.width,
        height: windowSize.height,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio
      }
    })
    renderRef.current = render

    /* Boundaries Creation (กำแพง) */
    const createBoundaries = () => {
        const newBarriers: Matter.Body[] = []
        const elementIds = [
            'login-card', 
            'app-footer', 
            'login-title-section', 
            'portal-title',
            'card-bacnet',
            'card-modbus',
            'card-logs',
            'portal-cards-container'
        ]

        elementIds.forEach(id => {
            const el = document.getElementById(id)
            if (el) {
                const rect = el.getBoundingClientRect()
                const centerX = rect.left + (rect.width / 2)
                const centerY = rect.top + (rect.height / 2)

                const barrier = Bodies.rectangle(
                    centerX, centerY, rect.width, rect.height, 
                    { isStatic: true, render: { visible: false } }
                )
                newBarriers.push(barrier)
            }
        })

        if (newBarriers.length > 0) {
            Composite.add(engine.world, newBarriers)
            barriersRef.current = newBarriers
        }
    }
    
    // เรียกสร้างกำแพงทันที
    createBoundaries()

    /* Particles Creation */
    const particles: Matter.Body[] = []
    for (let i = 0; i < COUNT; i++) {
        const x = Math.random() * windowSize.width
        const y = Math.random() * windowSize.height
        const size = BASE_SIZE + (Math.random() * 4) 
        let body: Matter.Body
        let currentShape = shape

        if (shape === 'mixed') {
            const shapes: ShapeType[] = ['circle', 'square', 'hexagon', 'triangle']
            currentShape = shapes[Math.floor(Math.random() * shapes.length)]
        }
        
        const commonOptions = {
            frictionAir: 0, friction: 0, restitution: 1, inertia: Infinity,
            angle: Math.random() * Math.PI * 2,
            render: { fillStyle: PARTICLE_COLOR, opacity: 0.6 }
        }

        switch (currentShape) {
            case 'square': body = Bodies.rectangle(x, y, size * 1.8, size * 1.8, commonOptions); break
            case 'hexagon': body = Bodies.polygon(x, y, 6, size, commonOptions); break
            case 'triangle': body = Bodies.polygon(x, y, 3, size + 2, commonOptions); break
            case 'circle': default: body = Bodies.circle(x, y, size / 1.5, commonOptions); break
        }

        const speed = Math.random() * 0.4 + 0.1
        const angle = Math.random() * Math.PI * 2
        Body.setVelocity(body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed })
        if (currentShape !== 'circle') Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.02)
        particles.push(body)
    }
    Composite.add(engine.world, particles)

    /* Mouse Interaction */
    const mouse = Mouse.create(document.body)
    render.mouse = mouse
    // @ts-ignore
    mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
    // @ts-ignore
    mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

    /* Update Loop */
    Events.on(engine, 'beforeUpdate', () => {
        const m = mouse.position
        const width = render.canvas.width
        const height = render.canvas.height
        
        particles.forEach((p) => {
            // Mouse Push
            const mx = p.position.x - m.x
            const my = p.position.y - m.y
            const md = Math.hypot(mx, my)
            const pushRadius = 150
            if (md < pushRadius) {
                const forceMagnitude = (pushRadius - md) / pushRadius * 0.00005
                Body.applyForce(p, p.position, { x: mx * forceMagnitude, y: my * forceMagnitude })
            }
            // Limit Speed
            const maxSpeed = 1.5
            if (p.speed > maxSpeed) {
                const ratio = maxSpeed / p.speed
                Body.setVelocity(p, { x: p.velocity.x * ratio, y: p.velocity.y * ratio })
            }
            // Screen Wrapping (ทะลุขอบ)
            const buffer = 50
            if (p.position.x > width + buffer) Body.setPosition(p, { x: -buffer, y: p.position.y })
            if (p.position.x < -buffer) Body.setPosition(p, { x: width + buffer, y: p.position.y })
            if (p.position.y > height + buffer) Body.setPosition(p, { x: p.position.x, y: -buffer })
            if (p.position.y < -buffer) Body.setPosition(p, { x: p.position.x, y: height + buffer })
        })
    })

    /* Run */
    Render.run(render)
    const runner = Runner.create()
    runnerRef.current = runner
    Runner.run(runner, engine)

    /* Cleanup function */
    return () => {
      Render.stop(render)
      Runner.stop(runner)
      if (runnerRef.current) Runner.stop(runnerRef.current)
      if (engineRef.current) {
        Composite.clear(engineRef.current.world, false)
        Engine.clear(engineRef.current)
      }
      if (render.canvas) render.canvas.remove()
      if (render.mouse) Mouse.clearSourceEvents(render.mouse)
    }
  }, [shape, windowSize]) // Re-run เมื่อ windowSize เปลี่ยน

  return (
      <div
        ref={sceneRef}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 0, pointerEvents: 'none'
        }}
      />
  )
}