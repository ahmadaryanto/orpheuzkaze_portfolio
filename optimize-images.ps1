Add-Type -AssemblyName System.Drawing

function Optimize-Image {
  param(
    [string]$InputPath,
    [string]$OutputPath,
    [int]$MaxWidth,
    [int]$Quality = 82
  )

  $src = [System.Drawing.Image]::FromFile($InputPath)
  $ratio = $MaxWidth / $src.Width
  if ($ratio -gt 1) { $ratio = 1 }

  $newW = [int]($src.Width * $ratio)
  $newH = [int]($src.Height * $ratio)

  $bmp = New-Object System.Drawing.Bitmap $newW, $newH
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gfx.DrawImage($src, 0, 0, $newW, $newH)
  $gfx.Dispose()
  $src.Dispose()

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }
  $encoder = [System.Drawing.Imaging.Encoder]::Quality
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [long]$Quality)
  $bmp.Save($OutputPath, $codec, $params)
  $bmp.Dispose()

  $size = (Get-Item $OutputPath).Length
  Write-Host "Created $OutputPath ($newW x $newH, $([math]::Round($size/1KB)) KB)"
}

$dir = Join-Path $PSScriptRoot "assets\pdf-pages"
$files = @("page-08", "page-09")

foreach ($name in $files) {
  $src = Join-Path $dir "$name.png"
  Optimize-Image -InputPath $src -OutputPath (Join-Path $dir "$name-1200.jpg") -MaxWidth 1200
  Optimize-Image -InputPath $src -OutputPath (Join-Path $dir "$name-768.jpg") -MaxWidth 768
}

Write-Host "Done."