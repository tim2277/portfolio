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
  ./scripts/Convert-Heic.ps1 -Path ~/Downloads/HomeHero.heic -MaxEdge 3000
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$Path,
  [string]$Destination = 'src/assets',
  # Output filename without extension. Single-file conversions only.
  [string]$Name,
  [int]$MaxEdge = 2400,
  [ValidateRange(1, 100)][int]$Quality = 82,
  [switch]$Force,

  <#
    A post hero is shown whole, so a portrait photograph would run the height
    of the screen. This cuts the frame to a width:height ratio before it is
    scaled: 1.5 for 3:2. 0 leaves the frame alone.
  #>
  [ValidateRange(0, 10)][double]$CropRatio = 0,
  # Where the kept slice sits along the edge being trimmed, as a percentage:
  # 0 is the top (or left), 100 the bottom (or right).
  [ValidateRange(0, 100)][double]$CropPosition = 50,

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

# EXIF tags System.Drawing/WIC's own JPEG encoder stamps in even when the
# BitmapFrame handed to it carries no metadata: Gamma, sRGB rendering intent,
# and the three pixel-per-unit/unit tags. Nothing else is expected — and
# nothing else is trusted; see Test-JpegClean below.
$script:AllowedExifTags = @(0x0301, 0x0303, 0x5110, 0x5111, 0x5112)

# PowerShell's -shl keeps the left operand's type, so shifting a [byte] left
# by 8 truncates to zero instead of widening — every byte is cast to [int]
# first so the shift actually has somewhere to put the bits.
function Get-U16([byte[]]$Bytes, [int]$Offset, [bool]$Little) {
  if ($Little) { [int]$Bytes[$Offset] -bor ([int]$Bytes[$Offset + 1] -shl 8) }
  else { ([int]$Bytes[$Offset] -shl 8) -bor [int]$Bytes[$Offset + 1] }
}

function Get-U32([byte[]]$Bytes, [int]$Offset, [bool]$Little) {
  if ($Little) {
    [int]$Bytes[$Offset] -bor ([int]$Bytes[$Offset + 1] -shl 8) -bor
      ([int]$Bytes[$Offset + 2] -shl 16) -bor ([int]$Bytes[$Offset + 3] -shl 24)
  } else {
    ([int]$Bytes[$Offset] -shl 24) -bor ([int]$Bytes[$Offset + 1] -shl 16) -bor
      ([int]$Bytes[$Offset + 2] -shl 8) -bor [int]$Bytes[$Offset + 3]
  }
}

# Walks one TIFF IFD (IFD0, or the Exif sub-IFD it points to) and reports any
# tag outside the boilerplate set, plus GPS IFD presence — the GPS pointer
# tag (0x8825) is itself the finding, so it isn't followed.
function Get-ExifIssues {
  param([byte[]]$Bytes, [int]$TiffOffset, [int]$IfdOffset, [bool]$Little, [string]$Label)
  $issues = @()
  $count = Get-U16 $Bytes $IfdOffset $Little
  for ($e = 0; $e -lt $count; $e++) {
    $entryOff = $IfdOffset + 2 + ($e * 12)
    $tag = Get-U16 $Bytes $entryOff $Little
    if ($tag -eq 0x8825) {
      $issues += 'GPS IFD present'
    } elseif ($tag -eq 0x8769) {
      $subOff = $TiffOffset + (Get-U32 $Bytes ($entryOff + 8) $Little)
      $issues += Get-ExifIssues -Bytes $Bytes -TiffOffset $TiffOffset -IfdOffset $subOff -Little $Little -Label 'Exif sub-IFD'
    } elseif ($script:AllowedExifTags -notcontains $tag) {
      $issues += ('{0} tag 0x{1:X4} present' -f $Label, $tag)
    }
  }
  $issues
}

