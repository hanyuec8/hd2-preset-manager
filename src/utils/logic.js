import { reactive, computed } from 'vue';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// 데이터 정의
const attackNames = ["Orbital Precision Strike", "Orbital Gatling Barrage", "Orbital Airburst Strike", "Orbital Napalm Barrage", "Orbital 120MM HE Barrage", "Orbital Walking Barrage", "Orbital 380MM HE Barrage", "Orbital Railcannon Strike", "Orbital Laser", "Orbital EMS Strike", "Orbital Gas Strike", "Orbital Smoke Strike", "Eagle 500KG Bomb", "Eagle Strafing Run", "Eagle 110MM Rocket Pods", "Eagle Airstrike", "Eagle Cluster Bomb", "Eagle Napalm Airstrike", "Eagle Smoke Strike"];
const supplyNames = ["Defoliation Tool", "CQC-20", "One True Flag", "Machine Gun", "Stalwart", "Heavy Machine Gun", "Railgun", "Speargun", "Anti-Materiel Rifle", "Epoch", "Grenade Launcher", "GL-52 De-Escalator", "Sterilizer", "Flamethrower", "Laser Cannon", "Quasar Cannon", "Arc Thrower", "Commando", "EAT-411", "Expendable Napalm", "Solo Silo", "Expendable Anti-Tank", "Autocannon", "Airburst Rocket Launcher", "Spear", "Cremator", "StA-X3 W.A.S.P. Launcher", "Maxigun", "GL-28", "Recoilless Rifle", "C4 Pack", "Supply Pack", "Hellbomb Portable", "Warp Pack", "Hover Pack", "Jump Pack", "Shield Generator Pack", "Directional Shield", "Ballistic Shield Backpack", "Guard Dog K-9", "Guard Dog Hot Dog", "Guard Dog", "Guard Dog Rover", "Guard Dog Breath", "Bastion MK XVI", "Fast Recon Vehicle", "Emancipator Exosuit", "Patriot Exosuit"];
const defenseNames = ["Gatling Sentry", "Machine Gun Sentry", "Flame Sentry", "Laser Sentry", "Rocket Sentry", "Autocannon Sentry", "EMS Mortar Sentry", "Gas Mortar Sentry", "Mortar Sentry", "Shield Generator Relay", "Grenadier Battlement", "Anti-Tank Emplacement", "HMG Emplacement", "Tesla Tower", "Anti-Tank Mines", "Gas Mine", "Anti-Personnel Minefield", "Incendiary Mines"];
const boosterNames = ["no_Booster_Icon", "Vitality_Enhancement_Booster_Icon", "Stamina_Enhancement_Booster_Icon", "Muscle_Enhancement_Booster_Icon", "UAV_Recon_Booster_Booster_Icon", "Increased_Reinforcement_Budget_Booster_Icon", "Flexible_Reinforcement_Budget_Booster_Icon", "Hellpod_Space_Optimization_Booster_Icon", "Localization_Confusion_Booster_Icon", "Expert_Extraction_Pilot_Booster_Icon", "Motivational_Shocks_Booster_Icon", "Experimental_Infusion_Booster_Icon", "Firebomb_Hellpods_Booster_Icon", "Sample_Scanner_Booster_Icon", "Dead_Sprint_Booster_Icon", "Armed_Resupply_Pods_Booster_Icon", "Sample_Extricator_Booster_Icon", "Stun_Pods_Booster_Icon", "Concealed_Insertion_Booster_Icon"];

const getSaved = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const globalExcludedIds = getSaved('hd2_global_excluded');

