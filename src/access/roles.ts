import type { Access, FieldAccess, PayloadRequest } from 'payload'

/** Admin roles (spec §9.3). Customers are a separate collection (Phase 7), never users. */
export const ROLES = ['owner', 'editor', 'support'] as const
export type Role = (typeof ROLES)[number]

type User = PayloadRequest['user']

export const hasRole = (user: User, ...roles: Role[]): boolean =>
  Boolean(user?.roles?.some((role) => roles.includes(role)))

export const isStaff = (user: User): boolean => hasRole(user, ...ROLES)

export const anyone: Access = () => true
export const nobody: Access = () => false
export const staff: Access = ({ req: { user } }) => isStaff(user)
export const ownerOnly: Access = ({ req: { user } }) => hasRole(user, 'owner')
/** Content collections: owner + editor write; support reads only. */
export const contentEditors: Access = ({ req: { user } }) => hasRole(user, 'owner', 'editor')
/** Leads and data requests: owner + support handle them; editors only read leads. */
export const leadHandlers: Access = ({ req: { user } }) => hasRole(user, 'owner', 'support')

/** Anonymous requests see published documents only; staff see drafts too. */
export const publishedOrStaff: Access = ({ req: { user } }) =>
  isStaff(user) ? true : { _status: { equals: 'published' } }

export const ownerOnlyField: FieldAccess = ({ req: { user } }) => hasRole(user, 'owner')
export const staffOnlyField: FieldAccess = ({ req: { user } }) => isStaff(user)
