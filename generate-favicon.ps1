Add-Type -AssemblyName System.Drawing

function Draw-Favicon {
    param([int]$Size, [string]$OutputPath)

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 12, 8, 20))

    $radius = [math]::Round($Size * 0.22)
    $body = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $body.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
    $body.AddArc($Size - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
    $body.AddArc($Size - $radius * 2, $Size - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $body.AddArc(0, $Size - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $body.CloseFigure()
    $g.SetClip($body)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 12, 8, 20))
    $g.ResetClip()

    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
        [System.Drawing.Point]::new(0, 0),
        [System.Drawing.Point]::new($Size, $Size),
        [System.Drawing.Color]::FromArgb(255, 201, 168, 255),
        [System.Drawing.Color]::FromArgb(255, 155, 109, 255)
    )

    $caseX = [math]::Round($Size * 0.234)
    $caseY = [math]::Round($Size * 0.406)
    $caseW = [math]::Round($Size * 0.531)
    $caseH = [math]::Round($Size * 0.359)
    $g.FillRectangle($brush, $caseX, $caseY, $caseW, $caseH)

    $pen = New-Object System.Drawing.Pen $brush, ([math]::Max(1, [math]::Round($Size * 0.069)))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $handleY = [math]::Round($Size * 0.406)
    $handleLeft = [math]::Round($Size * 0.39)
    $handleRight = [math]::Round($Size * 0.61)
    $g.DrawLine($pen, $handleLeft, $handleY, $handleLeft, [math]::Round($Size * 0.28))
    $g.DrawLine($pen, $handleRight, $handleY, $handleRight, [math]::Round($Size * 0.28))
    $g.DrawLine($pen, $handleLeft, [math]::Round($Size * 0.28), $handleRight, [math]::Round($Size * 0.28))

    $latchW = [math]::Round($Size * 0.113)
    $latchH = [math]::Round($Size * 0.075)
    $latchX = [math]::Round(($Size - $latchW) / 2)
    $latchY = [math]::Round($Size * 0.538)
    $g.FillRectangle(
        ([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(140, 12, 8, 20))),
        $latchX,
        $latchY,
        $latchW,
        $latchH
    )

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $brush.Dispose()
    $pen.Dispose()
}

$assets = Join-Path $PSScriptRoot "assets"
Draw-Favicon -Size 32 -OutputPath (Join-Path $assets "favicon-32x32.png")
Draw-Favicon -Size 180 -OutputPath (Join-Path $assets "apple-touch-icon.png")
Write-Host "Favicon PNGs generated in assets/"