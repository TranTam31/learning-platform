import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  course: ["create", "update", "delete"],
  class: ["create", "update", "delete"],
};

const ac = createAccessControl(statement);

const owner = ac.newRole({
  course: ["create", "update", "delete"],
  organization: ["update", "delete"],
});

const admin = ac.newRole({
  course: ["create", "update"],
  ...adminAc.statements,
});

const member = ac.newRole({
  class: ["create"],
});

export { ac, owner, admin, member };
