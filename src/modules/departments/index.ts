/**
 * Departments Module
 * Exports all department-related functionality
 */

// Services
export {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  reactivateDepartment,
  assignUserToDepartment,
  getDepartmentUsers,
  getDepartmentJobs,
  getOrgUsers,
  type Department,
  type DepartmentDB,
  type DepartmentUser,
  type DepartmentJob,
} from './services/departmentService';

// Hooks
export {
  useDepartments,
  useActiveDepartments,
  useDepartment,
} from './hooks/useDepartments';

// Components
export { DepartmentForm } from './components/DepartmentForm';
export { UserDepartmentAssignment } from './components/UserDepartmentAssignment';
