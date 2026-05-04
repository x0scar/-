// ============================================================
//  WITCHER MAP — MAIN APPLICATION
//  Interactive RPG Map with lore markers and sharing
// ============================================================

(function () {
  'use strict';

  // =========================================================
  //  STATE
  // =========================================================
  const state = {
    locations: [],
    mode: 'pin',          // 'pin' | 'pan'
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panStartPanX: 0,
    panStartPanY: 0,
    editingId: null,
    sidebarView: 'list',  // 'list' | 'add' | 'edit'
    searchQuery: '',
    pendingPinCoords: null,
    tagInput: '',
    currentTags: [],
  };

  const MAP_W = 1600;
  const MAP_H = 900;

  // =========================================================
  //  DOM REFERENCES
  // =========================================================
  const $ = id => document.getElementById(id);

  let mapContainer, mapWrapper, sidebar, modal, modalOverlay;
  let sharePopup, contextMenu, helpHint;
  let btnAddMode, btnPanMode, btnZoomIn, btnZoomOut, btnFit;
  let sidebarTitle, sidebarBody, sidebarFooter;
  let searchInput, zoomIndicator, modeIndicator;
  let statTotal, statToday;
  let statsBar;

  // =========================================================
  //  INIT
  // =========================================================
  function init() {
    buildDOM();
    cacheRefs();
    loadLocations();
    bindEvents();
    fitMapToScreen();
    renderAll();
    hideHelpHintAfterDelay();
  }

  // =========================================================
  //  BUILD ENTIRE DOM
  // =========================================================
  function buildDOM() {
    document.getElementById('app').innerHTML = `
      <!-- TOP BAR -->
      <div id="topbar">
        <div class="topbar-left">
          <div class="logo-medallion">🐺</div>
          <div>
            <div class="app-title">THE CONTINENT</div>
            <div class="app-subtitle">Интерактивная карта ведьмачьего мира</div>
          </div>
        </div>
        <div class="topbar-right">
          <button class="btn btn-ghost" id="btn-share">⚔ Поделиться</button>
          <button class="btn btn-ghost" id="btn-export">📜 Экспорт</button>
          <button class="btn" id="btn-open-list">📍 Локации</button>
        </div>
      </div>

      <!-- MAP AREA -->
      <div id="map-container">
        
        <!-- Toolbar -->
        <div id="toolbar">
          <button class="tool-btn active" id="btn-pin-mode" title="Режим: добавить метку">📍</button>
          <button class="tool-btn" id="btn-pan-mode" title="Режим: перемещение">✋</button>
          <div class="tool-separator"></div>
          <button class="tool-btn" id="btn-zoom-in" title="Приблизить">＋</button>
          <button class="tool-btn" id="btn-zoom-out" title="Отдалить">－</button>
          <button class="tool-btn" id="btn-fit" title="По размеру экрана">⊡</button>
        </div>

        <!-- Search -->
        <div id="searchbar">
          <span class="search-icon">🔍</span>
          <input type="text" id="search-input" placeholder="Искать локацию…"/>
        </div>

        <!-- Stats -->
        <div id="stats-bar">
          <div class="stat-chip">📍 <span class="stat-number" id="stat-total">0</span> мест</div>
          <div class="stat-chip">📅 <span class="stat-number" id="stat-today">0</span> сегодня</div>
        </div>

        <!-- Map wrapper -->
        <div id="map-wrapper">
          <img id="map-svg" src="assets/map.svg" draggable="false"/>
          <div id="markers-layer"></div>
        </div>

        <!-- Help hint -->
        <div id="help-hint">Кликните по карте, чтобы добавить метку • Прокрутите колёсиком для масштабирования</div>

        <!-- Zoom indicator -->
        <div id="zoom-indicator">МАСШТАБ: <span id="zoom-value">100</span>%</div>

        <!-- Mode indicator -->
        <div id="mode-indicator">
          <div class="mode-dot"></div>
          <span id="mode-text">ДОБАВИТЬ МЕТКУ</span>
        </div>

        <!-- Sidebar -->
        <div id="sidebar">
          <div class="sidebar-header">
            <div class="sidebar-title" id="sidebar-title">ЛОКАЦИИ</div>
            <div class="sidebar-subtitle" id="sidebar-subtitle">Все отмеченные места</div>
            <button class="sidebar-close" id="sidebar-close">✕</button>
          </div>
          <div class="sidebar-body" id="sidebar-body"></div>
          <div class="sidebar-footer" id="sidebar-footer"></div>
        </div>

        <!-- Context menu -->
        <div id="context-menu">
          <div class="ctx-item" id="ctx-add"><span class="ctx-item-icon">📍</span>Добавить метку</div>
          <div class="ctx-separator"></div>
          <div class="ctx-item ctx-has-marker hidden" id="ctx-edit"><span class="ctx-item-icon">✏️</span>Редактировать</div>
          <div class="ctx-item ctx-has-marker danger hidden" id="ctx-delete"><span class="ctx-item-icon">🗑️</span>Удалить</div>
        </div>
      </div>

      <!-- MODAL OVERLAY -->
      <div id="modal-overlay">
        <div id="modal">
          <div class="modal-top-ornament"></div>
          <div class="modal-header" id="modal-header">
            <button class="modal-close" id="modal-close">✕</button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer" id="modal-footer"></div>
        </div>
      </div>

      <!-- SHARE POPUP -->
      <div id="share-popup">
        <div class="share-title">⚔ ССЫЛКА НА КАРТУ</div>
        <input type="text" class="share-url" id="share-url" readonly/>
        <button class="btn btn-primary" id="btn-copy-url" style="width:100%">📋 Скопировать ссылку</button>
      </div>
    `;
  }

  function cacheRefs() {
    mapContainer  = $('map-container');
    mapWrapper    = $('map-wrapper');
    sidebar       = $('sidebar');
    modal         = $('modal');
    modalOverlay  = $('modal-overlay');
    sharePopup    = $('share-popup');
    contextMenu   = $('context-menu');
    helpHint      = $('help-hint');
    btnAddMode    = $('btn-pin-mode');
    btnPanMode    = $('btn-pan-mode');
    sidebarTitle  = $('sidebar-title');
    sidebarBody   = $('sidebar-body');
    sidebarFooter = $('sidebar-footer');
    searchInput   = $('search-input');
    zoomIndicator = $('zoom-value');
    modeIndicator = $('mode-text');
    statTotal     = $('stat-total');
    statToday     = $('stat-today');
  }

  // =========================================================
  //  STORAGE
  // =========================================================
  function loadLocations() {
    try {
      const saved = localStorage.getItem('witcher_map_locations');
      if (saved) {
        state.locations = JSON.parse(saved);
      } else {
        // Load from URL params or use defaults
        const urlData = getURLData();
        state.locations = urlData || DEFAULT_LOCATIONS.map(l => ({
          ...l,
          createdAt: Date.now()
        }));
        saveLocations();
      }
    } catch (e) {
      state.locations = DEFAULT_LOCATIONS.map(l => ({ ...l, createdAt: Date.now() }));
    }
  }

  function saveLocations() {
    localStorage.setItem('witcher_map_locations', JSON.stringify(state.locations));
  }

  function getURLData() {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return null;
      return JSON.parse(decodeURIComponent(atob(hash)));
    } catch { return null; }
  }

  // =========================================================
  //  RENDER — MAP TRANSFORM
  // =========================================================
  function applyTransform() {
    mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    zoomIndicator.textContent = Math.round(state.zoom * 100);
  }

  function fitMapToScreen() {
    const rect = mapContainer.getBoundingClientRect();
    const scaleX = rect.width  / MAP_W;
    const scaleY = rect.height / MAP_H;
    state.zoom = Math.min(scaleX, scaleY) * 0.95;
    state.panX = (rect.width  - MAP_W * state.zoom) / 2;
    state.panY = (rect.height - MAP_H * state.zoom) / 2;
    applyTransform();
  }

  // =========================================================
  //  RENDER — MARKERS
  // =========================================================
  function renderAll() {
    renderMarkers();
    renderSidebar();
    updateStats();
  }

  function renderMarkers() {
    const layer = $('markers-layer');
    layer.innerHTML = '';

    const query = state.searchQuery.toLowerCase();

    state.locations.forEach(loc => {
      if (query && !loc.name.toLowerCase().includes(query) &&
          !loc.lore?.toLowerCase().includes(query)) return;

      const typeConf = LOCATION_TYPES[loc.type] || LOCATION_TYPES.custom;
      const dangerLabel = DANGER_LABELS[loc.danger || 1];

      const el = document.createElement('div');
      el.className = 'marker' + (query ? ' marker-highlighted' : '');
      el.dataset.id = loc.id;
      el.style.left = loc.x + 'px';
      el.style.top  = loc.y + 'px';

      el.innerHTML = `
        <div class="marker-pin" style="color:${typeConf.color}">
          ${pinSVG(typeConf.color)}
        </div>
        <div class="marker-label">${loc.name}</div>
        <div class="marker-tooltip">
          <div class="tooltip-name">${typeConf.icon} ${loc.name}</div>
          ${loc.lore ? `<div class="tooltip-excerpt">${loc.lore.slice(0, 100)}…</div>` : ''}
          <div class="tooltip-type">${typeConf.label} · ${dangerLabel}</div>
        </div>
      `;

      el.addEventListener('click', e => {
        e.stopPropagation();
        openLocModal(loc.id);
      });

      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenuForMarker(e, loc.id);
      });

      layer.appendChild(el);
    });
  }

  function pinSVG(color) {
    return `<svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2 C8.3 2 2 8.3 2 16 C2 26 16 40 16 40 C16 40 30 26 30 16 C30 8.3 23.7 2 16 2Z" 
            fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="6" fill="rgba(0,0,0,0.3)"/>
      <circle cx="13" cy="13" r="2.5" fill="rgba(255,255,255,0.35)"/>
    </svg>`;
  }

  // =========================================================
  //  RENDER — SIDEBAR
  // =========================================================
  function renderSidebar() {
    const view = state.sidebarView;

    if (view === 'list') {
      renderLocationList();
    } else if (view === 'add' || view === 'edit') {
      renderLocationForm(state.editingId);
    }
  }

  function renderLocationList() {
    sidebarTitle.textContent = 'ЛОКАЦИИ';
    $('sidebar-subtitle').textContent = `${state.locations.length} отмечено на карте`;

    const query = state.searchQuery.toLowerCase();
    const filtered = state.locations.filter(l =>
      !query || l.name.toLowerCase().includes(query) || l.lore?.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      sidebarBody.innerHTML = `
        <div class="empty-state fade-in">
          <div class="empty-icon">🗺️</div>
          <div class="empty-text">
            ${query ? 'Ничего не найдено по запросу «' + query + '»' : 
              'Кликните по карте, чтобы добавить первую локацию'}
          </div>
        </div>`;
      sidebarFooter.innerHTML = '';
      return;
    }

    sidebarBody.innerHTML = filtered.map(loc => {
      const t = LOCATION_TYPES[loc.type] || LOCATION_TYPES.custom;
      return `
      <div class="location-card fade-in" data-card-id="${loc.id}">
        <div class="location-card-header">
          <span class="location-card-icon">${t.icon}</span>
          <span class="location-card-name">${loc.name}</span>
          <span class="location-card-type">${t.label}</span>
        </div>
        ${loc.lore ? `<div class="location-card-lore">${loc.lore}</div>` : ''}
        <div class="location-card-actions">
          <button class="card-btn" data-action="view" data-id="${loc.id}">👁 Читать</button>
          <button class="card-btn" data-action="goto" data-id="${loc.id}">🎯 Найти</button>
          <button class="card-btn" data-action="edit" data-id="${loc.id}">✏️ Изменить</button>
          <button class="card-btn card-btn-danger" data-action="delete" data-id="${loc.id}">✕</button>
        </div>
      </div>`;
    }).join('');

    sidebarFooter.innerHTML = `
      <button class="btn btn-primary" id="btn-add-new" style="flex:1">+ Добавить локацию</button>
    `;

    sidebarBody.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'view')   openLocModal(id);
        if (action === 'goto')   goToLocation(id);
        if (action === 'edit')   openEditForm(id);
        if (action === 'delete') deleteLocation(id);
      });
    });

    const btnAddNew = $('btn-add-new');
    if (btnAddNew) btnAddNew.addEventListener('click', openAddForm);
  }

  function renderLocationForm(editId) {
    const isEdit = !!editId;
    const loc = isEdit ? state.locations.find(l => l.id === editId) : null;

    sidebarTitle.textContent = isEdit ? 'РЕДАКТИРОВАТЬ' : 'НОВАЯ ЛОКАЦИЯ';
    $('sidebar-subtitle').textContent = isEdit ? loc?.name || '' : 'Добавить место на карту';

    const typeOptions = Object.entries(LOCATION_TYPES).map(([key, val]) => `
      <div class="type-btn ${(loc?.type || 'city') === key ? 'active' : ''}" data-type="${key}">
        <span class="type-icon">${val.icon}</span>
        ${val.label}
      </div>
    `).join('');

    const curDanger = loc?.danger || 1;
    const curTags = loc?.tags || state.currentTags || [];

    sidebarBody.innerHTML = `
      <div class="form-group">
        <label class="form-label">Название локации</label>
        <input type="text" class="form-input" id="f-name" placeholder="Напр.: Замок Гюнтера" 
               value="${loc?.name || ''}"/>
      </div>

      <div class="form-group">
        <label class="form-label">Тип локации</label>
        <div class="type-grid" id="f-type-grid">${typeOptions}</div>
        <input type="hidden" id="f-type" value="${loc?.type || 'city'}"/>
      </div>

      <hr class="form-divider" data-label="ЛОР">

      <div class="form-group">
        <label class="form-label">Описание / Лор</label>
        <textarea class="form-textarea" id="f-lore" 
          placeholder="Расскажи историю этого места — легенды, события, тайны…">${loc?.lore || ''}</textarea>
      </div>

      <hr class="form-divider" data-label="ДЕТАЛИ">

      <div class="form-group">
        <label class="form-label">Уровень опасности: <span id="danger-display">${DANGER_LABELS[curDanger]}</span></label>
        <input type="range" class="danger-slider" id="f-danger" min="1" max="5" value="${curDanger}"/>
        <div class="danger-labels">
          <span>Безопасно</span>
          <span>Опасно</span>
          <span>Смертельно</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Теги</label>
        <div class="tags-container" id="tags-container">
          ${curTags.map(t => `
            <div class="tag" data-tag="${t}">
              ${t}<span class="tag-remove">✕</span>
            </div>`).join('')}
        </div>
        <input type="text" class="form-input" id="tag-input" 
               placeholder="Введи тег и нажми Enter…" style="margin-top:6px; border-top:none"/>
      </div>

      ${!isEdit && state.pendingPinCoords ? `
      <div class="form-group" style="opacity:0.7">
        <label class="form-label">Координаты</label>
        <div style="font-family:var(--font-heading);font-size:10px;color:var(--gold);letter-spacing:1px">
          X: ${Math.round(state.pendingPinCoords.x)} · Y: ${Math.round(state.pendingPinCoords.y)}
        </div>
      </div>` : ''}
    `;

    sidebarFooter.innerHTML = `
      <button class="btn btn-primary" id="f-save" style="flex:2">${isEdit ? '✔ Сохранить' : '✚ Добавить на карту'}</button>
      <button class="btn btn-ghost" id="f-cancel" style="flex:1">Отмена</button>
    `;

    // Type grid toggle
    sidebarBody.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sidebarBody.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $('f-type').value = btn.dataset.type;
      });
    });

    // Danger slider
    $('f-danger').addEventListener('input', function () {
      $('danger-display').textContent = DANGER_LABELS[this.value];
    });

    // Tags
    $('tag-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && this.value.trim()) {
        addTag(this.value.trim());
        this.value = '';
      }
    });

    $('tags-container').addEventListener('click', function (e) {
      const tag = e.target.closest('.tag');
      if (tag) removeTag(tag.dataset.tag);
    });

    // Save / Cancel
    $('f-save').addEventListener('click', () => saveForm(editId));
    $('f-cancel').addEventListener('click', () => {
      state.currentTags = [];
      state.pendingPinCoords = null;
      state.sidebarView = 'list';
      renderSidebar();
    });
  }

  function addTag(text) {
    const container = $('tags-container');
    const existing = [...container.querySelectorAll('.tag')].map(t => t.dataset.tag);
    if (existing.includes(text)) return;
    const el = document.createElement('div');
    el.className = 'tag';
    el.dataset.tag = text;
    el.innerHTML = `${text}<span class="tag-remove">✕</span>`;
    container.appendChild(el);
  }

  function removeTag(text) {
    const container = $('tags-container');
    const el = container.querySelector(`[data-tag="${text}"]`);
    if (el) el.remove();
  }

  function getTags() {
    const container = $('tags-container');
    if (!container) return [];
    return [...container.querySelectorAll('.tag')].map(t => t.dataset.tag);
  }

  // =========================================================
  //  FORM SAVE
  // =========================================================
  function saveForm(editId) {
    const name = $('f-name')?.value.trim();
    const type = $('f-type')?.value || 'custom';
    const lore = $('f-lore')?.value.trim();
    const danger = parseInt($('f-danger')?.value || '1');
    const tags = getTags();

    if (!name) { showNotification('⚠ Введите название локации'); return; }

    if (editId) {
      const idx = state.locations.findIndex(l => l.id === editId);
      if (idx !== -1) {
        state.locations[idx] = { ...state.locations[idx], name, type, lore, danger, tags };
      }
      showNotification('✔ Локация обновлена: ' + name);
    } else {
      const coords = state.pendingPinCoords || { x: MAP_W / 2, y: MAP_H / 2 };
      const newLoc = {
        id: 'loc_' + Date.now(),
        name, type, lore, danger, tags,
        x: coords.x,
        y: coords.y,
        createdAt: Date.now(),
      };
      state.locations.push(newLoc);
      showNotification('✚ Добавлено: ' + name);
    }

    state.pendingPinCoords = null;
    state.currentTags = [];
    state.editingId = null;
    state.sidebarView = 'list';
    saveLocations();
    renderAll();
  }

  // =========================================================
  //  LOCATION ACTIONS
  // =========================================================
  function deleteLocation(id) {
    if (!confirm('Удалить эту локацию с карты?')) return;
    state.locations = state.locations.filter(l => l.id !== id);
    saveLocations();
    renderAll();
    showNotification('🗑 Локация удалена');
  }

  function openEditForm(id) {
    state.editingId = id;
    state.sidebarView = 'edit';
    sidebar.classList.add('open');
    renderSidebar();
  }

  function openAddForm(coords) {
    state.pendingPinCoords = coords || null;
    state.currentTags = [];
    state.sidebarView = 'add';
    sidebar.classList.add('open');
    renderSidebar();
  }

  function goToLocation(id) {
    const loc = state.locations.find(l => l.id === id);
    if (!loc) return;
    closeSidebar();

    const rect = mapContainer.getBoundingClientRect();
    state.panX = rect.width  / 2 - loc.x * state.zoom;
    state.panY = rect.height / 2 - loc.y * state.zoom;
    applyTransform();

    // Briefly highlight the marker
    setTimeout(() => {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) {
        el.classList.add('marker-highlighted');
        setTimeout(() => el.classList.remove('marker-highlighted'), 2000);
      }
    }, 300);
  }

  // =========================================================
  //  MODAL — LORE VIEWER
  // =========================================================
  function openLocModal(id) {
    const loc = state.locations.find(l => l.id === id);
    if (!loc) return;

    const t = LOCATION_TYPES[loc.type] || LOCATION_TYPES.custom;
    const dangerLabel = DANGER_LABELS[loc.danger || 1];
    const dangerColor = ['', '#4a8a4a','#a0a020','#d08020','#c04040','#8a0000'][loc.danger || 1];

    $('modal-header').innerHTML = `
      <button class="modal-close" id="modal-close">✕</button>
      <div class="modal-location-type">
        ${t.icon} ${t.label.toUpperCase()}
      </div>
      <div class="modal-location-name">${loc.name}</div>
      <div class="modal-danger-badge" style="border-color:${dangerColor}40; color:${dangerColor}">
        ⚠ ${dangerLabel}
      </div>
    `;

    $('modal-body').innerHTML = `
      ${loc.lore
        ? `<div class="lore-text">${loc.lore}</div>`
        : `<div class="lore-text" style="opacity:0.4;font-style:italic">Летопись ещё не написана. Что скрывает это место?</div>`}
      ${loc.tags?.length
        ? `<div class="modal-tags">${loc.tags.map(t => `<div class="modal-tag">${t}</div>`).join('')}</div>`
        : ''}
    `;

    $('modal-footer').innerHTML = `
      <button class="btn btn-ghost" id="modal-goto">🎯 Показать на карте</button>
      <button class="btn" id="modal-edit">✏️ Редактировать лор</button>
      <button class="btn btn-primary" id="modal-close-btn">Закрыть</button>
    `;

    modalOverlay.classList.add('open');

    $('modal-close').addEventListener('click', closeModal);
    $('modal-close-btn').addEventListener('click', closeModal);
    $('modal-goto').addEventListener('click', () => { closeModal(); goToLocation(id); });
    $('modal-edit').addEventListener('click', () => { closeModal(); openEditForm(id); });
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
  }

  // =========================================================
  //  CONTEXT MENU
  // =========================================================
  function showContextMenuForMarker(e, markerId) {
    const ctx = contextMenu;
    ctx.querySelector('#ctx-edit')  .classList.remove('hidden');
    ctx.querySelector('#ctx-delete').classList.remove('hidden');

    ctx.querySelector('#ctx-add').onclick    = () => { hideContextMenu(); handleMapClick(e); };
    ctx.querySelector('#ctx-edit').onclick   = () => { hideContextMenu(); openEditForm(markerId); };
    ctx.querySelector('#ctx-delete').onclick = () => { hideContextMenu(); deleteLocation(markerId); };

    ctx.style.left = e.clientX + 'px';
    ctx.style.top  = e.clientY + 'px';
    ctx.classList.add('show');
  }

  function showContextMenuOnMap(e) {
    const ctx = contextMenu;
    ctx.querySelector('#ctx-edit')  .classList.add('hidden');
    ctx.querySelector('#ctx-delete').classList.add('hidden');

    ctx.querySelector('#ctx-add').onclick = () => {
      hideContextMenu();
      const coords = screenToMap(e.clientX, e.clientY);
      openAddForm(coords);
    };

    ctx.style.left = e.clientX + 'px';
    ctx.style.top  = e.clientY + 'px';
    ctx.classList.add('show');
  }

  function hideContextMenu() { contextMenu.classList.remove('show'); }

  // =========================================================
  //  COORDINATE CONVERSION
  // =========================================================
  function screenToMap(sx, sy) {
    const rect = mapContainer.getBoundingClientRect();
    return {
      x: (sx - rect.left - state.panX) / state.zoom,
      y: (sy - rect.top  - state.panY) / state.zoom,
    };
  }

  // =========================================================
  //  MAP CLICK HANDLER
  // =========================================================
  function handleMapClick(e) {
    if (state.mode !== 'pin') return;
    if (e.target.closest('.marker')) return;

    const coords = screenToMap(e.clientX, e.clientY);

    // Out-of-bounds check
    if (coords.x < 0 || coords.x > MAP_W || coords.y < 0 || coords.y > MAP_H) return;

    hideHelpHint();
    openAddForm(coords);
  }

  // =========================================================
  //  PAN & ZOOM
  // =========================================================
  function startPan(e) {
    if (state.mode !== 'pan') return;
    state.isPanning = true;
    state.panStartX = e.clientX;
    state.panStartY = e.clientY;
    state.panStartPanX = state.panX;
    state.panStartPanY = state.panY;
    mapContainer.classList.add('mode-pan');
  }

  function doPan(e) {
    if (!state.isPanning) return;
    state.panX = state.panStartPanX + (e.clientX - state.panStartX);
    state.panY = state.panStartPanY + (e.clientY - state.panStartY);
    applyTransform();
  }

  function endPan() { state.isPanning = false; }

  function doZoom(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    const rect   = mapContainer.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const my     = e.clientY - rect.top;

    const newZoom = Math.max(0.2, Math.min(4, state.zoom * factor));
    const scale   = newZoom / state.zoom;

    state.panX = mx - (mx - state.panX) * scale;
    state.panY = my - (my - state.panY) * scale;
    state.zoom = newZoom;
    applyTransform();
  }

  function zoomBy(factor) {
    const rect = mapContainer.getBoundingClientRect();
    const cx = rect.width  / 2;
    const cy = rect.height / 2;

    const newZoom = Math.max(0.2, Math.min(4, state.zoom * factor));
    const scale   = newZoom / state.zoom;

    state.panX = cx - (cx - state.panX) * scale;
    state.panY = cy - (cy - state.panY) * scale;
    state.zoom = newZoom;
    applyTransform();
  }

  // =========================================================
  //  MODE SWITCHING
  // =========================================================
  function setMode(mode) {
    state.mode = mode;
    btnAddMode.classList.toggle('active', mode === 'pin');
    btnPanMode.classList.toggle('active', mode === 'pan');
    mapContainer.className = mode === 'pan' ? 'mode-pan' : '';
    $('mode-text').textContent = mode === 'pin' ? 'ДОБАВИТЬ МЕТКУ' : 'ПЕРЕМЕЩЕНИЕ';
  }

  // =========================================================
  //  SIDEBAR HELPERS
  // =========================================================
  function openSidebar(view) {
    state.sidebarView = view || 'list';
    sidebar.classList.add('open');
    renderSidebar();
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    state.sidebarView = 'list';
  }

  // =========================================================
  //  SHARE
  // =========================================================
  function showShare() {
    const data = btoa(encodeURIComponent(JSON.stringify(state.locations)));
    const url  = window.location.origin + window.location.pathname + '#' + data;
    $('share-url').value = url;
    sharePopup.classList.add('show');
    setTimeout(() => sharePopup.classList.remove('show'), 8000);
  }

  function copyShareURL() {
    navigator.clipboard.writeText($('share-url').value)
      .then(() => showNotification('📋 Ссылка скопирована в буфер обмена!'))
      .catch(() => showNotification('⚠ Не удалось скопировать ссылку'));
    sharePopup.classList.remove('show');
  }

  // =========================================================
  //  EXPORT
  // =========================================================
  function exportData() {
    const json = JSON.stringify({ locations: state.locations, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'witcher-map-lore.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('📜 Экспорт завершён');
  }

  // =========================================================
  //  STATS
  // =========================================================
  function updateStats() {
    statTotal.textContent = state.locations.length;
    const today = new Date().toDateString();
    const count = state.locations.filter(l =>
      l.createdAt && new Date(l.createdAt).toDateString() === today
    ).length;
    statToday.textContent = count;
  }

  // =========================================================
  //  NOTIFICATION
  // =========================================================
  function showNotification(text) {
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // =========================================================
  //  HELP HINT
  // =========================================================
  function hideHelpHint() {
    if (helpHint) helpHint.classList.add('hidden');
  }

  function hideHelpHintAfterDelay() {
    setTimeout(hideHelpHint, 5000);
  }

  // =========================================================
  //  BIND ALL EVENTS
  // =========================================================
  function bindEvents() {
    // Map clicks
    mapContainer.addEventListener('click', e => {
      hideContextMenu();
      if (e.target.closest('.marker')) return;
      handleMapClick(e);
    });

    mapContainer.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (!e.target.closest('.marker')) showContextMenuOnMap(e);
    });

    // Pan
    mapContainer.addEventListener('mousedown', startPan);
    window.addEventListener('mousemove', doPan);
    window.addEventListener('mouseup', endPan);

    // Zoom
    mapContainer.addEventListener('wheel', doZoom, { passive: false });

    // Toolbar
    $('btn-pin-mode').addEventListener('click',  () => setMode('pin'));
    $('btn-pan-mode').addEventListener('click',  () => setMode('pan'));
    $('btn-zoom-in').addEventListener('click',   () => zoomBy(1.25));
    $('btn-zoom-out').addEventListener('click',  () => zoomBy(0.8));
    $('btn-fit').addEventListener('click',       () => { fitMapToScreen(); renderMarkers(); });

    // Top bar
    $('btn-open-list').addEventListener('click', () => {
      if (sidebar.classList.contains('open')) closeSidebar();
      else openSidebar('list');
    });
    $('btn-share').addEventListener('click',  showShare);
    $('btn-export').addEventListener('click', exportData);
    $('btn-copy-url').addEventListener('click', copyShareURL);

    // Sidebar close
    $('sidebar-close').addEventListener('click', closeSidebar);

    // Modal close
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });

    // Search
    searchInput.addEventListener('input', function () {
      state.searchQuery = this.value.trim();
      renderAll();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeModal(); closeSidebar(); hideContextMenu(); }
      if (e.key === 'p' && !e.target.matches('input,textarea')) setMode('pin');
      if (e.key === 'g' && !e.target.matches('input,textarea')) setMode('pan');
      if (e.key === '=' || e.key === '+') zoomBy(1.15);
      if (e.key === '-') zoomBy(0.85);
      if (e.key === '0') fitMapToScreen();
    });

    // Hide share popup on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#share-popup') && !e.target.closest('#btn-share')) {
        sharePopup.classList.remove('show');
      }
      if (!e.target.closest('#context-menu')) hideContextMenu();
    });

    // Touch support (pinch zoom)
    let lastDist = 0;
    mapContainer.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        lastDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    mapContainer.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / lastDist;
        lastDist = dist;
        state.zoom = Math.max(0.2, Math.min(4, state.zoom * factor));
        applyTransform();
      }
    }, { passive: false });
  }

  // =========================================================
  //  BOOT
  // =========================================================
  document.addEventListener('DOMContentLoaded', init);

})();
