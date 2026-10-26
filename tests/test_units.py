import base64, json, sys
from playwright.sync_api import sync_playwright

PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
    "AAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

URL = "http://localhost:8123/index.html"
passed = 0
failed = []

def check(name, cond):
    global passed
    if cond:
        passed += 1
    else:
        failed.append(name)
        print("FAIL:", name)

with sync_playwright() as p:
    import os
    EXE="/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome"
    b = p.chromium.launch(executable_path=EXE, args=["--no-sandbox","--disable-dev-shm-usage"])
    pg = b.new_page(viewport={"width": 420, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    dialogs = []
    pg.on("dialog", lambda d: (dialogs.append(d.message), d.accept()))
    pg.goto(URL)

    # --- главное меню -> редактор модов ---
    check("main menu visible", pg.is_visible("#screen-main"))
    pg.click('[data-nav="mod-editor"]')
    check("mod editor visible", pg.is_visible("#screen-modeditor"))

    # --- редактор юнитов ---
    pg.click('[data-nav="uniteditor"]')
    check("unit editor visible", pg.is_visible("#screen-uniteditor"))
    cards = pg.locator("#unit-list .card")
    check("4 default units listed", cards.count() == 4)
    names = [cards.nth(i).locator(".cname").text_content() for i in range(4)]
    check("unit names", names == ["Ополченец", "Воин I", "Воин II", "Лёгкий танк"])
    summ0 = cards.nth(0).locator(".usummary").text_content()
    check("peasant summary armor/cost/upkeep",
          "🛡 1" in summ0 and "💰 10 Золото" in summ0 and "⚙ 3/ход" in summ0 and "зона 1" in summ0)
    summ3 = cards.nth(3).locator(".usummary").text_content()
    check("tank summary 4/40/31", "🛡 4" in summ3 and "💰 40" in summ3 and "⚙ 31/ход" in summ3)
    locks = pg.locator("#unit-list .lock")
    check("all 4 defaults locked", locks.count() == 4)
    pack_opt = pg.locator("#unit-pack-filter option")
    vals = [pack_opt.nth(i).text_content() for i in range(pack_opt.count())]
    check("pack filter has ww2", any("ww2" in v for v in vals))

    # --- readonly стандартного юнита ---
    cards.nth(0).click()
    check("unit form opened", pg.is_visible("#screen-unitedit"))
    check("readonly title", "Стандартный юнит" in pg.text_content("#unitedit-title"))
    check("name readonly", pg.eval_on_selector("#unit-name", "e=>e.readOnly"))
    check("save disabled", pg.eval_on_selector("#unitedit-save", "e=>e.disabled"))
    check("delete hidden", not pg.is_visible("#unitedit-delete"))
    check("area fields shown (areaProtect on)", pg.is_visible("#area-fields"))
    check("armor value 1", pg.input_value("#unit-armor") == "1")
    check("tank unit: kill-same off for peasant", not pg.eval_on_selector("#unit-kill-same", "e=>e.checked"))
    pg.click('[data-nav="uniteditor-back"]')
    check("back to unit list", pg.is_visible("#screen-uniteditor"))

    # 4-й юнит: может убить и войти в область своего уровня
    pg.locator("#unit-list .card").nth(3).click()
    check("tank kill-same on", pg.eval_on_selector("#unit-kill-same", "e=>e.checked"))
    check("tank enter-same-area on", pg.eval_on_selector("#unit-enter-same", "e=>e.checked"))
    check("tank armor 4", pg.input_value("#unit-armor") == "4")
    pg.click('[data-nav="uniteditor-back"]')

    # --- фильтр по паку ---
    def pick_pack(label):
        val = pg.evaluate("""(lbl)=>{var s=document.getElementById('unit-pack-filter');
            for (var i=0;i<s.options.length;i++) if (s.options[i].textContent.indexOf(lbl)>=0) return s.options[i].value;
            return null;}""", label)
        assert val is not None, "no option "+label
        pg.select_option("#unit-pack-filter", val)
    pick_pack("ww2")
    check("ww2 filter shows 4", pg.locator("#unit-list .card").count() == 4)
    pick_pack("Все паки")
    check("all filter shows 4", pg.locator("#unit-list .card").count() == 4)

    # --- создание своего юнита ---
    pg.click("#btn-new-unit")
    check("new unit form", pg.is_visible("#screen-unitedit"))
    check("subfields hidden initially", not pg.is_visible("#area-fields") and not pg.is_visible("#upkeep-fields"))
    pg.fill("#unit-name", "Тестовый юнит")
    pg.fill("#unit-armor", "1.5")

    # картинка через модалку выбора + загрузка файла
    pg.click("#unit-pickimg")
    check("img picker open", pg.is_visible("#modal-imgpicker"))
    pg.set_input_files("#file-image2", files=[{"name":"my_unit.png","mimeType":"image/png","buffer":PNG_1PX}])
    pg.wait_for_timeout(500)
    check("picker closed after upload", not pg.is_visible("#modal-imgpicker"))
    prev_img = pg.eval_on_selector("#unitedit-preview img", "e=>e.src") if pg.locator("#unitedit-preview img").count() else ""
    check("preview uses uploaded dataURL", prev_img.startswith("data:image"))

    # область защиты
    pg.check("#unit-area-protect")
    check("area fields appear", pg.is_visible("#area-fields"))
    pg.fill("#unit-area-size", "2")
    pg.uncheck("#unit-area-protect")
    check("area fields hide", not pg.is_visible("#area-fields"))
    pg.check("#unit-area-protect")

    # стоимость: добавить ресурс
    pg.click("#unit-add-cost")
    check("res picker open", pg.is_visible("#modal-respicker"))
    pg.locator("#respicker-list .card").first.click()
    check("cost row added", pg.locator("#unit-cost-list .resrow").count() == 1)
    pg.fill("#unit-cost-list .rvalue", "55")

    # рост стоимости при покупке + delta
    pg.check("#unit-cost-grow")
    check("delta field appears", pg.is_visible("#cost-delta-fields"))
    pg.fill("#unit-cost-delta", "2.5")

    # расход за ход
    pg.check("#unit-upkeep-enabled")
    check("upkeep fields appear", pg.is_visible("#upkeep-fields"))
    pg.click("#unit-add-upkeep")
    pg.locator("#respicker-list .card").first.click()
    pg.fill("#unit-upkeep-list .rvalue", "4")
    pg.check("#unit-die-on-empty")

    # текстурпак
    pg.fill("#unit-texturepack", "mypack")

    pg.click("#unitedit-save")
    pg.wait_for_timeout(300)
    _t = pg.text_content("#toast") or ""
    _scr = pg.evaluate("document.querySelector('.screen.active').id")
    _vis = pg.evaluate("""()=>{var r={};['unit-name','unitedit-save','unit-add-cost'].forEach(id=>{var e=document.getElementById(id);r[id]={dis:e.disabled,val:e.value};});return r;}\"\"\".replace('\"\"\"','"""'))
    if "сохранён" not in _t: print("   DEBUG toast:", _t, "| screen:", _scr, "| fields:", _vis, "| errors:", errors)
    check("saved toast", "сохранён" in _t)
    check("back at unit list", pg.is_visible("#screen-uniteditor"))
    check("5 units now", pg.locator("#unit-list .card").count() == 5)
    my = pg.locator("#unit-list .card").nth(4)
    ms = my.text_content()
    check("custom card content", "Тестовый юнит" in ms and "🛡 1,5" in ms and "55" in ms and "mypack" in ms)
    check("custom not locked", pg.locator("#unit-list .lock").count() == 4)

    # localStorage структура
    stored = pg.evaluate("JSON.parse(localStorage['hexcraft.units'])")
    u = stored[0]
    check("stored armor 1.5", u["armor"] == 1.5)
    check("stored cost", u["cost"] == [{"resourceId": "res_gold", "value": 55}])
    check("stored upkeep", u["upkeepEnabled"] and u["upkeep"][0]["value"] == 4)
    check("stored area", u["areaProtect"] and u["areaSize"] == 2)
    check("stored grow/delta", u["costGrow"] and u["costDelta"] == 2.5)
    check("stored dieOnEmpty", u["dieOnEmpty"])
    check("stored texturepack", u["texturepack"] == "mypack")
    check("stored image dataURL", str(u["imageId"]).startswith("cust_"))
    imgs = pg.evaluate("JSON.parse(localStorage['hexcraft.images'])")
    check("custom image persisted base64", len(imgs) == 1 and imgs[0]["dataUrl"].startswith("data:image/png"))

    # фильтр по новому паку
    pick_pack("mypack")
    check("mypack filter shows 1", pg.locator("#unit-list .card").count() == 1)
    pick_pack("Все паки")

    # редактирование своего: переименование без дубля
    my.click()
    check("custom form editable", not pg.eval_on_selector("#unitedit-save", "e=>e.disabled"))
    check("custom delete visible", pg.is_visible("#unitedit-delete"))
    pg.fill("#unit-name", "Переименованный")
    pg.click("#unitedit-save")
    check("renamed saved", "Переименованный" in pg.text_content("#unit-list"))
    check("still 5 units (no dup)", pg.locator("#unit-list .card").count() == 5)

    # удаление картинки, занятой юнитом, блокируется
    pg.click('[data-nav="modeditor"]')
    pg.click('[data-nav="reseditor"]')
    pg.click('.tab[data-tab="images"]')
    del_btn = pg.locator("#image-list .imgcell .del")
    check("custom image has del btn", del_btn.count() == 1)
    del_btn.first.click()
    pg.wait_for_timeout(200)
    toast_txt = pg.text_content("#toast")
    check("image deletion blocked by unit", "использует юнит" in toast_txt)

    # удаление своего юнита (диалог confirm принимается автоматически)
    pg.click('[data-nav="modeditor"]')
    pg.click('[data-nav="uniteditor"]')
    pg.locator("#unit-list .card").nth(4).click()
    pg.click("#unitedit-delete")
    pg.wait_for_timeout(300)
    check("unit deleted -> 4", pg.is_visible("#screen-uniteditor") and pg.locator("#unit-list .card").count() == 4)

    # теперь картинку можно удалить
    pg.click('[data-nav="modeditor"]')
    pg.click('[data-nav="reseditor"]')
    pg.click('.tab[data-tab="images"]')
    if pg.locator("#image-list .imgcell .del").count():
        pg.locator("#image-list .imgcell .del").first.click()
        pg.wait_for_timeout(300)
    check("image deleted after unit removal", pg.locator("#image-list .imgcell .del").count() == 0)

    # ресурсы: эмодзи-заготовок больше нет
    rc = pg.locator("#resource-list .card").count()
    check("only 1 default resource (gold)", rc == 1)
    ic = pg.locator("#image-list .imgcell").count()
    check("builtin images = 8 (2 gold + 6 units)", ic == 8)
    emoji_tiles = pg.locator("#image-list .emoji-tile").count()
    check("no emoji tiles anywhere in images tab", emoji_tiles == 0)

    # персистентность после перезагрузки
    pg.click('[data-nav="modeditor"]')
    pg.click('[data-nav="uniteditor"]')
    pg.click("#btn-new-unit")
    pg.fill("#unit-name", "После ребута")
    pg.click("#unit-add-cost")
    pg.locator("#respicker-list .card").first.click()
    pg.click("#unitedit-save")
    pg.reload()
    pg.wait_for_selector("#screen-main")
    pg.click('[data-nav="mod-editor"]')
    pg.click('[data-nav="uniteditor"]')
    txt = pg.text_content("#unit-list")
    check("custom unit persists after reload", "После ребута" in txt)

    check("no page JS errors", not errors)
    if errors: print("ERRORS:", errors)

    b.close()

print(f"\nPASSED {passed}, FAILED {len(failed)}")
sys.exit(1 if failed else 0)
