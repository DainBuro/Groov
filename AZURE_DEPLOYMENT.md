# Azure Deployment Guide for Groov

This guide will help you deploy the Groov application to Azure. The application has a **separate backend and frontend** architecture.

## Architecture Overview

- **Backend**: Node.js/Express API (port 3003) - located in `./backend`
- **Frontend**: React SPA served by nginx (port 80) - located in `./frontend`
- **Database**: PostgreSQL

## Prerequisites

- Azure CLI installed and configured (`az login`)
- Docker installed locally
- Azure subscription with appropriate permissions

---

## Recommended Deployment: Backend to App Service

This approach deploys only the backend API to Azure App Service, while the frontend can be deployed separately to Azure Static Web Apps or any static hosting service.

### Step 1: Create Azure Resources

```powershell
# Set variables
$RESOURCE_GROUP="groovrg"
$LOCATION="northeurope"
$ACR_NAME="groovacr"
$POSTGRES_SERVER="groov-postgres"
$POSTGRES_ADMIN="groovadmin"
$POSTGRES_PASSWORD="temppassword123!"
$DB_NAME="groov_db"
$BACKEND_APP_NAME="groov-api"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --location $LOCATION

# Create PostgreSQL server
az postgres flexible-server create `
  --resource-group $RESOURCE_GROUP `
  --name $POSTGRES_SERVER `
  --location $LOCATION `
  --admin-user $POSTGRES_ADMIN `
  --admin-password $POSTGRES_PASSWORD `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --storage-size 32 `
  --version 14

# Create database
az postgres flexible-server db create `
  --resource-group $RESOURCE_GROUP `
  --server-name $POSTGRES_SERVER `
  --database-name $DB_NAME

# Configure firewall to allow Azure services
az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $POSTGRES_SERVER `
  --rule-name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0
```

### Step 2: Build and Push Backend Docker Image

```powershell
# Log in to ACR
az acr login --name $ACR_NAME

# Build and push backend image (from project root)
cd backend
docker build -t "$ACR_NAME.azurecr.io/groov-backend:latest" .
az acr login --name groovacr
docker tag groov-backend:latest "$ACR_NAME.azurecr.io/groov-backend:latest"
docker push "$ACR_NAME.azurecr.io/groov-backend:latest"
cd ..
```

### Step 3: Deploy Backend to App Service

```powershell
# Get ACR credentials
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query username -o tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

# Generate strong secrets (save these!)
$ACCESS_TOKEN_SECRET = openssl rand -base64 32
$REFRESH_TOKEN_SECRET = openssl rand -base64 32

# Create App Service Plan
az appservice plan create `
  --resource-group $RESOURCE_GROUP `
  --name groov-backend-plan `
  --is-linux `
  --sku B1

# Create Web App for Backend
az webapp create `
  --resource-group $RESOURCE_GROUP `
  --plan groov-backend-plan `
  --name $BACKEND_APP_NAME `
  --deployment-container-image-name ${ACR_NAME}.azurecr.io/groov-backend:latest

# Configure ACR credentials
az webapp config container set `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --docker-registry-server-url https://${ACR_NAME}.azurecr.io `
  --docker-registry-server-user $ACR_USERNAME `
  --docker-registry-server-password $ACR_PASSWORD

# Configure environment variables
az webapp config appsettings set `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --settings `
    NODE_ENV=production `
    PORT=3003 `
    DB_HOST=${POSTGRES_SERVER}.postgres.database.azure.com `
    DB_USER=$POSTGRES_ADMIN `
    DB_PASSWORD=$POSTGRES_PASSWORD `
    DB_PORT=5432 `
    DB_NAME=$DB_NAME `
    DB_SSL=true `
    ACCESS_TOKEN_SECRET=$ACCESS_TOKEN_SECRET `
    REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET `
    WEBSITES_PORT=3003

# Enable HTTPS only
az webapp update --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME --https-only true

# Restart the app
az webapp restart --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME
```

