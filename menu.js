const header = document.querySelector("header");
const toggle = header.querySelector(".menu-toggle");

function setOpen(open) {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
}

toggle.addEventListener("click", () => setOpen(!header.classList.contains("menu-open")));

// Click anywhere else to close
document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) setOpen(false);
});

// Escape closes it and returns focus to the button
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("menu-open")) {
        setOpen(false);
        toggle.focus();
    }
});

// Growing past 650px brings the normal menu back, so reset the open state
window.matchMedia("(min-width: 651px)").addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
});