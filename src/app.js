document.documentElement.classList.replace('no-js','js');
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Real document links provide navigation, deep linking and browser history.
// JavaScript adds the menu, browsing controls and enquiry submission.
const menuButton = $('.menu-toggle');
const mobileMenu = $('#mobile-navigation');
function setMenu(open) {
  mobileMenu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  document.body.classList.toggle('scroll-locked', open);
}
menuButton?.addEventListener('click', () => setMenu(mobileMenu.hidden));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mobileMenu && !mobileMenu.hidden) {
    setMenu(false);
    menuButton.focus();
  }
  if (event.key === 'Tab' && mobileMenu && !mobileMenu.hidden) {
    const links = $$('a', mobileMenu);
    const first = menuButton;
    const last = links.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
});
window.matchMedia('(min-width: 981px)').addEventListener('change', event => {
  if (event.matches && mobileMenu && !mobileMenu.hidden) setMenu(false);
});

$$('.rail').forEach(rail => {
  const controls = $$('[data-rail]').filter(button => button.dataset.rail === rail.id);
  const update = () => {
    const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    controls.forEach(button => {
      button.disabled = Number(button.dataset.direction) < 0 ? rail.scrollLeft < 4 : rail.scrollLeft >= max - 4;
    });
  };
  controls.forEach(button => button.addEventListener('click', () => {
    const first = rail.firstElementChild;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 16;
    const step = first ? first.getBoundingClientRect().width + gap : rail.clientWidth;
    rail.scrollBy({left: step * Number(button.dataset.direction), behavior: reducedMotion() ? 'instant' : 'smooth'});
  }));
  rail.addEventListener('scroll', update, {passive: true});
  new ResizeObserver(update).observe(rail);
  update();
});

const filters = $$('[data-filter]');
const photoCards = $$('[data-photo]');
let currentCategory = 'All';
const validCategories = filters.map(button => button.dataset.filter);
function applyFilter(category, changeUrl = false) {
  currentCategory = validCategories.includes(category) ? category : 'All';
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === currentCategory)));
  photoCards.forEach(card => {card.hidden = currentCategory !== 'All' && card.dataset.category !== currentCategory;});
  const status = $('.gallery-status');
  if (status) status.textContent = `${photoCards.filter(card => !card.hidden).length} photographs shown${currentCategory === 'All' ? '' : ` in ${currentCategory}`}.`;
  if (changeUrl) {
    const url = new URL(window.location.href);
    if (currentCategory === 'All') url.searchParams.delete('category');
    else url.searchParams.set('category', currentCategory);
    history.replaceState(null, '', url.pathname + url.search);
  }
}
filters.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter, true)));
if (filters.length) applyFilter(new URLSearchParams(location.search).get('category') || 'All');

const lightbox = $('.lightbox');
let lightboxCards = [];
let photoIndex = 0;
let photoOpener;
function showPhoto(index) {
  if (!lightboxCards.length) return;
  photoIndex = (index + lightboxCards.length) % lightboxCards.length;
  const card = lightboxCards[photoIndex];
  const image = $('.lightbox-image', lightbox);
  image.src = card.dataset.src;
  image.alt = card.dataset.alt;
  $('.lightbox-caption', lightbox).textContent = card.dataset.caption;
  $('.photo-count', lightbox).textContent = `${photoIndex + 1} / ${lightboxCards.length}`;
}
photoCards.forEach(card => card.addEventListener('click', () => {
  lightboxCards = photoCards.filter(item => !item.hidden);
  photoOpener = card;
  showPhoto(lightboxCards.indexOf(card));
  lightbox.showModal();
  document.body.classList.add('scroll-locked');
  $('.lightbox-close', lightbox).focus();
}));
$('.lightbox-close', lightbox)?.addEventListener('click', () => lightbox.close());
$$('[data-photo-direction]', lightbox).forEach(button => button.addEventListener('click', () => showPhoto(photoIndex + Number(button.dataset.photoDirection))));
lightbox?.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') {event.preventDefault();showPhoto(photoIndex + 1);}
  if (event.key === 'ArrowLeft') {event.preventDefault();showPhoto(photoIndex - 1);}
});
lightbox?.addEventListener('click', event => {
  if (event.target !== lightbox) return;
  const rect = lightbox.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) lightbox.close();
});
lightbox?.addEventListener('close', () => {
  document.body.classList.remove('scroll-locked');
  photoOpener?.focus();
});