**Your backend API will be available at:** `https://groov-api.azurewebsites.net`

### Step 4: Configure CORS for Frontend

```powershell
# Add your frontend domain to CORS allowlist
# Replace with your actual frontend URL
az webapp cors add `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --allowed-origins `
    https://your-frontend-url.azurestaticapps.net `
    http://localhost:3000
```

### Step 5: Deploy Frontend to Azure Static Web Apps

**Option A: Via Azure Portal**

1. Go to Azure Portal → Create "Static Web App"
2. Connect to your GitHub repository
3. Set build configuration:
   - App location: `frontend`
   - Build location: `build`
   - Output location: `build`
4. Add environment variable:
   - `REACT_APP_API_URL=https://groov-api.azurewebsites.net`

**Option B: Via CLI (Manual Build)**

```powershell
cd frontend

# Build with backend API URL
$env:REACT_APP_API_URL="https://groov-api.azurewebsites.net"
npm run build

# Deploy using SWA CLI
npm install -g @azure/static-web-apps-cli
swa deploy ./build --app-name groov-frontend --env production
```

---

## Environment Variables Reference

| Variable               | Description                | Example                                      |
| ---------------------- | -------------------------- | -------------------------------------------- |
| `NODE_ENV`             | Environment mode           | `production`                                 |
| `PORT`                 | Backend application port   | `3003`                                       |
| `DB_HOST`              | PostgreSQL server hostname | `groov-postgres.postgres.database.azure.com` |
| `DB_USER`              | Database username          | `groovadmin`                                 |
| `DB_PASSWORD`          | Database password          | Your secure password                         |
| `DB_PORT`              | Database port              | `5432`                                       |
| `DB_NAME`              | Database name              | `groov_db`                                   |
| `DB_SSL`               | Enable SSL for database    | `true`                                       |
| `ACCESS_TOKEN_SECRET`  | JWT access token secret    | Generate with `openssl rand -base64 32`      |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret   | Generate with `openssl rand -base64 32`      |
| `WEBSITES_PORT`        | Port Azure should expose   | `3003`                                       |
| `REACT_APP_API_URL`    | Frontend API URL           | `https://groov-api.azurewebsites.net`        |

---

## Testing the Deployment

```powershell
# Check backend health
curl https://groov-api.azurewebsites.net/

# View API documentation
curl https://groov-api.azurewebsites.net/api-docs

# Test authentication
curl -X POST https://groov-api.azurewebsites.net/auth/signup `
  -H "Content-Type: application/json" `
  -d '{"username":"testuser","password":"testpass123"}'

# Test frontend (in browser)
# Navigate to: https://your-app.azurestaticapps.net
```

---

## Updating the Application

### Update Backend

```powershell
cd backend
docker build -t ${ACR_NAME}.azurecr.io/groov-backend:latest .
docker push ${ACR_NAME}.azurecr.io/groov-backend:latest

# Restart to pull new image
az webapp restart --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME
```

### Update Frontend

```powershell
cd frontend
npm run build

# If using Static Web Apps with GitHub, push to main branch
git push origin main

# Or deploy manually
swa deploy ./build --env production
```

---

## Monitoring and Logs

```powershell
# View live logs
az webapp log tail --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME

# Download logs
az webapp log download `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --log-file backend-logs.zip

# Enable detailed logging
az webapp log config `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --application-logging filesystem `
  --level information `
  --docker-container-logging filesystem
```

---

## Troubleshooting

### Database Connection Issues

```powershell
# Check firewall rules
az postgres flexible-server firewall-rule list `
  --resource-group $RESOURCE_GROUP `
  --name $POSTGRES_SERVER

# Test connection from App Service
az webapp ssh --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME
# Then inside container:
# apk add postgresql-client
# psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

### Container Won't Start

```powershell
# View detailed logs
az webapp log tail --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME

