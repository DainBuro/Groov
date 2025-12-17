# Azure Deployment Guide for Groov

This guide will help you deploy the Groov application to Azure using Docker containers.

## Prerequisites

- Azure CLI installed and configured (`az login`)
- Docker installed locally
- Azure subscription with appropriate permissions

## Option 1: Deploy to Azure Container Instances (Simplest)

### Step 1: Create Azure Resources

```bash
# Set variables
$RESOURCE_GROUP="saitynaiavrg"
$LOCATION="germanywestcentral"
$ACR_NAME="saitynaiavacr"
$POSTGRES_SERVER="saitynaiav-postgres"
$POSTGRES_ADMIN="avadmin"
$POSTGRES_PASSWORD="avadmin"
$DB_NAME="saitynaiav_db"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --location $LOCATION

# Create PostgreSQL server
az postgres flexible-server create --resource-group $RESOURCE_GROUP --name $POSTGRES_SERVER --location $LOCATION --admin-user $POSTGRES_ADMIN --admin-password $POSTGRES_PASSWORD --sku-name Standard_B1ms --tier Burstable --storage-size 32 --version 14

# Create database
az postgres flexible-server db create --resource-group $RESOURCE_GROUP --server-name $POSTGRES_SERVER --database-name $DB_NAME

# Configure firewall to allow Azure services
az postgres flexible-server firewall-rule create --resource-group $RESOURCE_GROUP --name $POSTGRES_SERVER --rule-name AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
```

### Step 2: Build and Push Docker Image

```bash
# Log in to ACR
az acr login --name $ACR_NAME

# Build and push image
docker build -t $ACR_NAME.azurecr.io/groov:latest .
docker push $ACR_NAME.azurecr.io/groov:latest
```

### Step 3: Deploy Container Instance

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

# Generate strong secrets (replace these!)
ACCESS_TOKEN_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)

# Deploy container
az container create --resource-group $RESOURCE_GROUP --name groov-app --image $ACR_NAME.azurecr.io/groov:latest --registry-login-server $ACR_NAME.azurecr.io --registry-username $ACR_USERNAME --registry-password $ACR_PASSWORD --dns-name-label groov-app-unique --ports 3003 --environment-variables   NODE_ENV=production   PORT=3003   DB_HOST=$POSTGRES_SERVER.postgres.database.azure.com   DB_USER=$POSTGRES_ADMIN   DB_PORT=5432   DB_NAME=$DB_NAME   DB_SSL=true --secure-environment-variables   DB_PASSWORD=$POSTGRES_PASSWORD   ACCESS_TOKEN_SECRET=$ACCESS_TOKEN_SECRET   REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET --cpu 1 --memory 1.5

# Get the FQDN
az container show --resource-group $RESOURCE_GROUP --name groov-app --query ipAddress.fqdn -o tsv
```

Your application will be available at: `http://groov-app-unique.eastus.azurecontainer.io:3003`

## Option 2: Deploy to Azure App Service (Recommended for Production)

### Step 1: Create Resources

```bash
# Use same resource group, ACR, and PostgreSQL from Option 1

# Create App Service Plan
az appservice plan create --resource-group $RESOURCE_GROUP --name groov-plan --is-linux --sku B1

# Create Web App
az webapp create --resource-group $RESOURCE_GROUP --plan groov-plan --name groov-app --deployment-container-image-name $ACR_NAME.azurecr.io/groov:latest
```

### Step 2: Configure Web App

```bash
# Configure ACR credentials
az webapp config container set --resource-group $RESOURCE_GROUP --name groov-app --docker-registry-server-url https://$ACR_NAME.azurecr.io --docker-registry-server-user $ACR_USERNAME --docker-registry-server-password $ACR_PASSWORD

# Configure environment variables
az webapp config appsettings set --resource-group $RESOURCE_GROUP --name groov-app --settings   NODE_ENV=production   PORT=3003   DB_HOST=$POSTGRES_SERVER.postgres.database.azure.com   DB_USER=$POSTGRES_ADMIN   DB_PASSWORD=$POSTGRES_PASSWORD   DB_PORT=5432   DB_NAME=$DB_NAME   DB_SSL=true   ACCESS_TOKEN_SECRET=$ACCESS_TOKEN_SECRET   REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET   WEBSITES_PORT=3003

# Restart the app
az webapp restart --resource-group $RESOURCE_GROUP --name groov-app
```

