# Define the necessary variables
$USER = "tno-terminology-design"
$REPO = "tev2-specifications"
$BRANCH = "main"
$DIR = "footer-links"

# Download the ZIP of the branch
Invoke-WebRequest -Uri "https://github.com/$USER/$REPO/archive/$BRANCH.zip" -OutFile "$BRANCH.zip"

# Extract the specific directory's contents directly to the current location
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$BRANCH.zip", "$BRANCH-temp")
Copy-Item -Path "./$BRANCH-temp/$REPO-$BRANCH/$DIR/*" -Destination "./" -Recurse -Force

# Cleanup
Remove-Item -Recurse -Force "./$BRANCH-temp"
Remove-Item "$BRANCH.zip"
