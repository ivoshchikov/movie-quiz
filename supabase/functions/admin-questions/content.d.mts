import type { ContentMetadata } from "../../../frontend/src/contentBundle/types";
export const TEMP_ID: RegExp;
export function canonical<T>(value: T): T;
export function safeHttpUrl(value: unknown): value is string;
export function bundleOperationId(packageId: string, tempId: string): Promise<string>;
export function validateContentMetadata(value: unknown): ContentMetadata;
