import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";

const ARTIFACT_DIR = "/home/ridwanul/.gemini/antigravity/brain/98c3e66f-e50d-4cf4-ad6f-862df3924695";

async function cdpRequest(endpoint, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request("http://127.0.0.1:9222" + endpoint, { method }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else {
            setTimeout(check, 400);
          }
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error("Timeout waiting for " + url));
          } else {
            setTimeout(check, 400);
          }
        });
    };
    check();
  });
}

async function captureTab(url, filename, isMobile = false) {
  const newTab = await cdpRequest("/json/new?" + encodeURIComponent(url), "PUT");
  const ws = new WebSocket(newTab.webSocketDebuggerUrl);

  let msgId = 1;
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = msgId++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener("message", handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await new Promise((r) => ws.addEventListener("open", r));
  await send("Page.enable");
  await send("Runtime.enable");

  if (isMobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
  } else {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  // Wait 2.5s for initial render and animations
  await new Promise((r) => setTimeout(r, 2500));

  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${ARTIFACT_DIR}/${filename}`, Buffer.from(shot.data, "base64"));
  console.log(`Saved screenshot: ${filename}`);

  ws.close();
  await cdpRequest("/json/close/" + newTab.id);
}

async function main() {
  console.log("Starting Next.js server with webpack...");
  const server = spawn("npx", ["next", "dev", "--webpack", "-p", "3000"], {
    stdio: ["pipe", "inherit", "inherit"],
  });

  try {
    console.log("Waiting for http://127.0.0.1:3000/ to respond...");
    await waitForServer("http://127.0.0.1:3000/");
    console.log("Server ready! Capturing screenshots...");

    // 1. Home route desktop
    await captureTab("http://127.0.0.1:3000/", "proof-hybrid-home-desktop.png", false);

    // 2. Home route mobile
    await captureTab("http://127.0.0.1:3000/", "proof-hybrid-home-mobile.png", true);

    // 3. Live broadcast route desktop
    await captureTab("http://127.0.0.1:3000/live", "proof-broadcast-show-desktop.png", false);

    // 4. Live broadcast route mobile
    await captureTab("http://127.0.0.1:3000/live", "proof-broadcast-show-mobile.png", true);

    console.log("All screenshots successfully captured!");
  } finally {
    console.log("Shutting down server...");
    server.kill("SIGINT");
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
