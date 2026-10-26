/* ===== HexCraft — логика меню и редактора ресурсов ===== */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  /* ================= Навигация между экранами ================= */
  var navStack = [];
  var PLACEHOLDERS = {
    "play":        ["▶ Играть", "Геймплей появится в следующей версии. Сейчас доступны редакторы ресурсов, юнитов, зданий и карт!"],
    "load":        ["💾 Загрузить сохранение", "Сохранения появятся вместе с режимом игры."],
    "celleditor":  ["⬡ Редактор клеток", "Редактор типов клеток-шестиугольников — в разработке."],
    "objeditor":   ["📦 Редактор объектов", "Редактор объектов карты — в разработке."]
  };

  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
    var s = $("screen-" + id);
    if (s) s.classList.add("active");
    window.scrollTo(0, 0);
  }

  function currentScreen() {
    var active = document.querySelector(".screen.active");
    return active ? active.id.replace("screen-", "") : "main";
  }

  function navigate(target) {
    navStack.push(currentScreen());

    if (target === "about") { showScreen("about"); return; }
    if (target === "mod-editor") { showScreen("modeditor"); return; }
    if (target === "reseditor") { openResourceEditor(); return; }
    if (target === "uniteditor") { openUnitEditor(); return; }
    if (target === "buildeditor") { openBuildEditor(); return; }
    if (target === "map-editor") { openMapList(); return; }

    if (PLACEHOLDERS[target]) {
      $("ph-title").textContent = PLACEHOLDERS[target][0];
      $("ph-text").textContent = PLACEHOLDERS[target][1];
      showScreen("placeholder");
      return;
    }
    showScreen(target);
  }

  function goBack(preferParent) {
    var prev = navStack.pop();
    while (preferParent && prev && prev !== preferParent && prev !== "main" && prev !== "modeditor") {
      prev = navStack.pop();
    }
    if (prev === "reseditor") openResourceEditor();
    else if (prev === "uniteditor") openUnitEditor();
    else if (prev === "buildeditor") openBuildEditor();
    else if (prev === "maplist") openMapList();
    else if (prev === "mapeditor") openMapEditor(currentMapId, { restorePan: true });
    else showScreen(prev || "main");
  }

  /* Кнопки навигации (делегирование) */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-nav]");
    if (!btn) return;
    var nav = btn.getAttribute("data-nav");
    if (nav === "back-ph") { goBack(); return; }
    if (nav === "reseditor-back") { goBack("reseditor"); return; }
    if (nav === "uniteditor-back") { goBack("uniteditor"); return; }
    if (nav === "buildeditor-back") { goBack("buildeditor"); return; }
    if (nav === "maplist-back") { saveCurrentMap({ silent: true }); goBack("maplist"); return; }
    if (nav === "gameview-back") { goBack("mapeditor"); return; }
    if (nav === "main") { navStack = []; showScreen("main"); return; }
    navigate(nav);
  });

  /* ================= Тосты ================= */
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add("hidden"); }, 2400);
  }
  window.HC = { toast: toast };

  /* ================= Табы редактора ресурсов ================= */
  var tabButtons = document.querySelectorAll(".tab");
  for (var tb = 0; tb < tabButtons.length; tb++) {
    tabButtons[tb].addEventListener("click", function () {
      for (var i = 0; i < tabButtons.length; i++) tabButtons[i].classList.remove("active");
      this.classList.add("active");
      var pages = document.querySelectorAll(".tabpage");
      for (var j = 0; j < pages.length; j++) pages[j].classList.remove("active");
      $("tab-" + this.getAttribute("data-tab")).classList.add("active");
    });
  }

  /* ================= Данные ресурсов ================= */
  /* Стандартные ресурсы только для просмотра (readonly), свои — в HCStorage. */
  function allResources() {
    return HCData.defaultResources.concat(HCStorage.getResources());
  }
  function findResource(id) {
    var list = allResources();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function isReadonly(res) { return !!(res && res.readonly); }

  function renderResourceList() {
    var box = $("resource-list");
    box.innerHTML = "";
    var list = allResources();
    for (var i = 0; i < list.length; i++) {
      (function (res) {
        var card = document.createElement("div");
        card.className = "card";

        var icon = document.createElement("div");
        icon.className = "iconwrap";
        HCImage.renderInto(icon, res.imageId);
        var img = icon.querySelector("img");
        if (img) img.className = "icon";
        var tile = icon.querySelector(".emoji-tile");
        if (tile) tile.classList.add("icon");

        var name = document.createElement("div");
        name.className = "cname";
        name.textContent = res.name;

        var tag = document.createElement("div");
        tag.className = "ctag";
        tag.textContent = res.readonly ? "стандартный" : "свой";

        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(tag);

        if (res.readonly) {
          var lock = document.createElement("span");
          lock.className = "lock";
          lock.textContent = "🔒";
          card.appendChild(lock);
        }

        card.addEventListener("click", function () { openResourceForm(res.id); });
        box.appendChild(card);
      })(list[i]);
    }
  }

  /* ================= Ячейка картинки ================= */
  function makeImageCell(item, custom) {
    var cell = document.createElement("div");
    cell.className = "imgcell";

    var imgBox = document.createElement("div");
    HCImage.renderInto(imgBox, item.id);
    cell.appendChild(imgBox);

    var nm = document.createElement("div");
    nm.className = "iname";
    nm.textContent = item.name;
    cell.appendChild(nm);

    if (custom) {
      var del = document.createElement("button");
      del.className = "del";
      del.textContent = "✕";
      del.title = "Удалить картинку";
      del.addEventListener("click", function (ev) {
        ev.stopPropagation();
        onDeleteImage(item.id, item.name);
      });
      cell.appendChild(del);

      var ren = document.createElement("button");
      ren.className = "rename";
      ren.textContent = "✎";
      ren.title = "Переименовать картинку";
      ren.addEventListener("click", function (ev) {
        ev.stopPropagation();
        onRenameImage(item.id, item.name);
      });
      cell.appendChild(ren);
    } else {
      var lk = document.createElement("span");
      lk.className = "lockmini";
      lk.textContent = "🔒";
      cell.appendChild(lk);
    }
    return cell;
  }

  /* ================= Вкладка картинок ================= */
  function renderImageList() {
    var box = $("image-list");
    box.innerHTML = "";

    var builtins = HCData.builtinImages;
    for (var i = 0; i < builtins.length; i++) {
      box.appendChild(makeImageCell(builtins[i], false));
    }
    var customs = HCStorage.getImages();
    if (customs.length === 0) {
      var e = document.createElement("div");
      e.className = "empty";
      e.style.gridColumn = "1 / -1";
      e.textContent = "Пока нет своих картинок — добавьте их кнопкой ниже 👇";
      box.appendChild(e);
    }
    for (var j = 0; j < customs.length; j++) {
      box.appendChild(makeImageCell(customs[j], true));
    }
  }

  function onRenameImage(id, current) {
    var nn = prompt("Новое название картинки:", current);
    if (nn === null) return;
    nn = nn.trim();
    if (!nn) { toast("Название не может быть пустым"); return; }
    HCStorage.renameImage(id, nn);
    renderImageList();
    refreshPickerIfOpen();
    toast("✎ Название изменено");
  }

  function onDeleteImage(id, name) {
    // нельзя удалить картинку, которую использует свой ресурс или свой юнит
    var used = HCStorage.getResources().filter(function (r) { return r.imageId === id; });
    if (used.length > 0) {
      toast("⚠ Картинку использует ресурс «" + used[0].name + "» — сначала замените её у ресурса");
      return;
    }
    var usedByUnit = HCStorage.getUnits().filter(function (u) { return u.imageId === id; });
    if (usedByUnit.length > 0) {
      toast("⚠ Картинку использует юнит «" + usedByUnit[0].name + "» — сначала замените её у юнита");
      return;
    }
    var usedByBuilding = HCStorage.getBuildings().filter(function (b) {
      return (b.imageIds || []).indexOf(id) !== -1;
    });
    if (usedByBuilding.length > 0) {
      toast("⚠ Картинку использует здание «" + usedByBuilding[0].name + "» — сначала уберите её у здания");
      return;
    }
    if (!confirm("Удалить картинку «" + name + "»?")) return;
    HCStorage.removeImage(id);
    renderImageList();
    refreshPickerIfOpen();
    toast("🗑 Картинка удалена");
  }

  /* ================= Загрузка файла картинки ================= */
  var MAX_IMG_BYTES = 1.5 * 1024 * 1024; // ограничение исходника, чтобы base64 влез в localStorage

  function handleImageFile(file, onDone) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("⚠ Это не изображение"); return; }
    if (file.size > MAX_IMG_BYTES) { toast("⚠ Файл больше 1.5 МБ — возьмите поменьше"); return; }

    var reader = new FileReader();
    reader.onload = function () {
      // прогоняем через canvas: уменьшаем до 128px и пережимаем в PNG,
      // чтобы base64 был компактным и одинаково работал на телефоне и ПК
      var im = new Image();
      im.onload = function () {
        var max = 128;
        var scale = Math.min(1, max / Math.max(im.width, im.height));
        var w = Math.max(1, Math.round(im.width * scale));
        var h = Math.max(1, Math.round(im.height * scale));
        var cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(im, 0, 0, w, h);
        var dataUrl;
        try { dataUrl = cv.toDataURL("image/png"); }
        catch (err) { dataUrl = String(reader.result); }

        var id = "cust_" + Date.now() + "_" + Math.floor(Math.random() * 1e5);
        var name = (file.name || "Картинка").replace(/\.[^.]+$/, "");
        var saved = HCStorage.addImage({ id: id, name: name, dataUrl: dataUrl });
        if (saved) {
          renderImageList();
          refreshPickerIfOpen();
          toast("✔ Картинка «" + name + "» добавлена и сохранена локально");
          if (onDone) onDone(id);
        }
      };
      im.onerror = function () { toast("⚠ Не удалось прочитать изображение"); };
      im.src = String(reader.result);
    };
    reader.onerror = function () { toast("⚠ Ошибка чтения файла"); };
    reader.readAsDataURL(file);
  }

  /* ================= Форма ресурса ================= */
  var editingId = null;      // id редактируемого ресурса
  var draftImageId = null;   // выбранная картинка (черновик)

  function openResourceForm(id) {
    var res = findResource(id);
    if (!res) return;
    editingId = id;
    draftImageId = res.imageId;

    var ro = isReadonly(res);
    $("recedit-title").textContent = ro ? "🔒 Стандартный ресурс" : "Редактирование ресурса";

    var nameInput = $("recedit-name");
    nameInput.value = res.name;
    nameInput.readOnly = ro;
    nameInput.placeholder = "Например: Золото";

    $("recedit-pickimg").disabled = ro;
    $("recedit-save").disabled = ro;
    $("recedit-delete").disabled = ro;
    $("recedit-delete").style.display = ro ? "none" : "";

    var badge = $("recedit-badge");
    badge.textContent = ro ? "только просмотр" : "свой ресурс";
    badge.classList.remove("hidden-badge");

    renderFormPreview();
    navStack.push(currentScreen());
    showScreen("recedit");
  }

  function renderFormPreview() {
    var pv = $("recedit-preview");
    pv.style.display = "none";
    var wrap = pv.parentNode.querySelector(".preview-render");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "preview-render";
      pv.parentNode.insertBefore(wrap, pv.nextSibling);
    }
    HCImage.renderInto(wrap, draftImageId);
    var img = wrap.querySelector("img");
    var tile = wrap.querySelector(".emoji-tile");
    if (img) {
      img.removeAttribute("class");
      img.style.width = "110px";
      img.style.height = "110px";
      img.style.objectFit = "contain";
      img.style.background = "var(--panel)";
      img.style.border = "1px dashed #45527a";
      img.style.borderRadius = "16px";
      img.style.padding = "8px";
      img.style.imageRendering = "pixelated";
    }
    if (tile) {
      tile.style.width = "110px";
      tile.style.height = "110px";
      tile.style.fontSize = "56px";
    }
    if (!img && !tile) wrap.textContent = "картинка не выбрана";
  }

  /* ================= Модалка выбора картинки ================= */
  var pickerOpen = false;
  var pendingPickCallback = null;

  function refreshPickerIfOpen() {
    if (pickerOpen) fillPicker();
  }

  function fillPicker() {
    var bBox = $("picker-builtin"), cBox = $("picker-custom");
    bBox.innerHTML = ""; cBox.innerHTML = "";

    function mk(item, custom) {
      var cell = makeImageCell(item, custom);
      if (item.id === draftImageId) cell.classList.add("selected");
      cell.addEventListener("click", function () {
        closeImgPicker();
        if (pendingPickCallback) pendingPickCallback(item.id);
      });
      return cell;
    }
    var bi = HCData.builtinImages;
    for (var i = 0; i < bi.length; i++) bBox.appendChild(mk(bi[i], false));

    var cu = HCStorage.getImages();
    if (!cu.length) {
      var e = document.createElement("div");
      e.className = "empty"; e.style.gridColumn = "1/-1";
      e.textContent = "нет своих картинок — загрузите ниже";
      cBox.appendChild(e);
    }
    for (var j = 0; j < cu.length; j++) cBox.appendChild(mk(cu[j], true));
  }

  function openImgPicker(onPick) {
    pendingPickCallback = onPick;
    pickerOpen = true;
    fillPicker();
    $("modal-imgpicker").classList.remove("hidden");
  }
  function closeImgPicker() {
    pickerOpen = false;
    $("modal-imgpicker").classList.add("hidden");
  }
  $("picker-cancel").addEventListener("click", closeImgPicker);
  $("modal-imgpicker").addEventListener("click", function (e) {
    if (e.target === this) closeImgPicker();
  });

  /* Файловые инпуты (работают и на телефоне — открывают системный выбор файлов) */
  $("file-image").addEventListener("change", function () {
    handleImageFile(this.files[0]);
    this.value = "";
  });
  $("file-image2").addEventListener("change", function () {
    var f = this.files[0];
    this.value = "";
    if (!f) return;
    handleImageFile(f, function (newId) {
      closeImgPicker();
      if (pendingPickCallback) pendingPickCallback(newId);
    });
  });

  $("recedit-pickimg").addEventListener("click", function () {
    if (isReadonly(findResource(editingId))) return;
    openImgPicker(function (imageId) {
      draftImageId = imageId;
      renderFormPreview();
    });
  });

  /* ================= Сохранение / удаление ресурса ================= */
  $("recedit-save").addEventListener("click", function () {
    var res = findResource(editingId);
    if (!res || isReadonly(res)) return;
    var name = $("recedit-name").value.trim();
    if (!name) { toast("⚠ Введите название ресурса"); return; }
    if (!draftImageId) { toast("⚠ Выберите картинку ресурса"); return; }

    var own = HCStorage.getResources();
    var found = false;
    for (var i = 0; i < own.length; i++) {
      if (own[i].id === editingId) { own[i].name = name; own[i].imageId = draftImageId; found = true; break; }
    }
    if (!found) own.push({ id: editingId, name: name, imageId: draftImageId });

    if (HCStorage.saveResources(own)) {
      toast("💾 Ресурс «" + name + "» сохранён");
      goBack("reseditor");
      renderResourceList();
    }
  });

  $("recedit-delete").addEventListener("click", function () {
    var res = findResource(editingId);
    if (!res || isReadonly(res)) return;
    if (!confirm("Удалить ресурс «" + res.name + "»?")) return;
    var own = HCStorage.getResources().filter(function (r) { return r.id !== editingId; });
    HCStorage.saveResources(own);
    toast("🗑 Ресурс удалён");
    goBack("reseditor");
    renderResourceList();
  });

  /* ================= Создание нового ресурса ================= */
  $("btn-new-resource").addEventListener("click", function () {
    var id = "res_" + Date.now();
    var own = HCStorage.getResources();
    own.push({ id: id, name: "Новый ресурс", imageId: HCData.builtinImages[0].id });
    HCStorage.saveResources(own);
    openResourceForm(id);
    $("recedit-name").value = "";
    $("recedit-name").placeholder = "Название нового ресурса";
    $("recedit-name").focus();
    toast("Создайте ресурс: название + картинка");
  });

  /* ================= Открытие редакторов ================= */
  function openResourceEditor() {
    renderResourceList();
    renderImageList();
    showScreen("reseditor");
  }

  /* =================================================================
   *                    РЕДАКТОР ЮНИТОВ
   * ================================================================= */

  /* Все юниты: стандартные (readonly) + свои из HCStorage */
  function allUnits() {
    return HCData.defaultUnits.concat(HCStorage.getUnits());
  }
  function findUnit(id) {
    var list = allUnits();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function isUnitReadonly(u) { return !!(u && u.readonly); }

  /* Список всех текстурпаков среди юнитов */
  function allTexturepacks() {
    var seen = {}, out = [];
    allUnits().forEach(function (u) {
      var p = (u.texturepack || "default").trim() || "default";
      if (!seen[p]) { seen[p] = true; out.push(p); }
    });
    return out.sort();
  }

  function resName(resourceId) {
    var r = findResource(resourceId);
    return r ? r.name : resourceId;
  }

  function fmtNum(v) {
    var n = Number(v);
    if (isNaN(n)) return "0";
    return (n % 1 === 0) ? String(n) : String(n).replace(".", ",");
  }

  function unitSummary(u) {
    var parts = ["🛡 " + fmtNum(u.armor)];
    if (u.areaProtect) parts.push("⬡ зона " + fmtNum(u.areaSize));
    var costStr = (u.cost || []).map(function (c) { return fmtNum(c.value) + " " + resName(c.resourceId); }).join(" + ");
    if (costStr) parts.push("💰 " + costStr);
    if (u.upkeepEnabled && (u.upkeep || []).length) {
      parts.push("⚙ " + u.upkeep.map(function (c) { return fmtNum(c.value) + "/ход"; }).join(" + "));
    }
    return parts.join(" · ");
  }

  /* ---- Фильтр по текстурпаку ---- */
  var packFilter = "all";

  function renderPackFilter() {
    var sel = $("unit-pack-filter");
    var packs = allTexturepacks();
    sel.innerHTML = "";
    var optAll = document.createElement("option");
    optAll.value = "all"; optAll.textContent = "Все паки (" + allUnits().length + ")";
    sel.appendChild(optAll);
    packs.forEach(function (p) {
      var n = allUnits().filter(function (u) { return (u.texturepack || "default") === p; }).length;
      var o = document.createElement("option");
      o.value = p; o.textContent = "🎨 " + p + " (" + n + ")";
      sel.appendChild(o);
    });
    if (packs.indexOf(packFilter) === -1 && packFilter !== "all") packFilter = "all";
    sel.value = packFilter;
  }

  $("unit-pack-filter").addEventListener("change", function () {
    packFilter = this.value;
    renderUnitList();
  });

  /* ---- Список юнитов ---- */
  function renderUnitList() {
    renderPackFilter();
    var box = $("unit-list");
    box.innerHTML = "";
    var list = allUnits();
    if (packFilter !== "all") {
      list = list.filter(function (u) { return (u.texturepack || "default") === packFilter; });
    }
    if (!list.length) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "В этом пакке пока нет юнитов";
      box.appendChild(e);
    }
    for (var i = 0; i < list.length; i++) {
      (function (u) {
        var card = document.createElement("div");
        card.className = "card unit-card";

        var icon = document.createElement("div");
        icon.className = "iconwrap";
        HCImage.renderInto(icon, u.imageId);
        var img = icon.querySelector("img"); if (img) img.className = "icon";

        var mid = document.createElement("div");
        mid.className = "unit-mid";
        var name = document.createElement("div");
        name.className = "cname";
        name.textContent = u.name;
        var summ = document.createElement("div");
        summ.className = "usummary";
        summ.textContent = unitSummary(u);
        mid.appendChild(name);
        mid.appendChild(summ);

        var tag = document.createElement("div");
        tag.className = "ctag";
        tag.textContent = "🎨 " + (u.texturepack || "default");

        card.appendChild(icon);
        card.appendChild(mid);
        card.appendChild(tag);

        if (u.readonly) {
          var lock = document.createElement("span");
          lock.className = "lock";
          lock.textContent = "🔒";
          card.appendChild(lock);
        }

        card.addEventListener("click", function () { openUnitForm(u.id); });
        box.appendChild(card);
      })(list[i]);
    }
  }

  /* ---- Форма юнита: черновик ---- */
  var editingUnitId = null;
  var unitDraftImageId = null;
  var unitCostDraft = [];    // [{resourceId,value}]
  var unitUpkeepDraft = [];  // [{resourceId,value}]

  function setSwitch(id, val) { $(id).checked = !!val; }
  function numVal(id, fb) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? fb : v;
  }

  function syncConditionalFields() {
    var ap = $("unit-area-protect").checked;
    $("area-fields").style.display = ap ? "" : "none";
    var deltaOn = $("unit-cost-grow").checked || $("unit-cost-shrink").checked;
    $("cost-delta-fields").style.display = deltaOn ? "" : "none";
    var up = $("unit-upkeep-enabled").checked;
    $("upkeep-fields").style.display = up ? "" : "none";
  }
  ["unit-area-protect", "unit-cost-grow", "unit-cost-shrink", "unit-upkeep-enabled"].forEach(function (id) {
    $(id).addEventListener("change", syncConditionalFields);
  });

  /* ---- Списки ресурсов (стоимость / расход) ---- */
  function renderResList(boxId, arr) {
    var box = $(boxId);
    box.innerHTML = "";
    if (!arr.length) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "нет ресурсов — добавьте кнопкой ниже";
      box.appendChild(e);
      return;
    }
    var allowNegative = boxId === "build-income-list";
    arr.forEach(function (entry, idx) {
      (function (entry, idx) {
        var row = document.createElement("div");
        row.className = "resrow";

        var ic = document.createElement("div");
        ic.className = "iconwrap mini";
        HCImage.renderInto(ic, (findResource(entry.resourceId) || {}).imageId);
        var im = ic.querySelector("img"); if (im) { im.className = "icon"; }

        var nm = document.createElement("span");
        nm.className = "rname";
        nm.textContent = resName(entry.resourceId);

        var inp = document.createElement("input");
        inp.type = "number"; inp.step = "0.5";
        inp.min = allowNegative ? "" : "0";
        inp.inputMode = "decimal";
        inp.className = "rvalue";
        inp.value = entry.value;
        inp.addEventListener("input", function () {
          var v = parseFloat(this.value);
          entry.value = isNaN(v) ? 0 : v;
        });

        var del = document.createElement("button");
        del.className = "rdel";
        del.textContent = "✕";
        del.title = "Убрать ресурс";
        del.addEventListener("click", function () {
          arr.splice(idx, 1);
          renderResList(boxId, arr);
        });

        row.appendChild(ic);
        row.appendChild(nm);
        row.appendChild(inp);
        row.appendChild(del);
        box.appendChild(row);
      })(entry, idx);
    });
  }

  function renderUnitLists() {
    renderResList("unit-cost-list", unitCostDraft);
    renderResList("unit-upkeep-list", unitUpkeepDraft);
  }

  /* ---- Модалка выбора ресурса ---- */
  var resPickerCallback = null;
  function openResPicker(onPick) {
    resPickerCallback = onPick;
    var box = $("respicker-list");
    box.innerHTML = "";
    allResources().forEach(function (res) {
      (function (res) {
        var card = document.createElement("div");
        card.className = "card";
        var icon = document.createElement("div");
        icon.className = "iconwrap";
        HCImage.renderInto(icon, res.imageId);
        var im = icon.querySelector("img"); if (im) im.className = "icon";
        var tile = icon.querySelector(".emoji-tile"); if (tile) tile.classList.add("icon");
        var nm = document.createElement("div");
        nm.className = "cname";
        nm.textContent = res.name;
        card.appendChild(icon);
        card.appendChild(nm);
        card.addEventListener("click", function () {
          $("modal-respicker").classList.add("hidden");
          resPickerCallback = null;
          onPick(res.id);
        });
        box.appendChild(card);
      })(res);
    });
    $("modal-respicker").classList.remove("hidden");
  }
  $("respicker-cancel").addEventListener("click", function () {
    $("modal-respicker").classList.add("hidden");
    resPickerCallback = null;
  });
  $("modal-respicker").addEventListener("click", function (e) {
    if (e.target === this) { this.classList.add("hidden"); resPickerCallback = null; }
  });

  $("unit-add-cost").addEventListener("click", function () {
    if (isUnitReadonly(findUnit(editingUnitId))) return;
    openResPicker(function (rid) {
      if (unitCostDraft.some(function (c) { return c.resourceId === rid; })) {
        toast("Этот ресурс уже в стоимости");
        return;
      }
      unitCostDraft.push({ resourceId: rid, value: 10 });
      renderUnitLists();
    });
  });
  $("unit-add-upkeep").addEventListener("click", function () {
    if (isUnitReadonly(findUnit(editingUnitId))) return;
    openResPicker(function (rid) {
      if (unitUpkeepDraft.some(function (c) { return c.resourceId === rid; })) {
        toast("Этот ресурс уже в расходе");
        return;
      }
      unitUpkeepDraft.push({ resourceId: rid, value: 1 });
      renderUnitLists();
    });
  });

  /* ---- Открытие формы юнита ---- */
  function fillUnitForm(u, ro) {
    unitDraftImageId = u.imageId;
    unitCostDraft = JSON.parse(JSON.stringify(u.cost || []));
    unitUpkeepDraft = JSON.parse(JSON.stringify(u.upkeep || []));

    $("unitedit-title").textContent = ro ? "🔒 Стандартный юнит" : "Редактирование юнита";
    var nameInp = $("unit-name");
    nameInp.value = u.name || "";
    nameInp.readOnly = ro;

    $("unit-armor").value = u.armor != null ? u.armor : 0;
    setSwitch("unit-area-protect", u.areaProtect);
    $("unit-area-size").value = u.areaSize != null ? u.areaSize : 1;
    setSwitch("unit-enter-same", u.canEnterSameArea);
    setSwitch("unit-kill-same", u.canKillSameArmor);
    setSwitch("unit-cost-grow", u.costGrow);
    setSwitch("unit-cost-shrink", u.costShrinkOnKill);
    $("unit-cost-delta").value = u.costDelta != null ? u.costDelta : 0;
    setSwitch("unit-upkeep-enabled", u.upkeepEnabled);
    setSwitch("unit-die-on-empty", u.dieOnEmpty);
    $("unit-texturepack").value = u.texturepack || "default";

    var inputs = document.querySelectorAll("#screen-unitedit input:not(.btn-back-input), #screen-unitedit button:not(.btn-back)");
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = ro;

    $("unitedit-delete").style.display = ro ? "none" : "";
    var badge = $("unitedit-badge");
    badge.textContent = ro ? "только просмотр" : "свой юнит";

    syncConditionalFields();
    renderUnitLists();
    renderUnitPreview();
  }

  function renderUnitPreview() {
    var wrap = $("unitedit-preview");
    wrap.innerHTML = "";
    HCImage.renderInto(wrap, unitDraftImageId);
    var img = wrap.querySelector("img");
    if (img) img.removeAttribute("class");
    if (!img && !wrap.querySelector(".emoji-tile")) wrap.textContent = "картинка не выбрана";
  }

  function openUnitForm(id) {
    var u = findUnit(id);
    if (!u) return;
    editingUnitId = id;
    fillUnitForm(u, isUnitReadonly(u));
    navStack.push(currentScreen());
    showScreen("unitedit");
  }

  /* Выбор картинки для юнита (общая модалка картинок) */
  $("unit-pickimg").addEventListener("click", function () {
    if (isUnitReadonly(findUnit(editingUnitId))) return;
    openImgPicker(function (imageId) {
      unitDraftImageId = imageId;
      renderUnitPreview();
    });
  });

  /* ---- Сохранение юнита ---- */
  $("unitedit-save").addEventListener("click", function () {
    var cur = findUnit(editingUnitId);
    if (!cur || isUnitReadonly(cur)) return;

    var name = $("unit-name").value.trim();
    if (!name) { toast("⚠ Введите название юнита"); return; }
    if (!unitDraftImageId) { toast("⚠ Выберите картинку юнита"); return; }

    var armor = numVal("unit-armor", 0);
    if (armor < 0) armor = 0;
    var areaProtect = $("unit-area-protect").checked;
    var areaSize = Math.max(1, Math.round(numVal("unit-area-size", 1)));
    var costDelta = Math.max(0, numVal("unit-cost-delta", 0));

    if (!unitCostDraft.length) { toast("⚠ Добавьте хотя бы один ресурс в стоимость"); return; }
    var bad = unitCostDraft.concat(unitUpkeepDraft).some(function (c) {
      return !findResource(c.resourceId) || c.value <= 0;
    });
    if (bad) { toast("⚠ Проверьте ресурсы и значения (должны быть > 0)"); return; }

    var u = {
      id: editingUnitId,
      name: name,
      imageId: unitDraftImageId,
      texturepack: $("unit-texturepack").value.trim() || "default",
      armor: armor,
      areaProtect: areaProtect,
      areaSize: areaSize,
      canKillSameArmor: $("unit-kill-same").checked,
      canEnterSameArea: $("unit-enter-same").checked,
      cost: unitCostDraft,
      costGrow: $("unit-cost-grow").checked,
      costShrinkOnKill: $("unit-cost-shrink").checked,
      costDelta: costDelta,
      upkeepEnabled: $("unit-upkeep-enabled").checked,
      upkeep: unitUpkeepDraft,
      dieOnEmpty: $("unit-die-on-empty").checked
    };

    var own = HCStorage.getUnits();
    var found = false;
    for (var i = 0; i < own.length; i++) {
      if (own[i].id === editingUnitId) { own[i] = u; found = true; break; }
    }
    if (!found) own.push(u);

    if (HCStorage.saveUnits(own)) {
      toast("💾 Юнит «" + name + "» сохранён");
      goBack("uniteditor");
      renderUnitList();
    }
  });

  /* ---- Удаление юнита ---- */
  $("unitedit-delete").addEventListener("click", function () {
    var u = findUnit(editingUnitId);
    if (!u || isUnitReadonly(u)) return;
    if (!confirm("Удалить юнита «" + u.name + "»?")) return;
    var own = HCStorage.getUnits().filter(function (x) { return x.id !== editingUnitId; });
    HCStorage.saveUnits(own);
    toast("🗑 Юнит удалён");
    goBack("uniteditor");
    renderUnitList();
  });

  /* ---- Создание своего юнита ---- */
  $("btn-new-unit").addEventListener("click", function () {
    var id = "unit_" + Date.now();
    var firstImg = HCData.builtinImages.length ? HCData.builtinImages[0].id : null;
    var tpl = {
      id: id, name: "", imageId: firstImg,
      texturepack: "default",
      armor: 0, areaProtect: false, areaSize: 1,
      canKillSameArmor: false, canEnterSameArea: false,
      cost: [], costGrow: false, costShrinkOnKill: false, costDelta: 0,
      upkeepEnabled: false, upkeep: [], dieOnEmpty: false
    };
    editingUnitId = id;
    fillUnitForm(tpl, false);
    $("unit-name").placeholder = "Название нового юнита";
    navStack.push(currentScreen());
    showScreen("unitedit");
    $("unit-name").focus();
    toast("Создайте юнита: картинка + параметры");
  });

  function openUnitEditor() {
    renderUnitList();
    renderImageList();
    showScreen("uniteditor");
  }

  /* =================================================================
   *                    РЕДАКТОР ЗДАНИЙ
   * ================================================================= */

  /* Все здания: стандартные (readonly) + свои из HCStorage */
  function allBuildings() {
    return HCData.defaultBuildings.concat(HCStorage.getBuildings());
  }
  function findBuilding(id) {
    var list = allBuildings();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function isBuildingReadonly(b) { return !!(b && b.readonly); }

  function buildingSummary(b) {
    var parts = ["🛡 " + fmtNum(b.armor || 0)];
    if (b.capital) parts.push("⭐ столица");
    if (b.capturable) parts.push("⚑ захват (окружить " + fmtNum(b.captureRadius || 1) + ")");
    if (b.areaProtect) parts.push("⬡ зона " + fmtNum(b.areaSize || 1) + (b.protectSelf ? "+себя" : ""));
    var costStr = (b.cost || []).map(function (c) { return fmtNum(c.value) + " " + resName(c.resourceId); }).join(" + ");
    parts.push("💰 " + (costStr ? costStr : "бесплатно"));
    if (b.incomeEnabled && (b.income || []).length) {
      parts.push("⚙ " + b.income.map(function (c) {
        return (c.value > 0 ? "+" : "") + fmtNum(c.value) + "/ход";
      }).join(" · "));
    }
    parts.push("🖼 " + (b.imageIds || []).length);
    return parts.join(" · ");
  }

  /* ---- Фильтр по текстурпаку (среди юнитов И зданий) ---- */
  var buildPackFilter = "all";

  function allBuildingTexturepacks() {
    var seen = {}, out = [];
    allUnits().concat(allBuildings()).forEach(function (x) {
      var p = (x.texturepack || "default").trim() || "default";
      if (!seen[p]) { seen[p] = true; out.push(p); }
    });
    return out.sort();
  }

  function renderBuildPackFilter() {
    var sel = $("build-pack-filter");
    var packs = allBuildingTexturepacks();
    sel.innerHTML = "";
    var optAll = document.createElement("option");
    optAll.value = "all"; optAll.textContent = "Все паки (" + allBuildings().length + ")";
    sel.appendChild(optAll);
    packs.forEach(function (p) {
      var n = allBuildings().filter(function (b) { return (b.texturepack || "default") === p; }).length;
      var o = document.createElement("option");
      o.value = p; o.textContent = "🎨 " + p + " (" + n + ")";
      sel.appendChild(o);
    });
    if (packs.indexOf(buildPackFilter) === -1 && buildPackFilter !== "all") buildPackFilter = "all";
    sel.value = buildPackFilter;
  }

  $("build-pack-filter").addEventListener("change", function () {
    buildPackFilter = this.value;
    renderBuildList();
  });

  /* ---- Список зданий ---- */
  function renderBuildList() {
    renderBuildPackFilter();
    var box = $("build-list");
    box.innerHTML = "";
    var list = allBuildings();
    if (buildPackFilter !== "all") {
      list = list.filter(function (b) { return (b.texturepack || "default") === buildPackFilter; });
    }
    if (!list.length) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "В этом пакке пока нет зданий";
      box.appendChild(e);
    }
    for (var i = 0; i < list.length; i++) {
      (function (b) {
        var card = document.createElement("div");
        card.className = "card unit-card";

        var icon = document.createElement("div");
        icon.className = "iconwrap";
        HCImage.renderInto(icon, (b.imageIds || [])[0]);
        var img = icon.querySelector("img"); if (img) img.className = "icon";

        var mid = document.createElement("div");
        mid.className = "unit-mid";
        var name = document.createElement("div");
        name.className = "cname";
        name.textContent = b.name;
        var summ = document.createElement("div");
        summ.className = "usummary";
        summ.textContent = buildingSummary(b);
        mid.appendChild(name);
        mid.appendChild(summ);

        var tag = document.createElement("div");
        tag.className = "ctag";
        tag.textContent = "🎨 " + (b.texturepack || "default");

        card.appendChild(icon);
        card.appendChild(mid);
        card.appendChild(tag);

        if (b.readonly) {
          var lock = document.createElement("span");
          lock.className = "lock";
          lock.textContent = "🔒";
          card.appendChild(lock);
        }

        card.addEventListener("click", function () { openBuildForm(b.id); });
        box.appendChild(card);
      })(list[i]);
    }
  }

  /* ---- Форма здания: черновики ---- */
  var editingBuildId = null;
  var buildImagesDraft = [];   // [imageId,...]
  var buildCostDraft = [];     // [{resourceId,value}]
  var buildIncomeDraft = [];   // [{resourceId,value}] (value может быть отрицательным — убыток)

  function syncBuildConditionalFields() {
    $("capture-fields").style.display = $("build-capturable").checked ? "" : "none";
    $("barea-fields").style.display = $("build-area-protect").checked ? "" : "none";
    var deltaOn = $("build-cost-grow").checked || $("build-cost-shrink").checked;
    $("bcost-delta-fields").style.display = deltaOn ? "" : "none";
    $("income-fields").style.display = $("build-income-enabled").checked ? "" : "none";
  }
  ["build-capital", "build-capturable", "build-area-protect",
   "build-cost-grow", "build-cost-shrink", "build-income-enabled"].forEach(function (id) {
    $(id).addEventListener("change", syncBuildConditionalFields);
  });

  function renderBuildLists() {
    renderResList("build-cost-list", buildCostDraft);
    renderResList("build-income-list", buildIncomeDraft);
  }

  /* Списки картинок здания (мультивыбор) */
  function renderBuildImgStrip() {
    var box = $("build-imglist");
    box.innerHTML = "";
    var cnt = $("build-imgcount");
    cnt.textContent = buildImagesDraft.length
      ? "(" + buildImagesDraft.length + (buildImagesDraft.length > 1 ? " — игра выберет случайную)" : ")")
      : "(нет)";
    if (!buildImagesDraft.length) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "картинки не выбраны";
      box.appendChild(e);
      renderBuildPreview();
      return;
    }
    buildImagesDraft.forEach(function (imageId, idx) {
      (function (imageId, idx) {
        var cell = document.createElement("div");
        cell.className = "imgstrip-cell";
        HCImage.renderInto(cell, imageId);
        var im = cell.querySelector("img"); if (im) im.removeAttribute("class");
        var rm = document.createElement("button");
        rm.className = "imgstrip-del";
        rm.textContent = "✕";
        rm.title = "Убрать картинку";
        rm.addEventListener("click", function (ev) {
          ev.stopPropagation();
          buildImagesDraft.splice(idx, 1);
          renderBuildImgStrip();
        });
        cell.appendChild(rm);
        cell.addEventListener("click", function () {
          buildPreviewIndex = idx % Math.max(1, buildImagesDraft.length);
          renderBuildPreview();
        });
        box.appendChild(cell);
      })(imageId, idx);
    });
    renderBuildPreview();
  }

  var buildPreviewIndex = 0;

  function renderBuildPreview() {
    var wrap = $("buildedit-preview");
    wrap.innerHTML = "";
    if (!buildImagesDraft.length) { wrap.textContent = "картинки не выбраны"; return; }
    var idx = buildPreviewIndex % buildImagesDraft.length;
    HCImage.renderInto(wrap, buildImagesDraft[idx]);
    var img = wrap.querySelector("img");
    if (img) img.removeAttribute("class");
    if (!img && !wrap.querySelector(".emoji-tile")) wrap.textContent = "картинка не найдена";
  }

  /* Добавление картинки к зданию — общая модалка выбора картинок */
  $("build-addimg").addEventListener("click", function () {
    if (isBuildingReadonly(findBuilding(editingBuildId))) return;
    openImgPicker(function (imageId) {
      if (buildImagesDraft.indexOf(imageId) !== -1) { toast("Эта картинка уже добавлена"); return; }
      buildImagesDraft.push(imageId);
      renderBuildImgStrip();
    });
  });

  $("build-clearimgs").addEventListener("click", function () {
    if (isBuildingReadonly(findBuilding(editingBuildId))) return;
    buildImagesDraft = [];
    renderBuildImgStrip();
  });

  /* ---- Кнопки добавления ресурсов в стоимость / доход ---- */
  $("build-add-cost").addEventListener("click", function () {
    if (isBuildingReadonly(findBuilding(editingBuildId))) return;
    openResPicker(function (rid) {
      if (buildCostDraft.some(function (c) { return c.resourceId === rid; })) {
        toast("Этот ресурс уже в стоимости");
        return;
      }
      buildCostDraft.push({ resourceId: rid, value: 10 });
      renderBuildLists();
    });
  });
  $("build-add-income").addEventListener("click", function () {
    if (isBuildingReadonly(findBuilding(editingBuildId))) return;
    openResPicker(function (rid) {
      if (buildIncomeDraft.some(function (c) { return c.resourceId === rid; })) {
        toast("Этот ресурс уже в доходе");
        return;
      }
      buildIncomeDraft.push({ resourceId: rid, value: 1 });
      renderBuildLists();
    });
  });

  /* ---- Открытие формы здания ---- */
  function fillBuildForm(b, ro) {
    buildImagesDraft = (b.imageIds || []).slice();
    buildCostDraft = JSON.parse(JSON.stringify(b.cost || []));
    buildIncomeDraft = JSON.parse(JSON.stringify(b.income || []));
    buildPreviewIndex = 0;

    $("buildedit-title").textContent = ro ? "🔒 Стандартное здание" : "Редактирование здания";
    var nameInp = $("build-name");
    nameInp.value = b.name || "";
    nameInp.readOnly = ro;

    setSwitch("build-capital", b.capital);
    setSwitch("build-capturable", b.capturable);
    $("build-capture-radius").value = b.captureRadius != null ? b.captureRadius : 1;
    $("build-armor").value = b.armor != null ? b.armor : 0;
    setSwitch("build-area-protect", b.areaProtect);
    setSwitch("build-protect-self", b.protectSelf);
    $("build-area-size").value = b.areaSize != null ? b.areaSize : 1;
    setSwitch("build-cost-grow", b.costGrow);
    setSwitch("build-cost-shrink", b.costShrink);
    $("build-cost-delta").value = b.costDelta != null ? b.costDelta : 0;
    setSwitch("build-income-enabled", b.incomeEnabled);
    $("build-texturepack").value = b.texturepack || "default";

    var inputs = document.querySelectorAll("#screen-buildedit input:not(.btn-back-input), #screen-buildedit button:not(.btn-back)");
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = ro;

    $("buildedit-delete").style.display = ro ? "none" : "";
    var badge = $("buildedit-badge");
    badge.textContent = ro ? "только просмотр" : "своё здание";

    syncBuildConditionalFields();
    renderBuildLists();
    renderBuildImgStrip();
  }

  function openBuildForm(id) {
    var b = findBuilding(id);
    if (!b) return;
    editingBuildId = id;
    fillBuildForm(b, isBuildingReadonly(b));
    navStack.push(currentScreen());
    showScreen("buildedit");
  }

  /* ---- Сохранение здания ---- */
  $("buildedit-save").addEventListener("click", function () {
    var cur = findBuilding(editingBuildId);
    if (!cur || isBuildingReadonly(cur)) return;

    var name = $("build-name").value.trim();
    if (!name) { toast("⚠ Введите название здания"); return; }
    if (!buildImagesDraft.length) { toast("⚠ Добавьте хотя бы одну картинку здания"); return; }

    var armor = numVal("build-armor", 0);
    if (armor < 0) armor = 0;
    var capturable = $("build-capturable").checked;
    var captureRadius = Math.max(1, Math.round(numVal("build-capture-radius", 1)));
    var areaProtect = $("build-area-protect").checked;
    var areaSize = Math.max(1, Math.round(numVal("build-area-size", 1)));
    var costDelta = Math.max(0, numVal("build-cost-delta", 0));

    var badRes = buildCostDraft.concat(buildIncomeDraft).some(function (c) {
      return !findResource(c.resourceId);
    });
    if (badRes) { toast("⚠ Проверьте ресурсы — какой-то был удалён"); return; }
    if (buildCostDraft.some(function (c) { return c.value <= 0; })) {
      toast("⚠ Значения в стоимости должны быть больше 0"); return;
    }
    if ($("build-income-enabled").checked && buildIncomeDraft.length &&
        buildIncomeDraft.every(function (c) { return c.value === 0; })) {
      toast("⚠ Доход/убыток не может быть нулевым у всех ресурсов"); return;
    }

    var b = {
      id: editingBuildId,
      name: name,
      imageIds: buildImagesDraft.slice(),
      texturepack: $("build-texturepack").value.trim() || "default",
      capital: $("build-capital").checked,
      capturable: capturable,
      captureRadius: capturable ? captureRadius : 0,
      armor: armor,
      areaProtect: areaProtect,
      protectSelf: areaProtect ? $("build-protect-self").checked : false,
      areaSize: areaSize,
      cost: buildCostDraft,
      costGrow: $("build-cost-grow").checked,
      costShrink: $("build-cost-shrink").checked,
      costDelta: costDelta,
      incomeEnabled: $("build-income-enabled").checked,
      income: buildIncomeDraft
    };

    var own = HCStorage.getBuildings();
    var found = false;
    for (var i = 0; i < own.length; i++) {
      if (own[i].id === editingBuildId) { own[i] = b; found = true; break; }
    }
    if (!found) own.push(b);

    if (HCStorage.saveBuildings(own)) {
      toast("💾 Здание «" + name + "» сохранён".replace("сохранён", "сохранено"));
      goBack("buildeditor");
      renderBuildList();
    }
  });

  /* ---- Удаление здания ---- */
  $("buildedit-delete").addEventListener("click", function () {
    var b = findBuilding(editingBuildId);
    if (!b || isBuildingReadonly(b)) return;
    if (!confirm("Удалить здание «" + b.name + "»?")) return;
    var own = HCStorage.getBuildings().filter(function (x) { return x.id !== editingBuildId; });
    HCStorage.saveBuildings(own);
    toast("🗑 Здание удалено");
    goBack("buildeditor");
    renderBuildList();
  });

  /* ---- Создание своего здания ---- */
  $("btn-new-building").addEventListener("click", function () {
    var id = "bld_" + Date.now();
    var firstImg = HCData.builtinImages.length ? HCData.builtinImages[0].id : null;
    var tpl = {
      id: id, name: "", imageIds: firstImg ? [firstImg] : [],
      texturepack: "default",
      capital: false, capturable: false, captureRadius: 1,
      armor: 0, areaProtect: false, protectSelf: false, areaSize: 1,
      cost: [], costGrow: false, costShrink: false, costDelta: 0,
      incomeEnabled: false, income: []
    };
    editingBuildId = id;
    fillBuildForm(tpl, false);
    $("build-name").placeholder = "Название нового здания";
    navStack.push(currentScreen());
    showScreen("buildedit");
    $("build-name").focus();
    toast("Создайте здание: картинки + параметры");
  });

  /* Обход картинок тапом по превью (заодно показывает «случайность») */
  $("buildedit-preview").addEventListener("click", function () {
    if (buildImagesDraft.length > 1) {
      buildPreviewIndex = (buildPreviewIndex + 1) % buildImagesDraft.length;
      renderBuildPreview();
    }
  });

  function openBuildEditor() {
    renderBuildList();
    renderImageList();
    showScreen("buildeditor");
  }

  /* =================================================================
   *                    РЕДАКТОР КАРТ
   * =================================================================
   * Поле — прямоугольник из шестиугольников (offset rows): чётные ряды
   * смещены на полхекса вправо. Клетки хранятся словарём "q,r".
   * Управление: рисование через Pointer Events — мышь ЛКМ-драг и палец
   * рисуют одинаково; два пальца = панорама + щипок-зум; тап по пустой
   * клетке инструментом «Хекс +» добавляет её одним касанием.
   */

  var HEX_R = 24;                       // радиус описанной окружности хекса (flat-top)
  var HEX_W = 2 * HEX_R, HEX_H = Math.sqrt(3) * HEX_R;

  function hexCenter(q, r) {
    return { x: q * HEX_W * 0.75, y: r * HEX_H + (q % 2 ? HEX_H / 2 : 0) };
  }
  function hexPoints(cx, cy) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 180 * (60 * i);
      pts.push((cx + HEX_R * Math.cos(a)).toFixed(2) + "," + (cy + HEX_R * Math.sin(a)).toFixed(2));
    }
    return pts.join(" ");
  }
  function cellKey(q, r) { return q + "," + r; }
  function parseKey(k) { var p = k.split(","); return { q: +p[0], r: +p[1] }; }

  var PLAYER_COLORS = ["#e05a4e", "#4e9de0", "#5cc46a", "#e6c34a",
                       "#b06ae0", "#e08a4e", "#4ec9c0", "#d05a9e", "#9aa54e", "#8f97a8"];

  var currentMapId = null;
  var mapDoc = null;          // редактируемый документ карты
  var mapDirty = false;
  var mapTool = "paint";
  var selectedPlayerId = null;
  var selectedBuildingId = null;
  var selectedUnitId = null;
  var panX = 0, panY = 0, zoom = 1;
  var lastPanStore = {};       // сохранение позиции камеры при выходе в игру
  var imgCache = {};           // imageId -> Image (для SVG pattern)

  function defaultCells(w, h) {
    var cells = {};
    for (var q = 0; q < w; q++) for (var r = 0; r < h; r++) cells[cellKey(q, r)] = {};
    return cells;
  }
  function newMapDoc(name) {
    return {
      name: name || "Новая карта",
      width: 14, height: 10,
      texturepack: "default",
      players: [
        mkPlayer("Игрок 1", PLAYER_COLORS[0]),
        mkPlayer("Игрок 2", PLAYER_COLORS[1])
      ],
      cells: defaultCells(14, 10),
      units: {},      // key -> { unitId, playerId }
      buildings: {}   // key -> { buildingId, playerId }
    };
  }
  function mkPlayer(name, color) {
    return {
      id: "pl_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36),
      name: name, color: color, flagImageId: null,
      startResources: [{ resourceId: "res_gold", value: 100 }]
    };
  }
  function findPlayer(id) {
    if (!mapDoc) return null;
    for (var i = 0; i < mapDoc.players.length; i++) if (mapDoc.players[i].id === id) return mapDoc.players[i];
    return null;
  }
  function markMapDirty() { mapDirty = true; updateMapStatus(); }

  /* ---- Список карт ---- */
  function openMapList() {
    renderMapList();
    showScreen("maplist");
  }

  function renderMapList() {
    var box = $("map-list");
    box.innerHTML = "";
    var maps = HCStorage.getMaps();
    if (!maps.length) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "Карт пока нет — создайте первую!";
      box.appendChild(e);
    }
    maps.forEach(function (m) {
      var card = document.createElement("div");
      card.className = "card map-card";

      var icon = document.createElement("div");
      icon.className = "iconwrap";
      icon.textContent = "🗺";
      icon.style.fontSize = "26px";

      var mid = document.createElement("div");
      mid.className = "unit-mid";
      var nm = document.createElement("div");
      nm.className = "cname";
      nm.textContent = m.name || "Без названия";
      var summ = document.createElement("div");
      summ.className = "usummary";
      var d = m.data || {};
      var nCells = Object.keys(d.cells || {}).length;
      var stuff = Object.keys(d.units || {}).length + Object.keys(d.buildings || {}).length;
      summ.textContent = "⬡ " + nCells + " · 👥 " + (d.players || []).length +
        " · 🏠🛡 " + stuff + " · 🎨 " + (d.texturepack || "default") +
        "\n" + new Date(m.updated || 0).toLocaleString();
      summ.style.whiteSpace = "pre-line";
      mid.appendChild(nm);
      mid.appendChild(summ);

      var playBtn = document.createElement("button");
      playBtn.className = "btn small-btn btn-success";
      playBtn.textContent = "▶";
      playBtn.title = "Играть (просмотр)";
      playBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        loadMapIntoDoc(m.id);
        startGameView();
      });

      var delBtn = document.createElement("button");
      delBtn.className = "btn small-btn btn-danger";
      delBtn.textContent = "🗑";
      delBtn.title = "Удалить карту";
      delBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (!confirm("Удалить карту «" + m.name + "»?")) return;
        HCStorage.saveMaps(HCStorage.getMaps().filter(function (x) { return x.id !== m.id; }));
        toast("🗑 Карта удалена");
        renderMapList();
      });

      card.appendChild(icon);
      card.appendChild(mid);
      card.appendChild(playBtn);
      card.appendChild(delBtn);
      card.addEventListener("click", function () { openExistingMap(m.id); });
      box.appendChild(card);
    });
  }

  $("btn-new-map").addEventListener("click", function () {
    var doc = newMapDoc("");
    currentMapId = "map_" + Date.now();
    mapDoc = doc;
    mapDirty = true;
    resetCamera();
    navStack.push(currentScreen());
    showScreen("mapeditor");
    setupMapEditorDom();
    $("map-name").focus();
    toast("Рисуйте поле: инструмент «Хекс +» ставит клетки тапом");
  });

  function loadMapIntoDoc(id) {
    var m = HCStorage.getMaps().filter(function (x) { return x.id === id; })[0];
    if (!m) return false;
    currentMapId = id;
    mapDoc = JSON.parse(JSON.stringify(m.data || newMapDoc(m.name)));
    if (!mapDoc.cells) mapDoc.cells = {};
    if (!mapDoc.units) mapDoc.units = {};
    if (!mapDoc.buildings) mapDoc.buildings = {};
    if (!mapDoc.players) mapDoc.players = [];
    mapDirty = false;
    return true;
  }

  function openExistingMap(id) {
    if (!loadMapIntoDoc(id)) { toast("⚠ Карта не найдена"); return; }
    resetCamera();
    navStack.push(currentScreen());
    showScreen("mapeditor");
    setupMapEditorDom();
  }

  function openMapEditor(id, opts) {
    if (opts && opts.restorePan) { setupMapEditorDom(); return; }
    openExistingMap(id);
  }

  function saveCurrentMap(opts) {
    opts = opts || {};
    if (!mapDoc || !currentMapId) return;
    mapDoc.name = $("map-name").value.trim() || mapDoc.name || "Без названия";
    var maps = HCStorage.getMaps();
    var entry = { id: currentMapId, name: mapDoc.name, data: mapDoc, updated: Date.now() };
    var found = false;
    for (var i = 0; i < maps.length; i++) {
      if (maps[i].id === currentMapId) { maps[i] = entry; found = true; break; }
    }
    if (!found) maps.push(entry);
    if (HCStorage.saveMaps(maps)) {
      mapDirty = false;
      updateMapStatus();
      if (!opts.silent) toast("💾 Карта «" + mapDoc.name + "» сохранена");
    } else if (!opts.silent) {
      toast("⚠ Не удалось сохранить — память переполнена");
    }
  }

  $("map-save").addEventListener("click", function () { saveCurrentMap(); });

  /* ---- Настройка экрана редактора ---- */
  var mapDomReady = false;
  function setupMapEditorDom() {
    $("map-name").value = mapDoc ? mapDoc.name : "";
    if (selectedPlayerId && !findPlayer(selectedPlayerId)) selectedPlayerId = null;
    if (!selectedPlayerId && mapDoc && mapDoc.players.length) selectedPlayerId = mapDoc.players[0].id;
    ensurePackSelection();
    renderCtxBar();
    renderMapSvg();
    updateMapStatus();
    mapDomReady = true;
  }

  function resetCamera() {
    panX = 20; panY = 20; zoom = 1;
  }

  function updateMapStatus() {
    var st = $("map-status");
    if (!st || !mapDoc) return;
    var nCells = Object.keys(mapDoc.cells).length;
    st.textContent = "⬡ " + nCells +
      " · 🛡 " + Object.keys(mapDoc.units).length +
      " · 🏠 " + Object.keys(mapDoc.buildings).length +
      " · 🎨 " + (mapDoc.texturepack || "default") +
      (mapDirty ? " · ● изменено" : " · ✔ сохранено");
  }

  /* ---- Инструменты ---- */
  function setTool(tool) {
    mapTool = tool;
    var btns = document.querySelectorAll("#map-toolbar .tool");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].getAttribute("data-tool") === tool);
    }
    renderCtxBar();
  }
  $("map-toolbar").addEventListener("click", function (e) {
    var b = e.target.closest(".mt");
    if (!b) return;
    if (b.getAttribute("data-tool")) { setTool(b.getAttribute("data-tool")); return; }
    if (b.id === "btn-players") openPlayersModal();
    if (b.id === "btn-pack") openPackModal();
    if (b.id === "btn-size") openSizeModal();
  });

  /* ---- Контекстная строка инструмента (быстрый выбор без лишних касаний) ---- */
  function packUnits() {
    var pack = mapDoc ? mapDoc.texturepack : "default";
    return allUnits().filter(function (u) { return (u.texturepack || "default") === pack; });
  }
  function packBuildings() {
    var pack = mapDoc ? mapDoc.texturepack : "default";
    return allBuildings().filter(function (b) { return (b.texturepack || "default") === pack; });
  }
  function ensurePackSelection() {
    if (!mapDoc) return;
    var us = packUnits();
    if (!selectedUnitId || !us.some(function (u) { return u.id === selectedUnitId; })) {
      selectedUnitId = us.length ? us[0].id : null;
    }
    var bs = packBuildings();
    if (!selectedBuildingId || !bs.some(function (b) { return b.id === selectedBuildingId; })) {
      selectedBuildingId = bs.length ? bs[0].id : null;
    }
  }

  function chipRow(items, selectedId, onPick) {
    var wrap = document.createElement("div");
    wrap.className = "chiprow";
    items.forEach(function (it) {
      var c = document.createElement("button");
      c.className = "chip" + (it.id === selectedId ? " active" : "");
      var ic = document.createElement("span");
      ic.className = "chip-img";
      if (it.imageIds) HCImage.renderInto(ic, it.imageIds[0]);
      else HCImage.renderInto(ic, it.imageId);
      var im = ic.querySelector("img"); if (im) im.removeAttribute("class");
      if (!ic.firstChild) ic.textContent = "❔";
      c.appendChild(ic);
      var tx = document.createElement("span");
      tx.className = "chip-name";
      tx.textContent = it.name;
      c.appendChild(tx);
      if (it.color) {
        var dot = document.createElement("i");
        dot.className = "chip-dot";
        dot.style.background = it.color;
        c.appendChild(dot);
      }
      c.addEventListener("click", function () { onPick(it.id); });
      wrap.appendChild(c);
    });
    return wrap;
  }

  function renderCtxBar() {
    var ctx = $("map-ctx");
    ctx.innerHTML = "";
    if (!mapDoc) return;
    if (mapTool === "paint" || mapTool === "building" || mapTool === "unit") {
      var label = document.createElement("div");
      label.className = "ctx-label";
      label.textContent = mapTool === "paint" ? "Красить за игрока:"
        : mapTool === "building" ? "Здание (" + (mapDoc.texturepack || "default") + "):"
        : "Юнит (" + (mapDoc.texturepack || "default") + "):";
      ctx.appendChild(label);
      if (mapTool === "paint") {
        if (!mapDoc.players.length) {
          var t = document.createElement("div");
          t.className = "ctx-empty";
          t.textContent = "нет игроков — нажмите 👥";
          ctx.appendChild(t);
        } else {
          ctx.appendChild(chipRow(mapDoc.players.map(function (p) {
            return { id: p.id, name: p.name, color: p.color, imageId: p.flagImageId };
          }), selectedPlayerId, function (id) {
            selectedPlayerId = id;
            renderCtxBar();
          }));
        }
      } else if (mapTool === "building") {
        var bs = packBuildings();
        if (!bs.length) {
          var t2 = document.createElement("div"); t2.className = "ctx-empty";
          t2.textContent = "в этом паке нет зданий";
          ctx.appendChild(t2);
        } else ctx.appendChild(chipRow(bs, selectedBuildingId, function (id) {
          selectedBuildingId = id; renderCtxBar();
        }));
      } else {
        var us = packUnits();
        if (!us.length) {
          var t3 = document.createElement("div"); t3.className = "ctx-empty";
          t3.textContent = "в этом паке нет юнитов";
          ctx.appendChild(t3);
        } else ctx.appendChild(chipRow(us, selectedUnitId, function (id) {
          selectedUnitId = id; renderCtxBar();
        }));
      }
    } else {
      var hints = {
        erase: "🧽 Тап/драг по клетке — обесцветить (здание/юнит останутся)",
        addhex: "⬡ Тап по пустому месту рядом с полем — добавить шестиугольник",
        delhex: "✂ Тап/драг по клетке — удалить её вместе со зданием и юнитом",
        erasestuff: "🚮 Тап по клетке — снять здание и юнита"
      };
      var h = document.createElement("div");
      h.className = "ctx-label";
      h.textContent = hints[mapTool] || "";
      ctx.appendChild(h);
    }
  }

  /* ---- Рендер SVG ---- */
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }

  /* Камера: viewBox = центр поля + pan (в экранных px) / zoom.
     При zoom=1 поле целиком вписано в viewport. */
  var gvCam = { panX: 0, panY: 0, zoom: 1 };

  function mapBounds(doc) {
    var keys = Object.keys(doc.cells);
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    keys.forEach(function (k) {
      var qr = parseKey(k), c = hexCenter(qr.q, qr.r);
      minX = Math.min(minX, c.x - HEX_R); maxX = Math.max(maxX, c.x + HEX_R);
      minY = Math.min(minY, c.y - HEX_H / 2); maxY = Math.max(maxY, c.y + HEX_H / 2);
    });
    if (!keys.length) { minX = 0; minY = 0; maxX = HEX_W; maxY = HEX_H; }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function renderMapSvg(targetSvgId, docOverride) {
    var svg = $(targetSvgId || "map-svg");
    var doc = docOverride || mapDoc;
    if (!svg || !doc) return;
    svg.innerHTML = "";

    var isEditor = (targetSvgId === undefined || targetSvgId === "map-svg");
    var cam = isEditor ? { panX: panX, panY: panY, zoom: zoom } : gvCam;
    var b = mapBounds(doc);
    var vbW = b.maxX - b.minX, vbH = b.maxY - b.minY;
    var cx0 = (b.minX + b.maxX) / 2, cy0 = (b.minY + b.maxY) / 2;
    var vw = vbW / cam.zoom, vh = vbH / cam.zoom;
    var vx = cx0 - vw / 2 - cam.panX / cam.zoom;
    var vy = cy0 - vh / 2 - cam.panY / cam.zoom;
    svg.setAttribute("viewBox", vx + " " + vy + " " + vw + " " + vh);

    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    var keys = Object.keys(doc.cells);

    keys.forEach(function (k) {
      var qr = parseKey(k), cell = doc.cells[k];
      var c = hexCenter(qr.q, qr.r);
      var poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("points", hexPoints(c.x, c.y));
      poly.setAttribute("class", "hex");
      poly.setAttribute("data-key", k);
      var owner = cell.owner && findPlayer(cell.owner);
      poly.setAttribute("fill", owner ? owner.color : "#ffffff");
      poly.setAttribute("stroke", "#7c8798");
      poly.setAttribute("stroke-width", "1.5");
      g.appendChild(poly);

      var bEntry = doc.buildings[k];
      if (bEntry) {
        var b = findBuilding(bEntry.buildingId);
        if (b && b.imageIds && b.imageIds.length) {
          var ids = b.imageIds.slice();
          var imageId = ids[hashStr(k) % ids.length];
          var use = document.createElementNS("http://www.w3.org/2000/svg", "image");
          var def = HCImage.resolve(imageId);
          if (def && def.src) {
            use.setAttribute("href", def.src);
            use.setAttribute("x", String(c.x - HEX_R * 0.85));
            use.setAttribute("y", String(c.y - HEX_R * 0.85));
            use.setAttribute("width", String(HEX_R * 1.7));
            use.setAttribute("height", String(HEX_R * 1.7));
            use.setAttribute("pointer-events", "none");
            g.appendChild(use);
          }
        }
        if (b && b.capital) {
          var star = document.createElementNS("http://www.w3.org/2000/svg", "text");
          star.setAttribute("x", String(c.x)); star.setAttribute("y", String(c.y - HEX_R * 0.55));
          star.setAttribute("text-anchor", "middle"); star.setAttribute("font-size", "14");
          star.setAttribute("pointer-events", "none");
          star.textContent = "★";
          g.appendChild(star);
        }
      }
      var uEntry = doc.units[k];
      if (uEntry) {
        var u = findUnitById(uEntry.unitId);
        if (u && u.imageId) {
          var def2 = HCImage.resolve(u.imageId);
          if (def2 && def2.src) {
            var ui = document.createElementNS("http://www.w3.org/2000/svg", "image");
            ui.setAttribute("href", def2.src);
            ui.setAttribute("x", String(c.x - HEX_R * 0.55));
            ui.setAttribute("y", String(c.y - HEX_R * 0.55));
            ui.setAttribute("width", String(HEX_R * 1.1));
            ui.setAttribute("height", String(HEX_R * 1.1));
            ui.setAttribute("pointer-events", "none");
            g.appendChild(ui);
          }
        }
        var up = uEntry.playerId && findPlayer(uEntry.playerId);
        if (up) {
          var ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          ring.setAttribute("cx", String(c.x + HEX_R * 0.62));
          ring.setAttribute("cy", String(c.y - HEX_R * 0.62));
          ring.setAttribute("r", "5");
          ring.setAttribute("fill", up.color);
          ring.setAttribute("stroke", "#222");
          ring.setAttribute("stroke-width", "1");
          ring.setAttribute("pointer-events", "none");
          g.appendChild(ring);
        }
      }
    });
    svg.appendChild(g);
  }

  function findUnitById(id) {
    var list = allUnits();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---- Взаимодействие: pointer events (мышь + палец) ---- */
  var pointers = {};          // id -> {x,y}
  var gesture = null;         // 'draw' | 'panzoom'
  var drawPainted = {};       // ключи, уже тронутые текущим жестом
  var pinchStart = null;

  var viewport = $("map-viewport");

  /* экранные px -> координаты мира (учитывая viewBox-камеру) */
  function svgPoint(clientX, clientY) {
    var svg = $("map-svg");
    var rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var vb = svg.viewBox.baseVal;
    var x = vb.x + (clientX - rect.left) / rect.width * vb.width;
    var y = vb.y + (clientY - rect.top) / rect.height * vb.height;
    return { x: x, y: y };
  }

  function cellAt(wx, wy) {
    var best = null, bestD = HEX_R * HEX_R;
    Object.keys(mapDoc.cells).forEach(function (k) {
      var qr = parseKey(k), c = hexCenter(qr.q, qr.r);
      var dx = wx - c.x, dy = wy - c.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = k; }
    });
    return best;
  }

  function applyTool(key, isTapEmpty) {
    var cell = mapDoc.cells[key];
    if (!cell) return;
    if (mapTool === "paint") {
      if (!selectedPlayerId) return;
      if (cell.owner !== selectedPlayerId) { cell.owner = selectedPlayerId; markMapDirty(); }
    } else if (mapTool === "erase") {
      if (cell.owner) { delete cell.owner; markMapDirty(); }
    } else if (mapTool === "delhex") {
      delete mapDoc.cells[key];
      delete mapDoc.buildings[key];
      delete mapDoc.units[key];
      markMapDirty();
    } else if (mapTool === "erasestuff") {
      if (mapDoc.buildings[key] || mapDoc.units[key]) {
        delete mapDoc.buildings[key];
        delete mapDoc.units[key];
        markMapDirty();
      }
    } else if (mapTool === "building") {
      if (isTapEmpty && selectedBuildingId) {
        var prevB = mapDoc.buildings[key];
        if (prevB && prevB.buildingId === selectedBuildingId) {
          delete mapDoc.buildings[key];
        } else {
          mapDoc.buildings[key] = { buildingId: selectedBuildingId, playerId: cell.owner || null };
        }
        markMapDirty();
      }
    } else if (mapTool === "unit") {
      if (isTapEmpty && selectedUnitId) {
        var prevU = mapDoc.units[key];
        if (prevU && prevU.unitId === selectedUnitId) {
          delete mapDoc.units[key];
        } else {
          mapDoc.units[key] = { unitId: selectedUnitId, playerId: cell.owner || selectedPlayerId || null };
        }
        markMapDirty();
      }
    }
  }

  function tryAddHexAt(world) {
    /* подобрать ближайшую свободную координату рядом с существующими клетками */
    var q = Math.round(world.x / (HEX_W * 0.75));
    var r = Math.round((world.y - (q % 2 ? HEX_H / 2 : 0)) / HEX_H);
    for (var dr = -1; dr <= 1; dr++) {
      for (var dq = -1; dq <= 1; dq++) {
        var qq = q + dq, rr = r + dr;
        if (qq < 0 || rr < 0) continue;
        var k = cellKey(qq, rr);
        if (!mapDoc.cells[k]) {
          mapDoc.cells[k] = {};
          markMapDirty();
          return k;
        }
      }
    }
    var k2 = cellKey(q, r);
    if (!mapDoc.cells[k2]) { mapDoc.cells[k2] = {}; markMapDirty(); return k2; }
    return null;
  }

  function redraw() { renderMapSvg("map-svg"); }

  function panZoom(cam, clientX, clientY) {
    /* cam.zoom умножаем на масштаб viewBox->px, чтобы px-перемещение
       превращалось в world-смещение */
    var svg = $("map-svg");
    var rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var vb = svg.viewBox.baseVal;
    var pxToUnit = vb.width / rect.width;   /* world units per screen px */
    var f = Math.max(0.35, Math.min(4, cam.zoom * (clientY)));
    cam.zoom = f;
  }

  /* единый обработчик жестов для map-viewport */
  viewport.addEventListener("pointerdown", function (e) {
    if (!mapDoc) return;
    if (!svgPoint(e.clientX, e.clientY)) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var n = Object.keys(pointers).length;
    if (n === 1) {
      if (panMode || e.shiftKey || e.button === 1) {
        gesture = "pan";
      } else {
        gesture = "draw";
        drawPainted = {};
        var w = svgPoint(e.clientX, e.clientY);
        var key = cellAt(w.x, w.y);
        if (key) {
          applyTool(key, true);
          drawPainted[key] = true;
          redraw();
        } else if (mapTool === "addhex") {
          var k = tryAddHexAt(w);
          if (k) { drawPainted[k] = true; redraw(); }
        }
      }
      viewport.setPointerCapture(e.pointerId);
    } else if (n === 2) {
      gesture = "pinch";
      var ids = Object.keys(pointers);
      var a = pointers[ids[0]], b = pointers[ids[1]];
      pinchStart = {
        dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2
      };
    }
    e.preventDefault();
  });

  viewport.addEventListener("pointermove", function (e) {
    if (!pointers[e.pointerId] || !mapDoc) return;
    var prev = pointers[e.pointerId];
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };

    if (gesture === "pinch" && Object.keys(pointers).length >= 2) {
      var ids = Object.keys(pointers);
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      applyPinch(zoomCam(), dist / pinchStart.dist, cx - pinchStart.cx, cy - pinchStart.cy);
      pinchStart.dist = dist; pinchStart.cx = cx; pinchStart.cy = cy;
      redraw();
      e.preventDefault();
      return;
    }
    if (gesture === "pan") {
      applyPan(zoomCam(), e.clientX - prev.x, e.clientY - prev.y);
      redraw();
      e.preventDefault();
      return;
    }
    if (gesture !== "draw") return;
    var w = svgPoint(e.clientX, e.clientY);
    if (!w) return;
    if (mapTool === "paint" || mapTool === "erase" || mapTool === "delhex" || mapTool === "erasestuff") {
      var key = cellAt(w.x, w.y);
      if (key && !drawPainted[key]) {
        applyTool(key, true);
        drawPainted[key] = true;
        redraw();
      }
    } else if (mapTool === "addhex") {
      if (!cellAt(w.x, w.y)) {
        var k = tryAddHexAt(w);
        if (k && !drawPainted[k]) { drawPainted[k] = true; redraw(); }
      }
    }
    e.preventDefault();
  });

  function endPointer(e) {
    delete pointers[e.pointerId];
    if (!Object.keys(pointers).length) { gesture = null; pinchStart = null; drawPainted = {}; }
    else if (gesture === "pinch" && Object.keys(pointers).length === 1) {
      gesture = "pan"; pinchStart = null;
    }
  }
  viewport.addEventListener("pointerup", endPointer);
  viewport.addEventListener("pointercancel", endPointer);

  /* Колесо мыши = зум на ПК */
  viewport.addEventListener("wheel", function (e) {
    if (!mapDoc) return;
    e.preventDefault();
    zoom *= (e.deltaY < 0 ? 1.12 : 0.89);
    zoom = Math.max(0.35, Math.min(4, zoom));
    redraw();
  }, { passive: false });

  /* Кнопки зума/вписывания — удобны на телефоне */
  function zoomCam() { return { get panX() { return panX; }, set panX(v) { panX = v; },
                                get panY() { return panY; }, set panY(v) { panY = v; },
                                get zoom() { return zoom; }, set zoom(v) { zoom = v; } }; }
  function applyPan(cam, dxPx, dyPx) {
    var svg = $("map-svg"), rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var vb = svg.viewBox.baseVal;
    var unitsPerPx = vb.width / rect.width;
    cam.panX -= dxPx * unitsPerPx;
    cam.panY -= dyPx * unitsPerPx;
  }
  function applyPinch(cam, factor, dcx, dcy) {
    var newZoom = Math.max(0.35, Math.min(4, cam.zoom * factor));
    cam.panX -= dcx;
    cam.panY -= dcy;
    cam.zoom = newZoom;
  }
  $("zoom-in").addEventListener("click", function () {
    zoom = Math.min(4, zoom * 1.25); redraw();
  });
  $("zoom-out").addEventListener("click", function () {
    zoom = Math.max(0.35, zoom * 0.8); redraw();
  });
  $("zoom-fit").addEventListener("click", function () {
    zoom = 1; panX = 0; panY = 0; redraw();
  });

  /* Режим «Рука»: панорама одним пальцем */
  var panMode = false;
  $("btn-panmode").addEventListener("click", function () {
    panMode = !panMode;
    this.classList.toggle("active", panMode);
    toast(panMode ? "✋ Панорама одним пальцем" : "✋ Выключено — палец рисует");
  });

  /* ---- Модальное окно: игроки ---- */
  var editingPlayerDraft = null;   // черновик игрока при редактировании
  var playerEditingNew = false;

  function openPlayersModal() {
    renderPlayerList();
    $("player-editor").classList.add("hidden");
    $("modal-players").classList.remove("hidden");
  }
  function closePlayersModal() {
    $("modal-players").classList.add("hidden");
    renderCtxBar();
    redraw();
    updateMapStatus();
  }
  $("players-close").addEventListener("click", closePlayersModal);
  $("modal-players").addEventListener("click", function (e) {
    if (e.target === this) closePlayersModal();
  });

  function renderPlayerList() {
    var box = $("player-list");
    box.innerHTML = "";
    if (!mapDoc.players.length) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "игроков нет — добавьте";
      box.appendChild(e);
    }
    mapDoc.players.forEach(function (p) {
      var card = document.createElement("div");
      card.className = "card player-card";
      var sw = document.createElement("span");
      sw.className = "pswatch";
      sw.style.background = p.color;
      var nm = document.createElement("div");
      nm.className = "cname grow-text";
      nm.textContent = p.name;
      var flag = document.createElement("span");
      flag.className = "pflag-mini";
      if (p.flagImageId) HCImage.renderInto(flag, p.flagImageId);
      var owned = Object.keys(mapDoc.cells).filter(function (k) { return mapDoc.cells[k].owner === p.id; }).length;
      var cnt = document.createElement("span");
      cnt.className = "pcount";
      cnt.textContent = "⬡ " + owned;
      var edit = document.createElement("button");
      edit.className = "btn small-btn";
      edit.textContent = "✎";
      edit.addEventListener("click", function () { openPlayerForm(p.id, false); });
      var del = document.createElement("button");
      del.className = "btn small-btn btn-danger";
      del.textContent = "🗑";
      del.addEventListener("click", function () {
        if (!confirm("Удалить игрока «" + p.name + "»? Его клетки станут бесцветными.")) return;
        mapDoc.players = mapDoc.players.filter(function (x) { return x.id !== p.id; });
        Object.keys(mapDoc.cells).forEach(function (k) {
          if (mapDoc.cells[k].owner === p.id) delete mapDoc.cells[k].owner;
        });
        if (selectedPlayerId === p.id) selectedPlayerId = mapDoc.players.length ? mapDoc.players[0].id : null;
        markMapDirty();
        renderPlayerList();
      });
      card.appendChild(sw); card.appendChild(nm); card.appendChild(flag);
      card.appendChild(cnt); card.appendChild(edit); card.appendChild(del);
      box.appendChild(card);
    });
  }

  $("btn-add-player").addEventListener("click", function () {
    var idx = mapDoc.players.length;
    var p = mkPlayer("Игрок " + (idx + 1), PLAYER_COLORS[idx % PLAYER_COLORS.length]);
    openPlayerFormFor(p, true);
  });

  function openPlayerForm(id, isNew) {
    var p = findPlayer(id);
    if (!p) return;
    openPlayerFormFor(JSON.parse(JSON.stringify(p)), isNew);
  }

  function openPlayerFormFor(draft, isNew) {
    editingPlayerDraft = draft;
    playerEditingNew = isNew;
    $("player-list").classList.add("hidden");
    $("btn-add-player").classList.add("hidden");
    $("player-editor").classList.remove("hidden");
    $("pl-name").value = draft.name || "";
    renderSwatches(draft.color);
    renderFlagPreview(draft.flagImageId);
    renderPlResList();
    $("pl-name").focus();
  }

  function finishPlayerEdit() {
    $("player-editor").classList.add("hidden");
    $("player-list").classList.remove("hidden");
    $("btn-add-player").classList.remove("hidden");
    editingPlayerDraft = null;
    renderPlayerList();
  }

  var plColorDraft = PLAYER_COLORS[0];
  function renderSwatches(cur) {
    plColorDraft = cur || PLAYER_COLORS[0];
    var box = $("pl-colors");
    box.innerHTML = "";
    PLAYER_COLORS.forEach(function (c) {
      var s = document.createElement("button");
      s.className = "swatch" + (c.toLowerCase() === String(plColorDraft).toLowerCase() ? " active" : "");
      s.style.background = c;
      s.addEventListener("click", function () {
        plColorDraft = c;
        renderSwatches(c);
      });
      box.appendChild(s);
    });
    var inp = $("pl-color-pick");
    inp.value = /^#[0-9a-f]{6}$/i.test(plColorDraft) ? plColorDraft : "#e6c34a";
    inp.oninput = function () {
      plColorDraft = this.value;
      renderSwatches(this.value);
    };
    inp.onchange = inp.oninput;
  }

  function renderFlagPreview(imageId) {
    var el = $("pl-flag-preview");
    el.innerHTML = "";
    if (imageId) {
      HCImage.renderInto(el, imageId);
      var im = el.querySelector("img"); if (im) im.removeAttribute("class");
    } else {
      el.textContent = "нет";
    }
  }

  $("pl-pick-flag").addEventListener("click", function () {
    if (!editingPlayerDraft) return;
    openImgPicker(function (imageId) {
      editingPlayerDraft.flagImageId = imageId;
      renderFlagPreview(imageId);
    });
  });
  $("pl-clear-flag").addEventListener("click", function () {
    if (!editingPlayerDraft) return;
    editingPlayerDraft.flagImageId = null;
    renderFlagPreview(null);
  });

  function renderPlResList() {
    renderResList("pl-startres", editingPlayerDraft.startResources);
  }
  $("pl-add-res").addEventListener("click", function () {
    if (!editingPlayerDraft) return;
    openResPicker(function (rid) {
      if (editingPlayerDraft.startResources.some(function (c) { return c.resourceId === rid; })) {
        toast("Этот ресурс уже в наборе"); return;
      }
      editingPlayerDraft.startResources.push({ resourceId: rid, value: 50 });
      renderPlResList();
    });
  });

  $("pl-ok").addEventListener("click", function () {
    if (!editingPlayerDraft) return;
    var name = $("pl-name").value.trim();
    if (!name) { toast("⚠ Введите название страны"); return; }
    editingPlayerDraft.name = name;
    editingPlayerDraft.color = plColorDraft;
    /* подтянуть значения ресурсов из DOM-ряда */
    syncResListFromDom("pl-startres", editingPlayerDraft.startResources);
    if (playerEditingNew) {
      mapDoc.players.push(editingPlayerDraft);
      if (!selectedPlayerId) selectedPlayerId = editingPlayerDraft.id;
    } else {
      var old = findPlayer(editingPlayerDraft.id);
      if (old) {
        var changedOwnerColor = old.color;
        Object.assign(old, editingPlayerDraft);
      }
    }
    markMapDirty();
    finishPlayerEdit();
    toast("✔ Игрок сохранён");
  });
  $("pl-cancel").addEventListener("click", finishPlayerEdit);

  /* Синхронизация значений в reslist обратно в массив (renderResList их пишет на input) */
  function syncResListFromDom(boxId, arr) {
    var rows = $(boxId).querySelectorAll(".resrow");
    for (var i = 0; i < rows.length && i < arr.length; i++) {
      var v = parseFloat(rows[i].querySelector(".rvalue").value.replace(",", "."));
      arr[i].value = isNaN(v) ? 0 : v;
    }
  }

  /* ---- Модальное окно: текстурпак ---- */
  function openPackModal() {
    var box = $("pack-list");
    box.innerHTML = "";
    var packs = allBuildingTexturepacks();
    if (packs.indexOf("default") === -1) packs.unshift("default");
    packs.forEach(function (p) {
      var nu = allUnits().filter(function (u) { return (u.texturepack || "default") === p; }).length;
      var nb = allBuildings().filter(function (b) { return (b.texturepack || "default") === p; }).length;
      var card = document.createElement("div");
      card.className = "card pack-card" + (mapDoc.texturepack === p ? " picked" : "");
      var ic = document.createElement("div");
      ic.className = "iconwrap";
      ic.textContent = "🎨";
      ic.style.fontSize = "24px";
      var mid = document.createElement("div");
      mid.className = "unit-mid";
      var nm = document.createElement("div");
      nm.className = "cname";
      nm.textContent = p;
      var su = document.createElement("div");
      su.className = "usummary";
      su.textContent = "🛡 юнитов: " + nu + " · 🏠 зданий: " + nb;
      mid.appendChild(nm); mid.appendChild(su);
      card.appendChild(ic); card.appendChild(mid);
      card.addEventListener("click", function () {
        mapDoc.texturepack = p;
        ensurePackSelection();
        markMapDirty();
        renderCtxBar();
        updateMapStatus();
        openPackModal();
        toast("🎨 Пак «" + p + "» выбран");
      });
      box.appendChild(card);
    });
    $("modal-pack").classList.remove("hidden");
  }
  $("btn-pack").addEventListener("click", openPackModal);
  $("pack-close").addEventListener("click", function () { $("modal-pack").classList.add("hidden"); });

  /* ---- Модальное окно: размер поля ---- */
  function openSizeModal() {
    $("size-w").value = mapDoc.width || 14;
    $("size-h").value = mapDoc.height || 10;
    $("modal-size").classList.remove("hidden");
  }
  $("btn-size").addEventListener("click", openSizeModal);
  $("size-cancel").addEventListener("click", function () { $("modal-size").classList.add("hidden"); });
  $("size-ok").addEventListener("click", function () {
    var w = Math.max(3, Math.min(120, Math.round(numVal("size-w", mapDoc.width || 14))));
    var h = Math.max(3, Math.min(120, Math.round(numVal("size-h", mapDoc.height || 10))));
    mapDoc.width = w; mapDoc.height = h;
    for (var q = 0; q < w; q++) for (var r = 0; r < h; r++) {
      var k = cellKey(q, r);
      if (!mapDoc.cells[k]) mapDoc.cells[k] = {};
    }
    markMapDirty();
    redraw();
    updateMapStatus();
    $("modal-size").classList.add("hidden");
    toast("Поле " + w + "×" + h);
  });

  /* ---- Просмотр игры (без геймплея) ---- */
  function startGameView() {
    if (!mapDoc) return;
    saveCurrentMap({ silent: true });
    lastPanStore[currentMapId] = { panX: panX, panY: panY, zoom: zoom };
    $("gv-title").textContent = "▶ " + (mapDoc.name || "Карта");
    var legend = $("gv-legend");
    legend.innerHTML = "";
    mapDoc.players.forEach(function (p) {
      var chip = document.createElement("span");
      chip.className = "legend-chip";
      var d = document.createElement("i");
      d.style.background = p.color;
      chip.appendChild(d);
      chip.appendChild(document.createTextNode(p.name));
      if (p.startResources && p.startResources.length) {
        var rs = p.startResources.map(function (c) {
          return fmtNum(c.value) + " " + resName(c.resourceId);
        }).join(", ");
        chip.appendChild(document.createTextNode(" (" + rs + ")"));
      }
      legend.appendChild(chip);
    });
    showScreen("gameview");
    renderMapSvg("gv-svg", mapDoc);
    setupGvPanZoom();
  }
  $("map-play").addEventListener("click", startGameView);

  var gvBound = false;
  function setupGvPanZoom() {
    if (gvBound) return;
    gvBound = true;
    var vp = $("gv-viewport");
    var gvs = $("gv-svg");
    var gp = 1, gz = 1, gptr = {}, ggest = null, gpinch = null;
    function gcenter() {
      var g = gvs.querySelector("g");
      if (!g) return;
      var tr = g.getAttribute("transform") || "";
      var m = /translate\(([-\d.]+),([-\d.]+)\)\s*scale\(([-\d.]+)\)/.exec(tr);
      if (m) { gp = +m[1]; gpy = +m[2]; gz = +m[3]; }
    }
    var gpy = 1;
    function gapply() {
      var g = gvs.querySelector("g");
      if (g) g.setAttribute("transform", "translate(" + gp + "," + gpy + ") scale(" + gz + ")");
    }
    vp.addEventListener("pointerdown", function (e) {
      gptr[e.pointerId] = { x: e.clientX, y: e.clientY };
      gcenter();
      if (Object.keys(gptr).length === 1) { ggest = "pan"; vp.setPointerCapture(e.pointerId); }
      else if (Object.keys(gptr).length === 2) {
        var ids = Object.keys(gptr), a = gptr[ids[0]], b = gptr[ids[1]];
        gpinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        ggest = "pinch";
      }
      e.preventDefault();
    });
    vp.addEventListener("pointermove", function (e) {
      if (!gptr[e.pointerId]) return;
      var px = gptr[e.pointerId].x, py = gptr[e.pointerId].y;
      gptr[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (ggest === "pan") { gp += e.clientX - px; gpy += e.clientY - py; gapply(); }
      else if (ggest === "pinch") {
        var ids = Object.keys(gptr);
        if (ids.length < 2) return;
        var a = gptr[ids[0]], b = gptr[ids[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y);
        gz = Math.max(0.35, Math.min(4, gcenterScale(gz, dist / Math.max(1, gpinch.dist))));
        gapply();
        gpinch.dist = dist;
      }
      e.preventDefault();
    });
    function gend(e) { delete gptr[e.pointerId]; if (!Object.keys(gptr).length) ggest = null; }
    vp.addEventListener("pointerup", gend);
    vp.addEventListener("pointercancel", gend);
    vp.addEventListener("wheel", function (e) {
      gcenter();
      gz = gcenterScale(gz, e.deltaY < 0 ? 1.12 : 0.89);
      gapply();
      e.preventDefault();
    }, { passive: false });
    function gcenterScale(z, f) { return Math.max(0.35, Math.min(4, z * f)); }
  }

  showScreen("main");
})();
