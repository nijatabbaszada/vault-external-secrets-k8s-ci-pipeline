# Vault-External-Secrets-K8s-CI-Pipeline

## Overview
This repository demonstrates a full CI/CD pipeline integrating **HashiCorp Vault** with a **Kubernetes cluster** using **External Secrets Operator (ESO)**.  
It automates application deployment via **GitLab CI/CD**, ensuring that sensitive data is securely fetched from Vault and injected into Kubernetes workloads.

---

## Architecture

![Architecture](./architecture.png)

### Workflow:
1. **Vault** stores all application secrets under defined paths.
2. **External Secrets Operator (ESO)** syncs secrets from Vault into Kubernetes as native secrets.
3. **GitLab CI/CD Pipeline**:
   - Builds the application image.
   - Pushes it to a container registry (using Kaniko).
   - Deploys the app (`myapp`) and its secrets to the cluster via `kubectl`.
4. The app retrieves credentials from the Kubernetes secrets at runtime.

---

## Repository Structure

├── deployment/ # Kubernetes deployment manifests
├── my_app_code/ # Application source code
├── secrets/ # ExternalSecret CRDs (fetching from Vault)
├── service/ # Kubernetes service definitions
├── .gitlab-ci.yml # CI/CD pipeline configuration
├── Dockerfile # App image build configuration
└── README.md # Project documentation


---

## Deployment Steps
1. Configure **Vault** Kubernetes auth and create a policy to allow secret reads for ESO.
2. Deploy **External Secrets Operator (ESO)** and a `ClusterSecretStore` pointing to Vault.
3. Push application code to GitLab and trigger the CI/CD pipeline:
   - Build → Image → Deploy stages.
4. Verify deployment:
```bash
kubectl get pods -n my-app
kubectl get secrets -n my-app
