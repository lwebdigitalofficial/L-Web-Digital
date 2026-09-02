const nav = document.getElementById('nav');
const hamburger = document.querySelector('.hamburger');

if (hamburger && nav) {
  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    if (open) {
      nav.style.display = 'flex';
      nav.style.position = 'absolute';
      nav.style.top = '76px';
      nav.style.left = '0';
      nav.style.right = '0';
      nav.style.background = '#050507';
      nav.style.flexDirection = 'column';
      nav.style.padding = '10px 25px 20px';
      nav.style.gap = '0';
    } else {
      nav.removeAttribute('style');
    }
  });
}

document.querySelectorAll('nav a').forEach(a =>
  a.addEventListener('click', () => nav && nav.removeAttribute('style'))
);

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// The form uses a normal POST to FormSubmit. This is intentional:
// it avoids browser/CORS issues and lets FormSubmit handle the email delivery.
const contactForm = document.getElementById('contactForm');
const successBox = document.getElementById('success');

if (contactForm) {
  contactForm.addEventListener('submit', () => {
    const emailInput = contactForm.querySelector('input[name="email"]');
    const replyTo = contactForm.querySelector('input[name="_replyto"]');
    if (emailInput && replyTo) replyTo.value = emailInput.value.trim();

    const button = contactForm.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }
  });
}

// FormSubmit redirects back here after a successful submission.
if (new URLSearchParams(window.location.search).get('sent') === '1' && successBox) {
  successBox.textContent = 'Thanks! Your inquiry has been sent successfully. We will contact you soon.';
  successBox.style.display = 'block';
  const contact = document.getElementById('contact');
  if (contact) setTimeout(() => contact.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
}

const links = [...document.querySelectorAll('nav a')];
const sections = [...document.querySelectorAll('main section[id]')];
window.addEventListener('scroll', () => {
  let current = 'home';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 130) current = s.id;
  });
  links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current));
});
