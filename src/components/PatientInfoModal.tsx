import type { PatientInfo as PatientInfoType } from '../types';

interface PatientInfoProps {
  patient: PatientInfoType | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PatientInfoModal({ patient, isOpen, onClose }: PatientInfoProps) {
  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                👤
              </div>
              <div>
                <h2 className="text-xl font-bold">{patient.name}</h2>
                <p className="text-blue-100 text-sm">{patient.name_en}</p>
                <p className="text-blue-200 text-xs mt-1">ID: {patient.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-500">Age</p>
              <p className="text-lg font-bold text-gray-800">{patient.age}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-500">Gender</p>
              <p className="text-lg font-bold text-gray-800">{patient.gender}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-500">Blood Type</p>
              <p className="text-lg font-bold text-red-500">{patient.blood_type}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-500">Room</p>
              <p className="text-lg font-bold text-blue-500">{patient.room}</p>
            </div>
          </div>

          {/* Physical Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Weight</p>
              <p className="text-xl font-bold text-gray-800">{patient.weight} <span className="text-sm font-normal">kg</span></p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Height</p>
              <p className="text-xl font-bold text-gray-800">{patient.height} <span className="text-sm font-normal">cm</span></p>
            </div>
          </div>

          {/* Medical Conditions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">🏥 Medical Conditions</h3>
            <div className="flex flex-wrap gap-2">
              {patient.conditions.map((condition, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full"
                >
                  {condition}
                </span>
              ))}
            </div>
          </div>

          {/* Medications */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">💊 Current Medications</h3>
            <div className="space-y-2">
              {patient.medications.map((medication, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg"
                >
                  <span className="text-purple-500">•</span>
                  <span className="text-sm text-gray-700">{medication}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">👨‍⚕️ Attending Doctor</h3>
            <p className="text-gray-800">{patient.doctor}</p>
          </div>

          {/* Emergency Contact */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📞 Emergency Contact</h3>
            <p className="text-gray-800">{patient.emergency_contact}</p>
            <p className="text-orange-600 font-medium">{patient.emergency_phone}</p>
          </div>

          {/* Notes */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📝 Notes</h3>
            <p className="text-sm text-gray-600">{patient.notes}</p>
          </div>

          {/* Admission Date */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            Admission Date: {new Date(patient.admission_date).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
