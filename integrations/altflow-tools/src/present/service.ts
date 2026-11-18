import type { ToolIdentity } from '../policy';

export interface PresentedFile {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  downloadUrl: string;
  description?: string;
}

export interface DeliveryService {
  /** Must check account ownership and regular-file existence on every call. */
  present(identity: ToolIdentity, files: Array<{ path: string; description?: string }>): Promise<PresentedFile[]>;
}
