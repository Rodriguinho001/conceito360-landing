/* ==========================================================================
   THE 3D PARTICLE PROJECTION & REFRACTION ENGINE — IGLOO Blueprint
   Math-driven 3D Morphing, Real-time Chromatic Aberration & Footer Silhouettes
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initCustomCursor();
    init3DGlacialEngine();
    initCinematicPreloader();
});

// ==========================================================================
// 1. PREMIUM CUSTOM CURSOR
// ==========================================================================
function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    const follower = document.getElementById('custom-cursor-follower');
    
    if (!cursor || !follower) return;

    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        cursor.style.left = `${mouseX}px`;
        cursor.style.top = `${mouseY}px`;
    });

    function animateFollower() {
        const easing = 0.14;
        followerX += (mouseX - followerX) * easing;
        followerY += (mouseY - followerY) * easing;
        
        follower.style.left = `${followerX}px`;
        follower.style.top = `${followerY}px`;
        
        requestAnimationFrame(animateFollower);
    }
    animateFollower();

    // Attach premium hover actions to interactive nodes
    const interactives = document.querySelectorAll('a, button, .header-cta, .selector-btn, .arrow-btn, .editorial-cta-link');
    interactives.forEach(el => {
        el.addEventListener('mouseenter', () => {
            document.body.classList.add('hovering');
        });
        el.addEventListener('mouseleave', () => {
            document.body.classList.remove('hovering');
        });
    });
}

// ==========================================================================
// 2. DYNAMIC 3D ENGINE (Scroll Morphing, Chromatic Aberration & Hover Silhouettes)
// ==========================================================================
function init3DGlacialEngine() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particlesArray = [];
    const numParticles = 900; // Calibrated for maximum shape definition & frame stability

    // Interactive States
    let mouse = {
        x: null,
        y: null,
        radius: 180
    };
    
    let scrollProgress = 0;
    let activeVariation = 0; // 0: Pudgy Penguins, 1: OverpassIP, 2: Infrastructure, 3: Collective
    let currentMorphTarget = null; // 'penguin' | 'overpass' | 'twitter' | 'discord' | null

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Editorial text database for the projects (Moment 2)
    const projectData = [
        {
            heading: "Pudgy Penguins",
            desc: "The spearhead of onchain intellectual property. Creating toys, media, clothing, and digital collectibles that establish deep emotional connection with global mainstream audiences.",
            quote: "\"Onchain IP scaled to global retail markets.\""
        },
        {
            heading: "Overpass IP",
            desc: "A pioneering NFT licensing protocol designed to scale onchain brands. Connects holders directly with global consumer businesses to license intellectual property seamlessly.",
            quote: "\"Natively licensing IP, zero friction, maximum scale.\""
        },
        {
            heading: "Infrastructure & Protocols",
            desc: "The technical framework supporting decentralized attention. Building robust pipelines, gasless interfaces, and community hubs to host millions of consumers.",
            quote: "\"Solid foundations for mainstream consumer crypto.\""
        },
        {
            heading: "Community & Collectives",
            desc: "The cultural engine of the Igloo ecosystem. A collaborative, global network of creators, holders, and builders working in perfect coordination to drive adoption.",
            quote: "\"Unified attention scales coordinate culture.\""
        }
    ];

    // High-performance Text Scrambler
    function scrambleStaticText(el, targetText) {
        let chars = '!<>-_\\/[]{}—=+*^?#________';
        let currentText = el.innerText || '';
        let queue = [];
        for (let i = 0; i < targetText.length; i++) {
            let from = currentText[i] || '';
            let to = targetText[i] || '';
            let start = Math.floor(Math.random() * 8);
            let end = start + Math.floor(Math.random() * 12);
            queue.push({ from, to, start, end, char: '' });
        }
        let frame = 0;
        function updateScramble() {
            let output = '';
            let complete = 0;
            for (let i = 0; i < queue.length; i++) {
                let { from, to, start, end, char } = queue[i];
                if (frame >= end) {
                    complete++;
                    output += to;
                } else if (frame >= start) {
                    if (!char || Math.random() < 0.28) {
                        char = chars[Math.floor(Math.random() * chars.length)];
                        queue[i].char = char;
                    }
                    output += `<span style="color: var(--accent-gold);">${char}</span>`;
                } else {
                    output += from;
                }
            }
            el.innerHTML = output;
            if (complete < queue.length) {
                frame++;
                requestAnimationFrame(updateScramble);
            }
        }
        updateScramble();
    }

    // ==========================================================================
    // 3D GEOMETRY GENERATORS (Math-driven Blueprints)
    // ==========================================================================
    function getShapeCoordinates(index, shapeIndex, varIndex) {
        // shapeIndex 0: Monolith (Start/End Block of Ice)
        if (shapeIndex === 0) {
            let pointsPerRow = 10;
            let pointsPerCol = 15;
            let pointsPerDepth = 6;
            
            let gridX = (index % pointsPerRow) - (pointsPerRow - 1) / 2;
            let gridY = (Math.floor(index / pointsPerRow) % pointsPerCol) - (pointsPerCol - 1) / 2;
            let gridZ = (Math.floor(index / (pointsPerRow * pointsPerCol)) % pointsPerDepth) - (pointsPerDepth - 1) / 2;
            
            // Return structured cuboid block
            return {
                x: gridX * 16,
                y: gridY * 18,
                z: gridZ * 12
            };
        } 
        
        // shapeIndex 1: Dynamic Portfolio Entity Variations (Moment 2)
        else {
            if (varIndex === 0) {
                // Variation 0: Pudgy Penguins (Glacial Penguin outline silhouette)
                let theta = (index / numParticles) * Math.PI * 2;
                
                if (index < 300) {
                    // Head shape
                    let r = 45;
                    return {
                        x: r * Math.sin(theta),
                        y: -55 + r * Math.cos(theta) * 0.9,
                        z: Math.sin(index) * 20
                    };
                } else if (index < 700) {
                    // Body oval
                    let rWidth = 60;
                    let rHeight = 85;
                    return {
                        x: rWidth * Math.sin(theta),
                        y: 15 + rHeight * Math.cos(theta),
                        z: Math.cos(index) * 25
                    };
                } else if (index < 820) {
                    // Left and Right flippers
                    let side = index % 2 === 0 ? -1 : 1;
                    let progress = (index - 700) / 120;
                    return {
                        x: side * (60 + progress * 28),
                        y: 10 + progress * 50 - Math.sin(progress * Math.PI) * 15,
                        z: -5 + progress * 15
                    };
                } else {
                    // Beak and Feet
                    if (index % 3 === 0) {
                        // Beak triangle
                        let progress = (index - 820) / 80;
                        return {
                            x: (Math.random() - 0.5) * 12,
                            y: -50 + progress * 10,
                            z: 20
                        };
                    } else {
                        // Feet
                        let side = index % 2 === 0 ? -1 : 1;
                        return {
                            x: side * (30 + Math.random() * 15),
                            y: 95 + Math.random() * 10,
                            z: Math.random() * 10
                        };
                    }
                }
            } else if (varIndex === 1) {
                // Variation 1: Overpass IP (Double Ring torus representing licensing flows)
                let theta = (index / numParticles) * Math.PI * 4;
                let isInner = index % 2 === 0;
                let r = isInner ? 50 : 90;
                
                return {
                    x: r * Math.cos(theta),
                    y: r * Math.sin(theta) * 1.1,
                    z: Math.sin(theta * 2.5) * 30
                };
            } else if (varIndex === 2) {
                // Variation 2: Infrastructure (Intersecting coordinate axes & crystalline grid)
                let section = index % 3;
                if (section === 0) {
                    // Horizontal planar technical ring
                    let theta = (index / numParticles) * Math.PI * 6;
                    let r = 85;
                    return {
                        x: r * Math.cos(theta),
                        y: 0,
                        z: r * Math.sin(theta)
                    };
                } else if (section === 1) {
                    // Crystalline diagonal lattice
                    let val = (index / numParticles - 0.5) * 240;
                    return {
                        x: val,
                        y: val * 0.6,
                        z: Math.cos(index) * 40
                    };
                } else {
                    // Vertical axis plane
                    return {
                        x: 0,
                        y: ((index % 20) - 10) * 16,
                        z: (Math.floor(index / 20) % 20 - 10) * 16
                    };
                }
            } else {
                // Variation 3: Collective (Central sphere core + orbiting particle cluster rings)
                let section = index % 4;
                if (section === 0) {
                    // Dense sphere core
                    let theta = Math.random() * Math.PI * 2;
                    let phi = Math.random() * Math.PI;
                    let r = 35;
                    return {
                        x: r * Math.sin(phi) * Math.cos(theta),
                        y: r * Math.sin(phi) * Math.sin(theta),
                        z: r * Math.cos(phi)
                    };
                } else {
                    // Orbital rings
                    let tilt = section === 1 ? 0 : (section === 2 ? Math.PI / 4 : -Math.PI / 4);
                    let theta = (index / numParticles) * Math.PI * 8;
                    let r = 100 - section * 10;
                    return {
                        x: r * Math.cos(theta),
                        y: r * Math.sin(theta) * Math.sin(tilt),
                        z: r * Math.sin(theta) * Math.cos(tilt)
                    };
                }
            }
        }
    }

    // ==========================================================================
    // 3D FOOTER INTERACTIVE SILHOUETTES (Target Morphs on Link Hover)
    // ==========================================================================
    function getFooterMorphCoordinates(index, target) {
        let theta = (index / numParticles) * Math.PI * 2;
        
        switch (target) {
            case 'penguin':
                // Reconstruct identical coordinates as Pudgy Penguin variation
                if (index < 300) {
                    let r = 40;
                    return { x: r * Math.sin(theta), y: -50 + r * Math.cos(theta) * 0.9, z: Math.sin(index) * 15 };
                } else if (index < 700) {
                    let rWidth = 55;
                    let rHeight = 80;
                    return { x: rWidth * Math.sin(theta), y: 15 + rHeight * Math.cos(theta), z: Math.cos(index) * 20 };
                } else {
                    let side = index % 2 === 0 ? -1 : 1;
                    let progress = (index - 700) / 200;
                    return { x: side * (55 + progress * 24), y: 10 + progress * 40, z: -5 };
                }

            case 'overpass':
                // Structured letters 'O' and 'P' in 3D space
                if (index < 500) {
                    // Outer Ring
                    let r = 75;
                    return { x: r * Math.cos(theta), y: r * Math.sin(theta), z: Math.sin(index) * 10 };
                } else {
                    // Inner geometric node core
                    let r = 35;
                    return { x: r * Math.cos(theta), y: r * Math.sin(theta), z: Math.cos(index) * 15 };
                }

            case 'twitter':
                // Simplified 3D Bird Silhouette (flying posture)
                if (index < 400) {
                    // Sweeping bird wing
                    let progress = (index / 400);
                    return {
                        x: -50 + progress * 100,
                        y: -30 - Math.sin(progress * Math.PI) * 45,
                        z: -20 + progress * 40
                    };
                } else if (index < 750) {
                    // Curved bird chest & belly
                    let progress = (index - 400) / 350;
                    return {
                        x: -30 + progress * 80,
                        y: 20 - Math.cos(progress * Math.PI) * 35,
                        z: Math.sin(progress) * 15
                    };
                } else {
                    // Head, Beak & Tail
                    let progress = (index - 750) / 150;
                    if (index % 2 === 0) {
                        // Pointy beak facing top right
                        return { x: 50 + progress * 15, y: -20 - progress * 5, z: 10 };
                    } else {
                        // Wing/Tail sweep
                        return { x: -65 - progress * 10, y: -10 + progress * 10, z: -10 };
                    }
                }

            case 'discord':
                // Simplified gaming controller mask silhouette
                let side = index % 2 === 0 ? -1 : 1;
                if (index < 500) {
                    // Outer structural controller outline
                    let thetaVal = (index / 500) * Math.PI;
                    let rX = 85;
                    let rY = 55;
                    return {
                        x: rX * Math.sin(thetaVal) * side,
                        y: -10 + rY * Math.cos(thetaVal),
                        z: Math.cos(index) * 12
                    };
                } else if (index < 750) {
                    // Dual handles/protrusions at bottom left/right
                    let progress = (index - 500) / 250;
                    return {
                        x: side * (50 + progress * 25),
                        y: 25 + progress * 35,
                        z: -5
                    };
                } else {
                    // Circular eye hole blank mapping (push particles away from center eyes)
                    let angleVal = (index / 150) * Math.PI * 2;
                    let eyeOffset = 30; // distance from center
                    return {
                        x: side * eyeOffset + 12 * Math.cos(angleVal),
                        y: -10 + 12 * Math.sin(angleVal),
                        z: 10
                    };
                }

            default:
                // Default fallback: scattered coordinate matrix
                return {
                    x: (Math.random() - 0.5) * 180,
                    y: 100 + (Math.random() - 0.5) * 60,
                    z: (Math.random() - 0.5) * 100
                };
        }
    }

    class Particle {
        constructor(index) {
            this.index = index;
            
            // Start from scattered spatial coords
            this.x = (Math.random() - 0.5) * window.innerWidth;
            this.y = (Math.random() - 0.5) * window.innerHeight;
            this.z = (Math.random() - 0.5) * 350;
            
            this.tx = this.x;
            this.ty = this.y;
            this.tz = this.z;
            
            this.vx = 0;
            this.vy = 0;
            this.vz = 0;

            this.size = Math.random() * 1.2 + 0.45;
            this.color = Math.random() > 0.88 ? '#d4af37' : '#ffffff';
        }

        // Perspective projection and R-G-B Chromatic Aberration Split drawing
        draw(projX, projY, projZ) {
            let fov = 380;
            let cameraDepth = 420;
            
            // Center projection coordinates
            let screenX = canvas.width / 2 + (projX * fov) / (projZ + cameraDepth);
            let screenY = canvas.height / 2 + (projY * fov) / (projZ + cameraDepth);
            
            let depthOpacity = Math.max(0.08, 1 - (projZ + 150) / 450);
            let speed = Math.hypot(this.vx, this.vy);
            
            // Calibrate Chromatic Aberration offset based on velocity and transitions
            let splitOffset = 0;
            if (speed > 0.8) {
                splitOffset = Math.min(speed * 1.5, 9); // Higher speed = wider R-G-B aberration dispersion
            } else if (scrollProgress > 0.28 && scrollProgress < 0.38) {
                splitOffset = 3.5; // Fixed chromatic split during initial shape metamorfose
            }

            ctx.globalAlpha = depthOpacity;

            if (splitOffset > 1) {
                // Drawing separate R-G-B components to simulate camera lens dispersion
                // Red Component (Left offset)
                ctx.fillStyle = '#ff3366';
                ctx.beginPath();
                ctx.arc(screenX - splitOffset, screenY, this.size * (cameraDepth / (projZ + cameraDepth)), 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();

                // Green/Cyan Component (Center)
                ctx.fillStyle = '#33ffff';
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.size * (cameraDepth / (projZ + cameraDepth)), 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();

                // Blue/Gold Component (Right offset)
                ctx.fillStyle = this.color === '#d4af37' ? '#d4af37' : '#3333ff';
                ctx.beginPath();
                ctx.arc(screenX + splitOffset, screenY, this.size * (cameraDepth / (projZ + cameraDepth)), 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            } else {
                // Static Standard Rendering
                if (speed > 1.2 && this.color !== '#d4af37') {
                    ctx.fillStyle = '#d4af37';
                    ctx.shadowColor = '#d4af37';
                    ctx.shadowBlur = Math.min(speed * 3, 6);
                } else {
                    ctx.fillStyle = this.color;
                    if (this.color === '#d4af37') {
                        ctx.shadowColor = '#d4af37';
                        ctx.shadowBlur = 3;
                    } else {
                        ctx.shadowBlur = 0;
                    }
                }
                
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.size * (cameraDepth / (projZ + cameraDepth)), 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }
        }

        update(t_morph) {
            let startShape, endShape;

            // Check if interactive footer hover target is active
            if (currentMorphTarget !== null) {
                // Morph to selected footer logo/silhouette shape
                startShape = getShapeCoordinates(this.index, 0, activeVariation); // Monolith original
                endShape = getFooterMorphCoordinates(this.index, currentMorphTarget); // Footer logo shape
                
                this.tx = startShape.x * 0.15 + endShape.x * 0.85;
                this.ty = startShape.y * 0.15 + endShape.y * 0.85;
                this.tz = startShape.z * 0.15 + endShape.z * 0.85;
            } else {
                // Standard scroll morphing between Ice Block and Ecosystem project shapes
                startShape = getShapeCoordinates(this.index, 0, activeVariation); // Monolith Ice
                endShape = getShapeCoordinates(this.index, 1, activeVariation); // Selected ecosystem entity
                
                this.tx = startShape.x * (1 - t_morph) + endShape.x * t_morph;
                this.ty = startShape.y * (1 - t_morph) + endShape.y * t_morph;
                this.tz = startShape.z * (1 - t_morph) + endShape.z * t_morph;
            }

            // High-fidelity physical spring behavior LERPing to target positions
            let easing = 0.075;
            this.x += (this.tx - this.x) * easing;
            this.y += (this.ty - this.y) * easing;
            this.z += (this.tz - this.z) * easing;

            // Ambient 3D glacial noise/vibration
            this.x += Math.sin(this.index * 0.06 + Date.now() * 0.001) * 0.12;
            this.y += Math.cos(this.index * 0.06 + Date.now() * 0.001) * 0.12;

            // Inertia deceleration
            this.vx *= 0.93;
            this.vy *= 0.93;

            // Particle/Cursor proximity interaction
            if (mouse.x !== null && mouse.y !== null) {
                let mx = mouse.x - canvas.width / 2;
                let my = mouse.y - canvas.height / 2;
                
                let dx = mx - this.x;
                let dy = my - this.y;
                let distance = Math.hypot(dx, dy);

                if (distance < mouse.radius) {
                    let force = (mouse.radius - distance) / mouse.radius;
                    
                    if (document.body.classList.contains('hovering')) {
                        // Fast gold orbital swirl vortex when hovering over header/footer links
                        let tx = -dy / (distance || 1);
                        let ty = dx / (distance || 1);
                        
                        this.vx += (tx * 2.8 + dx / (distance || 1) * 0.4) * force * 0.55;
                        this.vy += (ty * 2.8 + dy / (distance || 1) * 0.4) * force * 0.55;
                        this.size = Math.min(this.size + 0.04, 2.5);
                    } else {
                        // Soft repulsion/drift when hovering ambient space
                        this.vx -= (dx / (distance || 1)) * force * 0.75;
                        this.vy -= (dy / (distance || 1)) * force * 0.75;
                    }
                } else {
                    if (this.size > 1.2) this.size -= 0.03;
                }
            }

            this.x += this.vx;
            this.y += this.vy;
        }
    }

    function init() {
        particlesArray = [];
        for (let i = 0; i < numParticles; i++) {
            particlesArray.push(new Particle(i));
        }
    }
    init();

    // Scroll capture progress tracking
    window.addEventListener('scroll', () => {
        let maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
        
        toggleEditorialBlocks();
    });

    function toggleEditorialBlocks() {
        const block1 = document.getElementById('block-1');
        const block2 = document.getElementById('block-2');
        const block3 = document.getElementById('block-3');
        const selector = document.querySelector('.molecular-selector-wrapper');
        const notice = document.querySelector('.scroll-down-notice');

        // State 1: Intro (0% to 32%)
        if (scrollProgress < 0.32) {
            if (!block1.classList.contains('active')) {
                block1.classList.add('active');
                block2.classList.remove('active');
                block3.classList.remove('active');
                selector.classList.remove('active');
                if (notice) notice.style.opacity = '1';
            }
        } 
        // State 2: Ecosystem Projects (32% to 68%)
        else if (scrollProgress >= 0.32 && scrollProgress < 0.68) {
            if (!block2.classList.contains('active')) {
                block2.classList.add('active');
                block1.classList.remove('active');
                block3.classList.remove('active');
                selector.classList.add('active');
                if (notice) notice.style.opacity = '0.3';
            }
        } 
        // State 3: Joint/Footer (68% to 100%)
        else {
            if (!block3.classList.contains('active')) {
                block3.classList.add('active');
                block1.classList.remove('active');
                block2.classList.remove('active');
                selector.classList.remove('active');
                if (notice) notice.style.opacity = '0';
            }
        }
    }

    // Side Selector Buttons to navigate portfolio variations (Moment 2)
    const selectBtns = document.querySelectorAll('.selector-btn');
    const entityHeading = document.getElementById('dynamic-entity-heading');
    const entityDesc = document.getElementById('dynamic-entity-desc');
    const entityQuote = document.getElementById('dynamic-entity-quote');

    selectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            let varIdx = parseInt(btn.getAttribute('data-variation'));
            changeVariation(varIdx);
        });
    });

    const prevBtn = document.getElementById('prev-variation');
    const nextBtn = document.getElementById('next-variation');

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            let varIdx = (activeVariation - 1 + 4) % 4;
            changeVariation(varIdx);
        });
        nextBtn.addEventListener('click', () => {
            let varIdx = (activeVariation + 1) % 4;
            changeVariation(varIdx);
        });
    }

    function changeVariation(varIdx) {
        activeVariation = varIdx;
        
        // Active visual state update
        selectBtns.forEach((btn, idx) => {
            if (idx === activeVariation) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Dynamic Text Scramble
        if (entityHeading && entityDesc && entityQuote) {
            scrambleStaticText(entityHeading, projectData[activeVariation].heading);
            scrambleStaticText(entityDesc, projectData[activeVariation].desc);
            scrambleStaticText(entityQuote, projectData[activeVariation].quote);
        }
        
        // Sparkle flash effect on selection
        for (let i = 0; i < 20; i++) {
            let p = particlesArray[Math.floor(Math.random() * particlesArray.length)];
            p.vx += (Math.random() - 0.5) * 9;
            p.vy += (Math.random() - 0.5) * 9;
        }
    }

    // ==========================================================================
    // INTERACTIVE FOOTER LOGO MORPH TRIGGERS
    // ==========================================================================
    const morphLinks = document.querySelectorAll('.editorial-cta-link[data-morph-target]');
    morphLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            currentMorphTarget = link.getAttribute('data-morph-target');
        });
        link.addEventListener('mouseleave', () => {
            currentMorphTarget = null;
        });
    });

    // Unified Glacial Render Loop
    let angleY = 0.004; // 3D Angular speeds
    let angleX = 0.0015;
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Morph interpolation scrub based on scroll progress
        let t_morph = 0;
        if (scrollProgress < 0.35) {
            t_morph = scrollProgress / 0.35; // Interpolate block to entity
        } else if (scrollProgress >= 0.35 && scrollProgress < 0.68) {
            t_morph = 1.0; // Keep entity shape intact
        } else {
            t_morph = 1.0 - (scrollProgress - 0.68) / 0.32; // Re-compress back into block
        }

        // Apply global three-dimensional rotation matrices
        let rotationSpeedFactor = activeVariation === 3 ? 1.6 : 1.0;
        let cosY = Math.cos(angleY * rotationSpeedFactor);
        let sinY = Math.sin(angleY * rotationSpeedFactor);
        let cosX = Math.cos(angleX);
        let sinX = Math.sin(angleX);

        for (let i = 0; i < particlesArray.length; i++) {
            let p = particlesArray[i];
            p.update(t_morph);
            
            // Rotate particles globally around spatial center
            let x1 = p.x * cosY - p.z * sinY;
            let z1 = p.z * cosY + p.x * sinY;
            
            let y2 = p.y * cosX - z1 * sinX;
            let z2 = z1 * cosX + p.y * sinX;
            
            p.draw(x1, y2, z2);
        }
        
        requestAnimationFrame(animate);
    }
    animate();
}

// ==========================================================================
// 3. CINEMATIC PRELOADER LOOP (igloo.inc spec)
// ==========================================================================
function initCinematicPreloader() {
    const preloader = document.getElementById('preloader');
    const fill = document.querySelector('.preloader-loading-bar-fill');
    const percentText = document.querySelector('.preloader-percentage-text');
    const subStatusText = document.querySelector('.scramble-status-text');
    const logoWrapper = document.querySelector('.preloader-logo-wrapper');
    
    if (!preloader || !fill || !percentText) return;
    
    const statusLogs = [
        "INITIALIZING GL_RENDER CONTEXT...",
        "COMPILING SHADERS & MATRICES...",
        "COMPRESSING DENSE VOLUME VDB DATA...",
        "STABILIZING WEBGL PIPELINES...",
        "RESOLVING ASSET LATTICE CACHE...",
        "SYSTEM ONLINE // CONNECTING NODE"
    ];
    
    function scrambleText(el, targetText) {
        let chars = '!<>-_\\/[]{}—=+*^?#________';
        let currentText = el.innerText || '';
        let queue = [];
        
        for (let i = 0; i < targetText.length; i++) {
            let from = currentText[i] || '';
            let to = targetText[i] || '';
            let start = Math.floor(Math.random() * 8);
            let end = start + Math.floor(Math.random() * 12);
            queue.push({ from, to, start, end, char: '' });
        }
        
        let frame = 0;
        function updateScramble() {
            let output = '';
            let complete = 0;
            
            for (let i = 0; i < queue.length; i++) {
                let { from, to, start, end, char } = queue[i];
                if (frame >= end) {
                    complete++;
                    output += to;
                } else if (frame >= start) {
                    if (!char || Math.random() < 0.28) {
                        char = chars[Math.floor(Math.random() * chars.length)];
                        queue[i].char = char;
                    }
                    output += `<span style="color: var(--accent-gold); opacity: 0.8;">${char}</span>`;
                } else {
                    output += from;
                }
            }
            
            el.innerHTML = output;
            if (complete < queue.length) {
                frame++;
                requestAnimationFrame(updateScramble);
            }
        }
        updateScramble();
    }

    setTimeout(() => {
        if (logoWrapper) logoWrapper.classList.add('visible');
    }, 180);

    let progress = 0;
    let currentStatusIndex = 0;
    
    function updateProgress() {
        let increment = Math.random() * 2.2 + 0.5;
        if (progress > 35 && progress < 50) increment = Math.random() * 0.5 + 0.1; // SDB compilation latency mimic
        if (progress > 80) increment = Math.random() * 2 + 0.4;
        
        progress = Math.min(progress + increment, 100);
        
        fill.style.width = `${progress}%`;
        percentText.innerText = `${Math.floor(progress).toString().padStart(2, '0')}%`;
        
        let logIndex = Math.floor((progress / 100) * (statusLogs.length - 1));
        if (logIndex !== currentStatusIndex && subStatusText) {
            currentStatusIndex = logIndex;
            scrambleText(subStatusText, statusLogs[currentStatusIndex]);
        }
        
        if (progress < 100) {
            setTimeout(updateProgress, 25);
        } else {
            setTimeout(() => {
                preloader.classList.add('fade-out');
            }, 600);
        }
    }
    
    setTimeout(updateProgress, 800);
}
