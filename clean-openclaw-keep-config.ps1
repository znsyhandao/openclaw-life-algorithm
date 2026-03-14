<#
.SYNOPSIS
OpenClaw 环境健康检查脚本
.DESCRIPTION
检查Node.js版本、npm配置、编译工具、Git、以及OpenClaw残留，
为可靠安装提供依据。
#>
# ==================== 自动放行（仅当前进程）====================
Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope Process -Force

Write-Host "`n🔍 OpenClaw 环境健康检查开始..." -ForegroundColor Cyan
$global:passCount = 0
$global:failCount = 0

# 1. 检查 Node.js 版本
Write-Host "`n[1/6] 检查 Node.js 版本..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $versionNumber = [version]($nodeVersion -replace 'v', '')
    if ($versionNumber -ge [version]"22.0.0") {
        Write-Host "  ✅ Node.js 版本 $nodeVersion (满足要求)" -ForegroundColor Green
        $global:passCount++
    } else {
        Write-Host "  ❌ Node.js 版本 $nodeVersion 过低，需要 >=22" -ForegroundColor Red
        Write-Host "     建议: 访问 https://nodejs.org 下载 LTS 版" -ForegroundColor Yellow
        $global:failCount++
    }
} catch {
    Write-Host "  ❌ Node.js 未安装或无法运行" -ForegroundColor Red
    Write-Host "     建议: 访问 https://nodejs.org 下载 LTS 版" -ForegroundColor Yellow
    $global:failCount++
}

# 2. 检查 npm 镜像源
Write-Host "`n[2/6] 检查 npm 镜像源..." -ForegroundColor Yellow
try {
    $registry = npm config get registry
    if ($registry -like "https://registry.npmmirror.com*") {
        Write-Host "  ✅ npm 镜像源已配置为国内源 ($registry)" -ForegroundColor Green
        $global:passCount++
    } else {
        Write-Host "  ⚠️ npm 当前源: $registry" -ForegroundColor Yellow
        Write-Host "     建议: 运行 'npm config set registry https://registry.npmmirror.com' 加速下载" -ForegroundColor Yellow
        $global:failCount++  # 作为警告，但不强制阻止安装
    }
} catch {
    Write-Host "  ❌ npm 命令不可用" -ForegroundColor Red
    $global:failCount++
}

# 3. 检查编译工具 (Windows)
Write-Host "`n[3/6] 检查 Windows 编译工具..." -ForegroundColor Yellow
if ($env:OS -match "Windows") {
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vsWhere) {
        # 先检查 2026 版（你的实际安装路径）
        $vsPath2026 = "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools"
        if (Test-Path $vsPath2026) {
            Write-Host "  ✅ Visual Studio 编译工具已安装 (2026版)" -ForegroundColor Green
            $global:passCount++
        } else {
            # 再试试 2022 版
            $vsPath2022 = & $vsWhere -latest -property installationPath
            if ($vsPath2022) {
                Write-Host "  ✅ Visual Studio 编译工具已安装" -ForegroundColor Green
                $global:passCount++
            } else {
                Write-Host "  ❌ 未找到 Visual Studio 编译工具" -ForegroundColor Red
                Write-Host "     建议: 以管理员身份运行 'winget install --id Microsoft.VisualStudio.2022.BuildTools --force'" -ForegroundColor Yellow
                $global:failCount++
            }
        }
    } else {
        Write-Host "  ❌ 未找到 Visual Studio 编译工具" -ForegroundColor Red
        Write-Host "     建议: 以管理员身份运行 'winget install --id Microsoft.VisualStudio.2022.BuildTools --force'" -ForegroundColor Yellow
        $global:failCount++
    }
} else {
    Write-Host "  ⏭️ 非 Windows 系统，跳过编译工具检查" -ForegroundColor Gray
}

# 4. 检查 Git
Write-Host "`n[4/6] 检查 Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "  ✅ Git 已安装: $gitVersion" -ForegroundColor Green
    $global:passCount++
    
    # 检查 Git 配置（是否已替换 SSH 为 HTTPS）
    $gitConfig = git config --global --get url."https://github.com/".insteadOf
    if ($gitConfig -eq "git@github.com:") {
        Write-Host "  ✅ Git 已配置为 HTTPS 方式拉取代码" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Git 可能仍使用 SSH 协议，建议配置: 'git config --global url.'https://github.com/'.insteadOf git@github.com:'" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Git 未安装或无法运行" -ForegroundColor Red
    Write-Host "     建议: 从 https://git-scm.com 下载安装" -ForegroundColor Yellow
    $global:failCount++
}

# 5. 检查 OpenClaw 残留
Write-Host "`n[5/6] 检查 OpenClaw 残留..." -ForegroundColor Yellow
$openclawPaths = @(
    "$env:USERPROFILE\.openclaw",
    "$env:USERPROFILE\.npm-global\node_modules\openclaw",
    "$env:APPDATA\npm\node_modules\openclaw"
)
$found = $false
foreach ($path in $openclawPaths) {
    if (Test-Path $path) {
        Write-Host "  ⚠️ 发现残留目录: $path" -ForegroundColor Yellow
        $found = $true
    }
}
if ($found) {
    Write-Host "     建议: 如需全新安装，请删除上述残留目录" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ 未发现 OpenClaw 残留目录" -ForegroundColor Green
}

# 6. 检查 npm 全局包冲突
Write-Host "`n[6/6] 检查 npm 全局包冲突..." -ForegroundColor Yellow
$conflicts = @("openclaw", "clawdbot", "moltbot")
$foundConflict = $false
foreach ($pkg in $conflicts) {
    $result = npm list -g --depth=0 2>$null | Select-String $pkg
    if ($result) {
        Write-Host "  ⚠️ 发现可能冲突的全局包: $pkg" -ForegroundColor Yellow
        $foundConflict = $true
    }
}
if (-not $foundConflict) {
    Write-Host "  ✅ 未发现冲突的全局包" -ForegroundColor Green
}

# 总结
Write-Host "`n📊 检查完成: 通过 $global:passCount 项, 失败 $global:failCount 项" -ForegroundColor Cyan
if ($global:failCount -eq 0) {
    Write-Host "✅ 环境看起来不错，可以开始安装 OpenClaw 了！" -ForegroundColor Green
    Write-Host "   推荐命令: npm install -g openclaw@latest --registry=https://registry.npmmirror.com" -ForegroundColor White
} else {
    Write-Host "❌ 环境存在 $global:failCount 个问题，请按建议修复后重试。" -ForegroundColor Red
}