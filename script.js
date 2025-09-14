/* =========================
   Green Earth — script.js
   Vanilla JS. Copy/paste-ready.
   Main features:
   - fetch categories and plants from API OR use pasted JSON
   - render categories, cards, modal, cart
   - spinner, active state, search & sort
   ========================= */

   (() => {
    // API endpoints provided in assignment
    const API = {
      allPlants: 'https://openapi.programming-hero.com/api/plants',
      categories: 'https://openapi.programming-hero.com/api/categories',
      plantsByCategory: (id) => `https://openapi.programming-hero.com/api/category/${id}`,
      plantDetail: (id) => `https://openapi.programming-hero.com/api/plant/${id}`,
    };
  
    // DOM references
    const categoriesEl = document.getElementById('categories');
    const cardsGrid = document.getElementById('cardsGrid');
    const spinner = document.getElementById('spinner');
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const cartPanel = document.getElementById('cartPanel');
    const cartList = document.getElementById('cartList');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
  
    const cartModal = document.getElementById('cartModal');
    const cartListModal = document.getElementById('cartListModal');
    const cartTotalModal = document.getElementById('cartTotalModal');
  
    const plantNowBtn = document.getElementById('plantNowBtn');
    const bannerPlantBtn = document.getElementById('bannerPlantBtn');
    const plantForm = document.getElementById('plantForm');
  
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const sortSelect = document.getElementById('sortSelect');
  
    // State
    let allCategories = [];
    let allPlants = []; // flattened list of plants
    let displayedPlants = [];
    let cart = [];
  
    // Utility: show spinner
    function showSpinner() {
      spinner.classList.remove('hidden');
    }
    function hideSpinner() {
      spinner.classList.add('hidden');
    }
  
    // Format price helper
    function fmtPrice(v){ return Number(v||0).toFixed(2); }
  
    // Render categories: expects array of {id, name}
    function renderCategories(categories = []) {
      categoriesEl.innerHTML = '';
      // always add 'All' button
      const allBtn = document.createElement('button');
      allBtn.className = 'cat-btn';
      allBtn.textContent = 'All Plants';
      allBtn.dataset.id = 'all';
      allBtn.classList.add('active');
      categoriesEl.appendChild(allBtn);
  
      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.textContent = cat.name || cat.category || `Category ${cat.id || ''}`;
        btn.dataset.id = cat.id;
        categoriesEl.appendChild(btn);
      });
  
      // delegate clicks
      categoriesEl.addEventListener('click', onCategoryClick);
    }
  
    // Category click handler
    async function onCategoryClick(e){
      const btn = e.target.closest('.cat-btn');
      if(!btn) return;
      // active state
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.dataset.id;
      if(id === 'all'){
        displayedPlants = [...allPlants];
        renderCards(displayedPlants);
      } else {
        // show spinner and try fetch by category id. If you prefer to inject pasted JSON instead,
        // use window.loadPlantsFromJSON(...) provided below.
        showSpinner();
        try {
          const res = await fetch(API.plantsByCategory(id));
          const data = await res.json();
          // The API structure might wrap data differently; attempt to extract sensible list
          const list = (data && (data.data || data.plants || data.items)) || [];
          displayedPlants = Array.isArray(list) ? list : [];
          renderCards(displayedPlants);
        } catch(err){
          console.error('category fetch error', err);
          alert('Error loading category. You can instead paste API JSON using provided helper.');
        }
        hideSpinner();
      }
    }
  
    // Render cards
    function renderCards(plants = []) {
      cardsGrid.innerHTML = '';
      if(!plants || plants.length === 0){
        cardsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">No plants found.</p>';
        return;
      }
      plants.forEach(p => {
        const card = document.createElement('article');
        card.className = 'card';
        // normalize fields with fallbacks
        const id = p.id || p._id || p.plant_id || p.plantId || p.idPlant || Math.random().toString(16).slice(2);
        const name = p.name || p.common_name || p.plant_name || 'Unknown Plant';
        const img = (p.image || p.images || p.img || p.photo) || `https://via.placeholder.com/600x400.png?text=${encodeURIComponent(name)}`;
        const short = (p.description && p.description.slice(0,120)) || p.short_description || (p.bio && p.bio.slice(0,120)) || 'A lovely plant to grow.';
        const category = p.category || p.categ || p.category_name || p.genre || 'Unspecified';
        const price = (p.price!==undefined ? p.price : (p.cost || p.amount || (Math.random()*20+5).toFixed(2)));
  
        card.innerHTML = `
          <img src="${img}" alt="${escapeHtml(name)}" />
          <h4 class="plant-name" data-id="${id}">${escapeHtml(name)}</h4>
          <p class="desc">${escapeHtml(short)}</p>
          <div class="meta">
            <div class="badge">${escapeHtml(category)}</div>
            <div class="price">৳ <strong>${fmtPrice(price)}</strong></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn add-cart" data-id="${id}" data-name="${escapeAttr(name)}" data-price="${fmtPrice(price)}">Add to Cart</button>
            <button class="btn small view-detail" data-id="${id}">View</button>
          </div>
        `;
        // attach plant data to element for modal usage
        card.__plant = {...p, id, name, image: img, short, category, price: Number(price)};
        cardsGrid.appendChild(card);
      });
  
      // attach listeners
      cardsGrid.querySelectorAll('.add-cart').forEach(b => b.addEventListener('click', onAddToCart));
      cardsGrid.querySelectorAll('.plant-name').forEach(h => h.addEventListener('click', onNameClick));
      cardsGrid.querySelectorAll('.view-detail').forEach(b => b.addEventListener('click', (ev) => {
        const card = ev.target.closest('.card');
        openModalWithPlant(card.__plant);
      }));
    }
  
    // Add to cart handler
    function onAddToCart(e){
      const b = e.currentTarget;
      const id = b.dataset.id;
      const name = b.dataset.name;
      const price = Number(b.dataset.price || 0);
      addToCart({id, name, price, qty:1});
      // small visual feedback
      b.textContent = 'Added ✓';
      setTimeout(() => b.textContent = 'Add to Cart', 900);
    }
  
    // Add to cart logic
    function addToCart(item){
      const existing = cart.find(c => c.id === item.id);
      if(existing){
        existing.qty += item.qty;
      } else {
        cart.push({...item});
      }
      updateCartUI();
    }
  
    // Update cart UI (desktop + modal)
    function updateCartUI(){
      // list desktop
      cartList.innerHTML = '';
      cartListModal.innerHTML = '';
      let total = 0;
      cart.forEach(ci => {
        total += ci.price * ci.qty;
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
          <img src="https://via.placeholder.com/48x48.png?text=🌱" alt="${escapeAttr(ci.name)}"/>
          <div class="name">${escapeHtml(ci.name)} <div style="font-size:0.82rem;color:var(--muted)">x ${ci.qty}</div></div>
          <div class="price">৳ ${fmtPrice(ci.price * ci.qty)}</div>
          <button class="remove-btn" data-id="${ci.id}">❌</button>
        `;
        li.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(ci.id));
        cartList.appendChild(li);
  
        // modal list
        const li2 = li.cloneNode(true);
        li2.querySelector('.remove-btn').addEventListener('click', () => { removeFromCart(ci.id); closeCartModal(); });
        cartListModal.appendChild(li2);
      });
      cartTotal.textContent = fmtPrice(total);
      cartTotalModal.textContent = fmtPrice(total);
      cartCount.textContent = cart.reduce((s,c)=>s+c.qty,0);
    }
  
    function removeFromCart(id){
      cart = cart.filter(c => c.id !== id);
      updateCartUI();
    }
  
    // Modal open with plant object
    function openModalWithPlant(p){
      if(!p) return;
      modalBody.innerHTML = `
        <h2>${escapeHtml(p.name)}</h2>
        <img src="${p.image}" alt="${escapeAttr(p.name)}" style="width:100%;max-height:320px;object-fit:cover;border-radius:8px;margin:10px 0"/>
        <p>${escapeHtml(p.full_description || p.description || p.long_description || p.short || 'No full description available.')}</p>
        <p><strong>Category:</strong> ${escapeHtml(p.category)} &nbsp;&nbsp; <strong>Price:</strong> ৳ ${fmtPrice(p.price)}</p>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn add-cart-modal" data-id="${p.id}" data-name="${escapeAttr(p.name)}" data-price="${fmtPrice(p.price)}">Add to Cart</button>
          <button class="btn small" id="closeModalBtn">Close</button>
        </div>
      `;
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden','false');
  
      // attach
      modalBody.querySelector('.add-cart-modal').addEventListener('click', (e) => {
        const b = e.currentTarget;
        addToCart({id:b.dataset.id, name:b.dataset.name, price:Number(b.dataset.price), qty:1});
        modal.classList.add('hidden');
      });
      modalBody.querySelector('#closeModalBtn').addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }
  
    // Close modal
    modalClose.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden','true');
    });
  
    // When clicking plant name in card
    function onNameClick(e){
      const h = e.currentTarget;
      const card = h.closest('.card');
      if(card && card.__plant) openModalWithPlant(card.__plant);
    }
  
    // CART toggle (mobile)
    document.getElementById('cartToggle').addEventListener('click', () => {
      // if desktop: toggle cart panel display
      if(window.innerWidth > 1000){
        cartPanel.style.display = cartPanel.style.display === 'none' ? '' : 'none';
      } else {
        openCartModal();
      }
    });
  
    function openCartModal(){
      cartModal.classList.remove('hidden');
      cartModal.setAttribute('aria-hidden','false');
    }
    document.getElementById('cartModalClose').addEventListener('click', closeCartModal);
    function closeCartModal(){
      cartModal.classList.add('hidden');
      cartModal.setAttribute('aria-hidden','true');
    }
  
    // Simple search and sort
    searchBtn.addEventListener('click', () => {
      const q = searchInput.value.trim().toLowerCase();
      displayedPlants = allPlants.filter(p => (p.name || p.common_name || '').toLowerCase().includes(q));
      renderCards(displayedPlants);
    });
    sortSelect.addEventListener('change', () => {
      const v = sortSelect.value;
      if(v === 'price-asc') displayedPlants.sort((a,b)=> (a.price||0)-(b.price||0));
      else if(v === 'price-desc') displayedPlants.sort((a,b)=> (b.price||0)-(a.price||0));
      else if(v === 'name-asc') displayedPlants.sort((a,b)=> (''+(a.name||'')).localeCompare(b.name||''));
      else if(v === 'name-desc') displayedPlants.sort((a,b)=> (''+(b.name||'')).localeCompare(a.name||''));
      renderCards(displayedPlants);
    });
  
    // Plant form submit (sample behavior)
    plantForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const name = document.getElementById('donorName').value.trim();
      const email = document.getElementById('donorEmail').value.trim();
      const qty = Number(document.getElementById('donorQty').value) || 1;
      alert(`Thanks ${name}! We received your request to plant ${qty} tree(s). We'll contact you at ${email}.`);
      plantForm.reset();
    });
  
    // banner & nav Plant Now wiring
    [plantNowBtn, bannerPlantBtn].forEach(b => b.addEventListener('click', () => {
      document.getElementById('plant').scrollIntoView({behavior:'smooth'});
    }));
  
    // Convenience: show current year in footer
    document.getElementById('year').textContent = new Date().getFullYear();
  
    // Initial load: try to fetch categories & all plants
    async function init(){
      showSpinner();
      try {
        // categories
        const resCat = await fetch(API.categories);
        const catData = await resCat.json();
        // attempt to map categories depending on API shape
        const cats = (catData && (catData.data || catData.categories || catData.items)) || [];
        // normalize
        allCategories = (Array.isArray(cats) ? cats : []).map(c => ({
          id: c.id || c.category_id || c._id || c.cat_id || c.category_id || c.category || c.id,
          name: c.name || c.category || c.category_name || c.title || c.cat || `Category ${c.id || ''}`
        }));
        renderCategories(allCategories);
  
        // plants
        const resPlants = await fetch(API.allPlants);
        const plantData = await resPlants.json();
        // flatten array depending on shape
        let plants = (plantData && (plantData.data || plantData.plants || plantData.items)) || [];
        if(plants && plants.all) plants = plants.all;
        // normalize shallowly
        allPlants = (Array.isArray(plants) ? plants : []).map(p => {
          const id = p.id || p._id || p.plant_id || Math.random().toString(16).slice(2);
          const name = p.name || p.common_name || p.plant_name || p.title || 'Unknown Plant';
          const image = (p.image || (p.images && p.images[0])) || (p.img) || `https://via.placeholder.com/600x400.png?text=${encodeURIComponent(name)}`;
          const short = p.description ? String(p.description).slice(0,120) : (p.short_description||'A beautiful plant');
          const category = p.category || p.category_name || (p.categories && p.categories[0]) || 'Unspecified';
          const price = Number(p.price !== undefined ? p.price : (p.cost || p.amount || (Math.random()*20+5).toFixed(2)));
          return {...p, id, name, image, short, category, price};
        });
        displayedPlants = [...allPlants];
        renderCards(displayedPlants);
      } catch (err){
        console.warn('Initial fetch failed. You can paste API JSON manually with helper functions. Error:', err);
        // don't block — user can paste JSON into helper functions
        cardsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">Unable to fetch live data. Use provided paste helpers in the console or paste JSON into window.load... functions.</p>';
      } finally {
        hideSpinner();
      }
    }
  
    // Helper functions for the user to paste API results directly (useful if you paste raw JSON responses)
    // Example usage (paste raw JSON object into console):
    // window.loadCategoriesFromJSON({ data: [ {id:1,name:"Trees"} ] })
    // window.loadPlantsFromJSON({ data: [ { id:1, name:"Mango", image:"...", price:120 } ] })
    window.loadCategoriesFromJSON = function(json){
      try {
        const arr = (json && (json.data || json.categories || json.items)) || [];
        allCategories = arr.map(c => ({ id: c.id || c._id || c.category_id, name: c.name || c.category || c.title || c.category_name }));
        renderCategories(allCategories);
        console.log('Categories loaded from JSON.'); 
      } catch (e) { console.error(e); alert('Invalid categories JSON'); }
    };
  
    window.loadPlantsFromJSON = function(json){
      try {
        const arr = (json && (json.data || json.plants || json.items)) || [];
        allPlants = (arr||[]).map(p => ({
          id: p.id || p._id || p.plant_id || Math.random().toString(16).slice(2),
          name: p.name || p.common_name || p.title || 'Unknown Plant',
          image: p.image || (p.images && p.images[0]) || (`https://via.placeholder.com/600x400.png?text=${encodeURIComponent(p.name||'Plant')}`),
          short: p.short_description || (p.description ? String(p.description).slice(0,120) : 'A plant'),
          category: p.category || (p.categories && p.categories[0]) || 'Unspecified',
          price: Number(p.price !== undefined ? p.price : (p.cost || p.amount || (Math.random()*20+5).toFixed(2))),
          full_description: p.description || p.long_description || p.full || ''
        }));
        displayedPlants = [...allPlants];
        renderCards(displayedPlants);
        console.log('Plants loaded from JSON.');
      } catch(e){ console.error(e); alert('Invalid plants JSON'); }
    };
  
    // Also provide helper to load single plant detail into modal:
    window.openPlantDetailFromJSON = function(json){
      const p = json && (json.data || json.plant || json.item) || json;
      if(!p) return alert('No plant found in JSON');
      // normalize
      const normalized = {
        id: p.id || p._id || p.plant_id,
        name: p.name || p.common_name || p.title,
        image: p.image || (p.images && p.images[0]) || `https://via.placeholder.com/600x400.png?text=${encodeURIComponent(p.name||'Plant')}`,
        full_description: p.description || p.long_description || p.details || '',
        category: p.category || p.category_name || 'Unspecified',
        price: Number(p.price || p.cost || p.amount || 0)
      };
      openModalWithPlant(normalized);
    };
  
    // small sanitizers
    function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
    function escapeAttr(s){ if(!s) return ''; return String(s).replace(/"/g,'&quot;'); }
  
    // Expose some debug functions for teacher grading / testing convenience
    window.__greenEarth = {
      addToCart, removeFromCart, getCart: ()=>cart, loadCategoriesFromJSON: window.loadCategoriesFromJSON, loadPlantsFromJSON: window.loadPlantsFromJSON, openPlantDetailFromJSON: window.openPlantDetailFromJSON
    };
  
    // init
    init();
  })();
  