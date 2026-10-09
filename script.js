const projects = [
    {
        title: "Aftermath",
        description: "A description of my first UX project.",
        image: "content/defaultimg.jpg",
        link: "aftermath.html"
    },
    {
        title: "Greenlight",
        description: "A description of my first UX project.",
        image: "content/defaultimg.jpg",
        link: "greenlight.html"
    },
    {
        title: "Kims Dragon",
        description: "A description of my first UX project.",
        image: "content/defaultimg.jpg",
        link: "kimsdragon.html"
    },
    {
        title: "CMS Website",
        description: "A description of my second UX project.",
        image: "content/defaultimg.jpg",
        link: "cmswebsite.html"
    },
    {
        title: "PHP Recipe Site",
        description: "A description of my third UX project.",
        image: "content/defaultimg.jpg",
        link: "phprecipesite.html"
    },
    {
        title: "Microinteraction",
        description: "A description of my fourth UX project.",
        image: "content/defaultimg.jpg",
        link: "microinteraction.html"
    },
    {
        title: "Birdthday Watching",
        description: "A description of my fourth UX project.",
        image: "content/defaultimg.jpg",
        link: "birdthdaywatching.html"
    }
];

/* ---------- Tuning knobs ---------- */
const DESKTOP_RADIUS = 550;     // px, size of the desktop circle
const AUTO_SPEED = 0.05;        // cards per second while auto-rotating
const RESUME_DELAY = 5000;      // ms of inactivity before auto-rotate resumes
const SNAP_DURATION = 600;      // ms for next/previous animation
const PX_PER_CARD = 140;        // mobile: finger travel needed to move one card
const MOBILE_TILT = 0.6;        // mobile: 1 = cards fully face outward, 0 = no tilt
const MOBILE_RADIUS_RATIO = 0.75; // mobile: cylinder radius as a fraction of card width
const MOBILE_PERSPECTIVE_RATIO = 3.2; // mobile: perspective distance as a multiple of card width

// Right-focus layout (data-focus="right"), desktop only.
const RIGHT_RADIUS_HEIGHT_RATIO = 0.5;  // radius as a fraction of the wheel's height
const RIGHT_RADIUS_WIDTH_RATIO = 0.45;  // radius is also capped at this fraction of the wheel's width
// The circle slides down as far as needed so the top card is never cropped.
// This is the gap (px) kept between the top card and the header. Any cropping happens at the bottom.
const RIGHT_EDGE_PADDING = 12;
// Distance between card centers, as a multiple of card height.
// 1 = cards touch, 1.5 = half a card of gap. This only changes the spacing, never the circle size.
const RIGHT_CARD_SPACING = 1.5;
// Cards fade out as they swing round past the right half of the circle
// (angles in degrees from the focused card): fully visible up to START, gone by END.
const RIGHT_FADE_START_DEG = 70;
const RIGHT_FADE_END_DEG = 105;
// How many card slots, at the far end of the loop, are used to fade cards out
const RIGHT_FADE_CARDS = 1;
// Circle center, as a fraction of the radius from the left edge.
// 0 = center sits on the left edge (half the circle cut off),
// negative = more of it cut off, positive = more of it visible.
const RIGHT_CENTER_X_RATIO = 0.25;

/* ---------- State ---------- */
const wheel = document.querySelector(".project-wheel");
const detailsTitle = document.querySelector(".project-details h3");
const detailsText = document.querySelector(".project-details p");
const detailsImage = document.querySelector(".project-details img");

