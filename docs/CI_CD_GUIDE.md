# 🚀 Professional CI/CD Pipeline & VPS Deployment Guide

This project includes an automated, production-grade CI/CD pipeline using **GitHub Actions**, **GitHub Container Registry (GHCR)**, **Docker Compose**, and **SSH Deployment**.

---

## 🏗️ Architecture Overview

```
[ Git Push / PR ] ──▶ [ CI Pipeline: Lint + Tests + Build + Docker Check ]
                                 │
                 (When merged into 'main' branch)
                                 ▼
                     [ CD Pipeline: Docker Buildx ]
                                 │
                                 ▼
                  [ Push Image to ghcr.io (GHCR) ]
                                 │
                                 ▼
                    [ SSH Deploy to Production VPS ]
                                 │
            ┌────────────────────┴────────────────────┐
            ▼                                         ▼
  [ Run Prisma Migrations ]               [ Restart Containers ]
            │                                         │
            └────────────────────┬────────────────────┘
                                 ▼
                     [ Verify /api/v1/health ]
                                 │
                                 ▼
                      [ Prune Old Images ]
```

---

## 🔑 1. GitHub Secrets Configuration

In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions** > **New repository secret**, and add the following secrets:

| Secret Name | Description | Example Value |
|---|---|---|
| `SSH_HOST` | VPS Server Public IP or Domain | `159.65.123.45` or `api.yourdomain.com` |
| `SSH_USER` | VPS SSH Username | `ubuntu` or `root` |
| `SSH_PRIVATE_KEY` | Private SSH Key for VPS access (`~/.ssh/id_rsa` or `~/.ssh/id_ed25519`) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `SSH_PORT` | *(Optional, default: `22`)* SSH Port | `22` |
| `DEPLOY_PATH` | *(Optional, default: `/opt/dor-backend`)* Project folder on VPS | `/opt/dor-backend` |

> [!NOTE]
> `GITHUB_TOKEN` is automatically provided by GitHub Actions with write permissions to GHCR. You do **not** need to manually add it to Secrets.

---

## 🖥️ 2. VPS Server Initial Setup (One-time)

### Step 2.1: Generate and Configure SSH Key
On your local machine or VPS, generate a dedicated SSH key pair if you haven't already:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```
Add the public key to `~/.ssh/authorized_keys` on your VPS:
```bash
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```
Copy the contents of `~/.ssh/github_actions_deploy` (the **private key**) into the GitHub Secret `SSH_PRIVATE_KEY`.

---

### Step 2.2: Setup Deployment Directory & Files on VPS
SSH into your VPS and run:
```bash
# 1. Create deployment directory
sudo mkdir -p /var/www/dor-backend
sudo chown -R $USER:$USER /var/www/dor-backend
cd /var/www/dor-backend

# 2. Create uploads directory
mkdir -p uploads/documents
```

Copy the following files to `/var/www/dor-backend/`:
1. `docker-compose.prod.yml`
2. `.env` (Populate with your production secrets)

---

### Step 2.3: Ensure GitHub Container Registry (GHCR) Package Permissions
By default, GitHub Packages are associated with your repository.
1. Make sure your GitHub Action workflow has `packages: write` permissions (already configured in `cd.yml`).
2. If the repository is private, ensure your VPS can pull the image by logging in once:
```bash
echo "YOUR_GITHUB_PERSONAL_ACCESS_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```
*(GitHub Personal Access Token with `read:packages` scope).*

---

## 🚀 3. How to Deploy

### Automatic Deployment:
- Any `git push` or merged PR to the **`main`** branch will automatically trigger testing, container build, and deployment to the VPS.
- Pushing a release tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`) will also trigger the CD pipeline.

### Manual Deployment:
1. Go to **Actions** tab on your GitHub repository.
2. Select **CD - Build, Push & Deploy**.
3. Click **Run workflow** > Select branch `main` > Click **Run workflow**.

---

## 🛠️ 4. Workflows Summary

| File | Trigger | Description |
|---|---|---|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | PRs & feature branches | Lint check, Prettier check, TypeScript build, Jest tests, Docker build test |
| [`.github/workflows/cd.yml`](.github/workflows/cd.yml) | Push to `main`, tags, manual | Full CI validation, Docker multi-arch build & push to GHCR, zero-downtime SSH deploy |
| [`.github/dependabot.yml`](.github/dependabot.yml) | Automated schedule | Dependabot security scanning & version bumps for npm & actions |
| [`docker-compose.prod.yml`](docker-compose.prod.yml) | Production runtime | Production Compose with GHCR image, Redis AOF, log rotation & healthchecks |
| [`scripts/deploy.sh`](scripts/deploy.sh) | Server-side script | Standalone script for manual/automated server deployment & migration |
