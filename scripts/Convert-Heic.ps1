<#
.SYNOPSIS
  Converts HEIC photographs to web-ready JPEGs, downscaled and stripped of
  metadata.

.DESCRIPTION
  Decoding relies on Microsoft.HEIFImageExtension, which registers a WIC codec
  that .NET's imaging stack picks up — no ImageMagick, no ffmpeg, no npm
  dependency.

  Two things happen here that matter beyond the format change:

  EXIF is dropped. Phone photographs carry GPS coordinates, camera make and
  model, and a capture timestamp. Astro re-encodes on build, but it preserves
  what it's given, so anything left here reaches the public site.

  Images are downscaled before they enter the repo. The hero band is 1312px at
  its widest and Astro generates its own derivatives, so committing a 4000px
  original costs repository size for pixels no visitor receives.

.EXAMPLE
  ./scripts/Convert-Heic.ps1 -Path ~/Downloads -Destination src/assets

.EXAMPLE
  ./scripts/Convert-Heic.ps1 -Path ~/Downloads/HomeHero.heic -MaxEdge 3000 -KeepMetadata
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$Path,
  [string]$Destination = 'src/assets',
  # Output filename without extension. Single-file conversions only.
  [string]$Name,
  [int]$MaxEdge = 2400,
  [ValidateRange(1, 100)][int]$Quality = 82,
  # Opt back in to EXIF. Only sensible for images you've already checked.
  [switch]$KeepMetadata,
  [switch]$Force,

  # Burnt-in credit. Applies to every file in the call, so run per-photo when
  # the location differs.
  [string]$Location,
  [string]$Credit = "© $((Get-Date).Year) Tim · All rights reserved",
  [switch]$NoWatermark,
  <#
    Keeps the mark inside the crop a hero band will take. The band is a
    centred horizontal slice, so a corner mark on a landscape photo is cut off
    the rendered page and survives only in the downloaded file. Pass the
    widest ratio the image is displayed at — 4.5 for the index heroes — and
    the text lands at the bottom of that slice instead. 0 disables it and the
    mark goes in the true bottom corner, which is right for an in-article
    image that isn't cropped.
  #>
  [double]$SafeRatio = 0,
  # Must match the Y percentage of the hero's imagePosition. The crop window
  # slides with it, and a mark placed for a centred crop slides out of view.
  [ValidateRange(0, 100)][double]$SafePosition = 50
)

Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Drawing

$sources = if (Test-Path $Path -PathType Container) {
  Get-ChildItem (Join-Path $Path '*.heic') -File
} else {
  Get-ChildItem $Path -File
}

if (-not $sources) { throw "No HEIC files matched '$Path'." }

# Two-arg overload: resolves a relative path against the working directory and
# leaves an absolute one alone. Join-Path would concatenate both.
$destDir = [System.IO.Path]::GetFullPath($Destination, (Get-Location).Path)
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir | Out-Null }

# PascalCase and underscores become kebab-case, so filenames match the slug
# style used everywhere else.
function ConvertTo-Slug([string]$Name) {
  $s = $Name -creplace '([a-z0-9])([A-Z])', '$1-$2'
  $s = $s -replace '[_\s]+', '-' -replace '-+', '-'
  $s.ToLowerInvariant().Trim('-')
}

