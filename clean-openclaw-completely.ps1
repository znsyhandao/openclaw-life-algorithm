<#
.SYNOPSIS
OpenClaw 清理脚本 - 保留用户配置和记忆
.DESCRIPTION
这个脚本会删除所有 OpenClaw 的 npm 模块和系统残留，
但保留 %USERPROFILE%\.openclaw 目录下的所有配置和记忆。
#>

# 需要管理员权限
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ 请以管理员身份运行此脚本！" -ForegroundColor Red
    exit 1
}

Write-Host "🧹 OpenClaw 清理脚本（保留配置）开始..." -ForegroundColor Cyan
Write-Host "⚠️ 将保留您的配置和记忆：$env:USERPROFILE\.openclaw" -ForegroundColor Green
$confirm = Read-Host "确定要继续吗？(y/N)"
if ($confirm -ne 'y') { exit }

$totalSteps = 7
$currentStep = 0

# 1. 停止所有可能相关的进程
$currentStep++
Write-Host "`n[$currentStep/$totalSteps] 停止相关进程..." -ForegroundColor Yellow
$processes = @("openclaw", "node", "npm", "git")
foreach ($p in $processes) {
    Get-Process -Name $p -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ 已终止 $p 进程" -ForegroundColor Green
}

# 2. 删除 npm 全局模块
$currentStep++
Write-Host "`n[$currentStep/$totalSteps] 删除 npm 全局模块..." -ForegroundColor Yellow
$npmPaths = @(
    "$env:APPDATA\npm\node_modules\openclaw",
    "$env:APPDATA\npm\node_modules\clawdbot",
    "$env:APPDATA\npm\node_modules\moltbot",
    "$env:USERPROFILE\.npm-global\node_modules\openclaw",
    "$env:USERPROFILE\.npm-global\node_modules\clawdbot",
    "$env:USERPROFILE\.npm-global\node_modules\moltbot"
)
foreach ($path in $npmPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host "  ✅ 删除: $path" -ForegroundColor Green
    }
}

# 3. 删除 npm 全局可执行文件
$currentStep++
Write-Host "`n[$currentStep/$totalSteps] 删除 npm 全局可执行文件..." -ForegroundColor Yellow
$npmBinPaths = @(
    "$env:APPDATA\npm\openclaw*",
    "$env:APPDATA\npm\clawdbot*",
    "$env:APPDATA\npm\moltbot*",
    "$env:USERPROFILE\.npm-global\openclaw*",
    "$env:USERPROFILE\.npm-global\clawdbot*",
    "$env:USERPROFILE\.npm-global\moltbot*"
)
foreach ($pattern in $npmBinPaths) {
    Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -Force $_.FullName -ErrorAction SilentlyContinue
        Write-Host "  ✅ 删除: $($_.FullName)" -ForegroundColor Green
    }
}

# 4. 【跳过】删除用户配置目录 - 保留记忆！
$currentStep++
Write-Host "`n[$currentStep/$totalSteps] 保留用户配置目录: $env:USERPROFILE\.openclaw" -ForegroundColor Green

# 5. 删除系统程序目录
$currentStep++
Write-Host "`n[$currentStep/$totalSteps] 删除系统程序目录..." -ForegroundColor Yellow
$programPaths = @(
    "C:\Program Files\OpenClaw",
    "C:\Program Files\Clawdbot",
    "C:\Program Files\Moltbot",
    "C:\Program Files (x86)\OpenClaw",
    "C:\Program Files (x86)\Clawdbot",
    "C:\Program Files (x86)\Moltbot"
)
foreach ($path in $programPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host "  ✅ 删除: $path" -ForegroundColor Green
    }
}

# 6. 清理注册表（可选，谨慎）
$currentStep++
Write-Host "`n[$currentStep/$totalSteps] 清理注册表..." -ForegroundColor Yellow
$regPaths = @(
    "HKLM:\SOFTWARE\OpenClaw",
    "HKLM:\SOFTWARE\Clawdbot",
    "HKLM:\SOFTWARE\Moltbot",
    "HKCU:\SOFTWARE\OpenClaw",
    "HKCU:\SOFTWARE\Clawdbot",
    "HKCU:\SOFTWARE\Moltbot"
)
foreach ($regPath in $regPaths) {
    if (Test-Path $regPath) {
        Remove-Item -Recurse -Force $regPath -ErrorAction SilentlyContinue
        Write-Host "  ✅ 删除注册表: $regPath" -ForegroundColor Green
    }
}

# 7. 清理 npm 缓存
$currentStep++
Write-Host "`n[$currentStep/$totalSteps] 清理 npm 缓存..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "  ✅ npm 缓存已清理" -ForegroundColor Green

Write-Host "`n🎉 清理完成！您的配置和记忆已保留：" -ForegroundColor Cyan
Write-Host "   📁 $env:USERPROFILE\.openclaw" -ForegroundColor Green
Write-Host "`n💡 现在可以重新安装 OpenClaw 了" -ForegroundColor White
Write-Host "   推荐命令: npm install -g openclaw@latest --registry=https://registry.npmmirror.com" -ForegroundColor Yellow
Write-Host "   安装后您的配置和记忆将自动被新版本使用" -ForegroundColor Green