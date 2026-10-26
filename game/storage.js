/* ===== HexCraft — локальное хранилище =====
 * Все пользовательские данные (моды, свои картинки в base64) хранятся
 * локально на устройстве через localStorage.
 *
 * ВАЖНО для сборки APK/EXE: localStorage привязан к WebView/приложению,
 * поэтому данные пользователя сохраняются между запусками и работают
 * после экспорта в APK (Cordova/Capacitor/Tauri mobile) и EXE (Tauri/Electron/NW.js).
 * Для больших объёмов можно позже подключить Filesystem API — интерфейс ниже это позволяет.
 */
(function () {
  "use strict";

  var KEY_PREFIX = "hexcraft.";

  function lsGet(key, fallback) {
    try {
      var v = localStorage.getItem(KEY_PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      console.warn("Storage get error:", e);
      return fallback;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("Storage set error:", e);
      if (window.HC && window.HC.toast) window.HC.toast("⚠ Память переполнена — картинка слишком большая");
      return false;
    }
  }

  window.HCStorage = {
    /* ---- Пользовательские картинки: [{id,name,dataUrl}] ---- */
    getImages: function () {
      return lsGet("images", []);
    },
    saveImages: function (arr) {
      return lsSet("images", arr);
    },
    addImage: function (img) {
      var arr = this.getImages();
      arr.push(img);
      return this.saveImages(arr) ? img : null;
    },
    removeImage: function (id) {
      var arr = this.getImages().filter(function (i) { return i.id !== id; });
      return this.saveImages(arr);
    },
    renameImage: function (id, name) {
      var arr = this.getImages();
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) { arr[i].name = name; break; }
      }
      return this.saveImages(arr);
    },
    findImage: function (id) {
      var arr = this.getImages();
      for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
      return null;
    },

    /* ---- Пользовательские ресурсы: [{id,name,imageId}] ---- */
    getResources: function () {
      return lsGet("resources", []);
    },
    saveResources: function (arr) {
      return lsSet("resources", arr);
    },

    /* ---- Пользовательские юниты: [{id,name,imageId,armor,...}] ---- */
    getUnits: function () {
      return lsGet("units", []);
    },
    saveUnits: function (arr) {
      return lsSet("units", arr);
    },

    /* ---- Прочее (сохранения игры и т.д.) ---- */
    getRaw: function (key, fb) { return lsGet(key, fb); },
    setRaw: function (key, val) { return lsSet(key, val); }
  };
})();
