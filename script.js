const nav = document.getElementById('nav');
const hamburger = document.querySelector('.hamburger');
hamburger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  if(open){
    nav.style.display='flex';
    nav.style.position='absolute';
    nav.style.top='76px';
    nav.style.left='0';
    nav.style.right='0';
    nav.style.background='#050507';
    nav.style.flexDirection='column';
    nav.style.padding='10px 25px 20px';
    nav.style.gap='0';
  }else{
    nav.removeAttribute('style');
  }
});
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>nav.removeAttribute('style')));
document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  document.getElementById('success').style.display='block';
  e.target.reset();
});
const links=[...document.querySelectorAll('nav a')];
const sections=[...document.querySelectorAll('main section[id]')];
window.addEventListener('scroll',()=>{
  let current='home';
  sections.forEach(s=>{ if(window.scrollY >= s.offsetTop-130) current=s.id; });
  links.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+current));
});
