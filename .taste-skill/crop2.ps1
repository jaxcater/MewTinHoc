Add-Type -AssemblyName System.Drawing

$src = (Resolve-Path 'img\2.png').Path
$img = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap $img

$minX = $bmp.Width; $minY = $bmp.Height; $maxX = -1; $maxY = -1
for ($y = 0; $y -lt $bmp.Height; $y += 2) {
  for ($x = 0; $x -lt $bmp.Width; $x += 2) {
    $a = $bmp.GetPixel($x, $y).A
    if ($a -gt 12) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
"bbox: $minX,$minY -> $maxX,$maxY  (w=$($maxX-$minX) h=$($maxY-$minY))"

if ($maxX -lt 0) { $minX = 0; $minY = 0; $maxX = $bmp.Width - 1; $maxY = $bmp.Height - 1 }

$pad = 8
$minX = [Math]::Max(0, $minX - $pad); $minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($bmp.Width - 1, $maxX + $pad); $maxY = [Math]::Min($bmp.Height - 1, $maxY + $pad)
$rect = New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)
$crop = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$targetW = 760
$scale = [Math]::Min(1.0, $targetW / $crop.Width)
$nw = [int]($crop.Width * $scale); $nh = [int]($crop.Height * $scale)
"output: $nw x $nh"

$out = New-Object System.Drawing.Bitmap $nw, $nh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.DrawImage($crop, 0, 0, $nw, $nh)
$g.Dispose()

$out.Save((Join-Path (Get-Location) 'src\assets\landing\mew-closing.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$out.Save((Join-Path (Get-Location) '.taste-skill\preview-2.jpg'), [System.Drawing.Imaging.ImageFormat]::Jpeg)

$out.Dispose(); $crop.Dispose(); $bmp.Dispose(); $img.Dispose()
"done"
