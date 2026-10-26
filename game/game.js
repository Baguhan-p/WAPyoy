/* ===== HexCraft — логика меню и редактора ресурсов ===== */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  /* ================= Навигация между экранами ================= */
  var navStack = [];
  var PLACEHOLDERS = {
    "play":        ["▶ Играть", "Геймплей появится в следующей версии. Сейчас доступен редактор ресурсов!"],
    "load":        ["💾 Загрузить сохранение", "Сохранения появятся вместе с режимом игры."],
    "map-editor":  ["🗺 Редактор карт", "Редактор шестиугольных карт — в разработке."],
    "celleditor":  ["⬡ Редактор клеток", "Редактор типов клеток-шестиугольников — в разработке."],
    "uniteditor":  ["🛡 Редактор юнитов", "Редактор юнитов — в разработке."],
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
    else showScreen(prev || "main");
  }

  /* Кнопки навигации (делегирование) */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-nav]");
    if (!btn) return;
    var nav = btn.getAttribute("data-nav");
    if (nav === "back-ph") { goBack(); return; }
    if (nav === "reseditor-back") { goBack("reseditor"); return; }
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
    // нельзя удалить картинку, которую использует свой ресурс
    var used = HCStorage.getResources().filter(function (r) { return r.imageId === id; });
    if (used.length > 0) {
      toast("⚠ Картинку использует ресурс «" + used[0].name + "» — сначала замените её у ресурса");
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

  /* ================= Открытие редактора ================= */
  function openResourceEditor() {
    renderResourceList();
    renderImageList();
    showScreen("reseditor");
  }

  showScreen("main");
})();
