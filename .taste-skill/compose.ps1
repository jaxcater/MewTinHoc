Add-Type -AssemblyName System.Drawing

function Compose($inPath, $outPath, $bg) {
  $img = [System.Drawing.Image]::FromFile($inPath)
  $out = New-Object System.Drawing.Bitmap $img.Width, $img.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.Clear($bg)
  $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
  $g.Dispose()
  $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $out.Dispose(); $img.Dispose()
}

Compose ((Resolve-Path 'img\2.png').Path) ((Join-Path (Get-Location) '.taste-skill\src2-check.jpg')) ([System.Drawing.Color]::FromArgb(255, 30, 30, 30))
Compose ((Resolve-Path 'src\assets\landing\mew-closing.png').Path) ((Join-Path (Get-Location) '.taste-skill\crop-check.jpg')) ([System.Drawing.Color]::FromArgb(255, 30, 30, 30))
"ok"
