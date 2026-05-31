<template>
  <div id="app" class="app-container">
    <nav class="top-nav">
      <div class="nav-content">
        <div class="nav-title-area">
          <h1 class="nav-title">HD2 Preset Manager</h1>
        </div>
        <div class="nav-actions">
          <label class="lowspec-label">
            <input type="checkbox" :checked="state.isLowSpecMode" @change="toggleLowSpecMode" />
            저사양 모드
          </label>
          <button class="top-export-btn" @click="exportPresets">프리셋 내보내기</button>
        </div>
      </div>
    </nav>

    <main class="main-layout">
      <div class="sections-wrapper">
        <div class="sections-grid">
          <section class="section" v-for="(list, title) in { '공격': state.attackItems, '보급': state.supplyItems, '방어': state.defenseItems, '부스터': state.boosterItems }" :key="title">
            <h2 class="section-title">{{ title }}</h2>
            <div class="section-scroll-container hide-scrollbar">
              <div class="icon-grid">
                <template v-for="item in list" :key="item.id">
                  <div v-if="item.active" class="icon-box" :class="{ selected: item.selected }"
                    @click="handleLeftClick(item)" @contextmenu.prevent="handleRightClick(item, title === '부스터')">
                    <img :src="item.src" :alt="item.name" class="stratagem-icon no-drag" />
                  </div>
                </template>
              </div>

              <div class="excluded-tray-container" v-if="list.filter(i => !i.active).length > 0">
                <span class="tray-label">제외됨</span>
                <div class="excluded-tray">
                  <div v-for="item in list.filter(i => !i.active)" :key="'ex-'+item.id" class="ex-icon" @click="handleLeftClick(item)">
                    <img :src="item.src" class="stratagem-icon grayscale no-drag" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <aside class="side-panel">
        <div class="preset-group">
          <div class="panel-header">
            <span class="panel-title">프리셋 목록</span>
            <div class="panel-btns">
              <button class="action-btn" @click="addPreset">추가</button>
              <button class="action-btn" @click="savePreset">저장</button>
            </div>
          </div>
          <div class="preset-list hide-scrollbar">
            <div v-for="p in state.presets" :key="p.id" 
              class="preset-item" :class="{ active: state.selectedPresetId === p.id }"
              @click="selectPreset(p.id)" @dblclick="startEditing(p.id)">
              <div class="preset-content">
                <input v-if="state.editingId === p.id" v-model="p.name" class="name-edit-input" 
                  @blur="stopEditing" @keyup.enter="stopEditing" autoFocus />
                <span v-else>{{ p.name }}</span>
                <button class="delete-btn" @click.stop="deletePreset(p.id)">X</button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <footer class="bottom-area">
      <div class="loadout-bar">
        <div v-for="n in 4" :key="'slot-'+n" class="icon-box large">
          <img v-if="selectedItems[n - 1]" :src="selectedItems[n - 1].src" class="stratagem-icon no-drag" />
          <div v-else class="placeholder"></div>
        </div>
        <div class="icon-box large booster-slot">
          <img v-if="selectedBooster" :src="selectedBooster.src" class="stratagem-icon no-drag" />
          <div v-else class="placeholder"></div>
        </div>
      </div>
      <div class="hotkey-panel">
        <span class="hotkey-label">입력 단축키</span>
        <div class="hotkey-display" @click="startWaitingForKey">
          {{ state.isWaitingForKey ? '키를 입력하세요...' : state.currentHotkey }}
        </div>
      </div>
    </footer>

    <transition name="toast">
      <div v-if="state.toastMessage" class="toast-popup">
        {{ state.toastMessage }}
      </div>
    </transition>

    <transition name="fade">
      <div v-if="state.confirmDialog?.isOpen" class="modal-overlay">
        <div class="confirm-modal">
          <p class="modal-text">삭제하시겠습니까?</p>
          <div class="modal-btns">
            <button class="modal-btn cancel" @click="cancelDelete">취소</button>
            <button class="modal-btn confirm" @click="confirmDelete">삭제</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { 
  state, selectedItems, selectedBooster, 
  handleLeftClick, handleRightClick, 
  addPreset, selectPreset, savePreset, deletePreset, confirmDelete, cancelDelete,
  startEditing, stopEditing, 
  exportPresets, applyPreset, updateHotkey,
  startWaitingForKey, toggleLowSpecMode
} from './utils/logic';

export default {
  setup() {
    onMounted(() => {
      updateHotkey(state.currentHotkey);
      if (window.require) {
        window.require('electron').ipcRenderer.on('request-apply-preset', () => applyPreset());
      }
    });
    return { 
      state, selectedItems, selectedBooster, 
      handleLeftClick, handleRightClick, 
      addPreset, selectPreset, savePreset, deletePreset, confirmDelete, cancelDelete,
      startEditing, stopEditing, 
      exportPresets, applyPreset, updateHotkey,
      startWaitingForKey, toggleLowSpecMode
    };
  }
};
</script>

<style>
/* 🚀 텍스트 선택 및 드래그 전역 금지 */
* { 
  box-sizing: border-box !important; 
  margin: 0; padding: 0; 
  user-select: none !important; 
  -webkit-user-select: none !important;
}
.no-drag { 
  -webkit-user-drag: none !important; 
  pointer-events: none; 
}
input { user-select: auto !important; -webkit-user-select: auto !important; }

