// Individual blog post frontend logic
const API_GET_POSTS = '/.netlify/functions/get_blog_posts';

const $ = (sel) => document.querySelector(sel);

const loadingState = $('#loadingState');
const errorState = $('#errorState');
const postContent = $('#postContent');
const relatedPosts = $('#relatedPosts');
const relatedGrid = $('#relatedGrid');
const yearEl = $('#year'); 

if (yearEl) yearEl.textContent = new Date().getFullYear();

// Get post ID from URL parameters
function getPostId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Render blog post content
function renderBlogPost(post) {
  document.title = `${post.title} — Childcare Match Blog`;
  
  const featuredImage = post.featuredImage ? 
    `<img src="${post.featuredImage}" alt="${post.title}" class="featured-image" />` : '';
  
  const tags = post.tags.length ? 
    `<div class="tags">${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : '';
  
  const publishDate = new Date(post.publishDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const content = post.content.replace(/\n/g, '<br>');
  
  postContent.innerHTML = `
    ${featuredImage}
    <div class="post-header">
      <div class="category-badge">${post.category}</div>
      <h1>${post.title}</h1>
      <div class="post-meta">
        <span class="author">By ${post.author}</span>
        <span class="date">${publishDate}</span>
      </div>
      ${tags}
    </div>
    <div class="post-excerpt">
      <strong>${post.excerpt}</strong>
    </div>
    <div class="post-content">
      ${content}
    </div>
    <div class="post-footer">
      <a href="/blog.html" class="btn-ghost">← Back to All Articles</a>
    </div>
  `;
  
  loadingState.classList.add('hidden');
  postContent.classList.remove('hidden');
}

// Render related posts card
function relatedPostCard(post) {
  const image = post.featuredImage ? 
    `<img src="${post.featuredImage}" alt="${post.title}" />` : 
    `<div class="no-image">📰</div>`;
  
  const publishDate = new Date(post.publishDate).toLocaleDateString();
  
  return `<article class="card blog-card small">
    <a href="/blog-post.html?id=${post.id}" class="card-link">
      ${image}
      <div class="pad">
        <div class="meta">${post.category} • ${publishDate}</div>
        <h4>${post.title}</h4>
        <p class="excerpt">${post.excerpt.slice(0, 80)}${post.excerpt.length > 80 ? '...' : ''}</p>
      </div>
    </a>
  </article>`;
}

// Load and show related posts
async function loadRelatedPosts(currentPost) {
  try {
    const url = new URL(API_GET_POSTS, window.location.origin);
    url.searchParams.set('category', currentPost.category);
    
    const res = await fetch(url);
    if (!res.ok) return;
    
    const data = await res.json();
    const related = (data.posts || [])
      .filter(post => post.id !== currentPost.id)
      .slice(0, 3);
    
    if (related.length > 0) {
      relatedGrid.innerHTML = related.map(relatedPostCard).join('');
      relatedPosts.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading related posts:', error);
  }
}

// Load the blog post
async function loadBlogPost() {
  const postId = getPostId();
  
  if (!postId) {
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    return;
  }
  
  try {
    const url = new URL(API_GET_POSTS, window.location.origin);
    url.searchParams.set('id', postId);
    
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    
    if (!res.ok) {
      loadingState.classList.add('hidden');
      errorState.classList.remove('hidden');
      return;
    }
    
    const data = await res.json();
    const post = data.post;
    
    if (!post) {
      loadingState.classList.add('hidden');
      errorState.classList.remove('hidden');
      return;
    }
    
    renderBlogPost(post);
    loadRelatedPosts(post);
    
  } catch (error) {
    console.error('Error loading blog post:', error);
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
  }
}

// Initialize
loadBlogPost();