# Check environment variables
az webapp config appsettings list `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME

# Verify image was pulled
az webapp config container show `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME
```

### 502 Bad Gateway

- **Cause**: Container starting up (migrations take 30-60s)
- **Solution**: Wait a few minutes, check logs for "Server running on port 3003"
- **Check**: `WEBSITES_PORT` must match exposed port (3003)

### CORS Errors

```powershell
# View current CORS settings
az webapp cors show --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME

# Add frontend origin
az webapp cors add `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --allowed-origins https://your-frontend.azurestaticapps.net
```

### Frontend Can't Connect to Backend

1. Check `REACT_APP_API_URL` is set correctly in Static Web App environment variables
2. Verify CORS is configured on backend
3. Ensure backend is running: `curl https://groov-api.azurewebsites.net/`
4. Check browser console for specific errors

---

## Cost Optimization

### Estimated Monthly Costs (USD)

| Resource                   | Tier           | Cost/Month  |
| -------------------------- | -------------- | ----------- |
| App Service Plan (Backend) | B1 (Basic)     | ~$13        |
| PostgreSQL Flexible Server | Burstable B1ms | ~$12        |
| Azure Container Registry   | Basic          | ~$5         |
| Static Web Apps (Frontend) | Free/Standard  | $0-$9       |
| **Total**                  |                | **~$30-39** |

### Cost-Saving Tips

```powershell
# Stop backend when not in use
az webapp stop --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME

# Stop database (saves ~$12/month)
az postgres flexible-server stop --resource-group $RESOURCE_GROUP --name $POSTGRES_SERVER

# Start them again when needed
az webapp start --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME
az postgres flexible-server start --resource-group $RESOURCE_GROUP --name $POSTGRES_SERVER
```

---

## Security Best Practices

### 1. Use Azure Key Vault for Secrets

```powershell
# Create Key Vault
az keyvault create `
  --resource-group $RESOURCE_GROUP `
  --name groov-keyvault `
  --location $LOCATION

# Add secrets
az keyvault secret set --vault-name groov-keyvault --name DBPassword --value $POSTGRES_PASSWORD
az keyvault secret set --vault-name groov-keyvault --name AccessTokenSecret --value $ACCESS_TOKEN_SECRET

# Enable managed identity for App Service
az webapp identity assign --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME

# Grant access to Key Vault
$PRINCIPAL_ID = az webapp identity show --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME --query principalId -o tsv
az keyvault set-policy `
  --name groov-keyvault `
  --object-id $PRINCIPAL_ID `
  --secret-permissions get list
```

### 2. Configure Managed Identity for ACR

```powershell
# Enable system-assigned identity
az webapp identity assign --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME

# Grant ACR pull permission
$PRINCIPAL_ID = az webapp identity show --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME --query principalId -o tsv
az role assignment create `
  --assignee $PRINCIPAL_ID `
  --scope /subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME `
  --role AcrPull

# Disable admin credentials
az acr update --name $ACR_NAME --admin-enabled false
```

### 3. Restrict Database Access

```powershell
# Get App Service outbound IPs
az webapp show `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --query outboundIpAddresses -o tsv

# Add firewall rules for each IP
az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $POSTGRES_SERVER `
  --rule-name AppService `
  --start-ip-address <ip> `
  --end-ip-address <ip>
```

---

## Cleanup

Remove all resources:

```powershell
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

---

## Production Architecture Recommendations

For a production deployment, consider:

1. **Frontend**: Azure Static Web Apps with Azure CDN
2. **Backend**: Azure App Service (Standard tier minimum)
3. **Database**: Azure PostgreSQL Flexible Server (with backups enabled)
4. **CDN/WAF**: Azure Front Door for global distribution and DDoS protection
5. **Monitoring**: Azure Application Insights + Log Analytics
6. **Secrets**: Azure Key Vault
7. **CI/CD**: GitHub Actions for automated deployments

This architecture provides:

- ✅ High availability
- ✅ Global performance (CDN)
- ✅ Automated scaling
- ✅ Security (WAF, managed identities)
- ✅ Independent frontend/backend deployment
