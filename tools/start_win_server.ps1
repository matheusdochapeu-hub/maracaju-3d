# Servidor HTTP Nativo Windows (PowerShell + .NET HttpListener)
# Permite rodar o Maracaju 3D em QUALQUER PC Windows em casa SEM instalar Python ou Node.js!

param([int]$Port = 8088, [switch]$NoBrowser)

$Root = Split-Path -Parent $PSScriptRoot
$AppDir = Join-Path $Root "app"
$CapturasDir = Join-Path $Root "capturas"

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".webp" = "image/webp"
    ".svg"  = "image/svg+xml"
    ".glb"  = "model/gltf-binary"
    ".gltf" = "model/gltf+json"
    ".obj"  = "text/plain"
    ".ply"  = "application/octet-stream"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  Maracaju 3D rodando em: http://127.0.0.1:$Port" -ForegroundColor Cyan
Write-Host "  (Modo Nativo Windows - sem precisar de Python ou Node.js)" -ForegroundColor Gray
Write-Host "  Feche esta janela ou pressione Ctrl+C para encerrar." -ForegroundColor Gray
Write-Host "==================================================================" -ForegroundColor Green

if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$Port" }

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $reqPath = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
        if ($reqPath -eq "/") { $reqPath = "/index.html" }

        if ($reqPath -eq "/api/captures") {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"photos":[],"geotagged":0}')
            $ctx.Response.ContentType = "application/json; charset=utf-8"
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            $ctx.Response.Close()
            continue
        }

        $rel = $reqPath.TrimStart('/').Replace('/', '\')
        $fullPath = if ($reqPath.StartsWith("/capturas/")) {
            Join-Path $CapturasDir ($reqPath.Substring(10).Replace('/', '\'))
        } else {
            Join-Path $AppDir $rel
        }

        if ((Test-Path $fullPath -PathType Leaf)) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $ctx.Response.ContentType = if ($MimeTypes.ContainsKey($ext)) { $MimeTypes[$ext] } else { "application/octet-stream" }
            $ctx.Response.AddHeader("Cache-Control", "no-store")
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $ctx.Response.StatusCode = 404
        }
        $ctx.Response.Close()
    }
} finally {
    $listener.Stop()
}
