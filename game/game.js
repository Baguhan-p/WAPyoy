/* ===== HexCraft — логика меню и редактора ресурсов ===== */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  /* ================= Навигация между экранами ================= */
  var navStack = [];
  var PLACEHOLDERS = {
    "play":        ["▶ Играть", "Геймплей появится в следующей версии. Сейчас доступны редакторы ресурсов и юнитов!"],
    "load":        ["💾 Загрузить сохранение", "Сохранения появятся вместе с режимом игры."],
    "map-editor":  ["🗺 Редактор карт", "Редактор шестиугольных карт — в разработке. Там можно будет выбрать текстурпак — игра автоматически включит группу юнитов этого пака на время партии."],
    "celleditor":  ["⬡ Редактор клеток", "Редактор типов клеток-шестиугольников — в разработке."],
    "buildeditor": ["🏠 Редактор зданий", "Редактор зданий — в разработке."],
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
        inp.type = "number"; inp.step = "0.5"; inp.min = "0";
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

  showScreen("main");
})();
