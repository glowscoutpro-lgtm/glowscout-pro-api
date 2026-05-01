const professionOptions = {
  nails: {
    label: 'Nail technicians',
    defaults: ['gel-manicure', 'spa-pedicure'],
    pros: [
      ['Elina Nail Studio', 4.9, 28, 99, 1, 'Demo mode: live Google verification is required before production display.', true],
      ['Luxe Nail Atelier', 4.9, 186, 98, 1.25, 'Clients mention detailed cuticle work and polished gel finishes.', false],
      ['Polish & Co Studio', 4.8, 94, 94, 1, 'Reviewers praise cleanliness, appointment timing, and spa pedicures.', false],
      ['Bare Beauty Nail Bar', 4.7, 51, 89, 1, 'Guests highlight friendly service and strong classic manicure work.', false]
    ]
  },
  hair: {
    label: 'Hair stylists',
    defaults: ['haircut', 'hair-color'],
    pros: [
      ['Crown & Color Studio', 4.9, 211, 99, 1.25, 'Guests praise color consultations, shine, and one-on-one styling.', false],
      ['The Chair Hair Lounge', 4.8, 132, 95, 1, 'Strong fit for haircuts, blowouts, and natural-looking color refreshes.', false],
      ['Gloss House Salon', 4.7, 76, 90, 1, 'Reviewers mention friendly stylists, clean stations, and reliable scheduling.', false]
    ]
  },
  barber: {
    label: 'Barbers',
    defaults: ['mens-haircut', 'barber-fade'],
    pros: [
      ['Crisp & Co Barber Studio', 4.9, 188, 98, 1, 'Clients praise clean fades, sharp lineups, and appointment timing.', false],
      ['The Modern Barber Chair', 4.8, 121, 94, 1, 'Strong fit for men’s haircuts, beard trims, and hot towel shaves.', false],
      ['Oak Street Barbers', 4.7, 68, 89, 0.9, 'Reviewers mention friendly barbers, quick cleanups, and consistent fades.', false]
    ]
  },
  lashes: {
    label: 'Lash artists',
    defaults: ['lash-extensions'],
    pros: [
      ['Lash Theory Studio', 4.9, 144, 97, 1.25, 'Clients highlight retention, comfort, and soft natural-looking lash sets.', false],
      ['Blink Bar', 4.8, 88, 93, 1, 'Popular for lash fills, lifts, and online booking.', false],
      ['Soft Set Lash Studio', 4.7, 47, 88, 1, 'Reviewers mention careful application and a quiet private studio setting.', false]
    ]
  },
  brows: {
    label: 'Brow specialists',
    defaults: ['brow-shaping'],
    pros: [
      ['Arch & Feather Brow Studio', 4.9, 123, 96, 1, 'Known for brow mapping, balanced shaping, and natural results.', false],
      ['Brow Room Collective', 4.8, 67, 91, 1, 'Strong option for lamination, tinting, and quick cleanups.', false]
    ]
  },
  skin: {
    label: 'Estheticians',
    defaults: ['custom-facial'],
    pros: [
      ['Aura Skin Studio', 4.9, 172, 98, 1.25, 'Guests praise thoughtful consultations, clean rooms, and customized facial plans.', false],
      ['Fresh Face Esthetics', 4.8, 109, 94, 1, 'Popular for facials, dermaplaning, and gentle education.', false]
    ]
  },
  waxing: {
    label: 'Waxing specialists',
    defaults: ['brazilian-wax'],
    pros: [
      ['Smooth Studio', 4.9, 155, 97, 1, 'Reviewers mention fast appointments, cleanliness, and respectful service.', false],
      ['Bare Method Wax Bar', 4.8, 84, 92, 1, 'Strong fit for Brazilian, brow, and body waxing.', false]
    ]
  },
  massage: {
    label: 'Massage therapists',
    defaults: ['swedish-massage'],
    pros: [
      ['Restore Massage Therapy', 4.9, 203, 99, 1.25, 'Clients praise deep tissue work, quiet rooms, and professional intake questions.', false],
      ['Still Point Bodywork', 4.8, 117, 95, 1, 'Popular for Swedish massage, recovery work, and flexible scheduling.', false]
    ]
  },
  makeup: {
    label: 'Makeup artists',
    defaults: ['event-makeup'],
    pros: [
      ['Canvas Makeup Artistry', 4.9, 91, 94, 1.25, 'Clients praise camera-ready makeup, calm communication, and event-day timing.', false],
      ['Soft Glam Collective', 4.8, 64, 90, 1, 'Strong fit for event makeup, lessons, and natural soft glam.', false]
    ]
  },
  wellness: {
    label: 'Wellness pros',
    defaults: ['body-sculpting'],
    pros: [
      ['GlowWell Studio', 4.9, 118, 96, 1.25, 'Guests mention calm spaces, transparent pricing, and wellness-focused care.', false],
      ['Balance Beauty & Wellness', 4.8, 73, 91, 1, 'Popular for sauna sessions, holistic facials, and relaxing treatments.', false]
    ]
  }
};

