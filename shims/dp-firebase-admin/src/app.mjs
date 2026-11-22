// firebase-admin/app — shim dp-firebase-admin.
// Surface utilisée par DataParl' : cert, getApps, initializeApp.

export function cert(compteService) {
  if (!compteService || typeof compteService !== "object") {
    throw new Error("cert() : compte de service (JSON) attendu");
  }
  const { project_id: p, client_email: c, private_key: k } = compteService;
  if (!p || !c || !k) {
    throw new Error("cert() : compte de service incomplet (project_id, client_email, private_key requis)");
  }
  return { __dpCert: true, sa: compteService };
}

const registre = () => {
  const g = globalThis;
  if (!g.__dpFirebaseApps) g.__dpFirebaseApps = new Map();
  return g.__dpFirebaseApps;
};

export function getApps() {
  return Array.from(registre().values());
}

export function initializeApp(options = {}, name = "[DEFAULT]") {
  const apps = registre();
  const existant = apps.get(name);
  if (existant) return existant;
  const credential = options?.credential ?? null;
  const projectId =
    (typeof options?.projectId === "string" && options.projectId) ||
    (credential?.__dpCert && credential.sa?.project_id) ||
    null;
  const app = {
    name,
    options,
    credential,
    __dpProjectId: projectId,
  };
  apps.set(name, app);
  return app;
}

export function deleteApp(app) {
  registre().delete(app?.name);
  return Promise.resolve();
}
