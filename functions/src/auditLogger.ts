import * as admin from "firebase-admin";
import {
  writeMembershipAudit,
  type MembershipAuditEntry,
} from "../../shared/auditLogger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const auditDb = admin.firestore();

export type { MembershipAuditEntry };

export async function logMembershipAudit(
  entry: MembershipAuditEntry
): Promise<void> {
  await writeMembershipAudit(auditDb, entry);
}
