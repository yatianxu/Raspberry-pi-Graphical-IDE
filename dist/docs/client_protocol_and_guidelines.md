# RobEx Client Protocol & User Program Guidelines

This document outlines the communication protocol between the RobEx Host App (Server) and a PC Client, as well as the design patterns for User Python Programs running on RobEx.

## Part 1: Client Communication Protocol

The RobEx Host App runs an HTTP server on port **8080**. It uses a pairing mechanism to authorize clients.

### 1. Authorization Flow (Pairing)

To prevent unauthorized access, a PC Client must complete a one-time pairing process.

1.  **Client Request**: Client sends its ID and Name to `/auth/request`.
2.  **User Interaction**: RobEx displays a 6-digit **Auth Code** on its screen.
3.  **Client Verify**: User enters this code into the PC Client. Client sends the code to `/auth/verify`.
4.  **Success**: If the code matches, RobEx saves the Client ID as "Authorized". Future requests from this Client ID are accepted.

### 2. API Reference

**Base URL**: `http://<ROBEX_IP>:8080`
**Common Headers**:
*   `X-Client-ID`: <Unique Client Identifier (UUID or Hostname)>
*   `Content-Type`: `application/json` (unless specified otherwise)

#### Auth APIs (No Auth Required)

*   **POST /auth/request**
    *   **Body**: `{"client_id": "string", "client_name": "string"}`
    *   **Response**:
        *   `200 OK`: `{"status": "pending", "msg": "Please enter the code shown on device"}` (Auth Code displayed on device)
        *   `200 OK`: `{"status": "authorized", "msg": "Already authorized"}` (If already paired)

*   **POST /auth/verify**
    *   **Body**: `{"client_id": "string", "code": "string"}`
    *   **Response**:
        *   `200 OK`: `{"status": "success", "msg": "Authorized"}`
        *   `403 Forbidden`: `{"error": "Invalid code or expired"}`

#### App Management APIs (Auth Required)

All following APIs require the `X-Client-ID` header of an authorized client. Returns `403` if unauthorized.

*   **GET /list**
    *   **Response**: `{"files": ["app1.py", "demo.py", ...]}`

*   **GET /status**
    *   **Response**: `{"running": bool, "current_app": "string"}`

*   **POST /upload**
    *   **Header**: `Content-Type: multipart/form-data`
    *   **Body**: Form data with file field `file`
        *   可选：通过 `filename` 指定保存文件名
            *   Query 参数：`/upload?filename=demo.py`
            *   或 multipart 字段：`filename=demo.py`
        *   服务器会对文件名做安全净化（去路径、过滤非法字符、默认补 `.py`）。
    *   **Response**: `{"status": "success", "msg": "Uploaded", "filename": "demo.py"}`

*   **POST /delete**
    *   **Body**: `{"filename": "string"}`
    *   **Response**: `{"status": "success"}`

*   **POST /run**
    *   **Body**: `{"filename": "string"}`
    *   **Response**: `{"status": "success"}` or `{"error": "App already running"}`

*   **POST /stop**
    *   **Body**: `{}`
    *   **Response**: `{"status": "success"}`

---

## Part 2: User Python Program Design Pattern

User programs are Python scripts (`.py`) uploaded to `/root/scripts`. They are executed by a **Launcher** wrapper which provides a safe environment.

### 1. Execution Environment

*   **Interpreter**: System Python 3
*   **Libraries**: All MaixPy libraries (`maix`, `robex`, etc.) are available.
*   **Isolation**: Runs in a separate process.

### 2. Console Mode & Display

To ensure user feedback is visible even if the script doesn't implement a GUI:

*   **Stdout/Stderr Redirection**: The Launcher captures `print()` output and `sys.stderr`.
*   **Console Display**:
    *   If the user script **does not** take control of the display (i.e., does not initialize `maix.display.Display`), the Launcher will render the captured text to the screen in a "Console" view.
    *   If the user script initializes the display, the Console view is suppressed to allow the app to draw freely.

### 3. Error Handling

*   **Crash Recovery**: If the user script raises an unhandled exception:
    1.  The Launcher catches the exception.
    2.  It forces the display initialization (if not already open).
    3.  It prints the full **Traceback** to the screen (red text).
    4.  It waits for a timeout or user interaction (if implemented) before exiting back to the RobEx main menu.

### 4. Recommended Code Structure

```python
import time
from maix import display, image # Optional: Import if you want GUI

def main():
    print("App Starting...") # This shows on the generic Console
    
    # 1. Initialize Hardware (if needed)
    # ...
    
    # 2. Main Logic
    # Option A: Text-based App (don't init display)
    for i in range(5):
        print(f"Counting {i}...")
        time.sleep(1)
        
    # Option B: GUI App
    # disp = display.Display() # Takes over screen from Console
    # img = image.Image(disp.width(), disp.height())
    # ... drawing logic ...
    # disp.show(img)

if __name__ == "__main__":
    main()
```

---

## Part 3: PC Client Implementation Guidelines (For AI/Developers)

When building a PC Client for RobEx:

1.  **Discovery**: (Optional) Use mDNS to find `_robex._tcp` service.
2.  **Auth First**: On startup, generate a stable Client ID (e.g., UUID stored in config). Check authorization status by calling `/list` (or `/status`).
    *   If `403/401`: Initiate **Pairing Flow** (`/auth/request` -> Prompt user for code -> `/auth/verify`).
3.  **Management UI**:
    *   Show list of files (`/list`).
    *   Provide "Upload" button (POST `/upload`).
    *   Provide "Run" and "Stop" controls (`/run`, `/stop`).
    *   Show running status polling `/status`.

