// UX Projects Page

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

const wheel = document.querySelector(".project-wheel");

const cards = [];

let activeIndex = 0;
let wheelPosition = 0;

let isPaused = false;
let resumeTimer;
let isHoveringCard = false;
let isAnimating = false;

projects.forEach((project, index) => {

    const card = document.createElement("a");

    card.classList.add("project-card");

    card.href = project.link;

    card.target = "_blank";
    card.rel = "noopener noreferrer";

    card.innerHTML = `
        <img src="${project.image}" alt="${project.title}">
        <h3>${project.title}</h3>`;

    wheel.appendChild(card);

    cards.push(card);

    card.addEventListener("mouseenter", () => {

        isHoveringCard = true;

        pauseWheel();

    });

    card.addEventListener("mouseleave", () => {

        isHoveringCard = false;

        scheduleResume();
    });

    card.addEventListener("click", (event) => {

    pauseWheel();

    if (isAnimating) {
        event.preventDefault();

        return;
    }

    if (index === activeIndex) {
        return;
    }

    event.preventDefault();

    if (
        index ===
        (activeIndex + 1) % cards.length
    ) {
        moveNext();
    }

    else if (
        index ===
        (activeIndex - 1 + cards.length) % cards.length
    ) {
        movePrevious();
    }
});

function positionCards(position) {

    const angleBetweenCards =
        360 / cards.length;

    const radius = 550;

    cards.forEach((card, index) => {

        const angle =
            (index - position) *
            angleBetweenCards -
            90;

        const angleInRadians =
            angle * (Math.PI / 180);

        const x =
            Math.cos(angleInRadians) *
            radius;

        const y =
            Math.sin(angleInRadians) *
            radius;

        card.style.transform =
            `translate(${x}px, ${y}px)`;

        card.classList.toggle(
            "active",
            index === activeIndex
        );

    });
}

function positionCardsMobile() {

    const cardWidth = cards[0].offsetWidth;
    const gap = 30;

    cards.forEach((card, index) => {

        let difference = index - activeIndex;

        // Wrap around the carousel
        if (difference > cards.length / 2) {
            difference -= cards.length;
        }

        if (difference < -cards.length / 2) {
            difference += cards.length;
        }

        const x =
            difference * (cardWidth + gap);

        card.style.transform =
            `translateX(calc(-50% + ${x}px))`;

        card.classList.toggle(
            "active",
            index === activeIndex
        );

    });
}

function positionResponsive() {

    if (window.innerWidth <= 768) {

        positionCardsMobile();

    } else {

        positionCards(wheelPosition);

    }

}
positionCards(wheelPosition);

function animateWheel() {

    if (
        !isPaused &&
        window.innerWidth > 768
    ) {

        wheelPosition += 0.0008;

        updateActiveIndex();

        positionCards(wheelPosition);
    }

    requestAnimationFrame(animateWheel);
}

animateWheel();

function moveWheelTo(targetPosition) {
    if (isAnimating) {
        return;
}
    isAnimating = true;

    const startPosition = wheelPosition;

    const distance =
        targetPosition - startPosition;

    const duration = 600;

    const startTime =
        performance.now();

function animate(currentTime) {

        const elapsed =
            currentTime - startTime;

        const progress =
            Math.min(elapsed / duration, 1);

        // Ease in / ease out
        const eased =
            progress < 0.5
                ? 2 * progress * progress: 1 -
                Math.pow(-2 * progress + 2, 2) / 2;

        wheelPosition =
            startPosition + distance * eased;

        updateActiveIndex();

        positionCards(wheelPosition);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }

        else {
            wheelPosition =
                targetPosition;

            updateActiveIndex();

            positionCards(wheelPosition);

            isAnimating = false;

            scheduleResume();
        }}
    requestAnimationFrame(
        animate
    );
}

function updateActiveIndex() {
    const nearestIndex =
        Math.round(wheelPosition);

    activeIndex =
        ((nearestIndex % cards.length) + cards.length)
        % cards.length;
}

function moveNext() {

    if (window.innerWidth <= 768) {

        activeIndex++;

        if (activeIndex >= cards.length) {
            activeIndex = 0;
        }

        positionCardsMobile();

        return;
    }


    const currentPosition =
        Math.round(wheelPosition);

    const nextPosition =
        currentPosition + 1;

    moveWheelTo(nextPosition);
}

function movePrevious() {

    if (window.innerWidth <= 768) {

        activeIndex--;

        if (activeIndex < 0) {
            activeIndex = cards.length - 1;
        }

        positionCardsMobile();

        return;
    }


    const currentPosition =
        Math.round(wheelPosition);

    const previousPosition =
        currentPosition - 1;

    moveWheelTo(previousPosition);
}

function pauseWheel() {
    isPaused = true;

    clearTimeout(
        resumeTimer
    );
}

function scheduleResume() {

    clearTimeout(resumeTimer);

    resumeTimer = setTimeout(() => {

        if (!isHoveringCard) {

            isPaused = false;

        }

    }, 5000);

}

window.addEventListener("wheel", (event) => {

    pauseWheel();

    if (isAnimating) {
        return;
    }

    if (window.innerWidth <= 768) {

        if (event.deltaY > 0) {
            moveNext();
        } else if (event.deltaY < 0) {
            movePrevious();
        }

        scheduleResume();

        return;
    }


    // Desktop behavior
    if (event.deltaY > 0) {
        moveNext();
    } else if (event.deltaY < 0) {
        movePrevious();
    }

});
});
window.addEventListener("resize", () => {

    positionResponsive();

});