# Walks the JPEG's own segment structure rather than trusting a metadata API,
# because the encoders here can add tags an API wrapper might not surface.
# Flags anything beyond the System.Drawing boilerplate: any other EXIF tag,
# any GPS IFD, an XMP packet, or bytes left after the real EOI marker.
function Test-JpegClean {
  param([Parameter(Mandatory)][string]$Path)
  try {
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 4 -or $bytes[0] -ne 0xFF -or $bytes[1] -ne 0xD8) {
      return @('output does not start with a JPEG SOI marker')
    }

    $issues = @()
    $i = 2
    $eoiFound = $false
    while ($i -lt $bytes.Length) {
      while ($i -lt $bytes.Length -and $bytes[$i] -eq 0xFF) { $i++ }
      if ($i -ge $bytes.Length) { break }
      $marker = $bytes[$i]; $i++

      if ($marker -eq 0xD9) { $eoiFound = $true; break }
      if ($marker -eq 0x01 -or ($marker -ge 0xD0 -and $marker -le 0xD7)) { continue }

      if ($i + 1 -ge $bytes.Length) { $issues += 'truncated segment header'; break }
      $len = (Get-U16 $bytes $i $false)
      if ($len -lt 2) { $issues += 'malformed segment length'; break }
      $segStart = $i + 2
      $segEnd = $i + $len

      if ($marker -eq 0xE1 -and $segEnd -le $bytes.Length) {
        if ($len -ge 8 -and [System.Text.Encoding]::ASCII.GetString($bytes, $segStart, 4) -eq 'Exif') {
          $tiffOffset = $segStart + 6
          $bo = [System.Text.Encoding]::ASCII.GetString($bytes, $tiffOffset, 2)
          $little = $bo -eq 'II'
          $ifd0Off = $tiffOffset + (Get-U32 $bytes ($tiffOffset + 4) $little)
          $issues += Get-ExifIssues -Bytes $bytes -TiffOffset $tiffOffset -IfdOffset $ifd0Off -Little $little -Label 'IFD0'
        } elseif ($len -ge 31 -and [System.Text.Encoding]::ASCII.GetString($bytes, $segStart, 29) -eq 'http://ns.adobe.com/xap/1.0/') {
          $issues += 'XMP packet present'
        }
      }

      if ($marker -eq 0xDA) {
        # Entropy-coded scan data: a literal 0xFF in here is always stuffed as
        # 0xFF 0x00, or is a restart marker (0xD0-0xD7). Anything else is the
        # next real marker — normally EOI.
        $j = $segEnd
        while ($j -lt $bytes.Length - 1) {
          if ($bytes[$j] -eq 0xFF) {
            $nb = $bytes[$j + 1]
            if ($nb -eq 0x00 -or ($nb -ge 0xD0 -and $nb -le 0xD7)) { $j += 2; continue }
            break
          }
          $j++
        }
        $i = $j
        continue
      }

      $i = $segEnd
    }

    if (-not $eoiFound) {
      $issues += 'no EOI marker found'
    } elseif ($i -lt $bytes.Length) {
      $issues += "$($bytes.Length - $i) byte(s) of data after the EOI marker"
    }

    $issues
  } catch {
    @("failed to parse output for verification: $($_.Exception.Message)")
  }
}

foreach ($src in $sources) {
  $stream = [System.IO.File]::OpenRead($src.FullName)
  try {
    $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create(
      $stream, 'PreservePixelFormat', 'OnLoad')
    $frame = $decoder.Frames[0]

    $orientation = 1
    if ($frame.Metadata) {
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

    # Before the scale, so MaxEdge caps the picture that's kept and not the
    # part thrown away.
    if ($CropRatio -gt 0) {
      $cropW = $image.PixelWidth
      $cropH = [int][Math]::Round($cropW / $CropRatio)
      if ($cropH -gt $image.PixelHeight) {
        $cropH = $image.PixelHeight
        $cropW = [int][Math]::Round($cropH * $CropRatio)
      }
      $left = [int][Math]::Round(($image.PixelWidth - $cropW) * ($CropPosition / 100))
      $top = [int][Math]::Round(($image.PixelHeight - $cropH) * ($CropPosition / 100))
      $image = [System.Windows.Media.Imaging.CroppedBitmap]::new(
        $image, [System.Windows.Int32Rect]::new($left, $top, $cropW, $cropH))
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

    # Built from the pixels alone — no metadata handed to the encoder. That
    # isn't the same as a clean file: WIC's and System.Drawing's own JPEG
    # encoders stamp in a few boilerplate tags regardless (see
    # $script:AllowedExifTags), so the output is verified below rather than
    # assumed clean.
    $outFrame = [System.Windows.Media.Imaging.BitmapFrame]::Create($image)

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

    # Trust the file that's actually going in the repo, not the metadata API
    # used to build it. Any tag outside the boilerplate set, any GPS IFD, any
    # XMP, or anything after the EOI marker deletes the output and fails the
    # run rather than publishing it.
    $cleanIssues = Test-JpegClean -Path $outPath
    if ($cleanIssues) {
      Remove-Item -LiteralPath $outPath -Force
      throw "Convert-Heic: '$outPath' failed metadata verification and was deleted:`n  $($cleanIssues -join "`n  ")"
    }

    [pscustomobject]@{
      Source      = $src.Name
      Output      = Split-Path $outPath -Leaf
      Size        = '{0}x{1}' -f $image.PixelWidth, $image.PixelHeight
      KB          = [math]::Round((Get-Item $outPath).Length / 1KB)
      Rotated     = $angle
      # Unconditional because Test-JpegClean has already thrown on any GPS.
      GpsStripped = $true
      Watermark   = if ($watermarked) { $caption } else { '' }
    }
  } finally {
    $stream.Close()
  }
}