const servicesByProfession = {
  nails: [
    { slug: 'gel-manicure', label: 'Gel manicure' },
    { slug: 'russian-manicure', label: 'Russian manicure' },
    { slug: 'spa-pedicure', label: 'Spa pedicure' },
    { slug: 'dry-pedicure', label: 'Dry pedicure' },
    { slug: 'builder-gel', label: 'Builder gel' },
    { slug: 'nail-art', label: 'Nail art' }
  ],
  hair: [
    { slug: 'haircut', label: 'Haircut' },
    { slug: 'blowout', label: 'Blowout' },
    { slug: 'hair-color', label: 'Hair color' },
    { slug: 'balayage', label: 'Balayage' },
    { slug: 'hair-extensions', label: 'Extensions' },
    { slug: 'braids', label: 'Braids' }
  ],
  barber: [
    { slug: 'mens-haircut', label: 'Men’s haircut' },
    { slug: 'barber-fade', label: 'Fade' },
    { slug: 'beard-trim', label: 'Beard trim' },
    { slug: 'hot-towel-shave', label: 'Hot towel shave' }
  ],
  lashes: [
    { slug: 'lash-extensions', label: 'Lash extensions' },
    { slug: 'lash-lift', label: 'Lash lift' },
    { slug: 'lash-fill', label: 'Lash fill' }
  ],
  brows: [
    { slug: 'brow-shaping', label: 'Brow shaping' },
    { slug: 'brow-lamination', label: 'Brow lamination' },
    { slug: 'brow-tint', label: 'Brow tint' }
  ],
  skin: [
    { slug: 'custom-facial', label: 'Custom facial' },
    { slug: 'chemical-peel', label: 'Chemical peel' },
    { slug: 'dermaplaning', label: 'Dermaplaning' },
    { slug: 'microneedling', label: 'Microneedling' }
  ],
  waxing: [
    { slug: 'brazilian-wax', label: 'Brazilian wax' },
    { slug: 'brow-wax', label: 'Brow wax' },
    { slug: 'full-leg-wax', label: 'Full leg wax' }
  ],
  massage: [
    { slug: 'swedish-massage', label: 'Swedish massage' },
    { slug: 'deep-tissue-massage', label: 'Deep tissue' },
    { slug: 'sports-massage', label: 'Sports massage' },
    { slug: 'prenatal-massage', label: 'Prenatal massage' }
  ],
  makeup: [
    { slug: 'event-makeup', label: 'Event makeup' },
    { slug: 'bridal-makeup', label: 'Bridal makeup' },
    { slug: 'makeup-lesson', label: 'Makeup lesson' }
  ],
  wellness: [
    { slug: 'body-sculpting', label: 'Body sculpting' },
    { slug: 'sauna-session', label: 'Sauna session' },
    { slug: 'reiki', label: 'Reiki' },
    { slug: 'holistic-facial', label: 'Holistic facial' }
  ]
};

