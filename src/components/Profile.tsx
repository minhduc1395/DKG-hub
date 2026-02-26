import { useState, useEffect } from 'react';
import { User } from '../types';
import { Camera, Save, User as UserIcon, Briefcase, FileText, CreditCard, Phone, MapPin, Mail } from 'lucide-react';
import { AvatarPicker } from './AvatarPicker';

interface ProfileProps {
  user: User;
  onUpdate?: (updatedUser: User) => void;
}

export function Profile({ user, onUpdate }: ProfileProps) {
  const [formData, setFormData] = useState<User>(user);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Check for changes whenever formData updates
  useEffect(() => {
    const isDirty = JSON.stringify(formData) !== JSON.stringify(user);
    setHasChanges(isDirty);
  }, [formData, user]);

  const handleChange = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(formData);
    }
    setHasChanges(false);
    alert('Profile updated successfully!');
  };

  const handleAvatarSave = (newUrl: string) => {
    handleChange('avatar', newUrl);
  };

  // Styles for inputs
  const editableInputClass = "w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all";
  const readOnlyInputClass = "w-full p-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 font-medium cursor-not-allowed opacity-70";

  return (
    <>
      <AvatarPicker 
        isOpen={isAvatarPickerOpen} 
        onClose={() => setIsAvatarPickerOpen(false)} 
        onSave={handleAvatarSave}
        currentAvatar={formData.avatar}
      />
      
      <div className="max-w-5xl mx-auto pb-24 space-y-8 relative">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
        </div>

        {/* 1. Identity Section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6 text-blue-400">
            <UserIcon className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Bio</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <img 
                  src={formData.avatar} 
                  alt={formData.name} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/10"
                />
                <button 
                  onClick={() => setIsAvatarPickerOpen(true)}
                  className="absolute bottom-0 right-0 p-3 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-lg border border-white/30 shadow-xl text-white hover:scale-110 hover:from-white/30 hover:to-white/10 transition-all duration-300 group-hover:shadow-blue-500/30"
                >
                  <Camera className="w-5 h-5 drop-shadow-md" />
                </button>
              </div>
            </div>

            {/* Identity Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 w-full">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase">Full Name</label>
              <div className={readOnlyInputClass}>
                {formData.name}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase">Employee ID</label>
              <div className={readOnlyInputClass}>
                {formData.employeeId || 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase">Date of Birth</label>
              <div className={readOnlyInputClass}>
                {formData.dob || 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase">Gender</label>
              <div className={readOnlyInputClass}>
                {formData.gender || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Professional Info */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6 text-purple-400">
          <Briefcase className="w-6 h-6" />
          <h2 className="text-xl font-bold text-white">Role</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Position / Role</label>
            <div className={readOnlyInputClass}>
              {formData.position || formData.role}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Department</label>
            <div className={readOnlyInputClass}>
              {formData.department}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Line Manager</label>
            <div className={readOnlyInputClass}>
              {formData.lineManager || 'N/A'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Joining Date</label>
            <div className={readOnlyInputClass}>
              {formData.joiningDate || 'N/A'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Contract Type</label>
            <div className={readOnlyInputClass}>
              {formData.contractType || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Contact & Legal Info */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6 text-emerald-400">
          <FileText className="w-6 h-6" />
          <h2 className="text-xl font-bold text-white">Details</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
              <Mail className="w-3 h-3" /> Company Email
            </label>
            <div className={readOnlyInputClass}>
              {formData.companyEmail || 'N/A'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
              <Mail className="w-3 h-3" /> Personal Email
            </label>
            <input
              type="email"
              value={formData.personalEmail || ''}
              onChange={(e) => handleChange('personalEmail', e.target.value)}
              className={editableInputClass}
              placeholder="personal@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
              <Phone className="w-3 h-3" /> Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={editableInputClass}
              placeholder="+1 234 567 890"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Permanent Address
            </label>
            <input
              type="text"
              value={formData.permanentAddress || ''}
              onChange={(e) => handleChange('permanentAddress', e.target.value)}
              className={editableInputClass}
              placeholder="123 Main St, City, Country"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Temporary Address
            </label>
            <input
              type="text"
              value={formData.temporaryAddress || ''}
              onChange={(e) => handleChange('temporaryAddress', e.target.value)}
              className={editableInputClass}
              placeholder="Apt 4B, 456 Second St, City"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">ID Card Number (CCCD)</label>
            <input
              type="text"
              value={formData.idCardNumber || ''}
              onChange={(e) => handleChange('idCardNumber', e.target.value)}
              className={editableInputClass}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Date of Issue</label>
            <input
              type="text"
              placeholder="Select Date of Issue"
              onFocus={(e) => (e.target.type = "date")}
              onBlur={(e) => (e.target.type = "text")}
              value={formData.idCardDate || ''}
              onChange={(e) => handleChange('idCardDate', e.target.value)}
              className={editableInputClass}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Place of Issue</label>
            <input
              type="text"
              value={formData.idCardPlace || ''}
              onChange={(e) => handleChange('idCardPlace', e.target.value)}
              className={editableInputClass}
            />
          </div>
        </div>
      </div>

      {/* 4. Finance Info */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6 text-amber-400">
          <CreditCard className="w-6 h-6" />
          <h2 className="text-xl font-bold text-white">Banking</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Bank Account Number</label>
            <input
              type="text"
              value={formData.bankAccountNumber || ''}
              onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
              className={editableInputClass}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Bank Name</label>
            <input
              type="text"
              value={formData.bankName || ''}
              onChange={(e) => handleChange('bankName', e.target.value)}
              className={editableInputClass}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-medium text-slate-400 uppercase">Bank Branch</label>
            <input
              type="text"
              value={formData.bankBranch || ''}
              onChange={(e) => handleChange('bankBranch', e.target.value)}
              className={editableInputClass}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center pt-8">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`relative group overflow-hidden rounded-xl transition-all duration-500 transform ${
            hasChanges 
              ? 'hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4),_inset_0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.98] cursor-pointer' 
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          {/* Main Glass Body */}
          <div className={`absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-md border border-white/10 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-xl ${hasChanges ? 'group-hover:border-white/20' : ''}`} />
          
          {/* Top Gloss */}
          <div className={`absolute top-0 inset-x-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent opacity-0 transition-opacity duration-500 rounded-t-xl ${hasChanges ? 'group-hover:opacity-100' : ''}`} />
          
          {/* Bottom Rim */}
          <div className="absolute bottom-0 inset-x-0 h-[30%] bg-gradient-to-t from-white/10 to-transparent opacity-50 rounded-b-xl" />

          {/* Content */}
          <div className="relative z-10 px-10 py-3 flex items-center justify-center gap-2 text-white font-bold tracking-wide text-base drop-shadow-md">
            Save Changes
          </div>
          
          {/* Sweep Effect */}
          {hasChanges && (
            <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out skew-x-[-20deg] pointer-events-none" />
          )}
        </button>
      </div>
    </div>
    </>
  );
}
