// Blog management frontend logic
const API_GET_POSTS = '/.netlify/functions/get_blog_posts';
const API_MANAGE_POSTS = '/.netlify/functions/manage_blog_posts';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let currentEditingPost = null;

// Set current year
const yearEl = $('#year'); 
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Set default publish date to now
const publishDateEl = $('#publishDate');
if (publishDateEl) {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now - tzOffset);
  publishDateEl.value = localTime.toISOString().slice(0, 16);
}

// Form submission
$('#blogForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('#submitStatus');
  const submitBtn = $('#submitBtn');
  const originalText = submitBtn.textContent;
  
  status.textContent = 'Publishing...';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Publishing...';

  const tagsInput = $('#tags').value;
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  // Handle image upload
  let featuredImageUrl = $('#featuredImage').value.trim();
  const imageFile = $('#featuredImageFile').files[0];
  
  if (imageFile && !featuredImageUrl) {
    // Convert image to data URL for simple storage
    featuredImageUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(imageFile);
    });
  }
  
  const payload = {
    title: $('#title').value.trim(),
    excerpt: $('#excerpt').value.trim(),
    content: $('#content').value.trim(),
    category: $('#category').value.trim(),
    author: $('#author').value.trim(),
    featuredImage: featuredImageUrl,
    tags: tags,
    publishDate: $('#publishDate').value ? new Date($('#publishDate').value).toISOString() : new Date().toISOString()
  };

  // If editing, add the post ID
  if (currentEditingPost) {
    payload.id = currentEditingPost.id;
  }

  const method = currentEditingPost ? 'PUT' : 'POST';
  const res = await fetch(API_MANAGE_POSTS, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    status.textContent = 'Error: ' + txt.slice(0, 120);
  } else {
    const data = await res.json();
    status.textContent = currentEditingPost ? 'Article updated successfully!' : 'Article published successfully!';
    e.target.reset();
    currentEditingPost = null;
    updateFormTitle();
    loadExistingArticles();
    
    // Reset publish date to current time
    if (publishDateEl) {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localTime = new Date(now - tzOffset);
      publishDateEl.value = localTime.toISOString().slice(0, 16);
    }
  }
  
  submitBtn.disabled = false;
  submitBtn.textContent = originalText;
});

// Preview functionality
$('#previewBtn').addEventListener('click', () => {
  const previewSection = $('#previewSection');
  const previewContent = $('#previewContent');
  
  const title = $('#title').value.trim();
  const excerpt = $('#excerpt').value.trim();
  const content = $('#content').value.trim();
  const author = $('#author').value.trim();
  const category = $('#category').value.trim();
  const featuredImage = $('#featuredImage').value.trim();
  
  const tagsInput = $('#tags').value;
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  const publishDate = $('#publishDate').value ? new Date($('#publishDate').value).toLocaleDateString() : new Date().toLocaleDateString();
  
  const imageHtml = featuredImage ? `<img src="${featuredImage}" alt="${title}" class="featured-image" />` : '';
  const tagsHtml = tags.length ? `<div class="tags">${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : '';
  
  previewContent.innerHTML = `
    ${imageHtml}
    <h1>${title || 'Untitled Article'}</h1>
    <div class="meta">
      <span>By ${author || 'Admin'}</span> • 
      <span>${publishDate}</span> • 
      <span class="category">${category}</span>
    </div>
    ${tagsHtml}
    <div class="excerpt">${excerpt}</div>
    <div class="content">${content.replace(/\n/g, '<br>')}</div>
  `;
  
  previewSection.classList.toggle('hidden');
});

// Cancel/Reset functionality
$('#cancelBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
    document.getElementById('blogForm').reset();
    currentEditingPost = null;
    updateFormTitle();
    $('#previewSection').classList.add('hidden');
    
    // Reset publish date
    if (publishDateEl) {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localTime = new Date(now - tzOffset);
      publishDateEl.value = localTime.toISOString().slice(0, 16);
    }
  }
});

// Update form title based on editing state
function updateFormTitle() {
  const title = $('#formTitle');
  const submitBtn = $('#submitBtn');
  if (currentEditingPost) {
    title.textContent = 'Edit Blog Article';
    submitBtn.textContent = 'Update Article';
  } else {
    title.textContent = 'Write New Blog Article';
    submitBtn.textContent = 'Publish Article';
  }
}

// Load existing articles for management
async function loadExistingArticles(search = '', category = '') {
  const url = new URL(API_GET_POSTS, window.location.origin);
  if (search) url.searchParams.set('q', search);
  if (category) url.searchParams.set('category', category);
  
  const res = await fetch(url);
  if (!res.ok) return;
  
  const data = await res.json();
  renderArticlesGrid(data.posts || []);
}

// Render articles grid for management
function renderArticlesGrid(articles) {
  const grid = $('#articlesGrid');
  const emptyState = $('#noArticles');
  
  if (!articles.length) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  grid.innerHTML = articles.map(article => `
    <article class="card blog-management-card">
      ${article.featuredImage ? `<img src="${article.featuredImage}" alt="${article.title}" />` : '<div class="no-image">No Image</div>'}
      <div class="pad">
        <h3>${article.title}</h3>
        <div class="meta">${article.category} • ${new Date(article.publishDate).toLocaleDateString()}</div>
        <p>${article.excerpt.slice(0, 100)}${article.excerpt.length > 100 ? '...' : ''}</p>
        <div class="card-actions">
          <button class="btn-ghost btn-small" onclick="editArticle('${article.id}')">Edit</button>
          <button class="btn-ghost btn-small btn-danger" onclick="deleteArticle('${article.id}', '${article.title}')">Delete</button>
          <a href="/blog-post.html?id=${article.id}" class="btn-ghost btn-small" target="_blank">View</a>
        </div>
      </div>
    </article>
  `).join('');
}

// Edit article
window.editArticle = async (id) => {
  const res = await fetch(`${API_GET_POSTS}?id=${id}`);
  if (!res.ok) return;
  
  const data = await res.json();
  const post = data.post;
  
  // Populate form
  $('#title').value = post.title;
  $('#excerpt').value = post.excerpt;
  $('#content').value = post.content;
  $('#category').value = post.category;
  $('#author').value = post.author;
  $('#featuredImage').value = post.featuredImage;
  $('#tags').value = post.tags.join(', ');
  
  // Set publish date
  if (post.publishDate) {
    const date = new Date(post.publishDate);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localTime = new Date(date - tzOffset);
    $('#publishDate').value = localTime.toISOString().slice(0, 16);
  }
  
  currentEditingPost = post;
  updateFormTitle();
  
  // Scroll to form
  document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
};

// Delete article
window.deleteArticle = async (id, title) => {
  if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
    return;
  }
  
  const res = await fetch(`${API_MANAGE_POSTS}?id=${id}`, { method: 'DELETE' });
  if (res.ok) {
    loadExistingArticles();
  } else {
    alert('Error deleting article');
  }
};

// Search and filter functionality
$('#searchArticles').addEventListener('input', (e) => {
  const search = e.target.value;
  const category = $('#filterCategory').value;
  loadExistingArticles(search, category);
});

$('#filterCategory').addEventListener('change', (e) => {
  const category = e.target.value;
  const search = $('#searchArticles').value;
  loadExistingArticles(search, category);
});

// Load articles on page load
loadExistingArticles();