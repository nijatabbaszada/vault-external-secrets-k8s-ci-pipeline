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

## install vault 

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
kubectl create namespace vault-secondary
helm install -n vault-secondary secondary-vault hashicorp/vault
```

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

# Installing External Secrets Operator (ESO) on Kubernetes with Helm

This guide explains how to install the **External Secrets Operator (ESO)** on Kubernetes, which enables automatic syncing of secrets from providers like **HashiCorp Vault** into Kubernetes secrets.

---

## 1. Prerequisites

- A running Kubernetes cluster (v1.20+)
- `kubectl` and `helm` installed and configured
- Access to a secret provider (e.g., HashiCorp Vault)

---

## 2. Add the External Secrets Helm Repository

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
kubectl create namespace external-secrets
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
kubectl get pods -n external-secrets
kubectl get all -n external-secrets
```

#### Configure Vault Kubernetes Authentication

In order for ESO to authenticate with Vault, you must enable and configure the Kubernetes auth method in Vault.

Steps:
1. Login vault UI
2. Create Kubernetes Authentication Methods 
3. Create role
 example:

![auth](docs/images/auth.png)

### Create Cluster Secret Store

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




