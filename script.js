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


// Real ratings: persistent backend data from /api/ratings (Supabase via Vercel).
const ratingForm = document.getElementById('ratingForm');
const ratingValue = document.getElementById('ratingValue');
const ratingName = document.getElementById('ratingName');
const ratingMessage = document.getElementById('ratingMessage');
const ratingSubmit = document.getElementById('ratingSubmit');
const ratingStars = [...document.querySelectorAll('.real-rating-input button')];
const ratingScore = document.getElementById('siteRating');
const ratingMeta = document.getElementById('siteRatingMeta');
const ratingsListWrap = document.getElementById('ratingsListWrap');
const ratingsList = document.getElementById('ratingsList');
const ratingsCountLabel = document.getElementById('ratingsCountLabel');

function setRatingStars(value){
  ratingStars.forEach(button => button.classList.toggle('active', Number(button.dataset.rating) <= value));
}
function setRatingMessage(text,type=''){
  if(!ratingMessage) return;
  ratingMessage.textContent=text;
  ratingMessage.className=`rating-message${type ? ` ${type}` : ''}`;
}
function renderRating(data){
  const count=Number(data?.count||0);
  const average=data?.average==null?null:Number(data.average);
  if(!count || average==null){
    if(ratingScore) ratingScore.textContent='—';
    if(ratingMeta) ratingMeta.textContent='Be the first to rate L Web Digital';
    return;
  }
  if(ratingScore) ratingScore.textContent=`★ ${average.toFixed(1)}/5`;
  if(ratingMeta) ratingMeta.textContent=`Rating · ${count.toLocaleString()} vote${count===1?'':'s'}`;
}
function renderRatingList(items,total){
  if(!ratingsListWrap || !ratingsList) return;
  if(!items?.length){ ratingsListWrap.hidden=true; return; }
  ratingsListWrap.hidden=false;
  if(ratingsCountLabel) ratingsCountLabel.textContent=`${Number(total||items.length).toLocaleString()} total`;
  ratingsList.innerHTML=items.map(item=>{
    const name=String(item.name||'Anonymous').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const stars='★'.repeat(Number(item.rating))+'☆'.repeat(5-Number(item.rating));
    const date=item.created_at?new Date(item.created_at).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'';
    return `<div class="rating-item"><div class="rating-item-top"><span class="rating-item-name">${name}</span><span class="rating-item-stars" aria-label="${Number(item.rating)} out of 5 stars">${stars}</span></div><span class="rating-item-date">${date}</span></div>`;
  }).join('');
}
async function loadRatings(){
  try{
    const response=await fetch('/api/ratings',{headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok) throw new Error();
    const data=await response.json();
    renderRating(data); renderRatingList(data.ratings||[],data.count||0);
  }catch{
    if(ratingScore) ratingScore.textContent='—';
    if(ratingMeta) ratingMeta.textContent='Ratings are temporarily unavailable';
  }
}
ratingStars.forEach(button=>{
  button.addEventListener('mouseenter',()=>setRatingStars(Number(button.dataset.rating)));
  button.addEventListener('click',()=>{const value=Number(button.dataset.rating); if(ratingValue) ratingValue.value=String(value); setRatingStars(value);});
  button.addEventListener('mouseleave',()=>setRatingStars(Number(ratingValue?.value||0)));
});
if(ratingForm){
  ratingForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const rating=Number(ratingValue?.value||0);
    const name=String(ratingName?.value||'').trim();
    const website=String(document.getElementById('ratingWebsite')?.value||'').trim();
    if(!rating || rating<1 || rating>5){setRatingMessage('Please select a rating from 1 to 5 stars.','error');return;}
    if(name.length>80){setRatingMessage('Name must be 80 characters or fewer.','error');return;}
    ratingSubmit.disabled=true; setRatingMessage('Submitting…');
    try{
      const response=await fetch('/api/ratings',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({rating,name,website})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) {
        const message = typeof data.error === 'string' ? data.error : (typeof data.message === 'string' ? data.message : 'Unable to submit rating.');
        throw new Error(message);
      }
      if(ratingName) ratingName.value='';
      if(ratingValue) ratingValue.value='';
      setRatingStars(0); setRatingMessage('Thank you! Your rating has been submitted.','success');
      renderRating(data); renderRatingList(data.ratings||[],data.count||0);
    }catch(error){
      setRatingMessage(error.message||'Unable to submit rating. Please try again.','error');
    }finally{ratingSubmit.disabled=false;}
  });
  loadRatings();
}

// Anonymous local view indicators (no identity is collected).
(function setupViewIndicators(){
  const websiteEl=document.getElementById('websiteViews');
  const portfolioEl=document.getElementById('portfolioViews');
  try{
    const viewed=localStorage.getItem('lwd_site_viewed');
    const current=Number(localStorage.getItem('lwd_site_view_count')||0);
    if(!viewed){ localStorage.setItem('lwd_site_viewed','1'); localStorage.setItem('lwd_site_view_count',String(current+1)); }
    if(websiteEl) websiteEl.textContent=String(Number(localStorage.getItem('lwd_site_view_count')||1));
    const portfolio=document.getElementById('portfolio');
    const markPortfolio=()=>{
      if(localStorage.getItem('lwd_portfolio_viewed')) return;
      const n=Number(localStorage.getItem('lwd_portfolio_view_count')||0)+1;
      localStorage.setItem('lwd_portfolio_viewed','1'); localStorage.setItem('lwd_portfolio_view_count',String(n));
    };
    if(portfolio){
      const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){markPortfolio();observer.disconnect();}}, {threshold:.15});
      observer.observe(portfolio);
    }
    if(portfolioEl) portfolioEl.textContent=String(Number(localStorage.getItem('lwd_portfolio_view_count')||0));
  }catch{
    if(websiteEl) websiteEl.textContent='—';
    if(portfolioEl) portfolioEl.textContent='—';
  }
})();
