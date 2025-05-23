# PowerShell script to run the dentabular container with authentication variables

Write-Host "Container started with ID: $containerId"
Write-Host "Application is running at http://localhost:3000"
Write-Host "To view logs: docker logs $containerId"
Write-Host "To stop the container: docker stop $containerId" 