foreach ($src in $sources) {
  $stream = [System.IO.File]::OpenRead($src.FullName)
  try {
    $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create(
      $stream, 'PreservePixelFormat', 'OnLoad')
    $frame = $decoder.Frames[0]

    $hadGps = $false
    $orientation = 1
    if ($frame.Metadata) {
      try { $hadGps = $null -ne $frame.Metadata.GetQuery('/ifd/gps') } catch {}
      try {
        $o = $frame.Metadata.GetQuery('/ifd/{ushort=274}')
        if ($o) { $orientation = [int]$o }
      } catch {}
    }

    $image = [System.Windows.Media.Imaging.BitmapSource]$frame

    # WIC hands back the sensor's pixels, not the upright picture. Without this
    # a portrait shot lands on its side.
    $angle = switch ($orientation) { 3 { 180 } 6 { 90 } 8 { 270 } default { 0 } }
    if ($angle -ne 0) {
      $rotate = [System.Windows.Media.Imaging.TransformedBitmap]::new(
        $image, [System.Windows.Media.RotateTransform]::new($angle))
      $image = $rotate
    }

    # Longest edge, not width — capping width alone leaves a portrait shot
    # 4000px tall and several megabytes heavy.
    $longest = [Math]::Max($image.PixelWidth, $image.PixelHeight)
    if ($longest -gt $MaxEdge) {
      $scale = $MaxEdge / $longest
      $image = [System.Windows.Media.Imaging.TransformedBitmap]::new(
        $image, [System.Windows.Media.ScaleTransform]::new($scale, $scale))
    }

    $leaf = if ($Name -and @($sources).Count -eq 1) { $Name } else { ConvertTo-Slug $src.BaseName }
    $outPath = Join-Path $destDir "$leaf.jpg"
    if ((Test-Path $outPath) -and -not $Force) {
      Write-Warning "exists, skipping: $outPath (use -Force to overwrite)"
      continue
    }

    $caption = @($Location, $Credit | Where-Object { $_ }) -join ' · '
    $watermarked = $caption -and -not $NoWatermark

    # Built from the pixels alone. A BitmapFrame created this way carries no
    # metadata, which is the stripping — there's nothing to remove afterwards.
    $outFrame = [System.Windows.Media.Imaging.BitmapFrame]::Create($image)
    if ($KeepMetadata -and $frame.Metadata) {
      $outFrame = [System.Windows.Media.Imaging.BitmapFrame]::Create(
        $image, $null, $frame.Metadata.Clone(), $null)
    }

    if (-not $watermarked) {
      $encoder = [System.Windows.Media.Imaging.JpegBitmapEncoder]::new()
      $encoder.QualityLevel = $Quality
      $encoder.Frames.Add($outFrame)
      $out = [System.IO.File]::Create($outPath)
      try { $encoder.Save($out) } finally { $out.Close() }
    } else {
      # Handed between the two imaging stacks as PNG: WIC decodes HEIC and
      # System.Drawing draws text, and going via a lossless format keeps it to
      # a single JPEG encode at the end.
      $png = [System.Windows.Media.Imaging.PngBitmapEncoder]::new()
      $png.Frames.Add($outFrame)
      $mem = [System.IO.MemoryStream]::new()
      $png.Save($mem)
      $mem.Position = 0

      $bmp = [System.Drawing.Bitmap]::new($mem)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.SmoothingMode = 'AntiAlias'
      $g.TextRenderingHint = 'ClearTypeGridFit'

      $pad = [float]($bmp.Width * 0.014)
      $font = [System.Drawing.Font]::new(
        'Segoe UI', [float]($bmp.Width / 105), [System.Drawing.FontStyle]::Regular,
        [System.Drawing.GraphicsUnit]::Pixel)
      $size = $g.MeasureString($caption, $font)

      # Bottom of the slice a cropped hero will actually show. object-position
      # distributes the leftover height by percentage, same as the browser.
      $bottom = [float]$bmp.Height
      if ($SafeRatio -gt 0) {
        $safeH = $bmp.Width / $SafeRatio
        if ($safeH -lt $bmp.Height) {
          $top = ($bmp.Height - $safeH) * ($SafePosition / 100)
          $bottom = [float]($top + $safeH)
        }
      }

      $x = [float]($bmp.Width - $size.Width - $pad)
      $y = [float]($bottom - $size.Height - $pad)

      <#
        A drop shadow alone isn't enough: white text over sunlit limestone or
        snow disappears. A low-alpha plate behind it holds contrast whatever
        the photograph does, and stays discreet over dark water too.
      #>
      $plate = [System.Drawing.RectangleF]::new(
        $x - $pad * 0.45, $y - $pad * 0.22,
        $size.Width + $pad * 0.9, $size.Height + $pad * 0.44)
      $radius = [float]($plate.Height * 0.28)
      $plateShape = [System.Drawing.Drawing2D.GraphicsPath]::new()
      $plateShape.AddArc($plate.X, $plate.Y, $radius * 2, $radius * 2, 180, 90)
      $plateShape.AddArc($plate.Right - $radius * 2, $plate.Y, $radius * 2, $radius * 2, 270, 90)
      $plateShape.AddArc($plate.Right - $radius * 2, $plate.Bottom - $radius * 2, $radius * 2, $radius * 2, 0, 90)
      $plateShape.AddArc($plate.X, $plate.Bottom - $radius * 2, $radius * 2, $radius * 2, 90, 90)
      $plateShape.CloseFigure()

      $scrim = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(95, 0, 0, 0))
      $g.FillPath($scrim, $plateShape)

      $ink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(225, 255, 255, 255))
      $g.DrawString($caption, $font, $ink, $x, $y)

      $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq 'image/jpeg' }
      $ep = [System.Drawing.Imaging.EncoderParameters]::new(1)
      $ep.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new(
        [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)
      $bmp.Save($outPath, $codec, $ep)

      $plateShape.Dispose(); $scrim.Dispose(); $ink.Dispose(); $font.Dispose()
      $g.Dispose(); $bmp.Dispose(); $mem.Dispose()
    }

    [pscustomobject]@{
      Source      = $src.Name
      Output      = Split-Path $outPath -Leaf
      Size        = '{0}x{1}' -f $image.PixelWidth, $image.PixelHeight
      KB          = [math]::Round((Get-Item $outPath).Length / 1KB)
      Rotated     = $angle
      GpsStripped = $hadGps -and -not $KeepMetadata
      Watermark   = if ($watermarked) { $caption } else { '' }
    }
  } finally {
    $stream.Close()
  }
}
