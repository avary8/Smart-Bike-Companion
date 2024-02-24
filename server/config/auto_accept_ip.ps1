# Set your MongoDB Atlas API key and cluster ID
$apiKey = "YOUR_API_KEY"
$clusterId = "YOUR_CLUSTER_ID"

# Fetch current public IP address
$ipAddress = Invoke-RestMethod "https://api.ipify.org?format=json" | Select-Object -ExpandProperty ip

# Update MongoDB IP whitelist
$url = "https://cloud.mongodb.com/api/atlas/v1.0/groups/YOUR_GROUP_ID/clusters/$clusterId/whitelist"
$body = @{
    "ipAddress" = $ipAddress
}
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($apiKey):"))
}
$response = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body ($body | ConvertTo-Json)

# Print response
Write-Output $response