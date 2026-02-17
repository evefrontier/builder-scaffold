import path from "node:path";

export const EXTRACTED_OBJECT_IDS_FILENAME = "extracted-object-ids.json";

export function getExtractedObjectIdsPath(network: string): string {
    return path.resolve(process.cwd(), "deployments", network, EXTRACTED_OBJECT_IDS_FILENAME);
}
