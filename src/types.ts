export type Role = 'staff' | 'manager' | 'accountant' | 'ceo';

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
  permissions: string[];
}

export interface UserProfile {
  name: string;
  avatar: string;
  department: string;
  manager_id?: string;
}

export interface EmployeeDetails {
  employeeId?: string;
  dob?: string;
  gender?: string;
  position?: string;
  joiningDate?: string;
  contractType?: string;
  lineManager?: string;
  companyEmail?: string;
  personalEmail?: string;
  phone?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  idCardNumber?: string;
  idCardDate?: string;
  idCardPlace?: string;
}

export interface FinancialDetails {
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
}

export interface User extends AuthUser, UserProfile, EmployeeDetails, FinancialDetails {}

export interface Document {
  id: string;
  title: string;
  category_type: 'Guideline' | 'Template' | 'Contract';
  department: string;
  type: 'pdf' | 'image' | 'doc' | 'sheet';
  size: string;
  updatedAt: string;
  author: string;
  tags: string[];
  version: string;
  url: string;
  drive_folder_id?: string;
}

export interface DocumentHistory {
  id: string;
  document_id: string;
  action: string;
  user: string;
  timestamp: string;
}

export interface DocumentWithHistory extends Document {
  history: DocumentHistory[];
}
