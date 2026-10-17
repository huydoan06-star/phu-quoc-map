# Them anh moi vao ban do. Vi du:  .\them-anh.ps1   hoac   .\them-anh.ps1 --publish
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location -Path $PSScriptRoot
node tools/them-anh.mjs @args