const preferences = [
  'Can book online',
  'Open weekends',
  'Private studio setting',
  'Independent pro preferred',
  'Natural results preferred'
];

const priceRanges = {
  'gel-manicure': ['Gel manicure', 35, 70],
  'russian-manicure': ['Russian manicure', 75, 130],
  'spa-pedicure': ['Spa pedicure', 50, 95],
  'dry-pedicure': ['Dry pedicure', 45, 85],
  'builder-gel': ['Builder gel / BIAB', 60, 115],
  'nail-art': ['Nail art add-on', 10, 55],
  haircut: ['Haircut', 45, 120],
  blowout: ['Blowout', 40, 90],
  'hair-color': ['Hair color', 85, 180],
  balayage: ['Balayage', 160, 350],
  'hair-extensions': ['Hair extensions', 250, 900],
  braids: ['Braids', 80, 280],
  'mens-haircut': ['Men’s haircut', 30, 75],
  'barber-fade': ['Fade', 35, 85],
  'beard-trim': ['Beard trim', 18, 45],
  'hot-towel-shave': ['Hot towel shave', 30, 70],
  'lash-extensions': ['Lash extensions', 120, 260],
  'lash-lift': ['Lash lift', 70, 130],
  'lash-fill': ['Lash fill', 55, 120],
  'brow-shaping': ['Brow shaping', 20, 55],
  'brow-lamination': ['Brow lamination', 70, 140],
  'brow-tint': ['Brow tint', 20, 50],
  'custom-facial': ['Custom facial', 85, 180],
  'chemical-peel': ['Chemical peel', 110, 250],
  dermaplaning: ['Dermaplaning', 75, 160],
  microneedling: ['Microneedling', 180, 450],
  'brazilian-wax': ['Brazilian wax', 55, 95],
  'brow-wax': ['Brow wax', 18, 40],
  'full-leg-wax': ['Full leg wax', 70, 140],
  'swedish-massage': ['Swedish massage', 80, 150],
  'deep-tissue-massage': ['Deep tissue massage', 95, 180],
  'sports-massage': ['Sports massage', 100, 190],
  'prenatal-massage': ['Prenatal massage', 90, 170],
  'event-makeup': ['Event makeup', 90, 200],
  'bridal-makeup': ['Bridal makeup', 150, 400],
  'makeup-lesson': ['Makeup lesson', 80, 180],
  'body-sculpting': ['Body sculpting', 120, 350],
  'sauna-session': ['Sauna session', 25, 65],
  reiki: ['Reiki session', 70, 150],
  'holistic-facial': ['Holistic facial', 95, 210]
};

const locationSuggestions = [
  { city: 'Lake Zurich', state: 'IL', zip: '60047', region: 'Chicago northwest suburbs' },
  { city: 'Long Grove', state: 'IL', zip: '60047', region: 'Chicago northwest suburbs' },
  { city: 'Hawthorn Woods', state: 'IL', zip: '60047', region: 'Chicago northwest suburbs' },
  { city: 'Barrington', state: 'IL', zip: '60010', region: 'Chicago northwest suburbs' },
  { city: 'Deer Park', state: 'IL', zip: '60010', region: 'Chicago northwest suburbs' },
  { city: 'Kildeer', state: 'IL', zip: '60047', region: 'Chicago northwest suburbs' },
  { city: 'Austin', state: 'TX', zip: '78701', region: 'Central Texas' },
  { city: 'Chicago', state: 'IL', zip: '60611', region: 'Chicago metro' },
  { city: 'Naperville', state: 'IL', zip: '60540', region: 'Chicago west suburbs' },
  { city: 'Schaumburg', state: 'IL', zip: '60173', region: 'Chicago northwest suburbs' },
  { city: 'Miami', state: 'FL', zip: '33130', region: 'South Florida' },
  { city: 'New York', state: 'NY', zip: '10001', region: 'New York City' },
  { city: 'Los Angeles', state: 'CA', zip: '90012', region: 'Southern California' }
];

