export type Role = 'staff' | 'manager';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  department: string;
  manager_id?: string;
  // Identity
  employeeId?: string;
  dob?: string;
  gender?: string;
  // Professional
  position?: string;
  joiningDate?: string;
  contractType?: string;
  lineManager?: string;
  // Contact & Legal
  companyEmail?: string;
  personalEmail?: string;
  phone?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  idCardNumber?: string;
  idCardDate?: string;
  idCardPlace?: string;
  // Finance
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
}
