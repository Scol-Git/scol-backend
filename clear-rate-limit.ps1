# PowerShell script to clear rate limit cache from local Docker Redis
# Usage: .\clear-rate-limit.ps1
#
# Matches docker-compose.yml:
#   container: scol-redis
#   password:  redis123
#   url:       redis://:redis123@localhost:6379
#
# Keys written by the app:
#   ip:{ip}:{path}
#   user:{userId}:{path}
#   account:{identifier}:/auth/login

$REDIS_PASSWORD = "redis123"
$CONTAINER_NAME = "scol-redis"
$PATTERNS = @("ip:*", "user:*", "account:*")

$running = docker inspect -f "{{.State.Running}}" $CONTAINER_NAME 2>$null
if ($running -ne "true") {
    Write-Host "Redis container '$CONTAINER_NAME' is not running. Start it with: docker compose up -d" -ForegroundColor Red
    exit 1
}

Write-Host "Connecting to Redis container: $CONTAINER_NAME" -ForegroundColor Cyan

function Clear-RedisKeys([string]$Pattern) {
    Write-Host "`nClearing keys matching '$Pattern'..." -ForegroundColor Yellow
    $keys = docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD --scan --pattern $Pattern
    $keyList = @($keys | Where-Object { $_ -and $_.Trim() -ne "" })

    if ($keyList.Count -eq 0) {
        Write-Host "  No keys found." -ForegroundColor DarkGray
        return
    }

    foreach ($key in $keyList) {
        docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD DEL $key | Out-Null
        Write-Host "  Deleted: $key" -ForegroundColor Green
    }
}

foreach ($pattern in $PATTERNS) {
    Clear-RedisKeys $pattern
}

Write-Host "`nRate limit cache cleared!" -ForegroundColor Green

Write-Host "`nRemaining rate limit keys:" -ForegroundColor Cyan
foreach ($pattern in $PATTERNS) {
    $remaining = docker exec $CONTAINER_NAME redis-cli --no-auth-warning -a $REDIS_PASSWORD --scan --pattern $pattern
    $remainingList = @($remaining | Where-Object { $_ -and $_.Trim() -ne "" })
    if ($remainingList.Count -eq 0) {
        Write-Host "  $pattern -> none" -ForegroundColor DarkGray
    } else {
        $remainingList | ForEach-Object { Write-Host "  $_" }
    }
}
