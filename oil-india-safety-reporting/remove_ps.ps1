$files = Get-ChildItem "C:\Users\PARADOX\.gemini\antigravity-ide\scratch\oil-india-safety-reporting\src" -Recurse -Include "*.jsx","*.js"
foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw
  $c = $c -replace " - PS 26165", ""
  $c = $c -replace "PS 26165 ", ""
  $c = $c -replace " PS 26165", ""
  $c = $c -replace "\(PS 26165\)", ""
  $c = $c -replace "PS 26165", ""
  Set-Content $f.FullName $c
}
Write-Host "Done removing PS 26165"