const mobileQuery = window.matchMedia("(max-width: 768px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// "top" (default): focused card at the top of the circle.
// "right": circle hugs the left edge, focused card at its right tip.
const focusMode = wheel.dataset.focus === "right" ? "right" : "top";

const cards = [];

let activeIndex = 0;
let wheelPosition = 0;   // a float: 2.0 means card 2 is centered, 2.5 is halfway to card 3

// Measured in measure(), so everything scales with the page
let cardWidth = 0;
let cardHeight = 0;
let wheelHeight = 0;
let rightRadius = 0;

let isPaused = false;
let isHoveringCard = false;
let isAnimating = false;
let isDragging = false;
let didDrag = false;
let resumeTimer;
let shownIndex = -1;

/* ---------- Build the cards ---------- */
projects.forEach((project, index) => {
    const card = document.createElement("a");

    card.classList.add("project-card");
    card.href = project.link;
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    card.innerHTML = `
        <img src="${project.image}" alt="${project.title}" draggable="false">
        <h3>${project.title}</h3>`;

    wheel.appendChild(card);
    cards.push(card);

    // Only react to a real mouse. Touch devices fire fake hover events
    // that would otherwise leave auto-rotate paused forever.
    card.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "mouse") return;
        isHoveringCard = true;
        pauseWheel();
    });

    card.addEventListener("pointerleave", (event) => {
        if (event.pointerType !== "mouse") return;
        isHoveringCard = false;
        scheduleResume();
    });

    card.addEventListener("click", (event) => {
        pauseWheel();
        scheduleResume();

        // Ignore the click that ends a swipe, or clicks mid-animation
        if (didDrag || isAnimating) {
            event.preventDefault();
            return;
        }

        // Clicking the centered card follows its link
        if (index === activeIndex) return;

        // Clicking any other card rotates it to the center (shortest way round)
        event.preventDefault();

        let offset = index - activeIndex;
        if (offset > cards.length / 2) offset -= cards.length;
        if (offset < -cards.length / 2) offset += cards.length;

        moveWheelTo(Math.round(wheelPosition) + offset);
    });
});

/* ---------- Layouts ---------- */

// Desktop, top focus: cards sit on a big flat circle, focused card at the top
function positionCardsDesktop() {
    const angleBetweenCards = 360 / cards.length;

    cards.forEach((card, index) => {
        const angle = (index - wheelPosition) * angleBetweenCards - 90;
        const radians = angle * (Math.PI / 180);

        const x = Math.cos(radians) * DESKTOP_RADIUS;
        const y = Math.sin(radians) * DESKTOP_RADIUS;

        card.style.transform = `translate(${x}px, ${y}px)`;
        card.classList.toggle("active", index === activeIndex);
    });
}

// Desktop, right focus: the circle hugs the left edge, focused card at its right tip
function positionCardsRight() {
    if (!rightRadius) return;

    const count = cards.length;
    const centerX = rightRadius * RIGHT_CENTER_X_RATIO;
    // Normally the circle is centered vertically. If it's too big for that, it slides
    // down until the highest card sits just under the header, so the top is never
    // cropped. The overflow ends up at the bottom of the page instead.
    const centerY = Math.max(
        wheelHeight / 2,
        RIGHT_EDGE_PADDING + cardHeight / 2 + rightRadius
    );

    // The angle between cards comes from the card size, so the gap between
    // cards stays the same on any screen and with any number of projects
    const stepRadians = (cardHeight * RIGHT_CARD_SPACING) / rightRadius;

    cards.forEach((card, index) => {
        // Slot = how many cards this one is from the focus (negative = above),
        // wrapped so it always takes the shortest way round the loop
        const slot = ((((index - wheelPosition + count / 2) % count) + count) % count) - count / 2;
        const theta = slot * stepRadians;

        // CSS puts the card's top-left at (0, 0) in this mode,
        // so subtract half the card to center it on the circle
        const x = centerX + Math.cos(theta) * rightRadius - cardWidth / 2;
        const y = centerY + Math.sin(theta) * rightRadius - cardHeight / 2;

        // Two fades, whichever is stronger wins:
        // 1. by angle, so cards swinging round to the cut-off left side disappear
        //    instead of leaving slivers at the page edge
        // 2. at the far end of the loop, where cards wrap round, so none pops in or out
        const degrees = Math.abs(theta) * (180 / Math.PI);
        const angleFade = (RIGHT_FADE_END_DEG - degrees) / (RIGHT_FADE_END_DEG - RIGHT_FADE_START_DEG);
        const loopFade = (count / 2 - Math.abs(slot)) / RIGHT_FADE_CARDS;
        const opacity = Math.min(Math.max(Math.min(angleFade, loopFade), 0), 1);

        card.style.transform = `translate(${x}px, ${y}px)`;
        card.style.opacity = opacity;
        card.style.zIndex = Math.round(100 - Math.abs(slot) * 10);
        card.style.pointerEvents = opacity < 0.05 ? "none" : "auto";

        card.classList.toggle("active", index === activeIndex);
    });
}

