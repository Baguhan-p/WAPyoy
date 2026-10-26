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
      { id: "img_wood",      name: "Древесина",      emoji: "🪵", color: "#8d6e3a" },
      { id: "img_stone",     name: "Камень",         emoji: "🪨", color: "#7c8490" },
      { id: "img_food",      name: "Еда",            emoji: "🌾", color: "#c9a53f" },
      { id: "img_crystal",   name: "Кристалл",       emoji: "💎", color: "#4fc3f7" }
    ],

    /* Стандартные ресурсы (заготовки: название + картинка). readonly = true. */
    defaultResources: [
      { id: "res_gold",  name: "Золото",   imageId: "img_gold_coin", readonly: true },
      { id: "res_wood",  name: "Древесина", imageId: "img_wood",   readonly: true },
      { id: "res_stone", name: "Камень",    imageId: "img_stone",  readonly: true },
      { id: "res_food",  name: "Еда",       imageId: "img_food",   readonly: true },
      { id: "res_crystal", name: "Кристаллы", imageId: "img_crystal", readonly: true }
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
