# PowerShell script to clear rate limit cache from Redis
# Usage: .\clear-rate-limit.ps1

$REDIS_PASSWORD = "your-strong-password"  # Change this to match your REDIS_PASSWORD from .env
$CONTAINER_NAME = "scol-redis"

Write-Host "Connecting to Redis container: $CONTAINER_NAME" -ForegroundColor Cyan

# Method 1: Clear all rate limit keys (IP-based)
Write-Host "`nClearing IP-based rate limit keys (ip:*)..." -ForegroundColor Yellow
docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD --scan --pattern "ip:*" | ForEach-Object {
    docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD DEL $_
    Write-Host "Deleted: $_" -ForegroundColor Green
}

# Method 2: Clear all rate limit keys (User-based)
Write-Host "`nClearing user-based rate limit keys (user:*)..." -ForegroundColor Yellow
docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD --scan --pattern "user:*" | ForEach-Object {
    docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD DEL $_
    Write-Host "Deleted: $_" -ForegroundColor Green
}

# Method 3: Clear specific endpoint (e.g., /auth/register)
Write-Host "`nClearing /auth/register rate limit keys..." -ForegroundColor Yellow
docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD --scan --pattern "*:/auth/register" | ForEach-Object {
    docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD DEL $_
    Write-Host "Deleted: $_" -ForegroundColor Green
}

Write-Host "`nRate limit cache cleared!" -ForegroundColor Green

# Optional: List remaining rate limit keys
Write-Host "`nRemaining rate limit keys:" -ForegroundColor Cyan
docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD --scan --pattern "ip:*"
docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD --scan --pattern "user:*"