// Mobile: cards sit on a horizontal 3D cylinder, seen from the front.
// The centered card faces you; the rest curve away behind it,
// smaller, tilted and faded.
function positionCardsMobile() {
    const stepRadians = (Math.PI * 2) / cards.length;
    const radius = cardWidth * MOBILE_RADIUS_RATIO;

    cards.forEach((card, index) => {
        // Wrap the angle into -PI..PI so the tilt can never accumulate
        // past a half turn (which is what made cards appear backwards)
        const fullTurn = Math.PI * 2;
        const raw = (index - wheelPosition) * stepRadians;
        const theta = ((((raw + Math.PI) % fullTurn) + fullTurn) % fullTurn) - Math.PI;

        const depth = Math.cos(theta);            // 1 = front, -1 = directly behind

        const x = Math.sin(theta) * radius;       // slide left/right
        const z = (depth - 1) * radius;           // push back into the screen
        const tilt = theta * (180 / Math.PI) * MOBILE_TILT;
        const scale = 0.6 + 0.4 * Math.max(depth, 0);
        const opacity = Math.min(Math.max(0.25 + 0.75 * depth, 0), 1);

        card.style.transform =
            `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${tilt}deg) scale(${scale})`;
        card.style.opacity = opacity;
        card.style.zIndex = Math.round(depth * 100) + 100;
        card.style.pointerEvents = opacity < 0.05 ? "none" : "auto";

        card.classList.toggle("active", index === activeIndex);
    });
}

function updateActiveIndex() {
    const nearest = Math.round(wheelPosition);
    activeIndex = ((nearest % cards.length) + cards.length) % cards.length;
}

function updateDetails() {
    if (shownIndex === activeIndex) return;
    shownIndex = activeIndex;

    if (detailsTitle) detailsTitle.textContent = projects[activeIndex].title;
    if (detailsText) detailsText.textContent = projects[activeIndex].description;
    if (detailsImage) {
        detailsImage.src = projects[activeIndex].image;
        detailsImage.alt = projects[activeIndex].title;
    }
}

// One function draws everything, whatever is moving the wheel
function render() {
    updateActiveIndex();
    updateDetails();

    if (mobileQuery.matches) {
        positionCardsMobile();
    } else if (focusMode === "right") {
        positionCardsRight();
    } else {
        positionCardsDesktop();
    }
}

/* ---------- Motion ---------- */

let lastFrame = performance.now();

function tick(now) {
    // Time-based so the speed is the same on 60Hz and 120Hz screens
    const dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;

    if (!isPaused && !isAnimating && !isDragging && !reduceMotion) {
        wheelPosition += AUTO_SPEED * dt;
        render();
    }

    requestAnimationFrame(tick);
}

function moveWheelTo(targetPosition) {
    if (isAnimating) return;
    isAnimating = true;

    const startPosition = wheelPosition;
    const distance = targetPosition - startPosition;
    const startTime = performance.now();

    function animate(currentTime) {
        const progress = Math.min((currentTime - startTime) / SNAP_DURATION, 1);

        // Ease in / ease out
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        wheelPosition = startPosition + distance * eased;
        render();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            wheelPosition = targetPosition;
            render();
            isAnimating = false;
            scheduleResume();
        }
    }

    requestAnimationFrame(animate);
}

