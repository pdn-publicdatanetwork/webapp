// Types dp-firebase-admin/app (shim REST/WebCrypto pour Workers) - surface
// utilisee par DataParl' : cert, getApps, initializeApp. Les fichiers
// consommateurs importent ce shim directement (bundler-indépendant :
// dp-firebase-admin n'est pas dans la liste serverExternalPackages, il est
// toujours bundlé inline, aucune externalisation OpenNext possible).

export interface App {
  name: string;
  options: Record<string, unknown>;
}

export declare function cert(compteService: Record<string, unknown>): unknown;
export declare function getApps(): App[];
export declare function initializeApp(options?: Record<string, unknown>, name?: string): App;
export declare function deleteApp(app: App): Promise<void>;