export const state = reactive({
  currentTab: 'stratagem',
  attackItems: attackNames.map((n, i) => ({ id: i + 1, name: n, active: !globalExcludedIds.includes(i + 1), selected: false, src: `/stratagems/attack/${n}.svg` })),
  supplyItems: supplyNames.map((n, i) => ({ id: i + 50, name: n, active: !globalExcludedIds.includes(i + 50), selected: false, src: `/stratagems/supply/${n}.svg` })),
  defenseItems: defenseNames.map((n, i) => ({ id: i + 150, name: n, active: !globalExcludedIds.includes(i + 150), selected: false, src: `/stratagems/defense/${n}.svg` })),
  boosterItems: boosterNames.map((n, i) => ({ id: i + 250, name: n, active: !globalExcludedIds.includes(i + 250), selected: false, src: `/booster/${n}.svg` })),
  presets: getSaved('hd2_presets'),
  selectedPresetId: null,
  currentHotkey: localStorage.getItem('hd2_hotkey') || 'H',
  isWaitingForKey: false,
  isLowSpecMode: localStorage.getItem('hd2_lowspec') === 'true',
  editingId: null,
  toastMessage: "",
  confirmDialog: { isOpen: false, id: null }
});

export const toggleLowSpecMode = () => {
  state.isLowSpecMode = !state.isLowSpecMode;
  localStorage.setItem('hd2_lowspec', state.isLowSpecMode);
};

const triggerToast = (msg) => { state.toastMessage = msg; setTimeout(() => { state.toastMessage = ""; }, 1000); };

export const selectedItems = computed(() => [...state.attackItems, ...state.supplyItems, ...state.defenseItems].filter(item => item.selected).sort((a, b) => a.id - b.id));
export const selectedBooster = computed(() => state.boosterItems.find(item => item.selected) || null);

function getSectionCoords(item) {
  const categories = ['attackItems', 'supplyItems', 'defenseItems', 'boosterItems'];
  for (let sIdx = 0; sIdx < categories.length; sIdx++) {
    const activeList = state[categories[sIdx]].filter(i => i.active);
    const localIdx = activeList.findIndex(i => i.id === item.id);
    if (localIdx !== -1) return { section: sIdx, row: Math.floor(localIdx / 4), col: localIdx % 4 };
  }
  return null;
}

export const applyPreset = async () => {
  if (state.currentTab !== 'stratagem') return;
  const targets = [...selectedItems.value, ...(selectedBooster.value ? [selectedBooster.value] : [])]
    .sort((a, b) => {
      const ca = getSectionCoords(a), cb = getSectionCoords(b);
      return (ca.section * 1000 + ca.row * 10 + ca.col) - (cb.section * 1000 + cb.row * 10 + cb.col);
    });
  if (targets.length === 0) return;
  let sequence = ["SPACE", "WAIT_M"];
  let current = { section: 0, row: 0, col: 0 };
  for (const tItem of targets) {
    const target = getSectionCoords(tItem);
    if (target.section === 3 && current.section < 3) {
      sequence.push("RIGHT", "WAIT_M", "SPACE", "WAIT_200MS");
      current.section = 3; current.row = 0; current.col = 0;
    }
    while (current.section < target.section && current.section < 3) {
      sequence.push("C", "WAIT_200MS");
      current.section++; current.row = 0;
    }
    let rightDist = (target.col - current.col + 4) % 4;
    let leftDist = (current.col - target.col + 4) % 4;

    if (rightDist <= leftDist) {
      for (let i = 0; i < rightDist; i++) sequence.push("RIGHT", "WAIT_M");
    } else {
      for (let i = 0; i < leftDist; i++) sequence.push("LEFT", "WAIT_M");
    }
    current.col = target.col;
    while (current.row < target.row) { sequence.push("DOWN", "WAIT_M"); current.row++; }
    while (current.row > target.row) { sequence.push("UP", "WAIT_M"); current.row--; }
    sequence.push("SPACE");
    if (current.section === 0) sequence.push("WAIT_M");
    else sequence.push("WAIT_200MS");
  }
  if (window.require) window.require('electron').ipcRenderer.send('send-stratagem-input', { sequence, isLowSpec: state.isLowSpecMode });
};