html, body { width: 100%; height: 100%; background-color: #0b0b0b; overflow: hidden !important; }
::-webkit-scrollbar { display: none !important; }
.hide-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
</style>

<style scoped>
.app-container { width: 100vw; height: 100vh; padding: 20px 40px; display: flex; flex-direction: column; overflow: hidden; position: relative; }

/* 상단 내비 */
.top-nav { flex-shrink: 0; border-bottom: 1px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
.nav-content { display: flex; justify-content: space-between; align-items: flex-end; }
.nav-title-area { display: flex; align-items: center; gap: 15px; }
.nav-title { font-size: 22px; color: #ffe800; font-weight: bold; letter-spacing: 0.5px; }
.nav-actions { display: flex; align-items: center; gap: 15px; }
.lowspec-label { color: #ccc; font-size: 14px; display: flex; align-items: center; gap: 5px; cursor: pointer; }
.lowspec-label input { cursor: pointer; }
.top-export-btn { background: transparent; border: 1px solid #555; color: #ccc; padding: 5px 15px; cursor: pointer; }

/* 레이아웃 구성 */
.main-layout { display: flex; gap: 40px; flex: 1; min-height: 0; overflow: hidden; margin-bottom: 20px; }
.sections-wrapper { flex: 1; min-width: 0; }
.sections-grid { display: flex; gap: 25px; height: 100%; }

.section { flex: 1; min-width: 250px; max-width: 280px; display: flex; flex-direction: column; height: 100%; }
.section-title { color: #888; font-size: 18px; margin-bottom: 15px; font-weight: normal; flex-shrink: 0; }

.section-scroll-container { flex: 1; overflow-y: auto !important; padding-right: 5px; }
.icon-grid { display: grid; gap: 6px; grid-template-columns: repeat(4, 1fr); margin-bottom: 15px; align-content: start; }

.icon-box { 
  aspect-ratio: 1 / 1; width: 100%;
  background: #1a1a1a; border: 1px solid #333; padding: 4px; 
  cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; 
}
.icon-box.selected { border-color: #ffe800; box-shadow: 0 0 8px rgba(255, 232, 0, 0.4); }
.stratagem-icon { width: 100%; height: 100%; object-fit: contain; flex-shrink: 0; pointer-events: none; }
.stratagem-icon.grayscale { filter: grayscale(100%); opacity: 0.4; }

.excluded-tray-container { border-top: 1px solid #222; padding-top: 10px; margin-top: 5px; padding-bottom: 20px; }
.tray-label { font-size: 11px; color: #555; margin-bottom: 8px; display: block; }
.excluded-tray { display: flex; flex-wrap: wrap; gap: 4px; }
.ex-icon { width: 32px; height: 32px; background: #111; border: 1px solid #222; display: flex; align-items: center; justify-content: center; cursor: pointer; }

.side-panel { width: 320px; display: flex; flex-direction: column; gap: 30px; flex-shrink: 0; }
.preset-group { display: flex; flex-direction: column; height: 100%; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.panel-title { color: #ffffff; font-size: 12px; font-weight: bold; }
.action-btn { background: transparent; border: none; padding: 2px 8px; font-size: 11px; cursor: pointer; color:#ccc; }
.preset-list { background: transparent; border: 1px solid #333; flex: 1; overflow-y: auto !important; }
.preset-item { padding: 8px 12px; background: transparent; margin-bottom: 2px; cursor: pointer; color: #ccc; }
.preset-item.active { border-left: 3px solid #ffe800; background: rgba(255,232,0,0.1); color: #fff; }
.preset-content { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.name-edit-input { background: #333; color: #fff; border: 1px solid #ffe800; font-size: 13px; padding: 2px 5px; width: 80%; outline: none; }
.delete-btn { background: transparent; border: none; color: #ff0000; cursor: pointer; font-weight: bold; font-size: 14px; }

.bottom-area { flex-shrink: 0; height: 100px; display: flex; justify-content: center; align-items: center; position: relative; border-top: 1px solid #222; }
.loadout-bar { display: flex; gap: 15px; align-items: center; }
.icon-box.large { width: 75px; height: 75px; border: 2px solid #333; }
.booster-slot { margin-left: 30px; }
.placeholder { width: 100%; height: 100%; background: #222; }

.hotkey-panel { position: absolute; right: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.hotkey-label { color: #888; font-size: 12px; font-weight: bold; }
.hotkey-display { background: #ffe800; color: #000; border: none; padding: 8px 20px; font-weight: bold; cursor: pointer; outline: none; min-width: 120px; text-align: center; }

.toast-popup { position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%); background: #ffe800; color: #000; padding: 10px 30px; font-weight: bold; border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); z-index: 9999; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.confirm-modal { background: #1a1a1a; border: 1px solid #ffe800; border-radius: 8px; padding: 25px 40px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.8); min-width: 250px; }
.modal-text { color: #fff; font-size: 16px; margin-bottom: 25px; font-weight: bold; }
.modal-btns { display: flex; gap: 15px; justify-content: center; }
.modal-btn { padding: 8px 24px; font-weight: bold; cursor: pointer; border: none; border-radius: 4px; font-size: 14px; outline: none; }
.modal-btn.cancel { background: #333; color: #ccc; }
.modal-btn.cancel:hover { background: #444; }
.modal-btn.confirm { background: #ffe800; color: #000; }
.modal-btn.confirm:hover { background: #ffcc00; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>