const selectedServices = new Set(professionOptions.nails.defaults);
const selectedPreferences = new Set(['Can book online', 'Private studio setting']);

const licenseStatusCycle = ['state_verified', 'license_found', 'pending_review', 'not_verified'];

function getStateFromLocation(location) {
  const match = location.toUpperCase().match(/\\b([A-Z]{2})\\b/);
  if (match) return match[1];
  if (location.includes('60047') || location.toLowerCase().includes('lake zurich')) return 'IL';
  return '';
}

function getLicenseType(profession) {
  return (
    {
      nails: 'Nail Technician',
      hair: 'Cosmetologist',
      barber: 'Barber',
      lashes: 'Cosmetologist / Esthetician',
      brows: 'Esthetician / Cosmetologist',
      skin: 'Esthetician',
      waxing: 'Esthetician / Cosmetologist',
      massage: 'Massage Therapist',
      makeup: 'Makeup Artist',
      wellness: 'Wellness Professional'
    }[profession] || 'Professional'
  );
}

function getLicenseVerification(profession, location, index, isAreaSpecific) {
  const state = getStateFromLocation(location);
  const licenseType = getLicenseType(profession);
  const status = isAreaSpecific ? 'state_verified' : licenseStatusCycle[index % licenseStatusCycle.length];

  if (status === 'state_verified') {
    return {
      status,
      label: state ? `Verified ${state.toUpperCase()} ${licenseType}` : 'State license verified',
      detail: 'Demo badge: pro-submitted license details matched the official state licensing record.'
    };
  }

  if (status === 'license_found') {
    return {
      status,
      label: state ? `License found in ${state.toUpperCase()}` : 'License found',
      detail: 'Demo badge: GlowScout found a likely public license match, but the pro has not completed self-verification.'
    };
  }

  if (status === 'pending_review') {
    return {
      status,
      label: 'License pending review',
      detail: 'Demo badge: license details were submitted and are waiting for admin or state-board review.'
    };
  }

  return {
    status,
    label: 'License not verified',
    detail: 'This pro may be top-rated on Google, but GlowScout has not verified a state license.'
  };
}

const serviceList = document.querySelector('#service-list');
const preferenceList = document.querySelector('#preference-list');
const resultsList = document.querySelector('#results-list');
const searchButton = document.querySelector('#search-button');
const reviewDrawer = document.querySelector('#review-drawer');
const reviewList = document.querySelector('#review-list');
const locationInput = document.querySelector('#location');
const locationSuggestionsPanel = document.querySelector('#location-suggestions');
const professionSelect = document.querySelector('#profession');
const licensedButton = document.querySelector('#licensed-button');

function getActiveProfession() {
  return professionSelect.value;
}

function getLocationMatches(query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return [];
  }

  return locationSuggestions
    .filter((suggestion) => {
      const searchable = [
        suggestion.city,
        suggestion.state,
        suggestion.zip,
        `${suggestion.city}, ${suggestion.state}`,
        suggestion.region
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    })
    .slice(0, 5);
}

function closeLocationSuggestions() {
  locationSuggestionsPanel.innerHTML = '';
  locationSuggestionsPanel.classList.remove('is-open');
  locationInput.setAttribute('aria-expanded', 'false');
}

