(() => {
    const DAILY_GOAL_L = 2.0;
    const FORGOTTEN_AFTER_MS = 2 * 60 * 60 * 1000;   // 2h
    const DEHYDRATED_AFTER_MS = 4 * 60 * 60 * 1000;  // 4h
    const RESET_HOUR = 6;
  
    const els = {
      app: document.getElementById("app"),
      drinkBtn: document.getElementById("drink-btn"),
      closeBtn: document.getElementById("close-btn"),
  
      modal: document.getElementById("drink-modal"),
      cancel: document.getElementById("modal-cancel"),
      qtyBtns: Array.from(document.querySelectorAll(".qty-btn")),
  
      progressFill: document.getElementById("progress-fill"),
      progressText: document.getElementById("progress-text"),
      congrats: document.getElementById("congrats"),
      alarm: document.getElementById("alarm-audio"),
  
      titleHydrated: document.getElementById("title-hydrated"),
      titleForgotten: document.getElementById("title-forgotten"),
      titleDehydrated: document.getElementById("title-dehydrated"),
  
      charHydrated: document.getElementById("char-hydrated"),
      charForgotten: document.getElementById("char-forgotten"),
      charDehydrated: document.getElementById("char-dehydrated"),
    };

    function getNextResetAt() {
        const now = new Date();
        const reset = new Date();
      
        reset.setHours(RESET_HOUR, 0, 0, 0);
      
        // si on est déjà après 06:00 → reset demain
        if (now >= reset) {
          reset.setDate(reset.getDate() + 1);
        }
      
        return reset.getTime();
    }
      
    function createFreshState() {
        return {
            totalLiters: 0,
            lastDrinkAt: null,
            alarmArmed: true,
            nextResetAt: getNextResetAt(),
        };
    }      
  
    function todayKey() {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  
    function loadState() {
        const stored = JSON.parse(localStorage.getItem("hydrationState"));
      
        // première ouverture
        if (!stored) {
          const fresh = createFreshState();
          localStorage.setItem("hydrationState", JSON.stringify(fresh));
          return fresh;
        }
      
        // reset automatique à 06:00
        if (Date.now() >= stored.nextResetAt) {
          const fresh = createFreshState();
          localStorage.setItem("hydrationState", JSON.stringify(fresh));
          return fresh;
        }
      
        return stored;
    } 
  
    function saveState(state) {
      localStorage.setItem("hydrationState", JSON.stringify(state));
    }
  
    function setActive(activeTitleEl, activeCharEl) {
      [els.titleHydrated, els.titleForgotten, els.titleDehydrated].forEach(el => el.classList.remove("is-active"));
      [els.charHydrated, els.charForgotten, els.charDehydrated].forEach(el => el.classList.remove("is-active"));
      activeTitleEl.classList.add("is-active");
      activeCharEl.classList.add("is-active");
    }
  
    function updateProgressUI(state) {
      const pct = Math.min(1, state.totalLiters / DAILY_GOAL_L) * 100;
      els.progressFill.style.width = `${pct}%`;
  
      const total = Math.round(state.totalLiters * 100) / 100;
      els.progressText.textContent = `${total} / ${DAILY_GOAL_L} L`;
  
      if (state.totalLiters >= DAILY_GOAL_L) {
        els.congrats.classList.remove("hidden");
      } else {
        els.congrats.classList.add("hidden");
      }
    }
  
    function openModal() {
      els.modal.classList.remove("hidden");
    }
  
    function closeModal() {
      els.modal.classList.add("hidden");
    }
  
    function shakeApp() {
      els.app.classList.remove("shake");
      void els.app.offsetWidth; // reflow
      els.app.classList.add("shake");
    }
  
    function stopAlarm() {
      try { els.alarm.pause(); els.alarm.currentTime = 0; } catch (_) {}
    }
  
    async function playAlarmOnce(state) {
      if (!state.alarmArmed) return;
      state.alarmArmed = false;
      saveState(state);
  
      shakeApp();
  
      try {
        els.alarm.currentTime = 0;
        await els.alarm.play();
      } catch (_) {
        // peut être bloqué selon config/OS
      }
  
      setTimeout(() => stopAlarm(), 3000);
    }
  
    function statusTick(state) {
      if (!state.lastDrinkAt) {
        setActive(els.titleHydrated, els.charHydrated);
        return;
      }
  
      const now = Date.now();
      const delta = now - state.lastDrinkAt;
  
      if (delta >= DEHYDRATED_AFTER_MS) {
        setActive(els.titleDehydrated, els.charDehydrated);
        playAlarmOnce(state);
        return;
      }
  
      if (delta >= FORGOTTEN_AFTER_MS) {
        setActive(els.titleForgotten, els.charForgotten);
        return;
      }
  
      setActive(els.titleHydrated, els.charHydrated);
      state.alarmArmed = true;
      saveState(state);
      stopAlarm();
    }
  
    function drink(state, liters) {
      state.totalLiters = Math.min(DAILY_GOAL_L, state.totalLiters + liters);
      state.lastDrinkAt = Date.now();
      state.alarmArmed = true;
      saveState(state);
  
      setActive(els.titleHydrated, els.charHydrated);
      updateProgressUI(state);
      stopAlarm();
  
      if (state.totalLiters >= DAILY_GOAL_L) shakeApp();
    }
  
    // INIT
    let state = loadState();
    updateProgressUI(state);
    statusTick(state);
  
    setInterval(() => {
      state = loadState();
      statusTick(state);
      updateProgressUI(state);
    }, 60_000);
  
    // EVENTS
    els.closeBtn.addEventListener("click", () => {
      if (window.electronAPI?.closeApp) window.electronAPI.closeApp();
    });
  
    els.drinkBtn.addEventListener("click", () => openModal());
  
    els.qtyBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const liters = parseFloat(btn.dataset.qty);
        closeModal();
        state = loadState();
        drink(state, liters);
      });
    });
  
    els.cancel.addEventListener("click", closeModal);
  
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });
  })();
  