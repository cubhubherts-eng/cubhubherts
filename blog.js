// Blog listing frontend logic
const API_GET_POSTS = '/.netlify/functions/get_blog_posts';

const $ = (sel) => document.querySelector(sel);

const articlesGrid = $('#articlesGrid');
const emptyState = $('#emptyState');
const articleCount = $('#articleCount');
const yearEl = $('#year'); 
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Render a single blog card
function blogCardTemplate(post) {
  const image = post.featuredImage ? 
    `<img src="${post.featuredImage}" alt="${post.title}" />` : 
    `<div class="no-image">📰</div>`;
  
  const tags = (post.tags || []).slice(0, 5).map(t => `<span class="badge">${t}</span>`).join('');
  const publishDate = new Date(post.publishDate).toLocaleDateString();
  
  return `<article class="card blog-card">
    <a href="/blog-post.html?id=${post.id}" class="card-link">
      ${image}
      <div class="pad">
        <div class="meta">${post.category} • ${publishDate}</div>
        <h3>${post.title}</h3>
        <p class="excerpt">${post.excerpt}</p>
        <div class="badges">${tags}</div>
        <div class="meta author">By ${post.author}</div>
      </div>
    </a>
  </article>`;
}

// Fetch & render blog posts
async function loadBlogPosts(params = {}) {
  const url = new URL(API_GET_POSTS, window.location.origin);
  Object.entries(params).forEach(([k, v]) => { 
    if (v) url.searchParams.set(k, v) 
  });
  
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) { 
      console.error('Failed to load blog posts', await res.text()); 
      return 
    }
    const data = await res.json();
    renderBlogPosts(data.posts || []);
  } catch (error) {
    console.error('Error loading blog posts:', error);
    renderBlogPosts([]);
  }
}

function renderBlogPosts(posts) {
  articleCount.textContent = `${posts.length} article${posts.length === 1 ? '' : 's'}`;
  
  if (!posts.length) {
    articlesGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  articlesGrid.innerHTML = posts.map(blogCardTemplate).join('');
}

// Search form
$('#blogSearchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const category = $('#categoryFilter').value.trim();
  const q = $('#searchQuery').value.trim();
  loadBlogPosts({ category, q });
});

$('#clearSearchBtn').addEventListener('click', () => {
  $('#categoryFilter').value = '';
  $('#searchQuery').value = '';
  loadBlogPosts({});
});

// Blog submission form
const API_MANAGE_POSTS = '/.netlify/functions/manage_blog_posts';

$('#blogSubmitForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const status = $('#blogSubmitStatus');
  const submitBtn = this.querySelector('button[type="submit"]');
  
  status.textContent = 'Submitting...';
  status.style.color = '#5b7486';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(this);
    const tags = formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [];
    
    const blogData = {
      title: formData.get('title'),
      author: formData.get('author'),
      category: formData.get('category'),
      excerpt: formData.get('excerpt'),
      content: formData.get('content'),
      featuredImage: formData.get('featuredImage'),
      tags: tags,
      status: 'pending'
    };
    
    const response = await fetch(API_MANAGE_POSTS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(blogData)
    });
    
    if (response.ok) {
      status.textContent = 'Blog post submitted for review! It will appear after approval.';
      status.style.color = '#28a745';
      this.reset();
    } else {
      throw new Error('Submission failed');
    }
  } catch (error) {
    status.textContent = 'Error submitting blog post. Please try again.';
    status.style.color = '#dc3545';
  } finally {
    submitBtn.disabled = false;
  }
});

// Initial load
loadBlogPosts({});

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