// 🚀 좌클릭 핸들러: 부스터 첫 번째 항목(ID 250)은 제외 불가 처리
export const handleLeftClick = (item) => {
  if (item.id === 250) return; // "no_Booster"는 항상 활성화 상태 유지

  item.active = !item.active;
  if (!item.active) item.selected = false;
  const excluded = [...state.attackItems, ...state.supplyItems, ...state.defenseItems, ...state.boosterItems].filter(i => !i.active).map(i => i.id);
  localStorage.setItem('hd2_global_excluded', JSON.stringify(excluded));
};

// 🚀 우클릭 핸들러: 선택 제한을 5개로 확장
export const handleRightClick = (item, type = 'normal') => {
  if (!state.selectedPresetId) return;
  if (type === 'booster') {
    const list = state.boosterItems;
    const was = item.selected; list.forEach(i => i.selected = false); item.selected = !was;
  } else {
    if (item.selected) item.selected = false;
    else if (selectedItems.value.length < 5) item.selected = true;
  }
};

export const savePreset = () => {
  const id = state.selectedPresetId;
  const target = state.presets.find(p => p.id === id);
  if (target) {
    target.stratagemIds = selectedItems.value.map(i => i.id);
    target.boosterId = selectedBooster.value?.id || null;
    localStorage.setItem('hd2_presets', JSON.stringify(state.presets));
    triggerToast("저장되었습니다");
  }
};

export const deletePreset = (id) => { state.confirmDialog = { isOpen: true, id }; };
export const cancelDelete = () => { state.confirmDialog = { isOpen: false, id: null }; };
export const confirmDelete = () => {
  const { id } = state.confirmDialog;
  state.presets = state.presets.filter(p => p.id !== id);
  localStorage.setItem('hd2_presets', JSON.stringify(state.presets));
  cancelDelete();
};

export const addPreset = () => {
  const l = state.presets; 
  l.push({ id: Date.now(), name: `preset${l.length + 1}`, stratagemIds: [], boosterId: null }); 
  localStorage.setItem('hd2_presets', JSON.stringify(state.presets));
};

export const selectPreset = (id) => {
  state.selectedPresetId = id;
  const f = state.presets.find(p => p.id === id);
  [...state.attackItems, ...state.supplyItems, ...state.defenseItems, ...state.boosterItems].forEach(i => i.selected = false);
  if (f) {
    f.stratagemIds.forEach(sid => { const itm = [...state.attackItems, ...state.supplyItems, ...state.defenseItems].find(x => x.id === sid); if (itm) itm.selected = true; });
    if (f.boosterId) { const b = state.boosterItems.find(x => x.id === f.boosterId); if (b) b.selected = true; }
  }
};

export const startEditing = (id) => { state.editingId = id; };
export const stopEditing = () => { state.editingId = null; localStorage.setItem('hd2_presets', JSON.stringify(state.presets)); };
export const updateHotkey = (newKey) => { state.currentHotkey = newKey; localStorage.setItem('hd2_hotkey', newKey); if (window.require) window.require('electron').ipcRenderer.send('update-hotkey', newKey); };

export const startWaitingForKey = () => {
  if (state.isWaitingForKey) return;
  state.isWaitingForKey = true;

  const handleKeydown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.repeat) return; // 길게 누름 방지

    let key = e.key;
    if (key.length === 1) key = key.toUpperCase();
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

    if (key !== 'Escape') {
      if (key === ' ') key = 'Space';
      updateHotkey(key);
    }

    state.isWaitingForKey = false;
    window.removeEventListener('keydown', handleKeydown, true);
  };

  window.addEventListener('keydown', handleKeydown, true);
};

export const exportPresets = async () => { 
  const zip = new JSZip(); 
  zip.file("presets.json", JSON.stringify({ normal: state.presets })); 
  saveAs(await zip.generateAsync({ type: "blob" }), "HD2_Backup.zip"); 
};