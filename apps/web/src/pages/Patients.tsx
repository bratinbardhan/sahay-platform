
import { HeartHandshake } from 'lucide-react';

export default function Patients() {
    return (
        <div className="min-h-screen bg-sahay-bg p-4 sm:p-8 flex flex-col items-center justify-center tour-care-circle">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-slate-200 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6">
                    <HeartHandshake className="w-8 h-8 text-teal-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-3">Care Circle / Patients</h1>
                <p className="text-slate-600 mb-8">
                    Manage your assigned patients and review emergency protocols. This feature is being integrated in v1.1.
                </p>
            </div>
        </div>
    );
}
