const experiences = [
    {
        company: "SEPTA",
        location: "Philadelphia, Pennsylvania",         
        role: "Multimedia Designer",                         
        dates: "Apr 2023-Sep 2024",                  
        cardImage: "content/defaultimg.jpg",            
        image: "content/defaultimg.jpg",      
        bullets: [
            "Designed and developed five e-learning modules and two proof-of-concept projects, while contributing to 10+ additional initiatives.",
            "Created animations, interface layouts, quiz interactions, iconography, and 250+ UI buttons, including 15 custom designs.",
            "Filmed and edited five 15-minute instructional videos, handling green-screen compositing, B-roll, audio cleanup, and professional production equipment.",
            "Produced custom animated bumpers for instructional videos and e-learning content."
        ],
        skills: [
            { name: "Figma", src: "content/logo-figma.png" },
            { name: "Storyline 360", src: "content/logo-sl.png" },
            { name: "React Storyline", src: "content/logo-rs.png" },
            { name: "Adobe Premiere Pro", src: "content/logo-primiere.png" }
        ]
    },
    {
        company: "OPEX",
        location: "Cinaminson, New Jersey",
        role: "UX Design Intern",
        dates: "Mar 2026-Sep 2026",
        cardImage: "content/defaultimg.jpg",
        image: "content/defaultimg.jpg",
        bullets: [
            "Served as the sole UX designer embedded within the Infinity HMI development team, leading end-to-end research, interaction design, prototyping, and validation.",
            "Conducted and synthesized 25+ user interviews, usability tests, and validation sessions, translating findings into design improvements, functional requirements, and developer documentation.",
            "Bridged design and development by learning Unreal Engine 5, UMG, Blueprint, and foundational C++ to build functional prototypes and reusable widgets for testing before Slate implementation.",
            "Designed and tested complex tools, including the WAC Configurator and Instant Replay, while establishing an accessible color system, centralized Figma library, and reusable components across the HMI."
        ],
        skills: [
            { name: "Unreal Engine 5", src: "content/logo-UE5.png" },
            { name: "C++", src: "content/logo-c.png" },
            { name: "Figma", src: "content/logo-figma.png" },
            { name: "Plastic SCM", src: "content/logo-plastic.png" },
            { name: "Confluence", src: "content/logo-confluence.png" }
        ]
    },
    {
        company: "TENEO",
        location: "Dublin, Ireland",               
        role: "Design Team Intern",                  
        dates: "Apr 2025-Aug 2025",           
        cardImage: "content/defaultimg.jpg",
        image: "content/defaultimg.jpg",
        bullets: [
            "Supported UX research and led three user-testing sessions, gathering and organizing feedback to identify usability issues and inform design decisions.",
            "Developed professional wireframes and low-fidelity prototypes to explore page structure, navigation, and key user flows alongside the UX team.",
            "Conducted UX audits across websites and digital content feeds, evaluating usability, visual consistency, information hierarchy, and opportunities for improvement.",
            "Researched competitors’ Instagram and LinkedIn strategies, comparing visual identity, content patterns, and platform engagement to identify relevant design trends."
        ],
        skills: [
            { name: "Figma", src: "content/logo-figma.png" }
        ]
    }
];

/* ---------- Tuning knobs ---------- */
const START_INDEX = 1;        // OPEX Starts in the middle in the front
const AUTOPLAY_MS = 0;        
const SNAP_DURATION = 600;    // ms for a rotation
const FADE_MS = 150;          // ms the details panel fades while its text swaps
const PX_PER_CARD = 180;      // swipe distance (px) that moves one card

// The ring, seen from slightly above. The front card sits lowest and biggest.
const RING_X_DESKTOP = 1.35;  // horizontal radius as a multiple of card width (bigger = cards further apart)
const RING_X_MOBILE = 0.95;   // smaller on phones so the neighbors peek in from the edges
const RING_Y = 0.12;          // vertical radius as a multiple of card height (bigger = back cards sit higher)
const BACK_SCALE = 0.73;      // scale of a card directly behind the front one
const BACK_OPACITY = 0.9;     // opacity of a card directly behind the front one

/* ---------- Elements ---------- */
const wheel = document.querySelector(".exp-wheel");
const detail = document.querySelector(".work-detail");
const section = document.querySelector(".work");

const els = {
    image: document.querySelector('[data-exp="image"]'),
    heading: document.querySelector('[data-exp="heading"]'),
    role: document.querySelector('[data-exp="role"]'),
    bullets: document.querySelector('[data-exp="bullets"]'),
    skills: document.querySelector('[data-exp="skills"]')
};

