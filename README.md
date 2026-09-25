# 🎮 PulseGuard Test Sandbox & Failure Simulator

A lightweight, zero-dependency Node.js test environment designed to validate uptime monitors, crawlers, and anomaly-detection engines (specifically [PulseGuard](https://github.com/aman-raj-srivastva/PulseGuard---Autonomous-Multi-Page-Website-Monitoring-System)) by simulating real-world website failure modes on demand.

---

## 🚀 Features

- **Zero External Dependencies**: Powered entirely by native Node.js core modules (`http`, `url`).
- **Interactive Control Dashboard**: Switch simulation modes on the fly via a built-in UI at `http://localhost:5000/control`.
- **Deep Failure Simulations**: Recreates subtle edge cases like HTTP 200 "Coming Soon" pages and WordPress database connection errors that fool simple status checks.
- **Automated Mode Switching API**: Control site behavior programmatically for automated end-to-end integration tests.

---

## 📋 Prerequisites

- **Node.js** (v14.0.0 or higher recommended)

No `npm install` or external packages required.

---

## 🛠️ Quick Start & Setup

### 1. Start the Server

Navigate to the project directory and run:

```bash
node server.js
```

### 2. Access the Application

Once launched, the server runs on port `5000`:

| Interface | URL | Description |
| :--- | :--- | :--- |
| **Test Website** | `http://localhost:5000` | The simulated target website monitored by PulseGuard |
| **Control Dashboard** | `http://localhost:5000/control` | Interactive UI to toggle outages and failure modes |

---

## 🕹️ Simulation Modes

You can toggle between different operational states directly in the [Control Panel](http://localhost:5000/control) or via API:

| Mode | Status Code | Simulated Behavior & Detection Target |
| :--- | :---: | :--- |
| `healthy` | `200 OK` | **Normal Site Operation**: Clean HTML response with routes (`/`, `/about`, `/products`). |
| `coming-soon` | `200 OK` | **Hostinger Placeholder**: Tests deep content inspection when a domain unexpectedly reverts to a registrar "Coming Soon" page despite returning HTTP 200. |
| `server-error-500` | `500 Internal Error` | **Server Crash**: Simulates fatal PHP/backend exception. |
| `database-error` | `200 OK` | **Database Crash**: WordPress *"Error establishing a database connection"* signature test. |
| `timeout` | `504 / Latency` | **Hanging Request**: Delays responses by 15 seconds to trigger connection and response timeout alerts. |
| `not-found` | `404 Not Found` | **Broken Subpage**: Simulates missing pages and routing errors. |

---

## 🔗 How to Test with PulseGuard

1. Open your **PulseGuard Dashboard** (default: `http://localhost:3000`).
2. Click **"+ Add Website"**:
   - **Name**: `Sandbox Test Site`
   - **Base URL**: `http://localhost:5000`
   - **Failure Threshold**: `1`
3. Open `http://localhost:5000/control` in another browser tab and select any failure scenario (e.g., *Database Connection Crash* or *Coming Soon Mode*).
4. Return to PulseGuard and click **"Check Now"** to view real-time incident detection and notification dispatch.

---

## 📡 Programmatic Mode Switching (API)

You can automate test cases by updating the sandbox mode via an HTTP GET request:

```http
GET http://localhost:5000/api/set-mode?mode=<MODE_NAME>
```

### Example (cURL):

```bash
# Switch to database connection failure
curl "http://localhost:5000/api/set-mode?mode=database-error"

# Restore healthy state
curl "http://localhost:5000/api/set-mode?mode=healthy"
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
