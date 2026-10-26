# ============================================================================
# push-pullrequest.ps1 — push ветки v0.1 в GitHub и создание Pull Request
#
# Использование (Windows PowerShell):
#   1) Сохрани этот файл как C:\Users\aimo\Desktop\push-pullrequest.ps1
#   2) Открой PowerShell и выполни:
#        Set-ExecutionPolicy -Scope Process Bypass -Force
#        .\push-pullrequest.ps1
#      Скрипт спросит логин и пароль/токен — вводишь руками, больше не надо.
#
#或使用 уже сохранённых учётных данных (если входил через Credential Manager):
#   .\push-pullrequest.ps1 -UseSavedCreds
#
# Параметры по умолчанию совпадают с твоей ситуацией:
#   репо:    https://github.com/BlackAimo/hexcraft.git
#   ветка:   feature/v0.1-game-menu-resource-editor
#   base:    main
# ============================================================================

param(
    [string]$RepoUrl = "https://github.com/BlackAimo/hexcraft.git",
    [string]$Branch  = "feature/v0.1-game-menu-resource-editor",
    [string]$Base    = "main",
    [string]$Token   = "",          # PAT со scope "repo" — если задан, ввод руками не нужен
    [switch]$UseSavedCreds           # использовать Windows Credential Manager (git credential)
)

$ErrorActionPreference = "Stop"
$GameDir = Join-Path $env:USERPROFILE "Desktop\game"

if (-not (Test-Path (Join-Path $GameDir ".git"))) {
    Write-Host "В папке '$GameDir' нет git-репозитория (.git). Запусти сначала init-git.ps1" -ForegroundColor Red
    exit 1
}
Set-Location $GameDir

# ---------- 1. Убедиться, что всё закоммичено -------------------------------
$dirty = git status --porcelain
if ($dirty) {
    Write-Host "Есть незакоммиченные изменения — коммичу их:" -ForegroundColor Yellow
    Write-Host $dirty
    git add -A
    git commit -m "v0.1: mobile game menu + working resource editor" | Out-Null
} else {
    Write-Host "Рабочее дерево чистое, все файлы уже в коммите." -ForegroundColor Green
}

# ---------- 2. Проверка текущей ветки ---------------------------------------
$current = git rev-parse --abbrev-ref HEAD
if ($current -ne $Branch) {
    git branch -a | ForEach-Object { }
    if (git show-ref --verify --quiet ("refs/heads/" + $Branch)) {
        git checkout $Branch
    } else {
        Write-Host "Ветка '$Branch' не найдена. Текущая ветка: $current" -ForegroundColor Red
        Write-Host "Запусти со своей веткой:  .\push-pullrequest.ps1 -Branch $current" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host "Текущая ветка для пуша: $(git rev-parse --abbrev-ref HEAD)" -ForegroundColor Green

# ---------- 3. Remote ---------------------------------------------------------
$hasOrigin = git remote get-url origin 2>$null
if ($hasOrigin) {
    if ($hasOrigin -ne $RepoUrl) { git remote set-url origin $RepoUrl }
} else {
    git remote add origin $RepoUrl
}

# ---------- 4. Push -----------------------------------------------------------
if ($Token) {
    # Пуш с токеном прямо в URL (учётки при этом не трогаются)
    $u = [Uri]$RepoUrl
    $authUrl = "$($u.Scheme)://x-access-token:$Token@$($u.Host)$($u.PathAndQuery)"
    git push -u $authUrl $Branch
} elseif ($UseSavedCreds) {
    # Git сам подхватит логин/пароль из Windows Credential Manager
    git push -u origin $Branch
} else {
    # Интерактивный ввод логина и пароля/токена (сохранятся в Credential Manager)
    Write-Host "`n--- Введи данные GitHub (сохранятся в менеджере паролей Windows) ---" -ForegroundColor Cyan
    $login = Read-Host "GitHub login"
    $secret = Read-Host "Password или Personal Access Token (скрыто)" -AsSecureString
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret))
    $u = [Uri]$RepoUrl
    $escapedLogin = [Uri]::EscapeDataString($login)
    $escapedSecret = [Uri]::EscapeDataString($plain)
    $authUrl = "$($u.Scheme)://${escapedLogin}:${escapedSecret}@$($u.Host)$($u.PathAndQuery)"
    git push -u $authUrl $Branch
    # Чистим след токена из вывода/конфига: remote оставляем обычный
    git remote set-url origin $RepoUrl
}

Write-Host "`n✅ Ветка '$Branch' отправлена в $RepoUrl" -ForegroundColor Green

# ---------- 5. Pull Request ---------------------------------------------------
# Вариант А: установлен GitHub CLI (gh) — PR создаётся автоматически
$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
    Write-Host "Обнаружен GitHub CLI — создаю Pull Request..." -ForegroundColor Cyan
    gh pr create --repo BlackAimo/hexcraft --head $Branch --base $Base `
        --title "v0.1: игровое мобильное меню + редактор ресурсов" `
        --body "Главное меню (Играть / Загрузить сохранение / Редактор карт / Редактор модов / Об игре), редактор модов, рабочий редактор ресурсов: стандартные ресурсы защищены от изменения, картинки игрока хранятся локально в base64 (работает после экспорта в APK/EXE)."
    exit 0
}

# Вариант Б: открываем страницу создания PR в браузере (данные предзаполнятся)
$encBranch = [Uri]::EscapeDataString($Branch)
$prUrl = "$RepoUrl/pull/new/$encBranch"
Write-Host "`nGitHub CLI (gh) не найден. Открываю страницу создания Pull Request в браузере:" -ForegroundColor Yellow
Write-Host $prUrl -ForegroundColor White
Write-Host "Там выбери base-ветку '$Base', нажми 'Create pull request'." -ForegroundColor Yellow
Start-Process $prUrl
