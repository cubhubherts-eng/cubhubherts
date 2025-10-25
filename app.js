// Front-end logic (ESM)
const API_LIST = '/.netlify/functions/get_listings';
const API_SUBMIT = '/.netlify/functions/submit_listing';
const API_PLATFORM = '/.netlify/functions/platform';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
// Category → Subcategories map
const SUBCATS = {
  "Childcare Providers": ["Nanny","Babysitter","Childminder","Au Pair","Maternity Nurse","Night Nanny","Doula","Other"],
  "Tutors": ["Pre-primary","Primary","Secondary","Language","Music","Other"],
  "Nurseries & Preschools": ["Day Nursery","Preschool","Montessori","Forest School","Term Time Only","Year Round","Other"],
  "Holiday & Out of School Clubs": ["Holiday Club","After School Club","Breakfast Club","Sports","Arts & Crafts","STEM","Other"],
  "Events": ["Free","Payable","Workshop","Open Day","Parents","SEN","Other"],
  "Jobs": ["Nanny","Babysitter","Childminder","Nursery Roles","School Roles","Tutor","Other"],
  "Agencies": ["Nanny agency","Babysitting agency","Recruitment agency","Other"]
};

function populateSubcategories(selectCatEl, selectSubEl){
  const cat = selectCatEl.value.trim();
  const subs = SUBCATS[cat] || [];
  selectSubEl.innerHTML = '<option value="">' + (selectSubEl.id.includes('subcategoryInput') ? 'Select…' : 'Any') + '</option>' + subs.map(s => `<option>${s}</option>`).join('');
}

// On load, set up subcategory selects
const catSearch = $('#category');
const subSearch = $('#subcategory');
if (catSearch && subSearch){
  catSearch.addEventListener('change', ()=> populateSubcategories(catSearch, subSearch));
  populateSubcategories(catSearch, subSearch);
}
const catInput = $('#categoryInput');
const subInput = $('#subcategoryInput');
if (catInput && subInput){
  catInput.addEventListener('change', ()=> populateSubcategories(catInput, subInput));
  populateSubcategories(catInput, subInput);
}


const listingsGrid = $('#listingsGrid');
const emptyState = $('#emptyState');
const resultCount = $('#resultCount');
const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

// Render a single card
function cardTemplate(item){
  const img = item.featuredImageUrl ? `<img src="${item.featuredImageUrl}" alt="">` : `<img alt="" />`;
  const tags = (item.tags || []).slice(0,8).map(t => `<span class="badge">${t}</span>`).join('');
  const website = item.website ? `<a href="${item.website}" target="_blank" rel="noopener">Visit website</a>` : '';
  const meta = [item.category, item.town].filter(Boolean).join(' • ');
  return `<article class="card">
    ${img}
    <div class="pad">
      <h3>${item.title || 'Untitled'}</h3>
      <div class="meta">${meta}</div>
      <p>${(item.about || '').slice(0,160)}${item.about && item.about.length>160?'…':''}</p>
      <div class="badges">${tags}</div>
      <div class="meta">${website}</div>
    </div>
  </article>`;
}

// Fetch & render listings
async function loadListings(params = {}){
  const url = new URL(API_LIST, window.location.origin);
  Object.entries(params).forEach(([k,v]) => { if (v) url.searchParams.set(k, v) });
  const res = await fetch(url, { headers: { 'Accept':'application/json' } });
  if (!res.ok){ console.error('Failed to load', await res.text()); return }
  const data = await res.json();
  renderListings(data.items || []);
}

function renderListings(items){
  resultCount.textContent = `${items.length} result${items.length===1?'':'s'}`;
  if (!items.length){
    listingsGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  listingsGrid.innerHTML = items.map(cardTemplate).join('');
}

// Search form
$('#searchForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const category = $('#category').value.trim();
  const subcategory = $('#subcategory').value.trim();
  const town = $('#town').value.trim();
  const q = $('#q').value.trim();
  const dbs = $('#f_dbs').checked ? '1' : '';
  const firstaid = $('#f_firstaid').checked ? '1' : '';
  const ofsted = $('#f_ofsted').checked ? '1' : '';
  const sen = $('#f_sen').checked ? '1' : '';
  loadListings({ category, subcategory, town, q, dbs, firstaid, ofsted, sen });
});
$('#clearBtn').addEventListener('click', ()=>{
  $('#category').value = '';
  $('#subcategory').value = '';
  $('#town').value = '';
  $('#q').value = '';
  $('#f_dbs').checked = false;
  $('#f_firstaid').checked = false;
  $('#f_ofsted').checked = false;
  $('#f_sen').checked = false;
  loadListings({});
});

