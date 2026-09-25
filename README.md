# 🎮 PulseGuard Test Sandbox & Failure Simulator

A lightweight, zero-dependency Node.js test environment designed to validate uptime monitors, crawlers, and anomaly-detection engines (specifically [PulseGuard](https://github.com/aman-raj-srivastva/PulseGuard---Autonomous-Multi-Page-Website-Monitoring-System)) by simulating real-world website failure modes on demand.

**Live Deployment:** [https://pulse-guard-simulator.vercel.app/](https://pulse-guard-simulator.vercel.app/)

---

## 🚀 Features

- **Zero External Dependencies**: Powered entirely by native Node.js core modules (`http`, `url`).
- **Interactive Control Dashboard**: Switch simulation modes on the fly via a built-in dark UI directly on root (`/`) or `/control`.
- **Target Site Preview**: Toggle between the Simulator Controls and the live Simulated Target Website (`/?view=site`) with subpages (`/about`, `/products`, `/api/status`).
- **Deep Failure Simulations**: Recreates subtle edge cases like HTTP 200 "Coming Soon" pages and WordPress database connection errors that fool simple status checks.
- **Serverless & Stateless Compatibility**: Engineered for Vercel with cookie-based persistence, query parameter overrides, and direct path routing.
- **Automated Mode Switching API**: Control site behavior programmatically for automated end-to-end integration tests.

---

## 📋 Prerequisites

- **Node.js** (v14.0.0 or higher recommended)

No `npm install` or external packages required.

---

## 🛠️ Quick Start & Setup

### 1. Start the Server Locally

Navigate to the project directory and run:

```bash
node server.js
```

### 2. URL Reference

| Interface | Local URL | Live Vercel URL | Description |
| :--- | :--- | :--- | :--- |
| **🎮 Control Dashboard** | `http://localhost:5000/control` or `http://localhost:5000` | [https://pulse-guard-simulator.vercel.app/](https://pulse-guard-simulator.vercel.app/) | Interactive UI with 6 buttons to toggle failure scenarios |
| **🌐 Simulated Website** | `http://localhost:5000/?view=site` | [https://pulse-guard-simulator.vercel.app/?view=site](https://pulse-guard-simulator.vercel.app/?view=site) | The simulated target website monitored by PulseGuard |

---

## 🕹️ Simulation Modes

You can toggle between different operational states directly in the Control Panel or via API:

| Mode | Status Code | Simulated Behavior & Detection Target |
| :--- | :---: | :--- |
| `healthy` | `200 OK` | **Normal Site Operation**: Clean HTML response with routes (`/about`, `/products`, `/api/status`). |
| `coming-soon` | `200 OK` | **Hostinger Placeholder**: Tests deep content inspection when a domain unexpectedly reverts to a registrar "Coming Soon" page despite returning HTTP 200. |
| `server-error-500` | `500 Internal Error` | **Server Crash**: Simulates fatal PHP/backend exception. |
| `database-error` | `200 OK` | **Database Crash**: WordPress *"Error establishing a database connection"* signature test. |
| `timeout` | `504 / Latency` | **Hanging Request**: Delays responses by 10 seconds to trigger connection and response timeout alerts. |
| `not-found` | `404 Not Found` | **Broken Subpage**: Simulates missing pages and routing errors. |

---

## 🔗 How to Test with PulseGuard

### Local Testing:
1. Open your **PulseGuard Dashboard** (`http://localhost:3000` or `http://192.168.133.220:8089`).
2. Click **"+ Add Website"**:
   - **Name**: `Sandbox Test Site`
   - **Base URL**: `http://localhost:5000/?view=site`
   - **Failure Threshold**: `1`
3. Open `http://localhost:5000` in another browser tab and select any failure scenario (e.g., *Database Connection Crash* or *Coming Soon Mode*).
4. Return to PulseGuard and click **"Check Now"** to view real-time incident detection and notification dispatch.

### Cloud Testing (Vercel):
1. In PulseGuard, click **"+ Add Website"**:
   - **Name**: `Vercel Sandbox Site`
   - **Base URL**: `https://pulse-guard-simulator.vercel.app/?view=site`
   - **Failure Threshold**: `1`
2. Open the [Live Simulator Dashboard](https://pulse-guard-simulator.vercel.app/) and toggle any outage scenario.
3. Click **"Check Now"** in PulseGuard to verify instant detection across the internet.

---

## ☁️ Vercel Architecture & Serverless Routing

Vercel functions run in a stateless, serverless environment where in-memory state can reset across cold starts. This repository implements several mechanisms to guarantee seamless operation:

1. **Route Forwarding ([vercel.json](vercel.json))**:
   All incoming paths are mapped to `/api/index?route=$1` so internal routing logic accurately differentiates between the Control Dashboard and simulated subpages.
2. **State Persistence Hierarchy**:
   The active simulation mode is determined by evaluating:
   $$\text{URL Query Parameter} \rightarrow \text{Direct Path Prefix} \rightarrow \text{Browser Cookie} \rightarrow \text{In-Memory Default}$$
   - **Cookie (`sim_mode`)**: Set automatically by the interactive dashboard so your browser session persists across serverless function reboots.
   - **Direct Path Testing**: Point monitors directly to dedicated scenario endpoints:
     - `https://pulse-guard-simulator.vercel.app/mode/coming-soon`
     - `https://pulse-guard-simulator.vercel.app/mode/database-error`
     - `https://pulse-guard-simulator.vercel.app/mode/server-error-500`
     - `https://pulse-guard-simulator.vercel.app/mode/timeout`
   - **Query Parameter**: Append `?mode=<mode_name>` to any route (e.g. `/?view=site&mode=database-error`).

---

## 📡 Programmatic Mode Switching (API)

You can automate test cases by updating the sandbox mode via an HTTP GET request:

```http
GET https://pulse-guard-simulator.vercel.app/api/set-mode?mode=<MODE_NAME>
```

### Example (cURL):

```bash
# Switch to database connection failure
curl "https://pulse-guard-simulator.vercel.app/api/set-mode?mode=database-error"

# Restore healthy state
curl "https://pulse-guard-simulator.vercel.app/api/set-mode?mode=healthy"
```

**Response:**
```json
{
  "success": true,
  "currentMode": "database-error"
}
```

---

## 📄 License

MIT License. Designed for testing and development with the PulseGuard monitoring ecosystem.
