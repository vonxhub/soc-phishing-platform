# SOC Phishing Analysis Platform

A professional, production-ready Security Operations Center (SOC) platform designed for real-time phishing analysis, URL sandboxing, and automated threat intelligence enrichment.

## 🚀 Overview

This platform provides security analysts with a robust environment to investigate suspicious content. It leverages AI-driven analysis, multiple threat intelligence feeds, and an isolated browser sandbox to provide comprehensive risk assessments.

### Key Features

- **AI-Powered Detection**: Integrates with Qwen AI for advanced semantic analysis of phishing attempts.
- **Isolated URL Sandboxing**: Uses a Dockerized Puppeteer environment with custom Seccomp profiles for safe web analysis.
- **Real-time Monitoring**: WebSocket-driven dashboard and alerts for immediate threat visibility.
- **Threat Intelligence Enrichment**: Cross-validates indicators against multiple feeds (OpenPhish, URLHaus).
- **Automated Reporting**: Generates professional PDF reports including redirect chains and sandbox screenshots.
- **Secure Architecture**: Implements SSRF guards, rate limiting, and strict network isolation.

## 🛠 Architecture

The platform is built with a modern, scalable stack:

- **Backend**: Node.js, TypeScript, Express, Socket.io
- **Frontend**: React, Vite, TypeScript
- **Data & Messaging**: PostgreSQL, Redis, BullMQ
- **Infrastructure**: Docker, Nginx, Chrome Seccomp

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- An API Key for [Qwen AI](https://dashscope.aliyun.com/)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/vonxhub/soc-phishing-platform.git
cd soc-phishing-platform
```

### 2. Configure Environment Variables
Copy the example environment file and update it with your credentials:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` and set:
- `JWT_SECRET`: A strong 256-bit hex string.
- `QWEN_API_KEY`: Your actual Qwen API key.

### 3. Deploy with Docker
```bash
docker-compose -f backend/docker-compose.yml up --build -d
```

### 4. Access the Platform
- **Frontend**: `http://localhost`
- **API Documentation**: `http://localhost/api` (Internal)

## 🔒 Security Features

- **Network Isolation**: Database and Redis are isolated from the public internet.
- **Sandbox Hardening**: Custom Seccomp profiles and dropped capabilities for the browser worker.
- **SSRF Protection**: Strict validation of all analyzed URLs to prevent internal network scanning.
- **Rate Limiting**: Protects against brute-force and DoS attempts.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Developed by **Manus AI** for professional SOC environments.
