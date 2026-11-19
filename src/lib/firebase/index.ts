/**
 * Firebase service layer — the only modules allowed to talk to Firebase.
 * Components import from here (e.g. `import { subscribePlayers } from "@/lib/firebase"`).
 */
export * from "./config";
export * from "./database";
export * from "./converters";
export * from "./settings";
export * from "./clubs";
export * from "./players";
export * from "./segments";
export * from "./history";
export * from "./reset";
export * from "./purchase";
export * from "./auction";
export * from "./auth";