function moveNext() {
    moveWheelTo(Math.round(wheelPosition) + 1);
}

function movePrevious() {
    moveWheelTo(Math.round(wheelPosition) - 1);
}

function pauseWheel() {
    isPaused = true;
    clearTimeout(resumeTimer);
}

function scheduleResume() {
    clearTimeout(resumeTimer);

    resumeTimer = setTimeout(() => {
        if (!isHoveringCard && !isDragging) {
            isPaused = false;
        }
    }, RESUME_DELAY);
}

/* ---------- Input ---------- */

// Mouse wheel (desktop)
window.addEventListener("wheel", (event) => {
    pauseWheel();
    if (isAnimating) return;

    if (event.deltaY > 0) moveNext();
    else if (event.deltaY < 0) movePrevious();
}, { passive: true });

// Arrow keys
window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
        pauseWheel();
        if (!isAnimating) moveNext();
    } else if (event.key === "ArrowLeft") {
        pauseWheel();
        if (!isAnimating) movePrevious();
    }
});

// Swipe / drag (mobile layout)
let dragStartX = 0;
let dragStartPosition = 0;
let lastX = 0;
let lastTime = 0;
let velocity = 0; // px per ms, negative = finger moving left

wheel.addEventListener("pointerdown", (event) => {
    if (!mobileQuery.matches || isAnimating) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    isDragging = true;
    didDrag = false;
    dragStartX = lastX = event.clientX;
    dragStartPosition = wheelPosition;
    lastTime = performance.now();
    velocity = 0;

    pauseWheel();
});

window.addEventListener("pointermove", (event) => {
    if (!isDragging) return;

    const dx = event.clientX - dragStartX;
    if (Math.abs(dx) > 6) didDrag = true;
    if (!didDrag) return;

    const now = performance.now();
    const dt = now - lastTime;
    if (dt > 0) velocity = (event.clientX - lastX) / dt;
    lastX = event.clientX;
    lastTime = now;

    // Dragging left (negative dx) moves forward through the cards
    wheelPosition = dragStartPosition - dx / PX_PER_CARD;
    render();
});

function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    if (didDrag) {
        let target = Math.round(wheelPosition);

        // A quick flick should advance a card even if it didn't travel far
        if (Math.abs(velocity) > 0.4) {
            target = velocity < 0
                ? Math.ceil(wheelPosition)
                : Math.floor(wheelPosition);
        }

        moveWheelTo(target);

        // Keep didDrag true just long enough to swallow the click that follows
        setTimeout(() => { didDrag = false; }, 50);
    } else {
        scheduleResume();
    }
}

window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);

/* ---------- Responsive ---------- */

function measure() {
    cardWidth = cards[0].offsetWidth;
    cardHeight = cards[0].offsetHeight;
    wheelHeight = wheel.clientHeight;

    // Right-focus radius follows whichever dimension is the tighter fit
    rightRadius = Math.max(0, Math.min(
        wheel.clientHeight * RIGHT_RADIUS_HEIGHT_RATIO,
        wheel.clientWidth * RIGHT_RADIUS_WIDTH_RATIO
    ));

    // Mobile: keep the 3D depth proportional to the card size
    if (mobileQuery.matches) {
        wheel.style.perspective = `${cardWidth * MOBILE_PERSPECTIVE_RATIO}px`;
    } else {
        wheel.style.removeProperty("perspective");
    }
}

// Switching between layouts: clear the styles only the mobile layout uses
mobileQuery.addEventListener("change", () => {
    cards.forEach((card) => {
        card.style.removeProperty("opacity");
        card.style.removeProperty("z-index");
        card.style.removeProperty("pointer-events");
    });
    measure();
    render();
});

// Watching the wheel itself (not just the window) catches every size change
new ResizeObserver(() => {
    measure();
    render();
}).observe(wheel);

/* ---------- Start ---------- */
measure();
render();
requestAnimationFrame(tick);