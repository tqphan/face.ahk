# Get the latest commit number (total commits)
$commitCount = git rev-list --count HEAD

# Read the JSON file
$json = Get-Content "src\res\json\version.json" | ConvertFrom-Json

# Update the patch field
$json.patch = "$commitCount"

# Write back to the file
$json | ConvertTo-Json -Depth 3 | Set-Content "src\res\json\version.json"