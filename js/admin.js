document.addEventListener('DOMContentLoaded', () => {
  const { url, anonKey } = window.SUPABASE_CONFIG || {};
  const db = window.supabase.createClient(url, anonKey);

  let catalogData = {
    brands: [],
    categories: [],
    locations: [],
    parts: []
  };

  // Auth & Sektions-elementer
  const loginSection = document.getElementById('loginSection');
  const adminAppSection = document.getElementById('adminAppSection');
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  // Admin UI-elementer
  const storageStatus = document.getElementById('storageStatus');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  const triggerImportBtn = document.getElementById('triggerImportBtn');
  const importJsonInput = document.getElementById('importJsonInput');

  const tabBtnParts = document.getElementById('tabBtnParts');
  const tabBtnTaxonomy = document.getElementById('tabBtnTaxonomy');
  const tabPanelParts = document.getElementById('tabPanelParts');
  const tabPanelTaxonomy = document.getElementById('tabPanelTaxonomy');

  const formTitle = document.getElementById('formTitle');
  const partForm = document.getElementById('partForm');
  const editPartId = document.getElementById('editPartId');
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
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
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

  // Login / Logout håndtering
  async function checkSession() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
      showAdmin(session.user.email);
    } else {
      showLogin();
    }
  }

  function showLogin() {
    loginSection.classList.remove('hidden');
    adminAppSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }

  async function showAdmin(userEmail) {
    loginSection.classList.add('hidden');
    adminAppSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    storageStatus.textContent = `Logget ind som ${userEmail} • Live database aktiv`;
    await loadAllData();
    resetForm();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');

    const { data, error } = await db.auth.signInWithPassword({
      email: loginEmail.value.trim(),
      password: loginPassword.value
    });

    if (error) {
      loginError.textContent = 'Forkert email eller adgangskode.';
      loginError.classList.remove('hidden');
      return;
    }

    loginForm.reset();
    showAdmin(data.user.email);
  });

  logoutBtn.addEventListener('click', async () => {
    await db.auth.signOut();
    showLogin();
    showToast('Du er logget ud');
  });

  // Hent alle data fra Supabase
  async function loadAllData() {
    const [brandsRes, catsRes, locsRes, partsRes] = await Promise.all([
      db.from('brands').select('*').order('name'),
      db.from('categories').select('*').order('name'),
      db.from('locations').select('*').order('name'),
      db.from('parts').select('*').order('id', { ascending: false })
    ]);

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

    refreshUI();
  }

  // Faner
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
      <input type="text" class="c-model" placeholder="Model (f.eks. A3)" value="${esc(model)}">
      <input type="number" class="c-from" placeholder="Fra år" min="1960" max="2035" value="${esc(yearFrom)}">
      <input type="number" class="c-to" placeholder="Til år" min="1960" max="2035" value="${esc(yearTo)}">
      <button type="button" class="btn btn-danger btn-sm c-remove" aria-label="Fjern model">&times;</button>
    `;
    row.querySelector('.c-remove').addEventListener('click', () => row.remove());
    compatContainer.appendChild(row);
  }

  function resetForm() {
    partForm.reset();
    editPartId.value = '';
    partStock.value = '1';
    formTitle.textContent = 'Tilføj ny reservedel';
    cancelEditBtn.classList.add('hidden');
    compatContainer.innerHTML = '';
    addCompatRow();
  }

  function loadForEdit(partId) {
    const part = catalogData.parts.find(p => p.id === partId);
    if (!part) return;

    editPartId.value = String(part.id);
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

    const matches = catalogData.parts.filter(part => {
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

    adminPartsList.innerHTML = matches.map(part => `
      <div class="admin-row">
        <div>
          <strong>${esc(part.partNumber)} – ${esc(part.name)}</strong>
          <small>${esc(getBrandName(part.brand))} • 📍 ${esc(getLocName(part.location))} • ${Number(part.stock || 0)} stk.</small>
        </div>
        <div class="row-btns">
          <button type="button" class="btn btn-secondary btn-sm" data-edit-id="${part.id}">Rediger</button>
          <button type="button" class="btn btn-danger btn-sm" data-del-id="${part.id}">Slet</button>
        </div>
      </div>
    `).join('');
  }

  function renderTaxonomies() {
    brandsManageList.innerHTML = catalogData.brands.map(b => `
      <li>
        <span>${esc(b.name)}</span>
        <button type="button" class="btn btn-danger btn-sm" data-del-brand="${esc(b.id)}">Slet</button>
      </li>
    `).join('');

    locationsManageList.innerHTML = catalogData.locations.map(l => `
      <li>
        <span>📍 ${esc(l.name)}</span>
        <button type="button" class="btn btn-danger btn-sm" data-del-loc="${esc(l.id)}">Slet</button>
      </li>
    `).join('');

    const parents = catalogData.categories.filter(c => c.parent === null);
    categoriesManageList.innerHTML = parents.map(p => {
      const subs = catalogData.categories.filter(c => c.parent === p.id);
      const subHtml = subs.length
        ? subs.map(s => `
            <li>
              <span>↳ ${esc(s.name)}</span>
              <button type="button" class="btn btn-danger btn-sm" data-del-cat="${esc(s.id)}">Slet</button>
            </li>
          `).join('')
        : '<li style="color:var(--text-muted);font-size:0.82rem;">Ingen underkategorier</li>';

      return `
        <div class="cat-box">
          <div class="cat-box-head">
            <span>${esc(p.name)}</span>
            <button type="button" class="btn btn-danger btn-sm" data-del-cat="${esc(p.id)}">Slet</button>
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

  // Gem / Opdater reservedel i Supabase
  addCompatBtn.addEventListener('click', () => addCompatRow());
  cancelEditBtn.addEventListener('click', resetForm);
  adminSearch.addEventListener('input', renderPartsList);

  partForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const compatibility = Array.from(compatContainer.querySelectorAll('.compat-row'))
      .map(r => ({
        model: r.querySelector('.c-model').value.trim(),
        yearFrom: parseInt(r.querySelector('.c-from').value, 10),
        yearTo: parseInt(r.querySelector('.c-to').value, 10)
      }))
      .filter(c => c.model && !Number.isNaN(c.yearFrom) && !Number.isNaN(c.yearTo));

    const payload = {
      part_number: partNumber.value.trim(),
      name: partName.value.trim(),
      brand: partBrand.value,
      category: partCategory.value,
      location: partLocation.value || null,
      stock: Math.max(0, parseInt(partStock.value, 10) || 0),
      compatibility
    };

    const existingId = editPartId.value ? Number(editPartId.value) : null;

    if (existingId) {
      const { error } = await db.from('parts').update(payload).eq('id', existingId);
      if (error) return alert('Fejl ved opdatering: ' + error.message);
      showToast(`Opdaterede ${payload.part_number}`);
    } else {
      const { error } = await db.from('parts').insert([payload]);
      if (error) return alert('Fejl ved oprettelse: ' + error.message);
      showToast(`Tilføjede ${payload.part_number}`);
    }

    resetForm();
    await loadAllData();
  });

  adminPartsList.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit-id]');
    if (editBtn) {
      loadForEdit(Number(editBtn.dataset.editId));
      return;
    }

    const delBtn = e.target.closest('[data-del-id]');
    if (delBtn) {
      const id = Number(delBtn.dataset.delId);
      const part = catalogData.parts.find(p => p.id === id);
      if (!part) return;
      if (!confirm(`Slet "${part.partNumber} – ${part.name}" fra databasen?`)) return;

      const { error } = await db.from('parts').delete().eq('id', id);
      if (error) return alert('Kunne ikke slette: ' + error.message);
      showToast('Reservedel slettet');
      await loadAllData();
    }
  });

  // Tilføj / slet mærker
  addBrandForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newBrandName.value.trim();
    if (!name) return;
    const id = makeId(name, catalogData.brands);
    const { error } = await db.from('brands').insert([{ id, name }]);
    if (error) return alert('Fejl: ' + error.message);
    newBrandName.value = '';
    showToast(`Tilføjede mærke: ${name}`);
    await loadAllData();
  });

  brandsManageList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del-brand]');
    if (!btn) return;
    const id = btn.dataset.delBrand;
    const { error } = await db.from('brands').delete().eq('id', id);
    if (error) return alert('Kan ikke slette mærket (det bruges muligvis af eksisterende reservedele).');
    showToast('Mærke slettet');
    await loadAllData();
  });

  // Tilføj / slet lokationer
  addLocationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newLocationName.value.trim();
    if (!name) return;
    const id = makeId(name, catalogData.locations);
    const { error } = await db.from('locations').insert([{ id, name }]);
    if (error) return alert('Fejl: ' + error.message);
    newLocationName.value = '';
    showToast(`Tilføjede lokation: ${name}`);
    await loadAllData();
  });

  locationsManageList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del-loc]');
    if (!btn) return;
    const id = btn.dataset.delLoc;
    const { error } = await db.from('locations').delete().eq('id', id);
    if (error) return alert('Fejl ved sletning: ' + error.message);
    showToast('Lokation slettet');
    await loadAllData();
  });

  // Tilføj / slet kategorier
  addMainCatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newMainCatName.value.trim();
    if (!name) return;
    const id = makeId(name, catalogData.categories);
    const { error } = await db.from('categories').insert([{ id, name, parent: null }]);
    if (error) return alert('Fejl: ' + error.message);
    newMainCatName.value = '';
    showToast(`Tilføjede hovedkategori: ${name}`);
    await loadAllData();
  });

  addSubCatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const parent = parentCatSelect.value;
    const name = newSubCatName.value.trim();
    if (!parent || !name) return;
    const id = makeId(name, catalogData.categories);
    const { error } = await db.from('categories').insert([{ id, name, parent }]);
    if (error) return alert('Fejl: ' + error.message);
    newSubCatName.value = '';
    showToast(`Tilføjede underkategori: ${name}`);
    await loadAllData();
  });

  categoriesManageList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del-cat]');
    if (!btn) return;
    const id = btn.dataset.delCat;
    const { error } = await db.from('categories').delete().eq('id', id);
    if (error) return alert('Kan ikke slette (slet underkategorier eller tilknyttede reservedele først).');
    showToast('Kategori slettet');
    await loadAllData();
  });

  // Backup download & masse-import af parts.json direkte ind i Supabase
  downloadJsonBtn.addEventListener('click', () => {
    const exportObj = {
      brands: catalogData.brands,
      categories: catalogData.categories,
      locations: catalogData.locations,
      parts: catalogData.parts.map(p => ({
        partNumber: p.partNumber,
        name: p.name,
        brand: p.brand,
        category: p.category,
        location: p.location,
        stock: p.stock,
        compatibility: p.compatibility
      }))
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const urlObj = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlObj;
    link.download = 'parts-backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(urlObj);
    showToast('Backup downloadet!');
  });

  triggerImportBtn.addEventListener('click', () => importJsonInput.click());

  importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed.brands) || !Array.isArray(parsed.categories) || !Array.isArray(parsed.parts)) {
          throw new Error('Ugyldigt format');
        }

        showToast('Importerer til database...');

        // 1. Upsert brands
        if (parsed.brands.length) {
          const { error } = await db.from('brands').upsert(parsed.brands, { onConflict: 'id' });
          if (error) throw error;
        }

        // 2. Upsert hovedkategorier først, derefter underkategorier
        const mainCats = parsed.categories.filter(c => !c.parent);
        const subCats = parsed.categories.filter(c => c.parent);
        if (mainCats.length) {
          const { error } = await db.from('categories').upsert(mainCats, { onConflict: 'id' });
          if (error) throw error;
        }
        if (subCats.length) {
          const { error } = await db.from('categories').upsert(subCats, { onConflict: 'id' });
          if (error) throw error;
        }

        // 3. Upsert lokationer
        if (Array.isArray(parsed.locations) && parsed.locations.length) {
          const { error } = await db.from('locations').upsert(parsed.locations, { onConflict: 'id' });
          if (error) throw error;
        }

        // 4. Indsæt reservedele
        if (parsed.parts.length) {
          const rows = parsed.parts.map(p => ({
            part_number: p.partNumber,
            name: p.name,
            brand: p.brand,
            category: p.category,
            location: p.location || null,
            stock: Math.max(0, parseInt(p.stock, 10) || 0),
            compatibility: p.compatibility || []
          }));
          const { error } = await db.from('parts').insert(rows);
          if (error) throw error;
        }

        await loadAllData();
        resetForm();
        showToast(`Importerede ${parsed.parts.length} dele til databasen!`);
      } catch (err) {
        console.error(err);
        alert('Fejl ved import: ' + err.message);
      }
      importJsonInput.value = '';
    };
    reader.readAsText(file);
  });

  checkSession();
});