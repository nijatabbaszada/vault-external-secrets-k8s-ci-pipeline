# Vault-External-Secrets-K8s-CI-Pipeline
![image](docs/images/schem.png)

![CI](https://img.shields.io/badge/ci-passing-brightgreen)
[![Artifact Hub](https://img.shields.io/badge/artifacthub-external--secrets-blue)](https://artifacthub.io/packages/helm/external-secrets/external-secrets)
[![OperatorHub](https://img.shields.io/badge/operatorhub-external--secrets-green)](https://operatorhub.io/operator/external-secrets)

## Overview
This repository demonstrates a full CI/CD pipeline integrating **HashiCorp Vault** with a **Kubernetes cluster** using **External Secrets Operator (ESO)**.  
It automates application deployment via **GitLab CI/CD**, ensuring that sensitive data is securely fetched from Vault and injected into Kubernetes workloads.

---

## Architecture

### Workflow:
1. **Vault** stores all application secrets under defined paths.
2. **External Secrets Operator (ESO)** syncs secrets from Vault into Kubernetes as native secrets.
3. **GitLab CI/CD Pipeline**:
   - Builds the application image.
   - Pushes it to a container registry (using Kaniko).
   - Deploys the app (`myapp`) and its secrets to the cluster via `kubectl`.
4. The app retrieves credentials from the Kubernetes secrets at runtime.

---

## Install vault 

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
kubectl create namespace vault-secondary
helm install -n vault-secondary secondary-vault hashicorp/vault
```

### Initialize and Unseal Vault

After Vault is deployed, you need to initialize and unseal it.  
These commands must be run **inside the Vault pod**.

First, open a shell into the Vault pod:
```bash
kubectl exec -it -n vault-secondary <vault-pod-name> -- /bin/sh
export VAULT_ADDR='http://127.0.0.1:8200'
vault operator init
vault operator unseal     # run 3 times with different unseal keys
vault login <root_token>
```

>Note:
Use kubectl get pods -n vault-secondary to find the correct `vault-pod-name` (usually secondary-vault-0 if using a StatefulSet).

---

### Login to Vault Web UI

To access the Vault Web UI, you have two options:

1. **Port-forward (quick local access):**

```bash
kubectl -n vault-secondary port-forward svc/secondary-vault --address 0.0.0.0 8200:8200
```

2. **Creating ingress:**

```bash
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secondary-vault
  namespace: vault-secondary
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  ingressClassName: nginx
  rules:
  - host: <secondary-vault.example.com>
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: secondary-vault
            port:
              number: 8200
```
---

### Configure Vault Authentication

![authme](docs/images/authmethod.png)

In order for ESO to authenticate with Vault, you must configure an authentication method.  
While **Kubernetes authentication** is the most common option (allowing ESO to use ServiceAccounts for login), you can also use other methods supported by Vault, such as **AppRole, Token, or OIDC**, depending on your security requirements.

Example below shows **Kubernetes Authentication** setup in the Vault UI:

![auth](docs/images/auth.png)

```bash
#Define a policy to allow read-only access:

To allow ESO to fetch secrets from Vault, you must create a **read-only ACL policy**.  
This policy grants `read` and `list` permissions, so ESO can access only the required secrets.

Example (HCL format):

```hcl
path "*" {
  capabilities = ["read", "list"]
}
```

### Populate Vault with Application Secrets

create a secret in Vault that will be synced to Kubernetes by ESO.

Example secret (`my_app_secrets`):

```json
{
  "databaseUser": "appuser",
  "databasePass": "S3cur3Pass!",
  "apiKey": "my-api-key-123"
}
```

![secrets](docs/images/vault-secrets.png)

### Create ServiceAccount for ESO

The `ClusterSecretStore` configuration references a ServiceAccount that ESO will use to authenticate with Vault.  
Create the ServiceAccount in the `external-secrets` namespace:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: eso-myapp-css-sa
  namespace: external-secrets
```

---

## Installing External Secrets Operator (ESO) on Kubernetes with Helm

This guide explains how to install the **External Secrets Operator (ESO)** on Kubernetes, which enables automatic syncing of secrets from providers like **HashiCorp Vault** into Kubernetes secrets.

---

### Add the External Secrets Helm Repository

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
kubectl create namespace external-secrets
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
kubectl get pods -n external-secrets
kubectl get all -n external-secrets
```

---



### Create Cluster Secret Store

The `ClusterSecretStore` (CSS) must be **manually created by the administrator**.  
It is **not created automatically** when you define an `ExternalSecret`.  
Without a valid `ClusterSecretStore`, ESO cannot connect to Vault or retrieve secrets.

Example:

```bash
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: vault-backend-my-app
spec:
  conditions:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: my-app
  provider:
    vault:
      server: <http://secondary-vault.example.com>
      path: my_app_secrets
      version: v2
      auth:
        kubernetes:
          mountPath: kubernetes-eso-auth
          role: eso-readonly-role-my-app
          serviceAccountRef:
            name: eso-myapp-css-sa
            namespace: external-secrets
```

```bash
kubectl apply -f my-app-css.yml
#verify
kubectl get ClusterSecretStore vault-backend-my-app
```

## GitLab CI/CD Pipeline

This project uses **GitLab CI/CD** to automate building, containerizing, and deploying the application (`myapp`) to Kubernetes, while ensuring that **no secrets are hardcoded**.  
All sensitive data is securely stored in **HashiCorp Vault** and dynamically retrieved via **External Secrets Operator (ESO)**, so credentials never appear in the source code, CI variables, or manifests.


### Pipeline Stages Overview

The pipeline consists of three stages:

1. **Build**  
   - Uses a Node.js 18 Alpine image.  
   - Installs project dependencies.  
   - Stores built application artifacts for later stages.

2. **Push Image**  
   - Uses **Kaniko** to build and push a Docker image to the configured container registry.  
   - Handles Docker authentication dynamically using environment variables (`HUB_REGISTRY_PASSWORD`).  
   - No privileged mode is required (Kaniko runs in userspace).

3. **Deploy to Kubernetes**  
   - Uses a lightweight `kubectl` image to deploy the app into the `my-app` namespace.  
   - Creates the namespace if it doesn’t exist.  
   - Replaces the application image tag in the deployment YAML with the current Git commit SHA.  
   - Applies secrets (managed by ESO), deployment, and service YAMLs.

---

### Key Notes

>The pipeline uses Kaniko for building images in unprivileged environments.
 Vault and ESO handle secret injection automatically; no secrets are hardcoded.
 The namespace my-app must have the correct label (kubernetes.io/metadata.name: my-app) for ClusterSecretStore to function.
 Ensure the gitlab-runner ServiceAccount (or configured SA) has sufficient RBAC to:
 Manage deployments, services, and secrets in my-app.
 Access external-secrets.io CRDs for syncing secrets.

RUN >> New Pipeline
![gitlab](docs/images/pipeline.png)
---

## Testing & Verification

After completing the Vault, External Secrets Operator (ESO), and CI/CD pipeline setup, verify that the system works end-to-end by performing the following checks:
**Access the Application**
   - If an Ingress is configured for `myapp`, confirm it responds via the configured domain.
   - If using port-forward, run:
     ```bash
     kubectl -n my-app port-forward svc/myapp-service 5000:80
     ```
Access via `http://localhost:5000`

**Example:**

![verify](docs/images/verify.png)