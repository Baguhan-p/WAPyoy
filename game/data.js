/* ===== HexCraft — встроенные данные игры =====
 * Стандартные картинки и ресурсы неизменяемы (readonly).
 * Свои картинки пользователь добавляет через редактор (localStorage, base64).
 */
(function () {
  "use strict";

  window.HCData = {
    /* Встроенные картинки. id — стабильный ключ, src — путь в assets/images/
     * Чтобы добавить свои встроенные картинки в репозиторий:
     *   game/assets/images/<имя>.png  и зарегистрировать её здесь. */
    builtinImages: [
      { id: "img_gold_coin", name: "Золотая монета", src: "assets/images/gold_coin.png" },
      { id: "img_gold_bar",  name: "Золотой слиток", src: "assets/images/gold_bar.png"  },
      /* Картинки юнитов — game/assets/images/<файл>.png */
      { id: "img_ww2_peasant",   name: "ww2_peasant",   src: "assets/images/ww2_peasant.png"   },
      { id: "img_ww2_warrior1",  name: "ww2_warrior1",  src: "assets/images/ww2_warrior1.png"  },
      { id: "img_ww2_warrior2",  name: "ww2_warrior2",  src: "assets/images/ww2_warrior2.png"  },
      { id: "img_ww2_warrior3",  name: "ww2_warrior3",  src: "assets/images/ww2_warrior3.png"  },
      { id: "img_light_tank1",   name: "light_tank1",   src: "assets/images/light_tank1.png"   },
      { id: "img_light_tank2",   name: "light_tank2",   src: "assets/images/light_tank2.png"   }
    ],

    /* Стандартные ресурсы (заготовки: название + картинка). readonly = true. */
    defaultResources: [
      { id: "res_gold",  name: "Золото",   imageId: "img_gold_coin", readonly: true }
    ],

    /* ===== Параметры юнита (описания для формы редактора) =====
     * def — значение по умолчанию, kind — тип поля. */
    unitParamDefs: [
      { key: "armor",              label: "Уровень защиты",
        hint: "0 — ничего не защищает. Юнит с защитой N не может быть уничтожен юнитами с защитой ≤ N (дробные значения: 1.5, 1.6...).",
        kind: "number", step: "0.1", min: "0", def: 0 },
      { key: "areaProtect",        label: "Защита по области",
        hint: "Если да — юниты с защитой ниже его не могут войти в область радиуса R вокруг него.",
        kind: "bool", def: false },
      { key: "areaSize",           label: "Радиус области (кольца шестиугольников)",
        hint: "1 = соседние клетки, 2 = два кольца и т.д.",
        kind: "number", step: "1", min: "1", def: 1, dependsOn: "areaProtect" },
      { key: "canKillSameArmor",   label: "Может убить юнит того же уровня защиты",
        hint: "Если нет — юнит с такой же защитой не может быть им уничтожен.",
        kind: "bool", def: false },
      { key: "canEnterSameArea",   label: "Может войти в область юнита своего уровня",
        hint: "Актуально при «Защите по области»: если нет — одноуровневые юниты обходят зону друг друга.",
        kind: "bool", def: false, dependsOn: "areaProtect" },
      { key: "costGrow",           label: "Стоимость растёт при покупке",
        hint: "После покупки цена на этого юнита увеличивается (на сколько — см. поле ниже).",
        kind: "bool", def: false },
      { key: "costShrinkOnKill",   label: "Стоимость уменьшается при уничтожении врагом",
        hint: "Когда этот юнит уничтожают, его цена снижается (на сколько — см. поле ниже).",
        kind: "bool", def: false },
      { key: "costDelta",          label: "Δ стоимости за событие (покупка / уничтожение)",
        hint: "Насколько меняется стоимость каждого ресурса из цены юнита.",
        kind: "number", step: "0.5", min: "0", def: 0, dependsOnAny: ["costGrow", "costShrinkOnKill"] },
      { key: "upkeepEnabled",      label: "Юнит потребляет ресурсы каждый ход",
        hint: "Включите и укажите норму расхода на одного юнита за ход.",
        kind: "bool", def: false },
      { key: "upkeep",             label: "Расход ресурсов за ход",
        hint: "Сколько юнит тратит каждого выбранного ресурса каждый ход.",
        kind: "list", dependsOn: "upkeepEnabled" },
      { key: "dieOnEmpty",         label: "Юнит умирает, если один из его ресурсов закончился",
        kind: "bool", def: false },
      { key: "texturepack",        label: "Текстурпак",
        hint: "В редакторе карт выбор текстурпака автоматически включает группу юнитов этой темы на время партии.",
        kind: "text", def: "default" }
    ],

    /* Краткая сводка параметров для карточки юнита в списке */
    armorLabels: function (u) {
      var parts = [];
      parts.push("🛡 " + u.armor);
      if (u.areaProtect) parts.push("область " + u.areaSize);
      return parts.join(" · ");
    },

    /* ===== Стандартные юниты (readonly = true, изменять нельзя) ===== */
    defaultUnits: [
      {
        id: "unit_peasant", name: "Ополченец", imageId: "img_ww2_peasant",
        texturepack: "ww2", readonly: true,
        armor: 1, areaProtect: true, areaSize: 1,
        canKillSameArmor: false, canEnterSameArea: false,
        cost: [{ resourceId: "res_gold", value: 10 }],
        costGrow: false, costShrinkOnKill: false, costDelta: 0,
        upkeepEnabled: true, upkeep: [{ resourceId: "res_gold", value: 3 }],
        dieOnEmpty: true
      },
      {
        id: "unit_warrior1", name: "Воин I", imageId: "img_ww2_warrior1",
        texturepack: "ww2", readonly: true,
        armor: 2, areaProtect: true, areaSize: 1,
        canKillSameArmor: false, canEnterSameArea: false,
        cost: [{ resourceId: "res_gold", value: 20 }],
        costGrow: false, costShrinkOnKill: false, costDelta: 0,
        upkeepEnabled: true, upkeep: [{ resourceId: "res_gold", value: 7 }],
        dieOnEmpty: true
      },
      {
        id: "unit_warrior2", name: "Воин II", imageId: "img_ww2_warrior2",
        texturepack: "ww2", readonly: true,
        armor: 3, areaProtect: true, areaSize: 1,
        canKillSameArmor: false, canEnterSameArea: false,
        cost: [{ resourceId: "res_gold", value: 30 }],
        costGrow: false, costShrinkOnKill: false, costDelta: 0,
        upkeepEnabled: true, upkeep: [{ resourceId: "res_gold", value: 15 }],
        dieOnEmpty: true
      },
      {
        id: "unit_light_tank", name: "Лёгкий танк", imageId: "img_light_tank1",
        texturepack: "ww2", readonly: true,
        armor: 4, areaProtect: true, areaSize: 1,
        canKillSameArmor: true, canEnterSameArea: true,
        cost: [{ resourceId: "res_gold", value: 40 }],
        costGrow: false, costShrinkOnKill: false, costDelta: 0,
        upkeepEnabled: true, upkeep: [{ resourceId: "res_gold", value: 31 }],
        dieOnEmpty: true
      }
    ]
  };

  /* Разрешение картинки в отображаемый вид (src или emoji-плитка) */
  window.HCImage = {
    /* Возвращает объект {src} или {emoji,color} для рендера */
    resolve: function (imageId) {
      var b = HCData.builtinImages;
      for (var i = 0; i < b.length; i++) {
        if (b[i].id === imageId) return b[i];
      }
      var c = HCStorage.findImage(imageId);
      if (c) return { id: c.id, name: c.name, src: c.dataUrl, custom: true };
      return null;
    },

    /* Рендер картинки в существующий <img> или плитку div */
    renderInto: function (el, imageId, fallbackText) {
      var def = this.resolve(imageId);
      el.innerHTML = "";
      if (!def) {
        el.textContent = fallbackText || "нет картинки";
        return;
      }
      if (def.src) {
        var img = document.createElement("img");
        img.src = def.src;
        img.alt = def.name || "";
        img.draggable = false;
        el.appendChild(img);
      } else {
        var tile = document.createElement("div");
        tile.className = "emoji-tile";
        tile.style.background = def.color || "#333";
        tile.textContent = def.emoji || "❓";
        el.appendChild(tile);
      }
    },

    /* Все картинки вместе: встроенные + пользовательские */
    all: function () {
      return HCData.builtinImages.concat(
        HCStorage.getImages().map(function (i) {
          return { id: i.id, name: i.name, src: i.dataUrl, custom: true };
        })
      );
    }
  };
})();