const form = $('#enquiry-form');
if (form) {
  const endpoint = form.dataset.endpoint || '';
  let startedAt = Date.now();
  let formOpenedAt = performance.now();
  let submissionId = '';
  let submissionDetails = '';
  let sending = false;
  const params = new URLSearchParams(location.search);
  const requestedService = params.get('service');
  const serviceSelect = $('#enquiry-service');
  const options = [...serviceSelect.options].map(option => option.value);
  if (requestedService && options.includes(requestedService)) {
    serviceSelect.value = requestedService;
    $('.optional-details').open = true;
  }
  const area = params.get('area');
  if (['Brisbane','Gold Coast','Sunshine Coast'].includes(area)) $('#enquiry-suburb').placeholder = `Building suburb in ${area}`;

  const contact = $('#enquiry-contact');
  const formError = $('.form-error');
  contact.addEventListener('input', () => {contact.setCustomValidity('');formError.hidden = true;});
  let enquiryText = '';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    const data = new FormData(form);
    const preferredContact = String(data.get('contact') || '').trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(preferredContact);
    const isPhone = /^[+()\d\s.-]{6,25}$/.test(preferredContact) && (preferredContact.match(/\d/g) || []).length >= 6;
    if (!isEmail && !isPhone) {
      const message = 'Enter a phone number or email address so Noxy can reply.';
      contact.setCustomValidity(message);
      formError.textContent = message;formError.hidden = false;contact.reportValidity();return;
    }
    if (!form.reportValidity()) return;
    const details = {
      name: String(data.get('name') || '').trim(),
      contact: preferredContact,
      suburb: String(data.get('suburb') || '').trim(),
      problem: String(data.get('problem') || '').trim(),
      service: String(data.get('service') || ''),
      role: String(data.get('role') || ''),
      timing: String(data.get('timing') || ''),
      report: String(data.get('report') || ''),
    };
    const optional = [['Service',details.service],['Role',details.role],['Timing',details.timing],['Existing report',details.report]].filter(item=>item[1]);
    enquiryText = `Hi Noxy,\n\nI’d like to discuss a remedial building project.\n\nName: ${details.name}\nPreferred contact: ${details.contact}\nBuilding suburb: ${details.suburb}\n${optional.map(([label,value])=>`${label}: ${value}\n`).join('')}\nWhat’s happening:\n${details.problem}\n\nPlease let me know the next step for an assessment and scope.\n\nThanks,\n${details.name}`;
    const subject = `Building enquiry — ${details.suburb}${details.service ? ` — ${details.service}` : ''}`;
    $('#enquiry-preview').textContent = enquiryText;
    $('#enquiry-mailto').href = `mailto:noxy@hydrotecbuildingprotectiongroup.com.au?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(enquiryText)}`;
    if (endpoint) {
      const signature = JSON.stringify(details);
      if (!submissionId || signature !== submissionDetails) {
        submissionId = crypto.randomUUID();
        submissionDetails = signature;
      }
      const submit = $('.form-submit', form);
      const originalLabel = submit.innerHTML;
      const status = $('#enquiry-send-status');
      const fallback = $('#enquiry-fallback');
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 30000);
      sending = true;
      submit.disabled = true;
      submit.textContent = 'Sending your enquiry…';
      form.setAttribute('aria-busy', 'true');
      formError.hidden = true;
      fallback.hidden = true;
      status.textContent = 'Sending your enquiry securely.';
      try {
        const result = await fetch(endpoint, {
          method: 'POST', credentials: 'omit', signal: abort.signal,
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...details, submissionId, startedAt, elapsedMs: Math.round(performance.now() - formOpenedAt), website: String(data.get('website') || '')}),
        });
        let payload;
        try {payload = await result.json();} catch {payload = {};}
        if (!result.ok || payload.reference !== `HT-${submissionId}`) {
          const knownError = [400,409,429,503].includes(result.status) && typeof payload.message === 'string';
          throw new Error(knownError ? payload.message : 'We could not confirm your enquiry was sent. Please retry, or call or email Noxy directly.');
        }
        form.hidden = true;
        $('.form-heading').hidden = true;
        const success = $('#enquiry-success');
        success.hidden = false;
        $('#enquiry-reference').textContent = `Your reference: ${payload.reference}`;
        success.scrollIntoView({block:'start',behavior:reducedMotion()?'instant':'smooth'});
        $('#enquiry-success-title').focus({preventScroll:true});
        // Conversion tracking must listen only after the backend confirms receipt.
        // Never include form values in analytics; account setup remains separate.
        window.dispatchEvent(new CustomEvent('hydrotec:enquiry-submitted', {detail:{reference:payload.reference}}));
      } catch (error) {
        formError.textContent = error.name === 'AbortError' ? 'Sending took longer than expected. Wait a minute and retry, or contact Noxy directly. Your details are still here.' : error instanceof TypeError ? 'The connection was interrupted. Please retry, or call or email Noxy directly. Your details are still here.' : error.message;
        formError.hidden = false;
        fallback.href = $('#enquiry-mailto').href;
        fallback.hidden = false;
        formError.tabIndex = -1;
        formError.focus();
      } finally {
        clearTimeout(timeout);
        sending = false;
        submit.disabled = false;
        submit.innerHTML = originalLabel;
        form.removeAttribute('aria-busy');
        status.textContent = '';
      }
      return;
    }
    form.hidden = true;
    const review = $('#enquiry-review');
    review.hidden = false;
    $('.form-heading').hidden = true;
    review.scrollIntoView({block:'start',behavior:reducedMotion()?'instant':'smooth'});
    $('#enquiry-mailto').focus({preventScroll:true});
  });
  $('#enquiry-edit').addEventListener('click', () => {
    $('#enquiry-review').hidden = true;form.hidden = false;$('.form-heading').hidden = false;
    $('.copy-status').textContent = '';
    $('#enquiry-name').focus({preventScroll:true});
    form.scrollIntoView({block:'start',behavior:reducedMotion()?'instant':'smooth'});
  });
  $('#enquiry-copy').addEventListener('click', async () => {
    const status = $('.copy-status');
    try {
      await navigator.clipboard.writeText(enquiryText);
      status.textContent = 'Copied. Paste the enquiry into an email to Noxy and attach any relevant photos or report.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents($('#enquiry-preview'));
      selection.removeAllRanges();selection.addRange(range);
      status.textContent = 'The enquiry text is selected. Copy it and paste it into your email app.';
    }
  });
  $('#enquiry-new')?.addEventListener('click', () => {
    form.reset();
    submissionId = '';submissionDetails = '';startedAt = Date.now();formOpenedAt = performance.now();
    $('#enquiry-success').hidden = true;
    form.hidden = false;$('.form-heading').hidden = false;
    $('#enquiry-name').focus();
  });
}