function renderLocationSuggestions() {
  const matches = getLocationMatches(locationInput.value);

  if (matches.length === 0) {
    closeLocationSuggestions();
    return;
  }

  locationSuggestionsPanel.innerHTML = matches
    .map(
      (suggestion, index) => `
      <button
        id="location-option-${index}"
        class="location-suggestion"
        type="button"
        role="option"
        data-city="${suggestion.city}"
        data-state="${suggestion.state}"
        data-zip="${suggestion.zip || ''}"
      >
        <span>${suggestion.city}, ${suggestion.state}</span>
        <small>${suggestion.zip ? `${suggestion.zip} · ` : ''}${suggestion.region}</small>
      </button>
    `
    )
    .join('');

  locationSuggestionsPanel.classList.add('is-open');
  locationInput.setAttribute('aria-expanded', 'true');

  locationSuggestionsPanel.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      locationInput.value = `${button.dataset.city}, ${button.dataset.state}${
        button.dataset.zip ? ` ${button.dataset.zip}` : ''
      }`;
      closeLocationSuggestions();
      renderResults();
    });
  });
}

function renderServiceButtons() {
  const services = servicesByProfession[getActiveProfession()];
  serviceList.innerHTML = services
    .map(
      (service) => `
      <button
        class="service-button"
        type="button"
        data-service="${service.slug}"
        aria-pressed="${selectedServices.has(service.slug)}"
      >${service.label}</button>
    `
    )
    .join('');

  serviceList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const service = button.dataset.service;
      if (selectedServices.has(service)) {
        selectedServices.delete(service);
      } else {
        selectedServices.add(service);
      }
      renderServiceButtons();
      renderResults();
    });
  });
}

function renderPreferenceButtons() {
  preferenceList.innerHTML = preferences
    .map(
      (preference) => `
      <button
        class="chip-button"
        type="button"
        data-preference="${preference}"
        aria-pressed="${selectedPreferences.has(preference)}"
      >${preference}</button>
    `
    )
    .join('');

  preferenceList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const preference = button.dataset.preference;
      if (selectedPreferences.has(preference)) {
        selectedPreferences.delete(preference);
      } else {
        selectedPreferences.add(preference);
      }
      renderPreferenceButtons();
    });
  });
}

function getCostLines(pro) {
  const active = Array.from(selectedServices);
  const profession = getActiveProfession();
  const servicesToShow = active.length > 0 ? active : professionOptions[profession].defaults;

  return servicesToShow
    .map((slug) => {
      const [label, low, high] = priceRanges[slug];
      return `<p class="cost-line">${label}: $${Math.round(low * pro.multiplier)}-$${Math.round(
        high * pro.multiplier
      )}</p>`;
    })
    .join('');
}

function makeReviews(proName) {
  return [
    {
      author: 'Google reviewer',
      rating: 5,
      time: 'Demo mode',
      text: `Demo review placeholder for ${proName}. Live searches display real Google reviewer content here.`
    },
    {
      author: 'Google reviewer',
      rating: 5,
      time: 'Demo mode',
      text: 'Demo review placeholder showing the second written review slot.'
    }
  ];
}

function getVisiblePros() {
  const profession = getActiveProfession();
  const location = locationInput.value || 'your area';
  const normalizedLocation = location.toLowerCase();
  const showElina =
    profession === 'nails' &&
    (normalizedLocation.includes('60047') ||
      normalizedLocation.includes('lake zurich') ||
      normalizedLocation.includes('long grove') ||
      normalizedLocation.includes('hawthorn woods'));

  return professionOptions[profession].pros
    .filter((pro) => !pro[6] || showElina)
    .map(([name, rating, reviewCount, score, multiplier, quote, isAreaSpecific], index) => ({
      name,
      rating,
      reviewCount,
      score,
      multiplier,
      quote,
      isAreaSpecific,
      address: isAreaSpecific ? '291 S Rand Road, Lake Zurich, IL 60047' : `${location} · ${1.8 + index * 1.3} mi`,
      licenseVerification: getLicenseVerification(profession, location, index, isAreaSpecific),
      reviews: makeReviews(name)
    }));
}

