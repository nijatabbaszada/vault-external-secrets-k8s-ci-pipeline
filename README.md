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



1. Configure **Vault** Kubernetes auth and create a policy to allow secret reads for ESO.
2. Deploy **External Secrets Operator (ESO)** and a `ClusterSecretStore` pointing to Vault.
3. Push application code to GitLab and trigger the CI/CD pipeline:
   - Build → Image → Deploy stages.
4. Verify deployment:
```bash
kubectl get pods -n my-app
kubectl get secrets -n my-app
