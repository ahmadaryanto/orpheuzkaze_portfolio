$port = 8080
$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Serving portfolio at http://localhost:$port/"
Write-Host "Press Ctrl+C to stop."

$mime = @{
  '.html'  = 'text/html; charset=utf-8'
  '.css'   = 'text/css; charset=utf-8'
  '.js'    = 'application/javascript; charset=utf-8'
  '.mjs'   = 'application/javascript; charset=utf-8'
  '.json'  = 'application/json; charset=utf-8'
  '.xml'   = 'application/xml; charset=utf-8'
  '.txt'   = 'text/plain; charset=utf-8'
  '.png'   = 'image/png'
  '.jpg'   = 'image/jpeg'
  '.jpeg'  = 'image/jpeg'
  '.webp'  = 'image/webp'
  '.svg'   = 'image/svg+xml'
  '.ico'   = 'image/x-icon'
  '.mp4'   = 'video/mp4'
  '.webm'  = 'video/webm'
  '.woff2' = 'font/woff2'
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response

  $path = $request.Url.LocalPath
  if ($path -eq '/') { $path = '/index.html' }

  $filePath = Join-Path $root ($path.TrimStart('/'))

  if (Test-Path $filePath -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    $contentType = $mime[$ext]
    if (-not $contentType) { $contentType = 'application/octet-stream' }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $response.ContentType = $contentType
    $response.ContentLength64 = $bytes.Length
    $response.StatusCode = 200
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $response.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
    $response.ContentType = 'text/plain'
    $response.ContentLength64 = $msg.Length
    $response.OutputStream.Write($msg, 0, $msg.Length)
  }

  $response.Close()
}