// Submit form
$('#submitForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const status = $('#submitStatus');
  status.textContent = 'Submitting…';

  const extraTags = $('#tags').value.split(',').map(s => s.trim()).filter(Boolean);
  const flagTags = [];
  if ($('#t_dbs').checked) flagTags.push('DBS');
  if ($('#t_firstaid').checked) flagTags.push('First Aid');
  if ($('#t_ofsted').checked) flagTags.push('Ofsted Registered');
  if ($('#t_sen').checked) flagTags.push('SEN');
  const payload = {
    title: $('#title').value.trim(),
    category: $('#categoryInput').value.trim(),
    subcategory: $('#subcategoryInput').value.trim(),
    town: $('#townInput').value.trim(),
    website: $('#website').value.trim(),
    email: $('#email').value.trim(),
    phone: $('#phone').value.trim(),
    about: $('#about').value.trim(),
    tags: [...extraTags, ...flagTags],
    featuredImageUrl: $('#featuredImageUrl').value.trim()
  };

  const res = await fetch(API_SUBMIT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok){
    const txt = await res.text();
    status.textContent = 'Error: ' + txt.slice(0,120);
    return;
  }
  status.textContent = 'Thanks! Your listing has been added.';
  // reset & refresh
  e.target.reset();
  loadListings({});
});

// Initial load
loadListings({});

// Admin functionality - simple password-based check
function checkAdminStatus() {
  const adminPassword = localStorage.getItem('cubhub_admin_key');
  if (adminPassword === 'admin123') { // Simple password check
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'inline-block';
    });
  }
}

// Admin login prompt
function promptAdminLogin() {
  const password = prompt('Enter admin password:');
  if (password === 'admin123') {
    localStorage.setItem('cubhub_admin_key', password);
    checkAdminStatus();
    alert('Admin access granted');
  } else {
    alert('Incorrect password');
  }
}

// Check admin status on load
checkAdminStatus();

// Add admin login trigger (Ctrl+Alt+A)
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.altKey && e.key === 'a') {
    promptAdminLogin();
  }
});

// Sitter browsing functionality
async function loadSitters(filters = {}) {
  const sittersGrid = $('#sittersGrid');
  const resultCount = $('#resultCount');
  
  if (!sittersGrid) return; // Not on sitters page
  
  try {
    const url = new URL(`${API_PLATFORM}/sitters`, window.location.origin);
    Object.entries(filters).forEach(([k,v]) => { 
      if (v && v !== '') url.searchParams.set(k, v) 
    });
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.success) {
      renderSitters(data.sitters);
      if (resultCount) {
        resultCount.textContent = `Showing ${data.sitters.length} babysitters`;
      }
    } else {
      console.error('Failed to load sitters:', data.message);
      if (sittersGrid) sittersGrid.innerHTML = '<p>Error loading sitters. Please try again.</p>';
    }
  } catch (error) {
    console.error('Error loading sitters:', error);
    if (sittersGrid) sittersGrid.innerHTML = '<p>Error loading sitters. Please try again.</p>';
  }
}