const mobileQuery = window.matchMedia("(max-width: 768px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const cards = [];
let position = START_INDEX;   // a float: 1.0 = card 1 in front, 1.5 = halfway to card 2
let activeIndex = START_INDEX;
let shownIndex = START_INDEX; // which experience the details panel is showing
let cardWidth = 0;
let cardHeight = 0;

let isAnimating = false;
let isDragging = false;
let didDrag = false;
let animationToken = 0;
let fadeTimer;
let autoplayTimer;

/* ---------- Helpers ---------- */
const mod = (value, n) => ((value % n) + n) % n;
const wrap = (value, n) => mod(value + n / 2, n) - n / 2;

/* ---------- Details panel ---------- */
function fillDetails(experience) {
    els.image.src = experience.image;
    els.image.alt = `${experience.company} project image`;
    els.heading.textContent = `${experience.company} | ${experience.location}`;
    els.role.textContent = `${experience.role} | ${experience.dates}`;

    els.bullets.replaceChildren(...experience.bullets.map((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        return li;
    }));

    els.skills.replaceChildren(...experience.skills.map((skill) => {
        const li = document.createElement("li");
        const img = document.createElement("img");
        img.src = skill.src;
        img.alt = skill.name;
        img.title = skill.name;
        li.appendChild(img);
        return li;
    }));
}

// Fades the panel out, swaps the content, fades it back in.
function showDetails(index) {
    shownIndex = index;
    clearTimeout(fadeTimer);

    if (reduceMotion) {
        fillDetails(experiences[index]);
        return;
    }

    detail.classList.add("is-changing");
    fadeTimer = setTimeout(() => {
        fillDetails(experiences[shownIndex]);
        detail.classList.remove("is-changing");
    }, FADE_MS);
}

/* ---------- Cards ---------- */
function buildCards() {
    experiences.forEach((experience, index) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "exp-card";

        const img = document.createElement("img");
        img.src = experience.cardImage || experience.image;
        img.alt = "";
        img.draggable = false;

        const title = document.createElement("h3");
        title.textContent = experience.company;

        card.append(img, title);
        wheel.appendChild(card);
        cards.push(card);

        card.addEventListener("click", () => {
            stopAutoplay();

            if (didDrag || isAnimating) return;
            if (index === activeIndex) return;

            moveTo(Math.round(position) + wrap(index - activeIndex, cards.length));
        });
    });
}

/* ---------- Layout: draws every card from `position` ---------- */
function render() {
    const count = cards.length;
    const radiusX = cardWidth * (mobileQuery.matches ? RING_X_MOBILE : RING_X_DESKTOP);
    const radiusY = cardHeight * RING_Y;

    activeIndex = mod(Math.round(position), count);

    cards.forEach((card, index) => {
        const theta = wrap(index - position, count) * ((Math.PI * 2) / count);
        const depth = Math.cos(theta);              
        const nearness = (depth + 1) / 2;       

        const x = Math.sin(theta) * radiusX;
        const y = depth * radiusY;                
        const scale = BACK_SCALE + (1 - BACK_SCALE) * nearness;

        card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
        card.style.opacity = BACK_OPACITY + (1 - BACK_OPACITY) * nearness;
        card.style.zIndex = Math.round(depth * 100) + 100;

        const isActive = index === activeIndex;
        card.classList.toggle("active", isActive);
        if (isActive) card.setAttribute("aria-current", "true");
        else card.removeAttribute("aria-current");
    });

    if (activeIndex !== shownIndex) showDetails(activeIndex);
}

function measure() {
    cardWidth = cards[0].offsetWidth;
    cardHeight = cards[0].offsetHeight;
}

/* ---------- Motion ---------- */
function moveTo(target) {
    if (isAnimating) return;
    isAnimating = true;

    const token = ++animationToken;
    const start = position;
    const distance = target - start;
    const startTime = performance.now();
    const duration = reduceMotion ? 0 : SNAP_DURATION;

    function step(now) {
        if (token !== animationToken) return;

        const progress = duration ? Math.min((now - startTime) / duration, 1) : 1;
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        position = start + distance * eased;
        render();

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            position = target;
            render();
            isAnimating = false;
        }
    }

    requestAnimationFrame(step);
}

const moveNext = () => moveTo(Math.round(position) + 1);
const movePrevious = () => moveTo(Math.round(position) - 1);

/* ---------- Optional autoplay, off for now ---------- */
let autoplayPaused = false;

function startAutoplay() {
    if (!AUTOPLAY_MS || reduceMotion) return;

    autoplayTimer = setInterval(() => {
        if (!autoplayPaused && !isAnimating && !isDragging && !document.hidden) moveNext();
    }, AUTOPLAY_MS);
}

// Once someone uses the wheel themselves, autoplay stays off
function stopAutoplay() {
    clearInterval(autoplayTimer);
}

section.addEventListener("pointerenter", () => { autoplayPaused = true; });
section.addEventListener("pointerleave", () => { autoplayPaused = false; });
section.addEventListener("focusin", () => { autoplayPaused = true; });
section.addEventListener("focusout", () => { autoplayPaused = false; });

/* ---------- Input: swipe or drag ---------- */
let dragStartX = 0;
let dragStartPosition = 0;
let lastX = 0;
let lastTime = 0;
let velocity = 0; 

wheel.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isAnimating) return;

    stopAutoplay();
    isDragging = true;
    didDrag = false;
    dragStartX = lastX = event.clientX;
    dragStartPosition = position;
    lastTime = performance.now();
    velocity = 0;
});

window.addEventListener("pointermove", (event) => {
    if (!isDragging) return;

    const dx = event.clientX - dragStartX;
    if (Math.abs(dx) > 6) didDrag = true;
    if (!didDrag) return;

    const now = performance.now();
    if (now > lastTime) velocity = (event.clientX - lastX) / (now - lastTime);
    lastX = event.clientX;
    lastTime = now;

    position = dragStartPosition - dx / PX_PER_CARD;
    render();
});

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    if (!didDrag) return;

    let target = Math.round(position);

    if (Math.abs(velocity) > 0.4) {
        target = velocity < 0 ? Math.ceil(position) : Math.floor(position);
    }

    moveTo(target);

    setTimeout(() => { didDrag = false; }, 50);
}

window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);

/* ---------- Input: keyboard (while a card has focus) ---------- */
wheel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
        stopAutoplay();
        moveNext();
    } else if (event.key === "ArrowLeft") {
        stopAutoplay();
        movePrevious();
    }
});

/* ---------- Responsive ---------- */
new ResizeObserver(() => {
    measure();
    render();
}).observe(wheel);

mobileQuery.addEventListener("change", render);

/* ---------- Start ---------- */
buildCards();
fillDetails(experiences[START_INDEX]);
measure();
render();
startAutoplay();