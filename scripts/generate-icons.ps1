Add-Type -AssemblyName System.Drawing

function New-Icon {
    param(
        [int]$Size,
        [string]$Path,
        [double]$Padding,
        [bool]$Rounded
    )
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $navyDeep = [System.Drawing.Color]::FromArgb(255, 6, 31, 62)
    $navy = [System.Drawing.Color]::FromArgb(255, 9, 45, 87)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($Size, $Size)),
        $navyDeep, $navy
    )
    if ($Rounded) {
        $r = [int]($Size * 0.18)
        $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $r * 2
        $gp.AddArc(0, 0, $d, $d, 180, 90)
        $gp.AddArc($Size - $d, 0, $d, $d, 270, 90)
        $gp.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
        $gp.AddArc(0, $Size - $d, $d, $d, 90, 90)
        $gp.CloseFigure()
        $g.FillPath($brush, $gp)
    }
    else {
        $g.FillRectangle($brush, 0, 0, $Size, $Size)
    }
    $fontSize = [int]($Size * (0.34 - $Padding))
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $g.DrawString("PP", $font, [System.Drawing.Brushes]::White, $rect, $sf)
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Wrote $Path"
}

$iconsDir = Join-Path $PSScriptRoot "..\frontend\icons"
New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null

New-Icon -Size 512 -Path (Join-Path $iconsDir "icon-512.png") -Padding 0.0 -Rounded $true
New-Icon -Size 192 -Path (Join-Path $iconsDir "icon-192.png") -Padding 0.0 -Rounded $true
New-Icon -Size 512 -Path (Join-Path $iconsDir "icon-maskable-512.png") -Padding 0.12 -Rounded $false
New-Icon -Size 180 -Path (Join-Path $iconsDir "apple-touch-icon.png") -Padding 0.0 -Rounded $true
New-Icon -Size 32 -Path (Join-Path $iconsDir "favicon-32.png") -Padding 0.02 -Rounded $true
