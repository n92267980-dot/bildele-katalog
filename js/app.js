document.addEventListener('DOMContentLoaded', () => {
  const { url, anonKey } = window.SUPABASE_CONFIG || {};
  const db = window.supabase.createClient(url, anonKey);

  let catalogData = {
    brands: [],
    categories: [],
    locations: [],
    parts: []
  };

  let visibleParts = [];

  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const statTotalParts = document.getElementById('statTotalParts');
  const statInStock = document.getElementById('statInStock');
  const statOutOfStock = document.getElementById('statOutOfStock');
  const brandFilter = document.getElementById('brandFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  const subcategoryFilter = document.getElementById('subcategoryFilter');
  const locationFilter = document.getElementById('locationFilter');
  const modelFilter = document.getElementById('modelFilter');
  const yearFilter = document.getElementById('yearFilter');
  const inStockOnly = document.getElementById('inStockOnly');
  const sortSelect = document.getElementById('sortSelect');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const emptyResetBtn = document.getElementById('emptyResetBtn');
  const resultsCount = document.getElementById('resultsCount');
  const resultsGrid = document.getElementById('resultsGrid');
  const emptyState = document.getElementById('emptyState');
  const partModal = document.getElementById('partModal');
  const modalBrand = document.getElementById('modalBrand');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const toast = document.getElementById('toast');

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normPartNo(str) {
    return String(str || '').toLowerCase().replace(/[\s-]+/g, '');
  }

  let toastTimer = null;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Varenummer ${text} kopieret!`);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      showToast(`Varenummer ${text} kopieret!`);
    }
  }

  function getBrandName(id) {
    const b = catalogData.brands.find(x => x.id === id);
    return b ? b.name : id;
  }

  function getLocationName(id) {
    if (!id) return 'Ingen lokation';
    const l = catalogData.locations.find(x => x.id === id);
    return l ? l.name : id;
  }

  function getCategoryLabel(catId) {
    const c = catalogData.categories.find(x => x.id === catId);
    if (!c) return catId;
    if (!c.parent) return c.name;
    const p = catalogData.categories.find(x => x.id === c.parent);
    return p ? `${p.name} › ${c.name}` : c.name;
  }

  function updateStats() {
    const total = catalogData.parts.length;
    const inStock = catalogData.parts.filter(p => Number(p.stock) > 0).length;
    statTotalParts.textContent = String(total);
    statInStock.textContent = String(inStock);
    statOutOfStock.textContent = String(total - inStock);
  }

  function populateDropdowns() {
    brandFilter.innerHTML = '<option value="">Alle mærker</option>' +
      catalogData.brands.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('');

    const parents = catalogData.categories.filter(c => c.parent === null);
    categoryFilter.innerHTML = '<option value="">Alle kategorier</option>' +
      parents.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');

    locationFilter.innerHTML = '<option value="">Alle lokationer</option>' +
      catalogData.locations.map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');

    refreshSubcategories();
    refreshModels();
  }

  function refreshSubcategories() {
    const parentId = categoryFilter.value;
    if (!parentId) {
      subcategoryFilter.disabled = true;
      subcategoryFilter.innerHTML = '<option value="">Vælg hovedkategori</option>';
      return;
    }
    const subs = catalogData.categories.filter(c => c.parent === parentId);
    subcategoryFilter.disabled = false;
    subcategoryFilter.innerHTML = '<option value="">Alle underkategorier</option>' +
      subs.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  }

  function refreshModels() {
    const brandId = brandFilter.value;
    const current = modelFilter.value;
    const models = new Set();

    catalogData.parts.forEach(part => {
      if (!brandId || part.brand === brandId) {
        (part.compatibility || []).forEach(c => {
          if (c.model) models.add(c.model);
        });
      }
    });

    const sorted = Array.from(models).sort((a, b) => a.localeCompare(b, 'da'));
    modelFilter.innerHTML = '<option value="">Alle modeller</option>' +
      sorted.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');

    if (sorted.includes(current)) {
      modelFilter.value = current;
    }
  }

  function filterAndSort() {
    const raw = searchInput.value.trim();
    const q = raw.toLowerCase();
    const normQ = normPartNo(raw);
    const brand = brandFilter.value;
    const cat = categoryFilter.value;
    const subcat = subcategoryFilter.value;
    const loc = locationFilter.value;
    const model = modelFilter.value;
    const year = parseInt(yearFilter.value, 10);
    const onlyAvailable = inStockOnly.checked;

    const allowedSubIds = cat
      ? catalogData.categories.filter(c => c.parent === cat).map(c => c.id)
      : [];

    const filtered = catalogData.parts.filter(part => {
      if (onlyAvailable && Number(part.stock) <= 0) return false;

      if (raw) {
        const matchPart = normQ.length > 0 && normPartNo(part.partNumber).includes(normQ);
        const matchName = String(part.name || '').toLowerCase().includes(q);
        const matchBrand = getBrandName(part.brand).toLowerCase().includes(q);
        const matchLoc = getLocationName(part.location).toLowerCase().includes(q);
        if (!matchPart && !matchName && !matchBrand && !matchLoc) return false;
      }

      if (brand && part.brand !== brand) return false;

      if (subcat) {
        if (part.category !== subcat) return false;
      } else if (cat) {
        if (part.category !== cat && !allowedSubIds.includes(part.category)) return false;
      }

      if (loc && part.location !== loc) return false;

      if (model || !Number.isNaN(year)) {
        const compat = part.compatibility || [];
        const matchCar = compat.some(c => {
          const mOk = !model || c.model === model;
          const yOk = Number.isNaN(year) || (year >= Number(c.yearFrom) && year <= Number(c.yearTo));
          return mOk && yOk;
        });
        if (!matchCar) return false;
      }

      return true;
    });

    const sortBy = sortSelect.value;
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-desc':
          return String(b.name).localeCompare(String(a.name), 'da');
        case 'part-asc':
          return String(a.partNumber).localeCompare(String(b.partNumber), 'da');
        case 'stock-desc':
          return Number(b.stock || 0) - Number(a.stock || 0);
        case 'location-asc':
          return getLocationName(a.location).localeCompare(getLocationName(b.location), 'da');
        case 'name-asc':
        default:
          return String(a.name).localeCompare(String(b.name), 'da');
      }
    });

    return filtered;
  }

  function render() {
    visibleParts = filterAndSort();
    const count = visibleParts.length;
    resultsCount.textContent = `Viser ${count} ${count === 1 ? 'reservedel' : 'reservedele'}`;
    clearSearchBtn.classList.toggle('hidden', searchInput.value.length === 0);

    if (count === 0) {
      resultsGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    resultsGrid.innerHTML = visibleParts.map((part, idx) => {
      const stock = Number(part.stock || 0);
      const ok = stock > 0;
      return `
        <article class="part-card" data-card-idx="${idx}" tabindex="0" role="button" aria-label="Detaljer for ${esc(part.name)}">
          <div>
            <div class="card-top">
              <div class="part-no-wrap">
                <span class="part-no">${esc(part.partNumber)}</span>
                <button type="button" class="copy-mini" data-copy-idx="${idx}">Kopier</button>
              </div>
              <span class="brand-badge">${esc(getBrandName(part.brand))}</span>
            </div>
            <h3 class="part-name">${esc(part.name)}</h3>
            <p class="part-cat">${esc(getCategoryLabel(part.category))}</p>
          </div>
          <div class="card-foot">
            <span class="loc-tag">📍 ${esc(getLocationName(part.location))}</span>
            <span class="stock-pill ${ok ? 'ok' : 'out'}">${ok ? `På lager (${stock} stk.)` : 'Ikke på lager'}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  function openModal(idx) {
    const part = visibleParts[idx];
    if (!part) return;

    const stock = Number(part.stock || 0);
    const ok = stock > 0;
    const compat = part.compatibility || [];

    modalBrand.textContent = getBrandName(part.brand);
    modalTitle.textContent = part.name;

    const rowsHtml = compat.length
      ? compat.map(c => `
          <tr>
            <td>${esc(c.model)}</td>
            <td>${esc(c.yearFrom)} – ${esc(c.yearTo)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2">Ingen specifikke modeller angivet</td></tr>';

    modalBody.innerHTML = `
      <div class="part-no-wrap">
        <span class="part-no" style="font-size:0.98rem;">${esc(part.partNumber)}</span>
        <button type="button" id="modalCopyBtn" class="btn btn-secondary btn-sm">Kopier varenummer</button>
      </div>

      <div class="info-grid">
        <div class="info-cell">
          <span>Lokation</span>
          <strong>📍 ${esc(getLocationName(part.location))}</strong>
        </div>
        <div class="info-cell">
          <span>Lagerstatus</span>
          <strong style="color:${ok ? 'var(--ok)' : 'var(--bad)'}">${ok ? `${stock} stk. på lager` : 'Ikke på lager (0 stk.)'}</strong>
        </div>
        <div class="info-cell">
          <span>Kategori</span>
          <strong>${esc(getCategoryLabel(part.category))}</strong>
        </div>
        <div class="info-cell">
          <span>Bilmærke</span>
          <strong>${esc(getBrandName(part.brand))}</strong>
        </div>
      </div>

      <div>
        <h3 style="font-size:0.95rem;margin-bottom:0.5rem;">Kompatible modeller</h3>
        <div class="table-wrap">
          <table class="compat-tbl">
            <thead>
              <tr>
                <th>Model</th>
                <th>Årgang</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('modalCopyBtn').addEventListener('click', () => copyText(part.partNumber));
    partModal.classList.remove('hidden');
  }

  function closeModal() {
    partModal.classList.add('hidden');
  }

  function resetAll() {
    searchInput.value = '';
    brandFilter.value = '';
    categoryFilter.value = '';
    refreshSubcategories();
    subcategoryFilter.value = '';
    locationFilter.value = '';
    refreshModels();
    modelFilter.value = '';
    yearFilter.value = '';
    inStockOnly.checked = false;
    sortSelect.value = 'name-asc';
    render();
  }

  searchInput.addEventListener('input', render);
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    render();
  });

  brandFilter.addEventListener('change', () => {
    refreshModels();
    render();
  });

  categoryFilter.addEventListener('change', () => {
    refreshSubcategories();
    render();
  });

  subcategoryFilter.addEventListener('change', render);
  locationFilter.addEventListener('change', render);
  modelFilter.addEventListener('change', render);
  yearFilter.addEventListener('input', render);
  inStockOnly.addEventListener('change', render);
  sortSelect.addEventListener('change', render);

  resetFiltersBtn.addEventListener('click', resetAll);
  emptyResetBtn.addEventListener('click', resetAll);

  resultsGrid.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('[data-copy-idx]');
    if (copyBtn) {
      e.stopPropagation();
      const part = visibleParts[Number(copyBtn.dataset.copyIdx)];
      if (part) copyText(part.partNumber);
      return;
    }
    const card = e.target.closest('[data-card-idx]');
    if (card) openModal(Number(card.dataset.cardIdx));
  });

  resultsGrid.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('[data-card-idx]');
      if (card && !e.target.closest('[data-copy-idx]')) {
        e.preventDefault();
        openModal(Number(card.dataset.cardIdx));
      }
    }
  });

  closeModalBtn.addEventListener('click', closeModal);
  partModal.addEventListener('click', (e) => {
    if (e.target === partModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !partModal.classList.contains('hidden')) closeModal();
  });

  async function init() {
    try {
      const [brandsRes, catsRes, locsRes, partsRes] = await Promise.all([
        db.from('brands').select('*').order('name'),
        db.from('categories').select('*').order('name'),
        db.from('locations').select('*').order('name'),
        db.from('parts').select('*').order('id', { ascending: false })
      ]);

      if (brandsRes.error) throw brandsRes.error;
      if (catsRes.error) throw catsRes.error;
      if (locsRes.error) throw locsRes.error;
      if (partsRes.error) throw partsRes.error;

      catalogData.brands = brandsRes.data || [];
      catalogData.categories = catsRes.data || [];
      catalogData.locations = locsRes.data || [];
      catalogData.parts = (partsRes.data || []).map(p => ({
        id: p.id,
        partNumber: p.part_number,
        name: p.name,
        brand: p.brand,
        category: p.category,
        location: p.location,
        stock: p.stock,
        compatibility: p.compatibility || []
      }));

      updateStats();
      populateDropdowns();
      render();
    } catch (err) {
      console.error(err);
      resultsCount.textContent = 'Fejl ved forbindelse til databasen. Tjek js/config.js.';
    }
  }

  init();
});