Your application will be available at: `https://groov-app.azurewebsites.net`

## Option 3: Using Azure Portal

1. **Create Azure Container Registry:**

   - Search for "Container Registry" in Azure Portal
   - Create new registry with Basic tier
   - Note the login server name

2. **Build and Push Image:**

   ```bash
   az acr login --name $ACR_NAME
   docker build -t $ACR_NAME.azurecr.io/groov:latest .
   docker push $ACR_NAME.azurecr.io/groov:latest
   ```

3. **Create Azure Database for PostgreSQL:**

   - Search for "Azure Database for PostgreSQL flexible servers"
   - Create new server
   - Configure firewall to allow Azure services
   - Create database named "groov_db"

4. **Create Web App:**
   - Search for "App Services"
   - Create new Web App
   - Select Linux OS and Docker Container
   - Configure container settings to use your ACR image
   - Add environment variables in Configuration settings

## Environment Variables Reference

Required environment variables for Azure deployment:

| Variable               | Description                | Example                                      |
| ---------------------- | -------------------------- | -------------------------------------------- |
| `NODE_ENV`             | Environment mode           | `production`                                 |
| `PORT`                 | Application port           | `3003`                                       |
| `DB_HOST`              | PostgreSQL server hostname | `groov-postgres.postgres.database.azure.com` |
| `DB_USER`              | Database username          | `groovadmin`                                 |
| `DB_PASSWORD`          | Database password          | Your secure password                         |
| `DB_PORT`              | Database port              | `5432`                                       |
| `DB_NAME`              | Database name              | `groov_db`                                   |
| `DB_SSL`               | Enable SSL for database    | `true`                                       |
| `ACCESS_TOKEN_SECRET`  | JWT access token secret    | Generate with `openssl rand -base64 32`      |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret   | Generate with `openssl rand -base64 32`      |

## Testing the Deployment

```bash
# Check health
curl http://your-app-url:3003/

# Check API documentation
curl http://your-app-url:3003/api-docs

# Test authentication endpoint
curl -X POST http://your-app-url:3003/auth/signup -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpass123"}'
```

## Updating the Application

```bash
# Build new image
docker build -t $ACR_NAME.azurecr.io/groov:latest .

# Push to registry
docker push $ACR_NAME.azurecr.io/groov:latest

# For App Service, trigger webhook or restart
az webapp restart --resource-group $RESOURCE_GROUP --name groov-app

# For Container Instances, delete and recreate
az container delete --resource-group $RESOURCE_GROUP --name groov-app --yes
# Then recreate with the create command from Step 3 above
```

## Monitoring and Logs

```bash
# View App Service logs
az webapp log tail --resource-group $RESOURCE_GROUP --name groov-app

# View Container Instance logs
az container logs --resource-group $RESOURCE_GROUP --name groov-app

# Stream logs
az container attach --resource-group $RESOURCE_GROUP --name groov-app
```

## Cost Optimization

- **Development:** Use B1 tier App Service plan (~$13/month) and Burstable PostgreSQL
- **Production:** Scale to P1V2 or higher based on traffic
- **Stop resources when not in use:** Use `az webapp stop` and consider stopping PostgreSQL during off-hours

## Troubleshooting

### Database Connection Issues

- Verify firewall rules allow Azure services
- Check SSL is enabled (`DB_SSL=true`)
- Ensure connection string format is correct

### Container Won't Start

- Check logs: `az container logs --resource-group $RESOURCE_GROUP --name groov-app`
- Verify all environment variables are set
- Ensure migrations can connect to database

### 502 Bad Gateway

- Container may still be starting (migrations take time)
- Check container logs for errors
- Verify PORT environment variable matches EXPOSE in Dockerfile

## Security Best Practices

1. **Never commit secrets** - Use Azure Key Vault for production secrets
2. **Rotate secrets regularly** - Especially JWT secrets and database passwords
3. **Use managed identities** - Configure ACR to use managed identity instead of username/password
4. **Enable HTTPS** - Use Azure Front Door or Application Gateway for SSL termination
5. **Restrict database access** - Configure firewall rules to only allow your app's IP

## Cleanup

To remove all resources:

```bash
az group delete --name $RESOURCE_GROUP --yes --no-wait
```
