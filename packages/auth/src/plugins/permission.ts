import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  course: ["create", "update", "delete", "read"],
  class: ["create", "update", "delete"],
};

const ac = createAccessControl(statement);

const owner = ac.newRole({
  ...ownerAc.statements,
  course: ["create", "update", "delete", "read"],
  organization: ["update", "delete"],
});

const admin = ac.newRole({
  course: ["create", "update", "read"],
  ...adminAc.statements,
});

const member = ac.newRole({
  course: ["read"],
  class: ["create"],
});

export { ac, owner, admin, member };