function renderSitters(sitters) {
  const sittersGrid = $('#sittersGrid');
  if (!sittersGrid) return;
  
  if (!sitters || sitters.length === 0) {
    sittersGrid.innerHTML = `
      <div class="empty">
        <p>No sitters found matching your criteria. Try adjusting your filters.</p>
      </div>
    `;
    return;
  }
  
  sittersGrid.innerHTML = sitters.map(sitter => {
    const badges = sitter.verifiedFeatures.map(feature => {
      const badgeText = {
        'dbs': 'DBS ✓',
        'firstaid': 'First Aid ✓',
        'references': 'Refs ✓',
        'qualified': 'Qualified ✓'
      };
      return `<span class="badge verified">${badgeText[feature] || feature}</span>`;
    }).join('');
    
    const skillBadges = sitter.skills.slice(0, 3).map(skill => 
      `<span class="badge">${skill.charAt(0).toUpperCase() + skill.slice(1)}</span>`
    ).join('');
    
    const stars = '⭐'.repeat(Math.floor(sitter.rating));
    const distance = Math.floor(Math.random() * 5 + 1); // Mock distance
    
    return `
      <div class="sitter-card">
        <div class="sitter-photo">
          <img src="${sitter.profileImage}" alt="${sitter.firstName} ${sitter.lastName}">
        </div>
        <div class="sitter-info">
          <h3>${sitter.firstName} ${sitter.lastName}</h3>
          <div class="rating">
            <span class="stars">${stars}</span>
            <span class="rating-count">(${sitter.reviewCount} reviews)</span>
          </div>
          <p class="experience">${sitter.experience} experience • Ages ${sitter.ageGroups.join(', ')}</p>
          <div class="badges">
            ${badges}
            ${skillBadges}
          </div>
          <p class="bio">${sitter.bio.substring(0, 120)}${sitter.bio.length > 120 ? '...' : ''}</p>
          <div class="sitter-details">
            <span class="location">📍 ${sitter.location} (${distance}.${Math.floor(Math.random() * 9)} miles)</span>
            <span class="rate">💷 £${sitter.hourlyRate}/hour</span>
          </div>
          <div class="sitter-actions">
            <a href="/sitter-profile.html?id=${sitter.id}" class="btn-primary">View Profile</a>
            <button class="btn-ghost" onclick="toggleFavourite('${sitter.id}')">🤍 Save</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Sitter filters form
const sitterFilters = $('#sitterFilters');
if (sitterFilters) {
  sitterFilters.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const filters = {};
    
    // Get form values
    if (formData.get('location')) filters.location = formData.get('location');
    if (formData.get('priceRange')) filters.priceRange = formData.get('priceRange');
    
    // Get checked skills
    const skills = formData.getAll('skills');
    if (skills.length > 0) filters.skills = skills;
    
    // Get verified features
    const verified = formData.getAll('verified');
    if (verified.length > 0) filters.verified = verified;
    
    loadSitters(filters);
  });
  
  // Reset filters
  sitterFilters.addEventListener('reset', function() {
    setTimeout(() => loadSitters(), 100); // Small delay to let form reset
  });
}

// Featured sitters for home page
async function loadFeaturedSitters() {
  const featuredGrid = $('#featuredSittersGrid');
  if (!featuredGrid) return;
  
  try {
    const res = await fetch(`${API_PLATFORM}/sitters`);
    const data = await res.json();
    
    if (data.success && data.sitters.length > 0) {
      // Show top 3 rated sitters
      const featured = data.sitters
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3);
      
      featuredGrid.innerHTML = featured.map(sitter => {
        const stars = '⭐'.repeat(Math.floor(sitter.rating));
        return `
          <div class="sitter-card">
            <div class="sitter-photo">
              <img src="${sitter.profileImage}" alt="${sitter.firstName} ${sitter.lastName}">
            </div>
            <div class="sitter-info">
              <h3>${sitter.firstName} ${sitter.lastName}</h3>
              <div class="rating">
                <span class="stars">${stars}</span>
                <span class="rating-count">(${sitter.reviewCount})</span>
              </div>
              <p class="bio">${sitter.bio.substring(0, 80)}...</p>
              <div class="sitter-actions">
                <a href="/sitter-profile.html?id=${sitter.id}" class="btn-primary">View Profile</a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading featured sitters:', error);
  }
}

// Toggle favourite sitter
function toggleFavourite(sitterId) {
  const favourites = JSON.parse(localStorage.getItem('favouriteSitters') || '[]');
  const index = favourites.indexOf(sitterId);
  
  if (index > -1) {
    favourites.splice(index, 1);
    console.log('Removed from favourites');
  } else {
    favourites.push(sitterId);
    console.log('Added to favourites');
  }
  
  localStorage.setItem('favouriteSitters', JSON.stringify(favourites));
  
  // Update button text/icon
  const button = event.target;
  if (index > -1) {
    button.innerHTML = '🤍 Save';
  } else {
    button.innerHTML = '💛 Saved';
  }
}

// Load appropriate data based on page
document.addEventListener('DOMContentLoaded', function() {
  // Check which page we're on and load appropriate data
  if (window.location.pathname.includes('browse-sitters')) {
    loadSitters();
  } else if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    loadFeaturedSitters();
  }
  
  // Set current year in footer
  const yearEl = $('#year'); 
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// Make functions globally available
window.toggleFavourite = toggleFavourite;