function renderResults() {
  const visiblePros = getVisiblePros();
  const licensedNote = selectedPreferences.has('Licensed pro') ? ' · licensed preferred' : '';
  document.querySelector('#results-title').textContent = `${visiblePros.length} matching pros${licensedNote}`;

  resultsList.innerHTML = visiblePros
    .map(
      (pro) => `
      <article class="pro-card">
        <div class="pro-top">
          <div>
            <h4 class="pro-name">${pro.name}</h4>
            <p class="pro-address">${pro.address}</p>
          </div>
          <div class="score" aria-label="${pro.score} percent match">${pro.score}</div>
        </div>
        <p class="rating"><span>★</span> ${pro.rating.toFixed(1)} stars · ${pro.reviewCount} Google reviews</p>
        <div class="badge-row">
          <span class="trust-badge google-badge">Top-rated</span>
          <span class="trust-badge license-badge ${pro.licenseVerification.status}">${pro.licenseVerification.label}</span>
        </div>
        <p class="license-detail">${pro.licenseVerification.detail}</p>
        <div class="cost-box">
          <strong>Estimated service costs</strong>
          ${getCostLines(pro)}
        </div>
        <p class="review-quote">“${pro.quote}”</p>
        <div class="actions">
          <a href="tel:5550120186">Call</a>
          <a href="https://example.com" target="_blank" rel="noreferrer">Website</a>
          <a href="https://maps.google.com" target="_blank" rel="noreferrer">Map</a>
          <button type="button" data-review-pro="${pro.name}">View reviews</button>
        </div>
      </article>
    `
    )
    .join('');

  resultsList.querySelectorAll('[data-review-pro]').forEach((button) => {
    button.addEventListener('click', () => {
      const pro = visiblePros.find((candidate) => candidate.name === button.dataset.reviewPro);
      openReviews(pro);
    });
  });
}

function openReviews(pro) {
  if (!pro) return;

  document.querySelector('#review-title').textContent = pro.name;
  document.querySelector('#review-subtitle').textContent = `${pro.rating.toFixed(1)} stars · ${
    pro.reviews.length
  } written review excerpts`;
  reviewList.innerHTML = pro.reviews
    .slice(0, 5)
    .map(
      (review) => `
      <article class="review-item">
        <p class="review-author">${review.author} · ${review.rating} stars</p>
        <p class="review-meta">${review.time}</p>
        <p class="review-text">“${review.text}”</p>
      </article>
    `
    )
    .join('');

  reviewDrawer.classList.add('is-open');
  reviewDrawer.setAttribute('aria-hidden', 'false');
}

document.querySelectorAll('[data-close-reviews]').forEach((button) => {
  button.addEventListener('click', () => {
    reviewDrawer.classList.remove('is-open');
    reviewDrawer.setAttribute('aria-hidden', 'true');
  });
});

searchButton.addEventListener('click', () => {
  searchButton.classList.add('is-loading');
  searchButton.textContent = 'Scouting verified pros...';
  resultsList.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';

  setTimeout(() => {
    searchButton.classList.remove('is-loading');
    searchButton.textContent = 'Find verified pros';
    renderResults();
    document.querySelector('.results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 650);
});

professionSelect.addEventListener('change', () => {
  selectedServices.clear();
  professionOptions[getActiveProfession()].defaults.forEach((service) => selectedServices.add(service));
  renderServiceButtons();
  renderResults();
});

licensedButton.addEventListener('click', () => {
  if (selectedPreferences.has('Licensed pro')) {
    selectedPreferences.delete('Licensed pro');
  } else {
    selectedPreferences.add('Licensed pro');
  }
  licensedButton.setAttribute('aria-pressed', String(selectedPreferences.has('Licensed pro')));
  renderResults();
});

locationInput.addEventListener('input', renderLocationSuggestions);
locationInput.addEventListener('focus', renderLocationSuggestions);
locationInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeLocationSuggestions();
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.location-combobox')) {
    closeLocationSuggestions();
  }
});

document.querySelector('[data-theme-toggle]').addEventListener('click', () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
});

renderServiceButtons();
renderPreferenceButtons();
renderResults();
