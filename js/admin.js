document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'autodele_catalog_final_v1';

  let catalogData = {
    brands: [],
    categories: [],
    locations: [],
    parts: []
  };

  const storageStatus = document.getElementById('storageStatus');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  const triggerImportBtn = document.getElementById('triggerImportBtn');
  const importJsonInput = document.getElementById('importJsonInput');
  const resetStorageBtn = document.getElementById('resetStorageBtn');

  const tabBtnParts = document.getElementById('tabBtnParts');
  const tabBtnTaxonomy = document.getElementById('tabBtnTaxonomy');
  const tabPanelParts = document.getElementById('tabPanelParts');
  const tabPanelTaxonomy = document.getElementById('tabPanelTaxonomy');

  const formTitle = document.getElementById('formTitle');
  const partForm = document.getElementById('partForm');
  const editIndex = document.getElementById('editIndex');
  const partNumber = document.getElementById('partNumber');
  const partStock = document.getElementById('partStock');
  const partName = document.getElementById('partName');
  const partBrand = document.getElementById('partBrand');
  const partLocation = document.getElementById('partLocation');
  const partCategory = document.getElementById('partCategory');
  const compatContainer = document.getElementById('compatContainer');
  const addCompatBtn = document.getElementById('addCompatBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const adminPartCount = document.getElementById('adminPartCount');
  const adminSearch = document.getElementById('adminSearch');
  const adminPartsList = document.getElementById('adminPartsList');

  const addBrandForm = document.getElementById('addBrandForm');
  const newBrandName = document.getElementById('newBrandName');
  const brandsManageList = document.getElementById('brandsManageList');

  const addLocationForm = document.getElementById('addLocationForm');
  const newLocationName = document.getElementById('newLocationName');
  const locationsManageList = document.getElementById('locationsManageList');

  const addMainCatForm = document.getElementById('addMainCatForm');
  const newMainCatName = document.getElementById('newMainCatName');
  const addSubCatForm = document.getElementById('addSubCatForm');
  const parentCatSelect = document.getElementById('parentCatSelect');
  const newSubCatName = document.getElementById('newSubCatName');
  const categoriesManageList = document.getElementById('categoriesManageList');

  const toast = document.getElementById('toast');

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  let toastTimer = null;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }

  function makeId(name, existingList) {
    const base = String(name)
      .toLowerCase()
      .trim()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'oe')
      .replace(/å/g, 'aa')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'id';

    let id = base;
    let counter = 2;
    while (existingList.some(item => item.id === id)) {
      id = `${base}-${counter++}`;
    }
    return id;
  }

  function updateStatus(isLocal) {
    storageStatus.textContent = isLocal
      ? 'Gemt lokalt i browseren – klik "Download parts.json" når du vil opdatere din projektfil.'
      : 'Viser data indlæst direkte fra data/parts.json.';
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogData));
    updateStatus(true);
  }

  function switchTab(tabName) {
    const isParts = tabName === 'parts';
    tabBtnParts.classList.toggle('active', isParts);
    tabBtnTaxonomy.classList.toggle('active', !isParts);
    tabPanelParts.classList.toggle('hidden', !isParts);
    tabPanelTaxonomy.classList.toggle('hidden', isParts);
  }

  tabBtnParts.addEventListener('click', () => switchTab('parts'));
  tabBtnTaxonomy.addEventListener('click', () => switchTab('taxonomy'));

  function populateSelects() {
    partBrand.innerHTML = catalogData.brands
      .map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`)
      .join('');

    partLocation.innerHTML = catalogData.locations
      .map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`)
      .join('');

    const parents = catalogData.categories.filter(c => c.parent === null);
    partCategory.innerHTML = parents.map(p => {
      const subs = catalogData.categories.filter(c => c.parent === p.id);
      if (!subs.length) {
        return `<option value="${esc(p.id)}">${esc(p.name)}</option>`;
      }
      const opts = subs.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
      return `<optgroup label="${esc(p.name)}">${opts}</optgroup>`;
    }).join('');

    parentCatSelect.innerHTML = parents
      .map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
      .join('');
  }

  function addCompatRow(model = '', yearFrom = '', yearTo = '') {
    const row = document.createElement('div');
    row.className = 'compat-row';
    row.innerHTML = `
      <input type="text" class="c-model" placeholder="Model (f.eks. Golf V)" value="${esc(model)}">
      <input type="number" class="c-from" placeholder="Fra år" min="1960" max="2035" value="${esc(yearFrom)}">
      <input type="number" class="c-to" placeholder="Til år" min="1960" max="2035" value="${esc(yearTo)}">
      <button type="button" class="btn btn-danger btn-sm c-remove" aria-label="Fjern model">&times;</button>
    `;
    row.querySelector('.c-remove').addEventListener('click', () => row.remove());
    compatContainer.appendChild(row);
  }

  function resetForm() {
    partForm.reset();
    editIndex.value = '-1';
    partStock.value = '1';
    formTitle.textContent = 'Tilføj ny reservedel';
    cancelEditBtn.classList.add('hidden');
    compatContainer.innerHTML = '';
    addCompatRow();
  }

  function loadForEdit(idx) {
    const part = catalogData.parts[idx];
    if (!part) return;

    editIndex.value = String(idx);
    formTitle.textContent = `Rediger: ${part.partNumber}`;
    partNumber.value = part.partNumber || '';
    partName.value = part.name || '';
    partBrand.value = part.brand || '';
    partLocation.value = part.location || '';
    partCategory.value = part.category || '';
    partStock.value = Number(part.stock || 0);

    compatContainer.innerHTML = '';
    if (Array.isArray(part.compatibility) && part.compatibility.length) {
      part.compatibility.forEach(c => addCompatRow(c.model, c.yearFrom, c.yearTo));
    } else {
      addCompatRow();
    }

    cancelEditBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getBrandName(id) {
    const b = catalogData.brands.find(x => x.id === id);
    return b ? b.name : id;
  }

  function getLocName(id) {
    const l = catalogData.locations.find(x => x.id === id);
    return l ? l.name : 'Ingen lokation';
  }

  function renderPartsList() {
    const q = adminSearch.value.trim().toLowerCase();
    adminPartCount.textContent = String(catalogData.parts.length);

    const matches = catalogData.parts
      .map((part, idx) => ({ part, idx }))
      .filter(({ part }) => {
        if (!q) return true;
        return (
          String(part.partNumber || '').toLowerCase().includes(q) ||
          String(part.name || '').toLowerCase().includes(q) ||
          getBrandName(part.brand).toLowerCase().includes(q) ||
          getLocName(part.location).toLowerCase().includes(q)
        );
      });

    if (!matches.length) {
      adminPartsList.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;">Ingen dele fundet.</p>';
      return;
    }

    adminPartsList.innerHTML = matches.map(({ part, idx }) => `
      <div class="admin-row">
        <div>
          <strong>${esc(part.partNumber)} – ${esc(part.name)}</strong>
          <small>${esc(getBrandName(part.brand))} • 📍 ${esc(getLocName(part.location))} • ${Number(part.stock || 0)} stk.</small>
        </div>
        <div class="row-btns">
          <button type="button" class="btn btn-secondary btn-sm" data-edit="${idx}">Rediger</button>
          <button type="button" class="btn btn-danger btn-sm" data-del="${idx}">Slet</button>
        </div>
      </div>
    `).join('');
  }

  function renderTaxonomies() {
    brandsManageList.innerHTML = catalogData.brands.map((b, idx) => `
      <li>
        <span>${esc(b.name)}</span>
        <button type="button" class="btn btn-danger btn-sm" data-del-brand-idx="${idx}">Slet</button>
      </li>
    `).join('');

    locationsManageList.innerHTML = catalogData.locations.map((l, idx) => `
      <li>
        <span>📍 ${esc(l.name)}</span>
        <button type="button" class="btn btn-danger btn-sm" data-del-loc-idx="${idx}">Slet</button>
      </li>
    `).join('');

    const parents = catalogData.categories.filter(c => c.parent === null);
    categoriesManageList.innerHTML = parents.map(p => {
      const subs = catalogData.categories.filter(c => c.parent === p.id);
      const subHtml = subs.length
        ? subs.map(s => `
            <li>
              <span>↳ ${esc(s.name)}</span>
              <button type="button" class="btn btn-danger btn-sm" data-del-cat-id="${esc(s.id)}">Slet</button>
            </li>
          `).join('')
        : '<li style="color:var(--text-muted);font-size:0.82rem;">Ingen underkategorier</li>';

      return `
        <div class="cat-box">
          <div class="cat-box-head">
            <span>${esc(p.name)}</span>
            <button type="button" class="btn btn-danger btn-sm" data-del-cat-id="${esc(p.id)}">Slet</button>
          </div>
          <ul class="sub-list">${subHtml}</ul>
        </div>
      `;
    }).join('');
  }

  function refreshUI() {
    populateSelects();
    renderPartsList();
    renderTaxonomies();
  }

  // Formular-events (Reservedele)
  addCompatBtn.addEventListener('click', () => addCompatRow());
  cancelEditBtn.addEventListener('click', resetForm);
  adminSearch.addEventListener('input', renderPartsList);

  partForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const compatibility = Array.from(compatContainer.querySelectorAll('.compat-row'))
      .map(r => ({
        model: r.querySelector('.c-model').value.trim(),
        yearFrom: parseInt(r.querySelector('.c-from').value, 10),
        yearTo: parseInt(r.querySelector('.c-to').value, 10)
      }))
      .filter(c => c.model && !Number.isNaN(c.yearFrom) && !Number.isNaN(c.yearTo));

    const item = {
      partNumber: partNumber.value.trim(),
      name: partName.value.trim(),
      brand: partBrand.value,
      category: partCategory.value,
      location: partLocation.value,
      stock: Math.max(0, parseInt(partStock.value, 10) || 0),
      compatibility
    };

    const idx = parseInt(editIndex.value, 10);
    if (idx >= 0 && catalogData.parts[idx]) {
      catalogData.parts[idx] = item;
      showToast(`Opdaterede ${item.partNumber}`);
    } else {
      catalogData.parts.unshift(item);
      showToast(`Tilføjede ${item.partNumber}`);
    }

    persist();
    resetForm();
    renderPartsList();
  });

  adminPartsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      loadForEdit(Number(editBtn.dataset.edit));
      return;
    }

    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      const idx = Number(delBtn.dataset.del);
      const part = catalogData.parts[idx];
      if (!part) return;
      if (confirm(`Slet "${part.partNumber} – ${part.name}"?`)) {
        catalogData.parts.splice(idx, 1);
        persist();
        renderPartsList();
        showToast('Reservedel slettet');
      }
    }
  });

  // Tilføj / slet mærker
  addBrandForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = newBrandName.value.trim();
    if (!name) return;
    catalogData.brands.push({ id: makeId(name, catalogData.brands), name });
    newBrandName.value = '';
    persist();
    refreshUI();
    showToast(`Tilføjede mærke: ${name}`);
  });

  brandsManageList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del-brand-idx]');
    if (!btn) return;
    const idx = Number(btn.dataset.delBrandIdx);
    const brand = catalogData.brands[idx];
    if (!brand) return;

    if (catalogData.parts.some(p => p.brand === brand.id)) {
      alert('Mærket bruges af eksisterende reservedele og kan ikke slettes.');
      return;
    }
    catalogData.brands.splice(idx, 1);
    persist();
    refreshUI();
    showToast('Mærke slettet');
  });

  // Tilføj / slet lokationer
  addLocationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = newLocationName.value.trim();
    if (!name) return;
    catalogData.locations.push({ id: makeId(name, catalogData.locations), name });
    newLocationName.value = '';
    persist();
    refreshUI();
    showToast(`Tilføjede lokation: ${name}`);
  });

  locationsManageList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del-loc-idx]');
    if (!btn) return;
    const idx = Number(btn.dataset.delLocIdx);
    const loc = catalogData.locations[idx];
    if (!loc) return;

    if (catalogData.parts.some(p => p.location === loc.id)) {
      alert('Lokationen er tilknyttet reservedele og kan ikke slettes.');
      return;
    }
    catalogData.locations.splice(idx, 1);
    persist();
    refreshUI();
    showToast('Lokation slettet');
  });

  // Tilføj / slet kategorier
  addMainCatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = newMainCatName.value.trim();
    if (!name) return;
    catalogData.categories.push({ id: makeId(name, catalogData.categories), name, parent: null });
    newMainCatName.value = '';
    persist();
    refreshUI();
    showToast(`Tilføjede hovedkategori: ${name}`);
  });

  addSubCatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const parent = parentCatSelect.value;
    const name = newSubCatName.value.trim();
    if (!parent || !name) return;
    catalogData.categories.push({ id: makeId(name, catalogData.categories), name, parent });
    newSubCatName.value = '';
    persist();
    refreshUI();
    showToast(`Tilføjede underkategori: ${name}`);
  });

  categoriesManageList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del-cat-id]');
    if (!btn) return;
    const id = btn.dataset.delCatId;

    if (catalogData.categories.some(c => c.parent === id)) {
      alert('Slet underkategorierne først.');
      return;
    }
    if (catalogData.parts.some(p => p.category === id)) {
      alert('Kategorien bruges af eksisterende reservedele.');
      return;
    }
    catalogData.categories = catalogData.categories.filter(c => c.id !== id);
    persist();
    refreshUI();
    showToast('Kategori slettet');
  });

  // Eksport, Import og Nulstil
  downloadJsonBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(catalogData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'parts.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('parts.json downloadet!');
  });

  triggerImportBtn.addEventListener('click', () => {
    importJsonInput.click();
  });

  importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed.brands) || !Array.isArray(parsed.categories) || !Array.isArray(parsed.parts)) {
          throw new Error('Ugyldigt format');
        }
        catalogData = {
          brands: parsed.brands,
          categories: parsed.categories,
          locations: Array.isArray(parsed.locations) ? parsed.locations : [],
          parts: parsed.parts
        };
        persist();
        refreshUI();
        resetForm();
        showToast(`Importerede ${catalogData.parts.length} dele!`);
      } catch {
        alert('Filen er ikke en gyldig parts.json.');
      }
      importJsonInput.value = '';
    };
    reader.readAsText(file);
  });

  resetStorageBtn.addEventListener('click', () => {
    if (confirm('Nulstil alle lokale ændringer og indlæs data/parts.json på ny?')) {
      localStorage.removeItem(STORAGE_KEY);
      init();
      showToast('Nulstillet til original fil');
    }
  });

  async function init() {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        catalogData = JSON.parse(local);
        updateStatus(true);
      } else {
        const res = await fetch('data/parts.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        catalogData = await res.json();
        updateStatus(false);
      }
      catalogData.brands = catalogData.brands || [];
      catalogData.categories = catalogData.categories || [];
      catalogData.locations = catalogData.locations || [];
      catalogData.parts = catalogData.parts || [];

      refreshUI();
      resetForm();
    } catch (err) {
      console.error(err);
      storageStatus.textContent = 'Fejl: Kunne ikke indlæse data/parts.json (åbn siden via lokal webserver).';
    }
  }

  init();
});